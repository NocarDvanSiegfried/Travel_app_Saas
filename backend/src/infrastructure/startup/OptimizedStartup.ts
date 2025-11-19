import { DatabaseConfig } from '../config/database.config';
import { RedisConfig } from '../config/redis.config';
import { PostgresGraphRepository } from '../repositories/PostgresGraphRepository';
import type { GraphMetadata } from '../../domain/repositories/IGraphRepository';

/**
 * Startup performance metrics
 */
export type StartupMetrics = {
  totalDurationMs: number;
  postgresConnectionMs: number;
  redisConnectionMs: number;
  graphLoadMs: number;
  success: boolean;
  graphAvailable: boolean;
  graphVersion?: string;
  errors: string[];
};

/**
 * Startup result
 */
export type StartupResult = {
  metrics: StartupMetrics;
  graphMetadata?: GraphMetadata;
  postgresPool: any;
  redisClient: any;
};

/**
 * Optimized Backend Startup Module
 * 
 * Handles fast, readonly startup sequence:
 * 1. Initialize PostgreSQL connection pool
 * 2. Initialize Redis client
 * 3. Load graph metadata from Redis (readonly)
 * 4. Verify graph availability
 * 
 * Target: < 300ms total startup time
 * Redis graph load: < 200ms
 * 
 * No heavy processing:
 * - No OData fetching
 * - No virtual entity generation
 * - No graph building
 * - Readonly mode only
 */
export class OptimizedStartup {
  /**
   * Performs optimized startup sequence
   */
  public static async initialize(): Promise<StartupResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let postgresConnectionMs = 0;
    let redisConnectionMs = 0;
    let graphLoadMs = 0;
    let graphAvailable = false;
    let graphVersion: string | undefined;
    let graphMetadata: GraphMetadata | undefined;

    console.log('🚀 Starting optimized backend initialization...');

    // ========================================================================
    // Step 1: Initialize PostgreSQL
    // ========================================================================
    const postgresStart = Date.now();
    let postgresPool;
    
    try {
      console.log('🔗 Connecting to PostgreSQL...');
      postgresPool = DatabaseConfig.getPool();
      
      const isConnected = await DatabaseConfig.testConnection();
      postgresConnectionMs = Date.now() - postgresStart;

      if (isConnected) {
        console.log(`✅ PostgreSQL connected (${postgresConnectionMs}ms)`);
      } else {
        const error = 'PostgreSQL connection test failed';
        console.error(`❌ ${error}`);
        errors.push(error);
        
        throw new Error('PostgreSQL connection failed');
      }
    } catch (error: any) {
      postgresConnectionMs = Date.now() - postgresStart;
      const errorMessage = error?.message || String(error);
      console.error(`❌ PostgreSQL initialization failed (${postgresConnectionMs}ms):`, errorMessage);
      errors.push(`PostgreSQL: ${errorMessage}`);
      
      throw error; // PostgreSQL is critical - cannot continue without it
    }

    // ========================================================================
    // Step 2: Initialize Redis
    // ========================================================================
    const redisStart = Date.now();
    let redisClient;

    try {
      console.log('🔗 Connecting to Redis...');
      const isConnected = await RedisConfig.connect();
      redisClient = RedisConfig.getClient();
      redisConnectionMs = Date.now() - redisStart;

      if (isConnected) {
        console.log(`✅ Redis connected (${redisConnectionMs}ms)`);
      } else {
        const error = 'Redis connection test failed';
        console.warn(`⚠️ ${error} (${redisConnectionMs}ms)`);
        errors.push(error);
      }
    } catch (error: any) {
      redisConnectionMs = Date.now() - redisStart;
      const errorMessage = error?.message || String(error);
      console.warn(`⚠️ Redis initialization failed (${redisConnectionMs}ms):`, errorMessage);
      errors.push(`Redis: ${errorMessage}`);
      
      // Redis is non-critical - continue without it
      console.warn('⚠️ Continuing without Redis - graph will not be available');
    }

    // ========================================================================
    // Step 3: Load Graph Metadata from Redis (Readonly)
    // ========================================================================
    const graphLoadStart = Date.now();

