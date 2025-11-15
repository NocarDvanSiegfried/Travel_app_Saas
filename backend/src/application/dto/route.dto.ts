import { z } from 'zod';
import { TransportType } from '@domain/entities/RouteSegment';
import { RoutePreferenceType as SimpleRoutePreferenceType } from '@domain/value-objects/RoutePreference';

/**
 * DTO для поиска маршрутов
 */
export const SearchRoutesDtoSchema = z.object({
  from: z.string().min(1, 'Origin city is required'),
  to: z.string().min(1, 'Destination city is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  preference: z.enum(['fast', 'cheap', 'reliable']).optional(),
});

export type SearchRoutesDto = z.infer<typeof SearchRoutesDtoSchema>;

/**
 * DTO координат
 */
export interface CoordinatesDto {
  latitude: number;
  longitude: number;
}

/**
 * DTO сегмента маршрута
 */
export interface RouteSegmentDto {
  id: string;
  transportType: TransportType;
  fromCity: string;
  toCity: string;
  fromCoordinates: CoordinatesDto;
  toCoordinates: CoordinatesDto;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  price: {
    amount: number;
    currency: string;
  };
  carrier?: string;
  vehicleNumber?: string;
}

/**
 * DTO маршрута
 */
export interface RouteDto {
  id: string;
  fromCity: string;
  toCity: string;
  segments: RouteSegmentDto[];
  totalPrice: {
    amount: number;
    currency: string;
  };
  totalDurationMinutes: number;
  transfersCount: number;
  riskScore?: number;
  status: 'available' | 'unavailable';
}

/**
 * DTO ответа поиска маршрутов
 */
export interface SearchRoutesResponseDto {
  routes: RouteDto[];
  total: number;
}

/**
 * DTO деталей маршрута
 */
export interface RouteDetailsDto extends RouteDto {
  // Дополнительные детали для детального просмотра
}

/**
 * DTO для получения рекомендаций маршрутов
 */
export const GetRouteRecommendationsDtoSchema = z.object({
  fromCity: z.string().min(1, 'Origin city is required'),
  toCity: z.string().min(1, 'Destination city is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  preference: z.enum(['fastest', 'cheapest', 'most_reliable']).optional(),
  userId: z.string().uuid().optional(),
});

export type GetRouteRecommendationsDto = z.infer<typeof GetRouteRecommendationsDtoSchema>;

/**
 * DTO упрощенного маршрута для рекомендаций
 */
export interface RouteRecommendationRouteDto {
  id: string;
  fromCity: string;
  toCity: string;
  segments: Array<{
    id: string;
    transportType: TransportType;
    fromCity: string;
    toCity: string;
    departureTime: string;
    arrivalTime: string;
    price: {
      amount: number;
      currency: string;
    };
    carrier?: string;
    vehicleNumber?: string;
  }>;
  totalPrice: {
    amount: number;
    currency: string;
  };
  totalDurationMinutes: number;
  transfersCount: number;
  riskScore?: number;
  status: 'available' | 'unavailable';
}

/**
 * DTO рекомендации маршрута
 */
export interface RouteRecommendationDto {
  id: string;
  route: RouteRecommendationRouteDto;
  score: number;
  explanation: string;
  reasons: string[];
  personalizedFactors?: {
    userPreferences?: string[];
    travelHistory?: string[];
    riskTolerance?: 'low' | 'medium' | 'high';
  };
}

/**
 * DTO ответа с рекомендациями
 */
export interface RouteRecommendationResponseDto {
  recommendations: RouteRecommendationDto[];
  message: string;
}

