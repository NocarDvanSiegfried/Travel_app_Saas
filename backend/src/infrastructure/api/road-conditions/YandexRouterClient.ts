/**
 * Клиент для Яндекс.Маршрутизатора API
 * 
 * Предоставляет методы для получения данных о дорожных условиях через Яндекс.Маршрутизатор API.
 * Используется для оценки состояния дорог и пробок.
 */

import type { ICacheService } from '../../cache/ICacheService';
import { RedisCacheService } from '../../cache/RedisCacheService';

/**
 * Данные о маршруте от Яндекс.Маршрутизатора
 */
export interface YandexRouterData {
  routes: Array<{
    distance: {
      value: number;
      text: string;
    };
    duration: {
      value: number;
      text: string;
    };
    durationInTraffic?: {
      value: number;
      text: string;
    };
    legs: Array<{
      distance: {
        value: number;
        text: string;
      };
      duration: {
        value: number;
        text: string;
      };
      durationInTraffic?: {
        value: number;
        text: string;
      };
      steps: Array<{
        distance: {
          value: number;
          text: string;
        };
        duration: {
          value: number;
          text: string;
        };
        durationInTraffic?: {
          value: number;
          text: string;
        };
        polyline: {
          points: string;
        };
      }>;
    }>;
  }>;
}

/**
 * Клиент для Яндекс.Маршрутизатора API
 */
export class YandexRouterClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheService: ICacheService;
  private readonly cacheTTL: number;
  
  constructor(
    apiKey?: string,
    cacheService?: ICacheService,
    baseUrl?: string
  ) {
    this.apiKey = apiKey || process.env.YANDEX_ROUTER_API_KEY || '';
    this.baseUrl = baseUrl || 'https://router.api.2gis.com';
    this.cacheService = cacheService || new RedisCacheService();
    this.cacheTTL = 30 * 60;
  }
  
  /**
   * Получить данные о маршруте между двумя точками
   * 
   * @param fromLatitude - Широта точки отправления
   * @param fromLongitude - Долгота точки отправления
   * @param toLatitude - Широта точки назначения
   * @param toLongitude - Долгота точки назначения
   * @param avoidTrafficJams - Избегать пробок (по умолчанию false)
   * @returns Promise с данными о маршруте
   */
  async getRoute(
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number,
    avoidTrafficJams = false
  ): Promise<YandexRouterData | null> {
    if (!this.apiKey) {
      return null;
    }
    
    const cacheKey = this.buildCacheKey(
      fromLatitude,
      fromLongitude,
      toLatitude,
      toLongitude,
      avoidTrafficJams
    );
    const cached = await this.cacheService.get<YandexRouterData>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const url = this.buildRouteUrl(
        fromLatitude,
        fromLongitude,
        toLatitude,
        toLongitude,
        avoidTrafficJams
      );
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Yandex Router API error: ${response.status}`);
      }
      
      const data = await response.json() as YandexRouterData;
      await this.cacheService.set(cacheKey, data, this.cacheTTL);
      return data;
    } catch (error) {
      console.error('[YandexRouterClient] Error fetching route:', error);
      return null;
    }
  }
  
  /**
   * Вычислить коэффициент загруженности дорог
   * 
   * @param routeData - Данные о маршруте
   * @returns Коэффициент загруженности (0-1, где 1 - максимальная загруженность)
   */
  calculateTrafficCoefficient(routeData: YandexRouterData): number {
    if (!routeData.routes || routeData.routes.length === 0) {
      return 0;
    }
    
    const route = routeData.routes[0];
    if (!route.durationInTraffic || !route.duration) {
      return 0;
    }
    
    const baseDuration = route.duration.value;
    const trafficDuration = route.durationInTraffic.value;
    
    if (baseDuration === 0) {
      return 0;
    }
    
    const delayRatio = (trafficDuration - baseDuration) / baseDuration;
    return Math.min(1, Math.max(0, delayRatio));
  }
  
  /**
   * Проверить доступность API
   * 
   * @returns true, если API доступен
   */
  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }
  
  /**
   * Построить URL для запроса маршрута
   * 
   * @param fromLatitude - Широта точки отправления
   * @param fromLongitude - Долгота точки отправления
   * @param toLatitude - Широта точки назначения
   * @param toLongitude - Долгота точки назначения
   * @param avoidTrafficJams - Избегать пробок
   * @returns URL для запроса
   */
  private buildRouteUrl(
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number,
    avoidTrafficJams: boolean
  ): string {
    const waypoints = `${fromLongitude},${fromLatitude};${toLongitude},${toLatitude}`;
    const routingMode = avoidTrafficJams ? 'fastest' : 'shortest';
    return `${this.baseUrl}/route?waypoints=${waypoints}&routing_mode=${routingMode}&output_format=json`;
  }
  
  /**
   * Построить ключ кэша
   * 
   * @param fromLatitude - Широта точки отправления
   * @param fromLongitude - Долгота точки отправления
   * @param toLatitude - Широта точки назначения
   * @param toLongitude - Долгота точки назначения
   * @param avoidTrafficJams - Избегать пробок
   * @returns Ключ кэша
   */
  private buildCacheKey(
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number,
    avoidTrafficJams: boolean
  ): string {
    const trafficPart = avoidTrafficJams ? ':no-traffic' : ':traffic';
    return `road:yandex-router:${fromLatitude},${fromLongitude}:${toLatitude},${toLongitude}${trafficPart}`;
  }
}

