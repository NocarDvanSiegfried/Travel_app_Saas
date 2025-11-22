import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from project root (for Docker) or from backend directory (for local)
const rootEnvPath = path.resolve(__dirname, '../../../.env');
const localEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config({ path: localEnvPath });
}

const config: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'travel_app',
  user: process.env.DB_USER || 'travel_user',
  password: process.env.DB_PASSWORD || 'travel_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
};

export const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection (non-blocking)
pool.query('SELECT NOW()', (err, _res) => {
  if (err) {
    // Don't log here - will be handled in init-db.ts with retries
    // Only log if it's not a connection error (already handled)
    const errorCode = (err as any)?.code;
    if (errorCode !== 'EACCES' && errorCode !== 'ECONNREFUSED') {
      console.error('❌ Database connection error:', err);
    }
  } else {
    console.log('✅ Database connected successfully');
  }
});



