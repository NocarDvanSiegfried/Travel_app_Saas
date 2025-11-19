import { Pool, PoolConfig } from 'pg';

/**
 * PostgreSQL Database Configuration
 * 
 * Provides connection pool for all database operations.
 * Uses environment variables for configuration.
 */
export class DatabaseConfig {
  private static instance: Pool | null = null;

  /**
   * Gets PostgreSQL connection pool instance
   */
  public static getPool(): Pool {
    if (!DatabaseConfig.instance) {
      const config: PoolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'travel_app',
        user: process.env.DB_USER || 'travel_user',
        password: process.env.DB_PASSWORD || 'travel_pass',
        max: parseInt(process.env.DB_POOL_MAX || '20', 10),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
      };

      DatabaseConfig.instance = new Pool(config);

      // Log connection errors
      DatabaseConfig.instance.on('error', (err) => {
        console.error('❌ Unexpected PostgreSQL error:', err);
      });
    }

    return DatabaseConfig.instance;
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

