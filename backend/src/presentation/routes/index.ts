import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';
import { HealthCheckUseCase } from '@application/use-cases/HealthCheckUseCase';
import { checkStorageConnection } from '@infrastructure/storage/MinIOClient';
import authRoutes from './auth.routes';
import routeRoutes from './route.routes';
import orderRoutes from './order.routes';
import storageRoutes from './storage.routes';
import tourRoutes from './tour.routes';
import insuranceRoutes from './insurance.routes';
import { errorHandler } from '../middleware';

const router = Router();

// Инициализация HealthCheckUseCase
const storageHealthCheck = {
  checkConnection: checkStorageConnection,
};
const healthCheckUseCase = new HealthCheckUseCase(storageHealthCheck);
const healthController = new HealthController(healthCheckUseCase);

// Health check
router.get('/health', healthController.check);

// API routes
router.use('/auth', authRoutes);
router.use('/routes', routeRoutes);
router.use('/orders', orderRoutes);
router.use('/storage', storageRoutes);
router.use('/tours', tourRoutes);
router.use('/insurance', insuranceRoutes);

// Error handler (должен быть последним)
router.use(errorHandler);

export default router;
