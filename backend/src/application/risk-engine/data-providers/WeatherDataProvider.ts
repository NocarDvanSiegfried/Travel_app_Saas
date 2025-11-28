/**
 * Провайдер данных о погоде
 * 
 * Получает данные о погоде из различных источников (OpenWeatherMap, Яндекс.Погода)
 * и предоставляет их в едином формате для оценки риска.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type {
  IRiskDataProvider,
  IRiskDataContext,
} from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import { BaseDataProvider } from '../base/BaseDataProvider';
import { OpenWeatherMapClient } from '../../../infrastructure/api/weather/OpenWeatherMapClient';
import { YandexWeatherClient } from '../../../infrastructure/api/weather/YandexWeatherClient';
import { RiskCacheService } from '../cache/RiskCacheService';

/**
 * Данные о погоде для оценки риска
 */
export interface WeatherRiskData {
  /**
   * Уровень риска от погоды (0-1)
   */
  riskLevel: number;
  
  /**
   * Условия погоды
   */
  conditions: string[];
  
  /**
   * Видимость в метрах
   */
  visibility?: number;
  
  /**
   * Скорость ветра в м/с
   */
  windSpeed?: number;
  
  /**
   * Температура
   */
  temperature?: number;
}

/**
 * Провайдер данных о погоде
 */
export class WeatherDataProvider extends BaseDataProvider {
  private readonly openWeatherClient: OpenWeatherMapClient;
  private readonly yandexWeatherClient: YandexWeatherClient;
  private readonly cacheService: RiskCacheService;
  
  constructor() {
    super();
    this.openWeatherClient = new OpenWeatherMapClient();
    this.yandexWeatherClient = new YandexWeatherClient();
    this.cacheService = new RiskCacheService();
  }
  
  /**
   * Получить данные для оценки риска маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными о погоде
   */
  async getDataForRoute(
    route: IBuiltRoute,
    context: IRiskDataContext
  ): Promise<WeatherRiskData> {
    const segments = route.segments || [];
    if (segments.length === 0) {
      return this.getDefaultWeatherData();
    }
    
    const weatherDataArray = await Promise.all(
      segments.map((segmentDetails) => this.getWeatherForSegment(segmentDetails.segment, context))
    );
    
    const maxRiskLevel = Math.max(...weatherDataArray.map((d) => d.riskLevel));
    const allConditions = weatherDataArray.flatMap((d) => d.conditions);
    const uniqueConditions = Array.from(new Set(allConditions));
    
    return {
      riskLevel: maxRiskLevel,
      conditions: uniqueConditions,
    };
  }
  
