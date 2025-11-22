import { Pool, PoolConfig } from 'pg';
import { getLogger } from '../../shared/logger/Logger';

const logger = getLogger('DatabaseConfig');

/**
 * PostgreSQL Database Configuration
 * 
 * Provides connection pool for all database operations.
 * Uses environment variables for configuration.
 * Optimized for production with monitoring and proper pool sizing.
 */
export class DatabaseConfig {
  private static instance: Pool | null = null;

  /**
   * Gets PostgreSQL connection pool instance
   * 
   * Creates singleton pool with optimized settings for production.
   * Pool configuration:
   * - max: Maximum number of connections (default: 20, production: 50-100)
   * - min: Minimum number of connections (default: 2, production: 5-10)
   * - idleTimeoutMillis: Timeout for idle connections (default: 30s, production: 60s)
   * - connectionTimeoutMillis: Timeout for establishing connection (default: 5s, production: 10s)
   */
  public static getPool(): Pool {
    if (!DatabaseConfig.instance) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Production-optimized defaults
      const defaultMax = isProduction ? 50 : 20;
      const defaultMin = isProduction ? 5 : 2;
      const defaultIdleTimeout = isProduction ? 60000 : 30000; // 60s in production, 30s in dev
      const defaultConnectionTimeout = isProduction ? 10000 : 5000; // 10s in production, 5s in dev

      const config: PoolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'travel_app',
        user: process.env.DB_USER || 'travel_user',
        password: process.env.DB_PASSWORD || 'travel_pass',
        max: parseInt(process.env.DB_POOL_MAX || String(defaultMax), 10),
        min: parseInt(process.env.DB_POOL_MIN || String(defaultMin), 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || String(defaultIdleTimeout), 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || String(defaultConnectionTimeout), 10),
        // Statement timeout (optional, can be set via DB_STATEMENT_TIMEOUT)
        statement_timeout: process.env.DB_STATEMENT_TIMEOUT 
          ? parseInt(process.env.DB_STATEMENT_TIMEOUT, 10) 
          : undefined,
      };

      DatabaseConfig.instance = new Pool(config);

      // Log connection errors
      DatabaseConfig.instance.on('error', (err) => {
        logger.error('Unexpected PostgreSQL pool error', err, {
          module: 'DatabaseConfig',
        });
      });

      // Monitor pool usage (only in development or if explicitly enabled)
      const maxConnections = config.max || defaultMax;
      if (!isProduction || process.env.DB_POOL_MONITORING === 'true') {
        DatabaseConfig.instance.on('connect', () => {
          const poolStats = DatabaseConfig.getPoolStats();
          if (poolStats.totalCount >= maxConnections * 0.8) {
            logger.warn('Database pool usage is high', {
              module: 'DatabaseConfig',
              ...poolStats,
              maxConnections,
              threshold: '80%',
            });
          }
        });
      }

      logger.info('Database connection pool initialized', {
        module: 'DatabaseConfig',
        max: config.max,
        min: config.min,
        idleTimeout: config.idleTimeoutMillis,
        connectionTimeout: config.connectionTimeoutMillis,
        environment: isProduction ? 'production' : 'development',
      });
    }

    return DatabaseConfig.instance;
  }

  /**
   * Gets current pool statistics
   * 
   * @returns Pool statistics object
   */
  public static getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    if (!DatabaseConfig.instance) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      totalCount: DatabaseConfig.instance.totalCount,
      idleCount: DatabaseConfig.instance.idleCount,
      waitingCount: DatabaseConfig.instance.waitingCount,
    };
  }

  /**
   * Tests database connection
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const pool = DatabaseConfig.getPool();
      const result = await pool.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ PostgreSQL connection test failed:', error);
      return false;
    }
  }

  /**
   * Closes all database connections
   */
  public static async close(): Promise<void> {
    if (DatabaseConfig.instance) {
      await DatabaseConfig.instance.end();
      DatabaseConfig.instance = null;
    }
  }
}




