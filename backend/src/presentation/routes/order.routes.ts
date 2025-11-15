import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase';
import { GetUserOrdersUseCase } from '@application/use-cases/GetUserOrdersUseCase';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { OrderRepository } from '@infrastructure/repositories/OrderRepository';
import { UserRepository } from '@infrastructure/repositories/UserRepository';
import { MockRouteService } from '@application/services/MockRouteService';
import { authenticate } from '../middleware';

const router = Router();

// Инициализация зависимостей
const orderRepository: IOrderRepository = new OrderRepository();
const userRepository: IUserRepository = new UserRepository();
const mockRouteService = new MockRouteService();
const createOrderUseCase = new CreateOrderUseCase(orderRepository, userRepository, mockRouteService);
const getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepository);
const orderController = new OrderController(createOrderUseCase, getUserOrdersUseCase);

// Маршруты (требуют аутентификации)
router.post('/', authenticate, orderController.create);
router.get('/my', authenticate, orderController.getMyOrders);

export default router;