    if (redisClient && redisClient.isOpen) {
      try {
        console.log('📊 Loading graph metadata from Redis...');
        
        const graphRepository = new PostgresGraphRepository(postgresPool, redisClient);
        
        // Get current graph version
        graphVersion = await graphRepository.getGraphVersion();
        graphLoadMs = Date.now() - graphLoadStart;

        if (graphVersion) {
          console.log(`📊 Graph version: ${graphVersion}`);
          
          // Get graph metadata
          graphMetadata = await graphRepository.getGraphMetadata();
          
          if (graphMetadata) {
            graphAvailable = true;
            console.log(`✅ Graph loaded (${graphLoadMs}ms):`);
            console.log(`   - Nodes: ${graphMetadata.nodes}`);
            console.log(`   - Edges: ${graphMetadata.edges}`);
            console.log(`   - Build timestamp: ${new Date(graphMetadata.buildTimestamp).toISOString()}`);
            console.log(`   - Dataset version: ${graphMetadata.datasetVersion}`);
          } else {
            const error = 'Graph metadata not found in Redis';
            console.warn(`⚠️ ${error}`);
            errors.push(error);
          }
        } else {
          graphLoadMs = Date.now() - graphLoadStart;
          const error = 'No graph version found in Redis';
          console.warn(`⚠️ ${error} (${graphLoadMs}ms)`);
          errors.push(error);
        }
      } catch (error: any) {
        graphLoadMs = Date.now() - graphLoadStart;
        const errorMessage = error?.message || String(error);
        console.warn(`⚠️ Graph loading failed (${graphLoadMs}ms):`, errorMessage);
        errors.push(`Graph load: ${errorMessage}`);
      }
    } else {
      graphLoadMs = Date.now() - graphLoadStart;
      const error = 'Redis not available - cannot load graph';
      console.warn(`⚠️ ${error}`);
      errors.push(error);
    }

    // ========================================================================
    // Graceful Fallback
    // ========================================================================
    if (!graphAvailable) {
      console.warn('⚠️ Graph not available - backend will start in LIMITED MODE');
      console.warn('⚠️ Route search will not work until graph is built by background worker');
      console.warn('💡 To build graph, run: npm run worker:graph-builder');
    }

    // ========================================================================
    // Final Metrics
    // ========================================================================
    const totalDurationMs = Date.now() - startTime;
    const success = errors.length === 0 || (postgresConnectionMs > 0 && errors.length <= 2);

    const metrics: StartupMetrics = {
      totalDurationMs,
      postgresConnectionMs,
      redisConnectionMs,
      graphLoadMs,
      success,
      graphAvailable,
      graphVersion,
      errors,
    };

    // Log final summary
    console.log('\n📊 Startup Summary:');
    console.log(`   Total time: ${totalDurationMs}ms ${totalDurationMs < 300 ? '✅' : '⚠️ (> 300ms)'}`);
    console.log(`   PostgreSQL: ${postgresConnectionMs}ms ✅`);
    console.log(`   Redis: ${redisConnectionMs}ms ${redisConnectionMs < 200 ? '✅' : '⚠️'}`);
    console.log(`   Graph load: ${graphLoadMs}ms ${graphLoadMs < 200 ? '✅' : '⚠️'}`);
    console.log(`   Graph available: ${graphAvailable ? '✅ YES' : '❌ NO'}`);
    console.log(`   Status: ${success ? '✅ SUCCESS' : '⚠️ PARTIAL'}`);
    
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.length}`);
      errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error}`);
      });
    }

    console.log('');

    return {
      metrics,
      graphMetadata,
      postgresPool,
      redisClient,
    };
  }

  /**
   * Performs graceful shutdown
   */
  public static async shutdown(): Promise<void> {
    console.log('🛑 Shutting down backend...');

    try {
      await DatabaseConfig.close();
      console.log('✅ PostgreSQL connections closed');
    } catch (error) {
      console.error('❌ Error closing PostgreSQL:', error);
    }

    try {
      await RedisConfig.close();
      console.log('✅ Redis connection closed');
    } catch (error) {
      console.error('❌ Error closing Redis:', error);
    }

    console.log('✅ Shutdown complete');
  }
}