  /**
   * Получить данные для оценки риска сегмента
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными о погоде
   */
  async getDataForSegment(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<WeatherRiskData> {
    return this.getWeatherForSegment(segment, context);
  }
  
  /**
   * Получить данные о погоде для сегмента
   * 
   * @param segment - Сегмент
   * @param context - Контекст
   * @returns Promise с данными о погоде
   */
  private async getWeatherForSegment(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<WeatherRiskData> {
    const coordinates = await this.getSegmentCoordinates(segment);
    if (!coordinates) {
      return this.getDefaultWeatherData();
    }
    
    const locationKey = `${coordinates.latitude},${coordinates.longitude}`;
    const cached = await this.cacheService.getWeather<WeatherRiskData>(
      locationKey,
      context.date
    );
    if (cached) {
      return cached;
    }
    
    const weatherData = await this.fetchWeatherData(
      coordinates.latitude,
      coordinates.longitude,
      context.date
    );
    
    if (!weatherData) {
      return this.getDefaultWeatherData();
    }
    
    const riskData = this.calculateWeatherRisk(weatherData, segment.transportType);
    await this.cacheService.setWeather(locationKey, riskData, context.date);
    return riskData;
  }
  
  /**
   * Получить координаты сегмента
   * 
   * @param segment - Сегмент
   * @returns Координаты или null
   */
  private async getSegmentCoordinates(
    segment: IRouteSegment
  ): Promise<{ latitude: number; longitude: number } | null> {
    // TODO: Реализовать получение координат из базы данных или кэша
    // Пока возвращаем null для использования дефолтных значений
    return null;
  }
  
  /**
   * Получить данные о погоде из API
   * 
   * @param latitude - Широта
   * @param longitude - Долгота
   * @param date - Дата
   * @returns Promise с данными о погоде
   */
  private async fetchWeatherData(
    latitude: number,
    longitude: number,
    date: string
  ): Promise<unknown> {
    const openWeatherAvailable = await this.openWeatherClient.isAvailable();
    if (openWeatherAvailable) {
      const data = await this.openWeatherClient.getWeatherByCoordinates(
        latitude,
        longitude,
        date
      );
      if (data) {
        return data;
      }
    }
    
    const yandexAvailable = await this.yandexWeatherClient.isAvailable();
    if (yandexAvailable) {
      const data = await this.yandexWeatherClient.getWeatherByCoordinates(
        latitude,
        longitude,
        date
      );
      if (data) {
        return data;
      }
    }
    
    return null;
  }
  
  /**
   * Вычислить уровень риска от погоды
   * 
   * @param weatherData - Данные о погоде
   * @param transportType - Тип транспорта
   * @returns Данные о риске погоды
   */
  private calculateWeatherRisk(
    weatherData: unknown,
    transportType: TransportType
  ): WeatherRiskData {
    const conditions: string[] = [];
    let riskLevel = 0.2;
    
    if (this.isOpenWeatherData(weatherData)) {
      const weather = weatherData.weather[0];
      const main = weatherData.main;
      const wind = weatherData.wind;
      
      conditions.push(weather.description);
      
      if (transportType === TransportType.AIRPLANE) {
        if (main.visibility && main.visibility < 1000) {
          riskLevel = 0.8;
          conditions.push('Низкая видимость');
        }
        if (wind.speed > 15) {
          riskLevel = Math.max(riskLevel, 0.6);
          conditions.push('Сильный ветер');
        }
        if (weather.main === 'Thunderstorm') {
          riskLevel = 0.9;
          conditions.push('Гроза');
        }
        if (weather.main === 'Fog' || weather.main === 'Mist') {
          riskLevel = Math.max(riskLevel, 0.7);
          conditions.push('Туман');
        }
      } else if (transportType === TransportType.TRAIN) {
        if (weather.main === 'Snow') {
          riskLevel = 0.6;
          conditions.push('Снег');
        }
        if (main.temp < -20) {
          riskLevel = Math.max(riskLevel, 0.5);
          conditions.push('Сильный мороз');
        }
      } else if (transportType === TransportType.BUS || transportType === TransportType.TAXI) {
        if (weather.main === 'Rain' || weather.main === 'Drizzle') {
          riskLevel = 0.4;
          conditions.push('Дождь');
        }
        if (weather.main === 'Fog' || weather.main === 'Mist') {
          riskLevel = 0.5;
          conditions.push('Туман');
        }
        if (main.temp < 0 && (weather.main === 'Rain' || weather.main === 'Drizzle')) {
          riskLevel = 0.7;
          conditions.push('Гололёд');
        }
      }
    } else if (this.isYandexWeatherData(weatherData)) {
      const fact = weatherData.fact;
      conditions.push(fact.condition);
      
      if (transportType === TransportType.AIRPLANE) {
        if (fact.visibility < 1000) {
          riskLevel = 0.8;
          conditions.push('Низкая видимость');
        }
        if (fact.wind_speed > 15) {
          riskLevel = Math.max(riskLevel, 0.6);
          conditions.push('Сильный ветер');
        }
      } else if (transportType === TransportType.TRAIN) {
        if (fact.condition.includes('снег')) {
          riskLevel = 0.6;
        }
      } else if (transportType === TransportType.BUS || transportType === TransportType.TAXI) {
        if (fact.condition.includes('дождь')) {
          riskLevel = 0.4;
        }
        if (fact.condition.includes('туман')) {
          riskLevel = 0.5;
        }
      }
    }
    
    return {
      riskLevel,
      conditions,
    };
  }
  
  /**
   * Проверить, является ли данные OpenWeatherMap
   * 
   * @param data - Данные
   * @returns true, если это данные OpenWeatherMap
   */
  private isOpenWeatherData(data: unknown): data is {
    weather: Array<{ main: string; description: string }>;
    main: { visibility?: number; temp: number };
    wind: { speed: number };
  } {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return (
      Array.isArray(obj.weather) &&
      typeof obj.main === 'object' &&
      typeof obj.wind === 'object'
    );
  }
  
  /**
   * Проверить, является ли данные Яндекс.Погода
   * 
   * @param data - Данные
   * @returns true, если это данные Яндекс.Погода
   */
  private isYandexWeatherData(data: unknown): data is {
    fact: {
      condition: string;
      visibility: number;
      wind_speed: number;
    };
  } {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const obj = data as Record<string, unknown>;
    return typeof obj.fact === 'object' && obj.fact !== null;
  }
  
  /**
   * Получить дефолтные данные о погоде
   * 
   * @returns Дефолтные данные
   */
  private getDefaultWeatherData(): WeatherRiskData {
    return {
      riskLevel: 0.2,
      conditions: [],
    };
  }
  
  /**
   * Проверить доступность провайдера
   * 
   * @throws Error, если провайдер недоступен
   */
  protected async checkAvailability(): Promise<void> {
    const openWeatherAvailable = await this.openWeatherClient.isAvailable();
    const yandexAvailable = await this.yandexWeatherClient.isAvailable();
    
    if (!openWeatherAvailable && !yandexAvailable) {
      throw new Error('Weather API providers are not available');
    }
  }
}

