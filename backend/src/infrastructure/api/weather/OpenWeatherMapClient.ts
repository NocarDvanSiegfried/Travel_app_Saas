/**
 * Клиент для OpenWeatherMap API
 * 
 * Предоставляет методы для получения данных о погоде через OpenWeatherMap API.
 * Поддерживает кэширование и обработку ошибок.
 */

import type { ICacheService } from '../../cache/ICacheService';
import { RedisCacheService } from '../../cache/RedisCacheService';

/**
 * Данные о погоде от OpenWeatherMap
 */
export interface OpenWeatherMapData {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    visibility?: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  name: string;
}

/**
 * Клиент для OpenWeatherMap API
 */
export class OpenWeatherMapClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cacheService: ICacheService;
  private readonly cacheTTL: number;
  
  constructor(
    apiKey?: string,
    cacheService?: ICacheService,
    baseUrl?: string
  ) {
    this.apiKey = apiKey || process.env.OPENWEATHERMAP_API_KEY || '';
    this.baseUrl = baseUrl || 'https://api.openweathermap.org/data/2.5';
    this.cacheService = cacheService || new RedisCacheService();
    this.cacheTTL = 24 * 60 * 60;
  }
  
  /**
   * Получить данные о погоде для города
   * 
   * @param cityName - Название города
   * @param date - Дата (опционально, для прогноза)
   * @returns Promise с данными о погоде
   */
  async getWeatherByCity(
    cityName: string,
    date?: string
  ): Promise<OpenWeatherMapData | null> {
    if (!this.apiKey) {
      return null;
    }
    
    const cacheKey = this.buildCacheKey('city', cityName, date);
    const cached = await this.cacheService.get<OpenWeatherMapData>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const url = this.buildWeatherUrl(cityName, date);
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`OpenWeatherMap API error: ${response.status}`);
      }
      
      const data = await response.json() as OpenWeatherMapData;
      await this.cacheService.set(cacheKey, data, this.cacheTTL);
      return data;
    } catch (error) {
      console.error('[OpenWeatherMapClient] Error fetching weather:', error);
      return null;
    }
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
  ): Promise<OpenWeatherMapData | null> {
    if (!this.apiKey) {
      return null;
    }
    
    const cacheKey = this.buildCacheKey('coord', `${latitude},${longitude}`, date);
    const cached = await this.cacheService.get<OpenWeatherMapData>(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const url = this.buildCoordinatesUrl(latitude, longitude, date);
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`OpenWeatherMap API error: ${response.status}`);
      }
      
      const data = await response.json() as OpenWeatherMapData;
      await this.cacheService.set(cacheKey, data, this.cacheTTL);
      return data;
    } catch (error) {
      console.error('[OpenWeatherMapClient] Error fetching weather:', error);
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
   * Построить URL для запроса погоды по городу
   * 
   * @param cityName - Название города
   * @param date - Дата (опционально)
   * @returns URL для запроса
   */
  private buildWeatherUrl(cityName: string, date?: string): string {
    const encodedCity = encodeURIComponent(cityName);
    if (date) {
      return `${this.baseUrl}/forecast?q=${encodedCity}&appid=${this.apiKey}&units=metric&lang=ru`;
    }
    return `${this.baseUrl}/weather?q=${encodedCity}&appid=${this.apiKey}&units=metric&lang=ru`;
  }
  
  /**
   * Построить URL для запроса погоды по координатам
   * 
   * @param latitude - Широта
   * @param longitude - Долгота
   * @param date - Дата (опционально)
   * @returns URL для запроса
   */
  private buildCoordinatesUrl(
    latitude: number,
    longitude: number,
    date?: string
  ): string {
    if (date) {
      return `${this.baseUrl}/forecast?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&lang=ru`;
    }
    return `${this.baseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&lang=ru`;
  }
  
  /**
   * Построить ключ кэша
   * 
   * @param type - Тип запроса
   * @param identifier - Идентификатор (город или координаты)
   * @param date - Дата (опционально)
   * @returns Ключ кэша
   */
  private buildCacheKey(type: string, identifier: string, date?: string): string {
    const datePart = date ? `:${date}` : '';
    return `weather:openweathermap:${type}:${identifier}${datePart}`;
  }
}

