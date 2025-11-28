/**
 * Клиент для Яндекс.Погода API
 * 
 * Предоставляет методы для получения данных о погоде через Яндекс.Погода API.
 * Используется как fallback, если OpenWeatherMap недоступен.
 */

import type { ICacheService } from '../../cache/ICacheService';
import { RedisCacheService } from '../../cache/RedisCacheService';

/**
 * Данные о погоде от Яндекс.Погода
 */
export interface YandexWeatherData {
  fact: {
    temp: number;
    feels_like: number;
    condition: string;
    wind_speed: number;
    wind_dir: string;
    pressure_mm: number;
    humidity: number;
    visibility: number;
  };
  forecast: {
    date: string;
    parts: Array<{
      part_name: string;
      temp_min: number;
      temp_max: number;
      condition: string;
      wind_speed: number;
      pressure_mm: number;
      humidity: number;
    }>;
  };
}

/**
 * Клиент для Яндекс.Погода API
 */
export class YandexWeatherClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheService: ICacheService;
  private readonly cacheTTL: number;
  
  constructor(
    apiKey?: string,
    cacheService?: ICacheService,
    baseUrl?: string
  ) {
    this.apiKey = apiKey || process.env.YANDEX_WEATHER_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.weather.yandex.ru/v2';
    this.cacheService = cacheService || new RedisCacheService();
    this.cacheTTL = 24 * 60 * 60;
  }
  
  /**
   * Получить данные о погоде по координатам
   * 
   * @param latitude - Широта
   * @param longitude - Долгота
   * @param date - Дата (опционально)
   * @returns Promise с данными о погоде
   */
  async getWeatherByCoordinates(
    latitude: number,
    longitude: number,
    date?: string
  ): Promise<YandexWeatherData | null> {
    if (!this.apiKey) {
      return null;
    }
    
    const cacheKey = this.buildCacheKey(latitude, longitude, date);
    const cached = await this.cacheService.get<YandexWeatherData>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const url = `${this.baseUrl}/forecast?lat=${latitude}&lon=${longitude}&limit=1`;
      const response = await fetch(url, {
        headers: {
          'X-Yandex-API-Key': this.apiKey,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Yandex Weather API error: ${response.status}`);
      }
      
      const data = await response.json() as YandexWeatherData;
      await this.cacheService.set(cacheKey, data, this.cacheTTL);
      return data;
    } catch (error) {
      console.error('[YandexWeatherClient] Error fetching weather:', error);
      return null;
    }
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
   * Построить ключ кэша
   * 
   * @param latitude - Широта
   * @param longitude - Долгота
   * @param date - Дата (опционально)
   * @returns Ключ кэша
   */
  private buildCacheKey(latitude: number, longitude: number, date?: string): string {
    const datePart = date ? `:${date}` : '';
    return `weather:yandex:${latitude},${longitude}${datePart}`;
  }
}


