import { Router } from 'express';
import { RouteController } from '../controllers/RouteController';
import { SearchRoutesUseCase } from '@application/use-cases/SearchRoutesUseCase';
import { GetRouteDetailsUseCase } from '@application/use-cases/GetRouteDetailsUseCase';
import { GetRouteRecommendationsUseCase } from '@application/use-cases/GetRouteRecommendationsUseCase';
import { MockRouteService } from '@application/services/MockRouteService';
import { AIRecommendationService } from '@application/services/AIRecommendationService';
import { UserRepository } from '@infrastructure/repositories/UserRepository';
import { OrderRepository } from '@infrastructure/repositories/OrderRepository';

const router = Router();

// Инициализация зависимостей
const mockRouteService = new MockRouteService();
const searchRoutesUseCase = new SearchRoutesUseCase(mockRouteService);
const getRouteDetailsUseCase = new GetRouteDetailsUseCase(mockRouteService);

// Инициализация ИИ-сервиса и use-case для рекомендаций
const aiRecommendationService = new AIRecommendationService();
const userRepository = new UserRepository();
const orderRepository = new OrderRepository();
const getRouteRecommendationsUseCase = new GetRouteRecommendationsUseCase(
  mockRouteService,
  aiRecommendationService,
  userRepository,
  orderRepository
);

const routeController = new RouteController(
  searchRoutesUseCase,
  getRouteDetailsUseCase,
  getRouteRecommendationsUseCase
);

// Маршруты
router.get('/search', routeController.search);
router.get('/recommendations', routeController.getRecommendations);
router.get('/:id', routeController.getDetails);

export default router;

