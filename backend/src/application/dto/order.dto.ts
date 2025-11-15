import { z } from 'zod';
import { OrderStatus } from '@domain/entities/Order';
import { ServiceType } from '@domain/entities/OrderService';

/**
 * DTO для создания заказа
 */
export const CreateOrderDtoSchema = z.object({
  routeId: z.string().uuid('Invalid route ID format'),
  passengers: z.array(
    z.object({
      fullName: z.string().min(2, 'Full name must be at least 2 characters'),
      documentNumber: z.string().min(1, 'Document number is required'),
    })
  ).min(1, 'At least one passenger is required'),
  services: z.array(
    z.object({
      serviceType: z.enum(['insurance', 'premium-support']),
      serviceId: z.string().min(1, 'Service ID is required'),
      name: z.string().min(1, 'Service name is required'),
      priceAmount: z.number().min(0, 'Price must be non-negative'),
      priceCurrency: z.string().length(3, 'Currency must be 3 letters').default('RUB'),
    })
  ).optional(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderDtoSchema>;

/**
 * DTO пассажира в заказе
 */
export interface OrderPassengerDto {
  id: string;
  fullName: string;
  documentNumber: string;
}

/**
 * DTO услуги в заказе
 */
export interface OrderServiceDto {
  id: string;
  serviceType: ServiceType;
  serviceId: string;
  name: string;
  price: {
    amount: number;
    currency: string;
  };
}

/**
 * DTO заказа
 */
export interface OrderDto {
  id: string;
  userId: string;
  routeId: string;
  status: OrderStatus;
  totalPrice: {
    amount: number;
    currency: string;
  };
  passengers: OrderPassengerDto[];
  services: OrderServiceDto[];
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
}

/**
 * DTO ответа создания заказа
 */
export interface CreateOrderResponseDto {
  order: OrderDto;
}

