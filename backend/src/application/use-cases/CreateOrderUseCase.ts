import { Order, OrderStatus } from '@domain/entities/Order';
import { OrderPassenger } from '@domain/entities/OrderPassenger';
import { OrderService, ServiceType } from '@domain/entities/OrderService';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { MockRouteService } from '../services/MockRouteService';
import { CreateOrderDto } from '../dto/order.dto';
import { NotFoundError, ValidationError } from '@shared/errors';
import { Price } from '@domain/value-objects/Price';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для создания заказа
 */
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly userRepository: IUserRepository,
    private readonly mockRouteService: MockRouteService
  ) {}

  async execute(userId: string, dto: CreateOrderDto): Promise<Order> {
    try {
      logger.info('Creating order', { userId, routeId: dto.routeId });

      // Проверка существования пользователя
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User', userId);
      }

      // Получение маршрута
      const route = this.mockRouteService.getRouteById(dto.routeId);
      if (!route) {
        throw new NotFoundError('Route', dto.routeId);
      }

      // Создание пассажиров
      const passengers = dto.passengers.map(
        (p) =>
          new OrderPassenger(
            uuidv4(),
            '', // orderId будет установлен после создания заказа
            p.fullName,
            p.documentNumber
          )
      );

      // Создание услуг
      const services: OrderService[] = [];
      if (dto.services) {
        for (const serviceDto of dto.services) {
          const service = new OrderService(
            uuidv4(),
            '', // orderId будет установлен после создания заказа
            serviceDto.serviceType as ServiceType,
            serviceDto.serviceId,
            serviceDto.name,
            new Price(serviceDto.priceAmount, serviceDto.priceCurrency || 'RUB')
          );
          services.push(service);
        }
      }

      // Расчет общей цены
      let totalPrice = route.totalPrice;
      for (const service of services) {
        totalPrice = totalPrice.add(service.price);
      }

      // Создание заказа
      const orderId = uuidv4();
      const order = new Order(
        orderId,
        userId,
        dto.routeId,
        'pending' as OrderStatus,
        totalPrice,
        passengers.map((p) => new OrderPassenger(p.id, orderId, p.fullName, p.documentNumber)),
        services.map((s) => new OrderService(s.id, orderId, s.serviceType, s.serviceId, s.name, s.price)),
        new Date(),
        new Date()
      );

      const createdOrder = await this.orderRepository.create(order);

      logger.info('Order created', { orderId: createdOrder.id });

      return createdOrder;
    } catch (error) {
      logger.error('Error creating order', error);
      throw error;
    }
  }
}

