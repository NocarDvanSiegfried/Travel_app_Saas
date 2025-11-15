import { Order } from '@domain/entities/Order';
import { IOrderRepository } from '@domain/repositories/IOrderRepository';
import { NotFoundError } from '@shared/errors';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для получения заказов пользователя
 */
export class GetUserOrdersUseCase {
  constructor(private readonly orderRepository: IOrderRepository) {}

  async execute(userId: string): Promise<Order[]> {
    try {
      logger.info('Getting user orders', { userId });

      const orders = await this.orderRepository.findByUserId(userId);

      logger.info('User orders retrieved', { userId, count: orders.length });

      return orders;
    } catch (error) {
      logger.error('Error getting user orders', error);
      throw error;
    }
  }
}

