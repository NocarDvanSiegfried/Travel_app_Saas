/**
 * Test Database Helpers
 * 
 * Вспомогательные функции для работы с тестовой базой данных.
 * Используется только в integration тестах.
 */

import { Pool } from 'pg';
import { createClient, type RedisClientType } from 'redis';
import { TEST_ENV } from '../../config/test-config';

let testDbPool: Pool | null = null;
let testRedisClient: RedisClientType | null = null;

/**
 * Инициализация тестовой базы данных
 */
export async function setupIntegrationTests(): Promise<{
  dbPool: Pool;
  redisClient: RedisClientType;
}> {
  // Инициализация PostgreSQL
  if (!testDbPool) {
    testDbPool = new Pool({
      connectionString: TEST_ENV.DATABASE_URL,
      max: 5,
    });
    
    try {
      await testDbPool.query('SELECT 1');
      console.log('✅ Test database connected');
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error);
      throw error;
    }
  }
  
  // Инициализация Redis
  if (!testRedisClient) {
    testRedisClient = createClient({
      url: `redis://${TEST_ENV.REDIS_HOST}:${TEST_ENV.REDIS_PORT}`,
      database: parseInt(TEST_ENV.REDIS_DB, 10),
    });
    
    testRedisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });
    
    await testRedisClient.connect();
    console.log('✅ Test Redis connected');
  }
  
  return {
    dbPool: testDbPool,
    redisClient: testRedisClient,
  };
}

/**
 * Очистка тестовой базы данных
 */
export async function cleanTestDatabase(): Promise<void> {
  if (!testDbPool) return;
  
  const tables = [
    'flights',
    'virtual_routes',
    'routes',
    'virtual_stops',
    'stops',
    'graphs',
    'datasets',
  ];
  
  await testDbPool.query('BEGIN');
  try {
    await testDbPool.query('SET session_replication_role = replica');
    
    for (const table of tables) {
      await testDbPool.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
    
    await testDbPool.query('SET session_replication_role = DEFAULT');
    await testDbPool.query('COMMIT');
  } catch (error) {
    await testDbPool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Очистка тестового Redis
 */
export async function cleanTestRedis(): Promise<void> {
  if (!testRedisClient) return;
  await testRedisClient.flushDb();
}

/**
 * Завершение работы с тестовой базой данных
 */
export async function teardownIntegrationTests(): Promise<void> {
  if (testDbPool) {
    await testDbPool.end();
    testDbPool = null;
    console.log('✅ Test database connection closed');
  }
  
  if (testRedisClient) {
    await testRedisClient.quit();
    testRedisClient = null;
    console.log('✅ Test Redis connection closed');
  }
}





