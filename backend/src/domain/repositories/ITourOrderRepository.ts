import { TourOrder } from '../entities/TourOrder';

/**
 * Интерфейс репозитория заказов туров
 */
export interface ITourOrderRepository {
  /**
   * Создание заказа тура
   */
  create(order: TourOrder): Promise<TourOrder>;

  /**
   * Получение заказа по ID
   */
  findById(id: string): Promise<TourOrder | null>;

  /**
   * Получение заказов пользователя
   */
  findByUserId(userId: string): Promise<TourOrder[]>;

  /**
   * Обновление заказа
   */
  update(order: TourOrder): Promise<TourOrder>;
}

