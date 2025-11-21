import { createClient, RedisClientType } from 'redis';

/**
 * Redis Configuration
 * 
 * Provides Redis client for graph storage and caching.
 * Uses environment variables for configuration.
 */
export class RedisConfig {
  private static instance: RedisClientType | null = null;

  /**
   * Gets Redis client instance
   */
  public static getClient(): RedisClientType {
    if (!RedisConfig.instance) {
      const config = {
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000', 10),
        },
        password: process.env.REDIS_PASSWORD,
      };

      RedisConfig.instance = createClient(config);

      // Error handling
      RedisConfig.instance.on('error', (err) => {
        console.error('❌ Redis error:', err);
      });

      RedisConfig.instance.on('connect', () => {
        console.log('🔗 Redis connecting...');
      });

      RedisConfig.instance.on('ready', () => {
        console.log('✅ Redis ready');
      });
    }

    return RedisConfig.instance;
  }

  /**
   * Connects to Redis
   */
  public static async connect(): Promise<boolean> {
    try {
      const client = RedisConfig.getClient();
      
      if (!client.isOpen) {
        await client.connect();
      }

      // Test connection
      await client.ping();
      return true;
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      return false;
    }
  }

  /**
   * Tests Redis connection
   */
  public static async testConnection(): Promise<boolean> {
    try {
      const client = RedisConfig.getClient();
      
      if (!client.isOpen) {
        return false;
      }

      const pong = await client.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Closes Redis connection
   */
  public static async close(): Promise<void> {
    if (RedisConfig.instance && RedisConfig.instance.isOpen) {
      await RedisConfig.instance.quit();
      RedisConfig.instance = null;
    }
  }
}




