import { Request, Response, NextFunction } from 'express';
import { CreateOrderUseCase } from '@application/use-cases/CreateOrderUseCase';
import { GetUserOrdersUseCase } from '@application/use-cases/GetUserOrdersUseCase';
import { CreateOrderDtoSchema } from '@application/dto/order.dto';
import { OrderDto, CreateOrderResponseDto } from '@application/dto/order.dto';
import { ApiResponse } from '@shared/types';

export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly getUserOrdersUseCase: GetUserOrdersUseCase
  ) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const dto = CreateOrderDtoSchema.parse(req.body);
      const order = await this.createOrderUseCase.execute(req.user.userId, dto);

      const orderDto: OrderDto = this.mapToOrderDto(order);

      const response: ApiResponse<CreateOrderResponseDto> = {
        data: {
          order: orderDto,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  getMyOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const orders = await this.getUserOrdersUseCase.execute(req.user.userId);

      const orderDtos: OrderDto[] = orders.map((order) => this.mapToOrderDto(order));

      const response: ApiResponse<OrderDto[]> = {
        data: orderDtos,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  private mapToOrderDto(order: any): OrderDto {
    return {
      id: order.id,
      userId: order.userId,
      routeId: order.routeId,
      status: order.status,
      totalPrice: {
        amount: order.totalPrice.amount,
        currency: order.totalPrice.currency,
      },
      passengers: order.passengers.map((p: any) => ({
        id: p.id,
        fullName: p.fullName,
        documentNumber: p.documentNumber,
      })),
      services: order.services.map((s: any) => ({
        id: s.id,
        serviceType: s.serviceType,
        serviceId: s.serviceId,
        name: s.name,
        price: {
          amount: s.price.amount,
          currency: s.price.currency,
        },
      })),
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString(),
      cancelledAt: order.cancelledAt?.toISOString(),
    };
  }
}

