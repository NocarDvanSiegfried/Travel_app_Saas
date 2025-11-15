import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './infrastructure/database/init-db';
import apiRoutes from './presentation/routes';
import { validateEnv } from '@shared/config';
import { logger } from '@shared/utils/logger';
import { errorHandler } from './presentation/middleware';

dotenv.config();

// Валидация переменных окружения
try {
  validateEnv();
} catch (error) {
  logger.error('Environment validation failed', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Middleware
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(origin => origin.trim());
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use(`/api/${API_VERSION}`, apiRoutes);

// Root endpoint
app.get(`/api/${API_VERSION}/`, (req, res) => {
  res.json({ 
    message: 'Travel App API - Северный Маршрут',
    version: API_VERSION,
    status: 'running'
  });
});

// Global error handler (должен быть последним)
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    // Initialize database (run migrations)
    await initializeDatabase();
    
    // Start server
    app.listen(PORT, () => {
      logger.info('Backend server started', { port: PORT, apiVersion: API_VERSION });
      logger.info(`API available at http://localhost:${PORT}/api/${API_VERSION}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
