import { TourOrder } from '@domain/entities/TourOrder';
import { Tour } from '@domain/entities/Tour';
import { Price } from '@domain/value-objects/Price';
import { MockTourService } from '../services/MockTourService';
import { CreateTourOrderDto, TourOrderDto } from '../dto/tour.dto';
import { NotFoundError, ConflictError } from '@shared/errors';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@shared/utils/logger';

/**
 * Use-case для создания заказа тура
 */
export class CreateTourOrderUseCase {
  constructor(private readonly mockTourService: MockTourService) {}

  async execute(userId: string, dto: CreateTourOrderDto): Promise<TourOrderDto> {
    try {
      logger.info('Creating tour order', { userId, tourId: dto.tourId });

      // Получение тура
      const tour = this.mockTourService.findById(dto.tourId);
      if (!tour) {
        throw new NotFoundError('Tour', dto.tourId);
      }

      // Проверка доступности
      if (!tour.hasAvailableSpots(dto.participantsCount)) {
        throw new ConflictError('Not enough available spots in the tour');
      }

      // Расчет цены
      const basePrice = tour.price.amount * dto.participantsCount;
      const insurancePrice = dto.insuranceIncluded ? 1000 * dto.participantsCount : 0;
      const totalPrice = new Price(basePrice + insurancePrice, tour.price.currency);

      // Создание заказа
      const order = new TourOrder(
        uuidv4(),
        userId,
        dto.tourId,
        tour,
        'pending',
        totalPrice,
        dto.participantsCount,
        dto.participants.map(p => ({
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
        })),
        new Date(),
        new Date(),
        undefined,
        undefined,
        dto.insuranceIncluded
      );

      // В реальности здесь был бы вызов репозитория для сохранения
      // await this.tourOrderRepository.create(order);

      logger.info('Tour order created', { orderId: order.id });

      return this.mapToDto(order);
    } catch (error) {
      logger.error('Error creating tour order', error);
      throw error;
    }
  }

  private mapToDto(order: TourOrder): TourOrderDto {
    return {
      id: order.id,
      userId: order.userId,
      tourId: order.tourId,
      status: order.status,
      totalPrice: {
        amount: order.totalPrice.amount,
        currency: order.totalPrice.currency,
      },
      participantsCount: order.participantsCount,
      participants: order.participants.map(p => ({
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
      })),
      createdAt: order.createdAt?.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString(),
      insuranceIncluded: order.insuranceIncluded,
    };
  }
}

