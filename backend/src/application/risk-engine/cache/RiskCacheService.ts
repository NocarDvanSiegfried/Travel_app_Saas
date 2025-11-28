/**
 * Сервис кэширования для модуля оценки риска
 * 
 * Предоставляет специализированные методы кэширования с оптимизированными TTL
 * для различных типов данных оценки риска.
 */

import type { ICacheService } from '../../../infrastructure/cache/ICacheService';
import { RedisCacheService } from '../../../infrastructure/cache/RedisCacheService';
import { CacheKeyBuilder } from '../../../infrastructure/cache/CacheKeyBuilder';

/**
 * Конфигурация TTL для различных типов данных
 */
const TTL_CONFIG = {
  /**
   * Оценка риска маршрута (1 час)
   */
  ROUTE_RISK: parseInt(process.env.RISK_CACHE_TTL_ROUTE || '3600', 10),
  
  /**
   * Оценка риска сегмента (30 минут)
   */
  SEGMENT_RISK: parseInt(process.env.RISK_CACHE_TTL_SEGMENT || '1800', 10),
  
  /**
   * Данные о погоде (24 часа)
   */
  WEATHER: parseInt(process.env.RISK_CACHE_TTL_WEATHER || '86400', 10),
  
  /**
   * Дорожные условия (30 минут)
   */
  ROAD_CONDITIONS: parseInt(process.env.RISK_CACHE_TTL_ROAD || '1800', 10),
  
  /**
   * Исторические данные о задержках (6 часов)
   */
  HISTORICAL_DELAYS: parseInt(process.env.RISK_CACHE_TTL_HISTORICAL || '21600', 10),
  
  /**
   * Данные о загруженности (1 час)
   */
  OCCUPANCY: parseInt(process.env.RISK_CACHE_TTL_OCCUPANCY || '3600', 10),
  
  /**
   * Регулярность расписания (12 часов)
   */
  SCHEDULE_REGULARITY: parseInt(process.env.RISK_CACHE_TTL_SCHEDULE || '43200', 10),
};

/**
 * Сервис кэширования для модуля оценки риска
 */
export class RiskCacheService {
  private readonly cacheService: ICacheService;
  
  constructor(cacheService?: ICacheService) {
    this.cacheService = cacheService || new RedisCacheService();
  }
  
  /**
   * Получить оценку риска маршрута из кэша
   * 
   * @param routeId - ID маршрута
   * @returns Promise с оценкой риска или null
   */
  async getRouteRisk<T>(routeId: string): Promise<T | null> {
    const key = CacheKeyBuilder.risk.route(routeId);
    return this.cacheService.get<T>(key);
  }
  
  /**
   * Сохранить оценку риска маршрута в кэш
   * 
   * @param routeId - ID маршрута
   * @param riskAssessment - Оценка риска
   */
  async setRouteRisk<T>(routeId: string, riskAssessment: T): Promise<void> {
    const key = CacheKeyBuilder.risk.route(routeId);
    await this.cacheService.set(key, riskAssessment, TTL_CONFIG.ROUTE_RISK);
  }
  
  /**
   * Получить оценку риска сегмента из кэша
   * 
   * @param segmentId - ID сегмента
   * @returns Promise с оценкой риска или null
   */
  async getSegmentRisk<T>(segmentId: string): Promise<T | null> {
    const key = CacheKeyBuilder.risk.segment(segmentId);
    return this.cacheService.get<T>(key);
  }
  
  /**
   * Сохранить оценку риска сегмента в кэш
   * 
   * @param segmentId - ID сегмента
   * @param riskAssessment - Оценка риска
   */
  async setSegmentRisk<T>(segmentId: string, riskAssessment: T): Promise<void> {
    const key = CacheKeyBuilder.risk.segment(segmentId);
    await this.cacheService.set(key, riskAssessment, TTL_CONFIG.SEGMENT_RISK);
  }
  
  /**
   * Получить данные о погоде из кэша
   * 
   * @param location - Локация (город или координаты)
   * @param date - Дата (опционально)
   * @returns Promise с данными о погоде или null
   */
  async getWeather<T>(location: string, date?: string): Promise<T | null> {
    const key = CacheKeyBuilder.risk.weather(location, date);
    return this.cacheService.get<T>(key);
  }
  
  /**
   * Сохранить данные о погоде в кэш
   * 
   * @param location - Локация (город или координаты)
   * @param weatherData - Данные о погоде
   * @param date - Дата (опционально)
   */
  async setWeather<T>(location: string, weatherData: T, date?: string): Promise<void> {
    const key = CacheKeyBuilder.risk.weather(location, date);
    await this.cacheService.set(key, weatherData, TTL_CONFIG.WEATHER);
  }
  
  /**
   * Получить данные о дорожных условиях из кэша
   * 
   * @param from - Координаты отправления
   * @param to - Координаты назначения
   * @returns Promise с данными о дорожных условиях или null
   */
  async getRoadConditions<T>(
    from: string,
    to: string
  ): Promise<T | null> {
    const key = CacheKeyBuilder.risk.roadConditions(from, to);
    return this.cacheService.get<T>(key);
  }
  
