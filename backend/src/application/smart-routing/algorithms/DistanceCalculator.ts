/**
 * Калькулятор расстояний для разных типов транспорта
 * 
 * Использует различные методы расчёта в зависимости от типа транспорта:
 * - Haversine для авиа (расстояние по прямой)
 * - OSRM для автобусов (расстояние по дорогам)
 * - River Path для паромов (расстояние по рекам)
 * - Rail Path для ЖД (расстояние по железным дорогам)
 * - Manual для фиксированных маршрутов (зимники)
 */

import { DistanceCalculationMethod } from '../../../domain/smart-routing/enums/DistanceCalculationMethod';
import type { DistanceModel } from '../../../domain/smart-routing/value-objects/DistanceModel';
import { createDistanceModel } from '../../../domain/smart-routing/value-objects/DistanceModel';
import type { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type { CityConnection } from '../../../domain/smart-routing/data/connections-model';

/**
 * Интерфейс ответа OSRM API
 */
interface OSRMResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
  }>;
  message?: string;
}

/**
 * Type guard для проверки структуры ответа OSRM API
 */
function isOSRMResponse(data: unknown): data is OSRMResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const response = data as Record<string, unknown>;
  
  // Проверяем обязательное поле code
  if (typeof response.code !== 'string') {
    return false;
  }
  
  // Если есть routes, проверяем его структуру
  if (response.routes !== undefined) {
    if (!Array.isArray(response.routes)) {
      return false;
    }
    
    // Проверяем первый элемент массива routes, если он есть
    if (response.routes.length > 0) {
      const route = response.routes[0] as Record<string, unknown>;
      if (typeof route.distance !== 'number') {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Калькулятор расстояний
 */
export class DistanceCalculator {
  /**
   * Вычисляет расстояние между двумя точками по формуле Haversine
   */
  public calculateHaversineDistance(
    from: Coordinates,
    to: Coordinates
  ): number {
    const R = 6371; // Радиус Земли в километрах
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLon = this.toRad(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.latitude)) *
        Math.cos(this.toRad(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Вычисляет расстояние по дорогам через OSRM API
   * 
   * @param from - Координаты отправления
   * @param to - Координаты назначения
   * @returns Расстояние в километрах
   */
  public async calculateOSRMDistance(
    from: Coordinates,
    to: Coordinates
  ): Promise<number> {
    try {
      // Используем публичный OSRM сервер для демо
      // В продакшене должен быть свой OSRM сервер
      const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false&alternatives=false&steps=false`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OSRM API error: ${response.status}`);
      }

      const data: unknown = await response.json();
      
      // Проверяем структуру ответа с помощью type guard
      if (!isOSRMResponse(data)) {
        console.warn('[DistanceCalculator] Некорректный ответ от OSRM API');
        return this.calculateHaversineDistance(from, to);
      }
      
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        // Fallback на Haversine, если OSRM недоступен
        return this.calculateHaversineDistance(from, to);
      }

      // Расстояние в метрах, преобразуем в километры
      const distanceMeters = data.routes[0].distance;
      return distanceMeters / 1000;
    } catch (error) {
      console.warn(`[DistanceCalculator] OSRM недоступен, используем Haversine:`, error);
      // Fallback на Haversine
      return this.calculateHaversineDistance(from, to);
    }
  }

  /**
   * Вычисляет расстояние по реке (упрощённая модель)
   * 
   * Для паромов расстояние по реке обычно больше, чем по прямой,
   * из-за извилистости русла. Используем коэффициент 1.2-1.5
   * 
   * @param from - Координаты отправления
   * @param to - Координаты назначения
   * @param riverName - Название реки (Лена, Алдан, Вилюй) для определения коэффициента
   * @param connection - Соединение для получения расстояния из справочника (если есть)
   * @returns Расстояние в километрах
   */
  public calculateRiverDistance(
    from: Coordinates,
    to: Coordinates,
    riverName?: string,
    connection?: CityConnection
  ): number {
    // Если есть соединение из справочника, используем его расстояние (уже учитывает извилистость)
    if (connection?.distance && connection.distance > 0) {
      return connection.distance;
    }
    
    // Иначе вычисляем с учётом коэффициента извилистости реки
    const straightDistance = this.calculateHaversineDistance(from, to);
    
    // Определяем коэффициент извилистости в зависимости от реки
    let riverCoefficient = 1.2; // По умолчанию
    if (riverName === 'Лена' || riverName === 'Вилюй') {
      riverCoefficient = 1.18; // Средняя извилистость
    } else if (riverName === 'Алдан') {
      riverCoefficient = 1.25; // Высокая извилистость
    }
    
    // Учитываем извилистость русла реки
    return straightDistance * riverCoefficient;
  }

  /**
   * Вычисляет расстояние по железной дороге
   * 
   * Для ЖД расстояние обычно близко к прямому, но может быть больше
   * из-за обходов. Используем коэффициент 1.1-1.2
   * 
   * @param from - Координаты отправления
   * @param to - Координаты назначения
   * @param railCoefficient - Коэффициент обходов (по умолчанию 1.15)
   * @returns Расстояние в километрах
   */
  public calculateRailDistance(
    from: Coordinates,
    to: Coordinates,
    railCoefficient: number = 1.15
  ): number {
    const straightDistance = this.calculateHaversineDistance(from, to);
    // Учитываем обходы железной дороги
    return straightDistance * railCoefficient;
  }

  /**
   * Создаёт модель расстояния для сегмента маршрута
   * 
   * @param transportType - Тип транспорта
   * @param from - Координаты отправления
   * @param to - Координаты назначения
   * @param connection - Соединение из справочника (опционально, для точных данных)
   * @returns Модель расстояния
   */
  public async calculateDistanceForSegment(
    transportType: TransportType,
    from: Coordinates,
    to: Coordinates,
    connection?: CityConnection
  ): Promise<DistanceModel> {
    // Если есть соединение из справочника, используем его расстояние
    if (connection && connection.distance > 0) {
      return this.createDistanceModelFromConnection(transportType, connection);
    }

    // Иначе вычисляем по типу транспорта
    let distance: number;
    let method: DistanceCalculationMethod;
    const breakdown: DistanceModel['breakdown'] = {
      airplane: 0,
      train: 0,
      bus: 0,
      ferry: 0,
      winter_road: 0,
      taxi: 0,
    };

    switch (transportType) {
      case TransportType.AIRPLANE:
        distance = this.calculateHaversineDistance(from, to);
        method = DistanceCalculationMethod.HAVERSINE;
        breakdown.airplane = distance;
        break;

      case TransportType.BUS:
        distance = await this.calculateOSRMDistance(from, to);
        method = DistanceCalculationMethod.OSRM;
        breakdown.bus = distance;
        break;

      case TransportType.TRAIN:
        distance = this.calculateRailDistance(from, to);
        method = DistanceCalculationMethod.RAIL_PATH;
        breakdown.train = distance;
        break;

      case TransportType.FERRY:
        // Получаем название реки из connection для правильного коэффициента
        const riverName = connection?.metadata?.river as string | undefined;
        distance = this.calculateRiverDistance(from, to, riverName, connection);
        method = DistanceCalculationMethod.RIVER_PATH;
        breakdown.ferry = distance;
        break;

      case TransportType.TAXI:
        // Для такси используем OSRM (городские дороги)
        distance = await this.calculateOSRMDistance(from, to);
        method = DistanceCalculationMethod.OSRM;
        breakdown.taxi = distance;
        break;

      default:
        // Fallback на Haversine
        distance = this.calculateHaversineDistance(from, to);
        method = DistanceCalculationMethod.HAVERSINE;
    }

    return createDistanceModel(distance, method, breakdown);
  }

  /**
   * Создаёт модель расстояния из соединения
   */
  private createDistanceModelFromConnection(
    transportType: TransportType,
    connection: CityConnection
  ): DistanceModel {
    const breakdown: DistanceModel['breakdown'] = {
      airplane: 0,
      train: 0,
      bus: 0,
      ferry: 0,
      winter_road: 0,
      taxi: 0,
    };

    let method: DistanceCalculationMethod;

    switch (transportType) {
      case TransportType.AIRPLANE:
        method = DistanceCalculationMethod.HAVERSINE;
        breakdown.airplane = connection.distance;
        break;
      case TransportType.TRAIN:
        method = DistanceCalculationMethod.RAIL_PATH;
        breakdown.train = connection.distance;
        break;
      case TransportType.BUS:
        method = DistanceCalculationMethod.OSRM;
        breakdown.bus = connection.distance;
        break;
      case TransportType.FERRY:
        method = DistanceCalculationMethod.RIVER_PATH;
        breakdown.ferry = connection.distance;
        break;
      default:
        method = DistanceCalculationMethod.MANUAL;
        breakdown[transportType as keyof typeof breakdown] = connection.distance;
    }

    return createDistanceModel(connection.distance, method, breakdown);
  }

  /**
   * Преобразует градусы в радианы
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

