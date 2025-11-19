import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initializeDatabase } from './infrastructure/database/init-db';
import { OptimizedStartup } from './infrastructure/startup';
import type { StartupResult } from './infrastructure/startup';
import apiRoutes from './presentation/routes';

// ============================================================================
// Environment Configuration
// ============================================================================

// Load .env from project root (for Docker) or from backend directory (for local)
const rootEnvPath = path.resolve(__dirname, '../../.env');
const localEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config({ path: localEnvPath });
}

// ============================================================================
// Express Application Setup
// ============================================================================

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// Global Startup State
// ============================================================================

// Store startup result globally for health checks and API access
let startupResult: StartupResult | null = null;

/**
 * Gets current startup result
 */
export function getStartupResult(): StartupResult | null {
  return startupResult;
}

// ============================================================================
// Health Check Endpoint
// ============================================================================

app.get('/health', (req, res) => {
  const metrics = startupResult?.metrics;
  
  res.json({ 
    status: metrics?.success ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    startup: {
      totalDurationMs: metrics?.totalDurationMs || 0,
      postgresConnected: (metrics?.postgresConnectionMs || 0) > 0,
      redisConnected: (metrics?.redisConnectionMs || 0) > 0,
      graphAvailable: metrics?.graphAvailable || false,
      graphVersion: metrics?.graphVersion || null,
    }
  });
});

// ============================================================================
// API Routes
// ============================================================================

app.use(`/api/${API_VERSION}`, apiRoutes);

app.get(`/api/${API_VERSION}/`, (req, res) => {
  res.json({ 
    message: 'Travel App API',
    version: API_VERSION,
    status: 'running',
    graphAvailable: startupResult?.metrics?.graphAvailable || false,
    graphVersion: startupResult?.metrics?.graphVersion || null,
  });
});

// ============================================================================
// Optimized Startup Sequence
// ============================================================================

async function start() {
  try {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Travel App Backend - Optimized Startup Sequence v2.0    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // ========================================================================
    // Step 1: Run Database Migrations (if needed)
    // ========================================================================
    console.log('📦 Step 1: Database Migrations');
    console.log('─────────────────────────────────────────────────────────────');
    
    try {
      await initializeDatabase();
      console.log('✅ Database migrations complete\n');
    } catch (error: any) {
      console.error('❌ Database migrations failed:', error?.message || String(error));
      console.warn('⚠️ Continuing without migrations - assuming schema exists\n');
    }

    // ========================================================================
    // Step 2: Optimized Backend Initialization (PostgreSQL + Redis + Graph)
    // ========================================================================
    console.log('🚀 Step 2: Backend Initialization (Readonly Mode)');
    console.log('─────────────────────────────────────────────────────────────');
    
    startupResult = await OptimizedStartup.initialize();

    // ========================================================================
    // Step 2.5: Ensure Data Initialization (if database is empty)
    // ========================================================================
    if (startupResult.redisClient && startupResult.redisClient.isOpen) {
      const { ensureDataInitialized } = await import('./infrastructure/startup/DataInitialization');
      
      const dataInitialized = await ensureDataInitialized(
        startupResult.postgresPool,
        startupResult.redisClient
      );

      if (dataInitialized) {
        // Reload graph after data initialization
        console.log('🔄 Reloading graph after data initialization...');
        startupResult = await OptimizedStartup.initialize();
      }
    }

    // ========================================================================
    // Step 3: Start Express Server
    // ========================================================================
    console.log('🌐 Step 3: Starting Express Server');
    console.log('─────────────────────────────────────────────────────────────');

    const server = app.listen(PORT, () => {
      console.log(`✅ Backend server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api/${API_VERSION}`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log('');
      
      if (startupResult?.metrics?.graphAvailable) {
        console.log('✅ Backend ready - Graph available, route search enabled');
        console.log(`📊 Graph version: ${startupResult.metrics.graphVersion}`);
      } else {
        console.log('⚠️ Backend ready - LIMITED MODE (graph not available)');
        console.log('💡 Run background worker to build graph: npm run worker:graph-builder');
      }
      
      console.log('');
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    Backend Started ✅                      ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log('');
    });

    // ========================================================================
    // Error Handling
    // ========================================================================

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.error(`   To fix this, either:`);
        console.error(`   1. Stop the process using port ${PORT}:`);
        console.error(`      Windows: netstat -ano | findstr :${PORT}`);
        console.error(`      Then: taskkill /PID <PID> /F`);
        console.error(`   2. Or change the PORT environment variable:`);
        console.error(`      PORT=5001 npm start`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // ========================================================================
    // Graceful Shutdown
    // ========================================================================

    process.on('SIGTERM', async () => {
      console.log('\n📴 SIGTERM received - starting graceful shutdown...');
      
      server.close(() => {
        console.log('✅ Express server closed');
      });

      await OptimizedStartup.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n📴 SIGINT received - starting graceful shutdown...');
      
      server.close(() => {
        console.log('✅ Express server closed');
      });

      await OptimizedStartup.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    process.exit(1);
  }
}

// ============================================================================
// Start Backend
// ============================================================================

start();
