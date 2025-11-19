/**
 * Integration Test Setup
 * 
 * Configures test environment for integration tests with real databases.
 */

import { Pool } from 'pg';
import { createClient, type RedisClientType } from 'redis';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test database configuration
 */
export const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  database: process.env.TEST_DB_NAME || 'travel_app_test',
  user: process.env.TEST_DB_USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || 'postgres',
};

/**
 * Test Redis configuration
 */
export const TEST_REDIS_CONFIG = {
  url: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
  database: parseInt(process.env.TEST_REDIS_DB || '1', 10), // Use DB 1 for tests
};

/**
 * Global test database pool
 */
let testDbPool: Pool | null = null;

/**
 * Global test Redis client
 */
let testRedisClient: RedisClientType | null = null;

/**
 * Initialize test database connection
 */
export async function initTestDatabase(): Promise<Pool> {
  if (testDbPool) {
    return testDbPool;
  }

  testDbPool = new Pool(TEST_DB_CONFIG);

  // Test connection
  try {
    await testDbPool.query('SELECT 1');
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }

  return testDbPool;
}

/**
 * Initialize test Redis connection
 */
export async function initTestRedis(): Promise<RedisClientType> {
  if (testRedisClient) {
    return testRedisClient;
  }

  testRedisClient = createClient({
    url: TEST_REDIS_CONFIG.url,
    database: TEST_REDIS_CONFIG.database,
  });

  testRedisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  await testRedisClient.connect();
  console.log('✅ Test Redis connected');

  return testRedisClient;
}

/**
 * Run database migrations
 */
export async function runMigrations(pool: Pool): Promise<void> {
  const migrationsDir = path.join(__dirname, '../../../infrastructure/database/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.warn('⚠️  Migrations directory not found:', migrationsDir);
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    try {
      await pool.query(sql);
      console.log(`✅ Migration applied: ${file}`);
    } catch (error) {
      console.error(`❌ Failed to apply migration ${file}:`, error);
      throw error;
    }
  }
}

/**
 * Clean test database (truncate all tables)
 */
export async function cleanTestDatabase(pool: Pool): Promise<void> {
  const tables = [
    'flights',
    'virtual_routes',
    'routes',
    'virtual_stops',
    'stops',
    'graphs',
    'datasets',
  ];

  await pool.query('BEGIN');
  try {
    // Disable foreign key checks temporarily
    await pool.query('SET session_replication_role = replica');
    
    for (const table of tables) {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
    
    await pool.query('SET session_replication_role = DEFAULT');
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

/**
 * Clean test Redis (flush database)
 */
export async function cleanTestRedis(client: RedisClientType): Promise<void> {
  await client.flushDb();
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testDbPool) {
    await testDbPool.end();
    testDbPool = null;
    console.log('✅ Test database connection closed');
  }
}

/**
 * Close test Redis connection
 */
export async function closeTestRedis(): Promise<void> {
  if (testRedisClient) {
    await testRedisClient.quit();
    testRedisClient = null;
    console.log('✅ Test Redis connection closed');
  }
}

/**
 * Global setup for integration tests
 */
export async function setupIntegrationTests(): Promise<{
  dbPool: Pool;
  redisClient: RedisClientType;
}> {
  const dbPool = await initTestDatabase();
  const redisClient = await initTestRedis();

  // Run migrations
  await runMigrations(dbPool);

  // Clean databases
  await cleanTestDatabase(dbPool);
  await cleanTestRedis(redisClient);

  return { dbPool, redisClient };
}

/**
 * Global teardown for integration tests
 */
export async function teardownIntegrationTests(): Promise<void> {
  await closeTestDatabase();
  await closeTestRedis();
}

