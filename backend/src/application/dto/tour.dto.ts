import { z } from 'zod';

/**
 * DTO для поиска туров
 */
export const SearchToursDtoSchema = z.object({
  destination: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  durationDays: z.number().int().positive().optional(),
  status: z.enum(['available', 'sold_out', 'cancelled']).optional(),
});

export type SearchToursDto = z.infer<typeof SearchToursDtoSchema>;

/**
 * DTO для создания заказа тура
 */
export const CreateTourOrderDtoSchema = z.object({
  tourId: z.string().uuid(),
  participantsCount: z.number().int().positive(),
  participants: z.array(
    z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      dateOfBirth: z.string().optional(),
    })
  ),
  insuranceIncluded: z.boolean().optional(),
});

export type CreateTourOrderDto = z.infer<typeof CreateTourOrderDtoSchema>;

/**
 * DTO компонента тура
 */
export interface TourComponentDto {
  id: string;
  type: 'accommodation' | 'activity' | 'meal' | 'transport';
  name: string;
  description: string;
  price: {
    amount: number;
    currency: string;
  };
  accommodation?: {
    id: string;
    name: string;
    type: string;
    address: string;
    coordinates: { latitude: number; longitude: number };
    rating?: number;
    amenities?: string[];
  };
  activity?: {
    id: string;
    name: string;
    type: string;
    description: string;
    location: string;
    durationHours?: number;
  };
  meal?: {
    id: string;
    type: string;
    name: string;
    description: string;
  };
}

/**
 * DTO тура
 */
export interface TourDto {
  id: string;
  title: string;
  description: string;
  destination: string;
  durationDays: number;
  price: {
    amount: number;
    currency: string;
  };
  status: 'available' | 'sold_out' | 'cancelled';
  components: TourComponentDto[];
  maxParticipants?: number;
  currentParticipants?: number;
  startDate?: string;
  endDate?: string;
  images?: string[];
  tags?: string[];
  isAvailable: boolean;
}

/**
 * DTO ответа поиска туров
 */
export interface SearchToursResponseDto {
  tours: TourDto[];
  total: number;
}

/**
 * DTO заказа тура
 */
export interface TourOrderDto {
  id: string;
  userId: string;
  tourId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: {
    amount: number;
    currency: string;
  };
  participantsCount: number;
  participants: Array<{
    fullName: string;
    email: string;
    phone?: string;
  }>;
  createdAt?: string;
  confirmedAt?: string;
  insuranceIncluded?: boolean;
}

