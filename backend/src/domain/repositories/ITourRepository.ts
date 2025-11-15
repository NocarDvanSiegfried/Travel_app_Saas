import { Tour } from '../entities/Tour';

/**
 * Интерфейс репозитория туров
 */
export interface ITourRepository {
  /**
   * Поиск туров по критериям
   */
  findTours(criteria: {
    destination?: string;
    minPrice?: number;
    maxPrice?: number;
    durationDays?: number;
    startDate?: Date;
    status?: 'available' | 'sold_out' | 'cancelled';
  }): Promise<Tour[]>;

  /**
   * Получение тура по ID
   */
  findById(id: string): Promise<Tour | null>;

  /**
   * Проверка доступности тура
   */
  checkAvailability(tourId: string, participantsCount: number): Promise<boolean>;

  /**
   * Обновление количества участников
   */
  updateParticipantsCount(tourId: string, delta: number): Promise<void>;
}