  /**
   * Сохранить данные о дорожных условиях в кэш
   * 
   * @param from - Координаты отправления
   * @param to - Координаты назначения
   * @param roadConditionsData - Данные о дорожных условиях
   */
  async setRoadConditions<T>(
    from: string,
    to: string,
    roadConditionsData: T
  ): Promise<void> {
    const key = CacheKeyBuilder.risk.roadConditions(from, to);
    await this.cacheService.set(key, roadConditionsData, TTL_CONFIG.ROAD_CONDITIONS);
  }
  
  /**
   * Получить исторические данные о задержках из кэша
   * 
   * @param routeId - ID маршрута
   * @param days - Количество дней
   * @returns Promise с историческими данными или null
   */
  async getHistoricalDelays<T>(routeId: string, days: number): Promise<T | null> {
    const key = CacheKeyBuilder.risk.historicalDelays(routeId, days);
    return this.cacheService.get<T>(key);
  }
  
  /**
   * Сохранить исторические данные о задержках в кэш
   * 
   * @param routeId - ID маршрута
   * @param days - Количество дней
   * @param historicalData - Исторические данные
   */
  async setHistoricalDelays<T>(
    routeId: string,
    days: number,
    historicalData: T
  ): Promise<void> {
    const key = CacheKeyBuilder.risk.historicalDelays(routeId, days);
    await this.cacheService.set(key, historicalData, TTL_CONFIG.HISTORICAL_DELAYS);
  }
  
  /**
   * Получить данные о загруженности из кэша
   * 
   * @param segmentId - ID сегмента
   * @param date - Дата
   * @returns Promise с данными о загруженности или null
   */
  async getOccupancy<T>(segmentId: string, date: string): Promise<T | null> {
    const key = CacheKeyBuilder.risk.occupancy(segmentId, date);
    return this.cacheService.get<T>(key);
  }
  
  /**
   * Сохранить данные о загруженности в кэш
   * 
   * @param segmentId - ID сегмента
   * @param date - Дата
   * @param occupancyData - Данные о загруженности
   */
  async setOccupancy<T>(
    segmentId: string,
    date: string,
    occupancyData: T
  ): Promise<void> {
    const key = CacheKeyBuilder.risk.occupancy(segmentId, date);
    await this.cacheService.set(key, occupancyData, TTL_CONFIG.OCCUPANCY);
  }
  
  /**
   * Получить данные о регулярности расписания из кэша
   * 
   * @param routeId - ID маршрута
   * @returns Promise с данными о регулярности или null
   */
  async getScheduleRegularity<T>(routeId: string): Promise<T | null> {
    const key = CacheKeyBuilder.risk.scheduleRegularity(routeId);
    return this.cacheService.get<T>(key);
  }
  
  /**
   * Сохранить данные о регулярности расписания в кэш
   * 
   * @param routeId - ID маршрута
   * @param regularityData - Данные о регулярности
   */
  async setScheduleRegularity<T>(routeId: string, regularityData: T): Promise<void> {
    const key = CacheKeyBuilder.risk.scheduleRegularity(routeId);
    await this.cacheService.set(key, regularityData, TTL_CONFIG.SCHEDULE_REGULARITY);
  }
  
  /**
   * Инвалидировать кэш для маршрута
   * 
   * @param routeId - ID маршрута
   */
  async invalidateRoute(routeId: string): Promise<void> {
    const pattern = CacheKeyBuilder.risk.routePattern(routeId);
    await this.cacheService.deleteByPattern(pattern);
    await this.cacheService.delete(CacheKeyBuilder.risk.route(routeId));
  }
  
  /**
   * Инвалидировать кэш для сегмента
   * 
   * @param segmentId - ID сегмента
   */
  async invalidateSegment(segmentId: string): Promise<void> {
    await this.cacheService.delete(CacheKeyBuilder.risk.segment(segmentId));
  }
  
  /**
   * Инвалидировать весь кэш модуля риска
   */
  async invalidateAll(): Promise<void> {
    const pattern = CacheKeyBuilder.risk.pattern();
    await this.cacheService.deleteByPattern(pattern);
  }
  
  /**
   * Инвалидировать кэш погоды для локации
   * 
   * @param location - Локация
   */
  async invalidateWeather(location: string): Promise<void> {
    const key = CacheKeyBuilder.risk.weather(location);
    await this.cacheService.delete(key);
  }
  
  /**
   * Инвалидировать кэш дорожных условий
   * 
   * @param from - Координаты отправления
   * @param to - Координаты назначения
   */
  async invalidateRoadConditions(from: string, to: string): Promise<void> {
    const key = CacheKeyBuilder.risk.roadConditions(from, to);
    await this.cacheService.delete(key);
  }
}


