import { Router } from 'express';
import { TourController } from '../controllers/TourController';
import { SearchToursUseCase } from '@application/use-cases/SearchToursUseCase';
import { GetTourDetailsUseCase } from '@application/use-cases/GetTourDetailsUseCase';
import { CreateTourOrderUseCase } from '@application/use-cases/CreateTourOrderUseCase';
import { MockTourService } from '@application/services/MockTourService';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Инициализация зависимостей
const mockTourService = new MockTourService();
const searchToursUseCase = new SearchToursUseCase(mockTourService);
const getTourDetailsUseCase = new GetTourDetailsUseCase(mockTourService);
const createTourOrderUseCase = new CreateTourOrderUseCase(mockTourService);

const tourController = new TourController(
  searchToursUseCase,
  getTourDetailsUseCase,
  createTourOrderUseCase
);

// Маршруты
router.get('/search', tourController.search);
router.get('/:id', tourController.getDetails);
router.post('/orders', authenticate, tourController.createOrder);

export default router;

