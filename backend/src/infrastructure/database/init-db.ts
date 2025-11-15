import { pool } from './PostgresConnection';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase() {
  try {
    // Wait for database to be ready
    let retries = 10;
    while (retries > 0) {
      try {
        await pool.query('SELECT NOW()');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await pool.query(sql);
      console.log(`✅ Migration applied: ${file}`);
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    // Don't throw in development to allow server to start
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

