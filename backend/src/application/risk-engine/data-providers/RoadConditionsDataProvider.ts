/**
 * Провайдер данных о дорожных условиях
 * 
 * Получает данные о состоянии дорог, пробках и других факторах,
 * влияющих на безопасность и скорость движения.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import { TransportType } from '../../../domain/entities/RouteSegment';
import type {
  IRiskDataProvider,
  IRiskDataContext,
} from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import { BaseDataProvider } from '../base/BaseDataProvider';
import { YandexRouterClient } from '../../../infrastructure/api/road-conditions/YandexRouterClient';
import { RiskCacheService } from '../cache/RiskCacheService';

/**
 * Данные о дорожных условиях для оценки риска
 */
export interface RoadConditionsRiskData {
  /**
   * Уровень риска от дорожных условий (0-1)
   */
  riskLevel: number;
  
  /**
   * Коэффициент загруженности дорог (0-1)
   */
  trafficCoefficient: number;
  
  /**
   * Условия дороги
   */
  conditions: string[];
  
  /**
   * Ожидаемое время в пути в секундах
   */
  estimatedDuration?: number;
  
  /**
   * Время в пути с учётом пробок в секундах
   */
  durationInTraffic?: number;
}

/**
 * Провайдер данных о дорожных условиях
 */
export class RoadConditionsDataProvider extends BaseDataProvider {
  private readonly routerClient: YandexRouterClient;
  private readonly cacheService: RiskCacheService;
  
  constructor() {
    super();
    this.routerClient = new YandexRouterClient();
    this.cacheService = new RiskCacheService();
  }
  
  /**
   * Получить данные для оценки риска маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными о дорожных условиях
   */
  async getDataForRoute(
    route: IBuiltRoute,
    context: IRiskDataContext
  ): Promise<RoadConditionsRiskData> {
    const segments = route.segments || [];
    if (segments.length === 0) {
      return this.getDefaultRoadConditionsData();
    }
    
    const roadConditionsArray = await Promise.all(
      segments
        .filter((segment) => this.isRoadTransport(segment.segment.transportType))
        .map((segment) => this.getRoadConditionsForSegment(segment.segment, context))
    );
    
    if (roadConditionsArray.length === 0) {
      return this.getDefaultRoadConditionsData();
    }
    
    const maxRiskLevel = Math.max(...roadConditionsArray.map((d) => d.riskLevel));
    const avgTrafficCoefficient = roadConditionsArray.reduce(
      (sum, d) => sum + d.trafficCoefficient,
      0
    ) / roadConditionsArray.length;
    const allConditions = roadConditionsArray.flatMap((d) => d.conditions);
    const uniqueConditions = Array.from(new Set(allConditions));
    
    return {
      riskLevel: maxRiskLevel,
      trafficCoefficient: avgTrafficCoefficient,
      conditions: uniqueConditions,
    };
  }
  
  /**
   * Получить данные для оценки риска сегмента
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с данными о дорожных условиях
   */
  async getDataForSegment(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<RoadConditionsRiskData> {
    if (!this.isRoadTransport(segment.transportType)) {
      return this.getDefaultRoadConditionsData();
    }
    
    return this.getRoadConditionsForSegment(segment, context);
  }
  
  /**
   * Получить данные о дорожных условиях для сегмента
   * 
   * @param segment - Сегмент
   * @param context - Контекст
   * @returns Promise с данными о дорожных условиях
   */
  private async getRoadConditionsForSegment(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<RoadConditionsRiskData> {
    const coordinates = await this.getSegmentCoordinates(segment);
    if (!coordinates) {
      return this.getDefaultRoadConditionsData();
    }
    
    const fromKey = `${coordinates.fromLatitude},${coordinates.fromLongitude}`;
    const toKey = `${coordinates.toLatitude},${coordinates.toLongitude}`;
    const cached = await this.cacheService.getRoadConditions<RoadConditionsRiskData>(
      fromKey,
      toKey
    );
    if (cached) {
      return cached;
    }
    
    const routeData = await this.routerClient.getRoute(
      coordinates.fromLatitude,
      coordinates.fromLongitude,
      coordinates.toLatitude,
      coordinates.toLongitude,
      false
    );
    
    if (!routeData) {
      return this.getDefaultRoadConditionsData();
    }
    
    const trafficCoefficient = this.routerClient.calculateTrafficCoefficient(routeData);
    const riskLevel = this.calculateRoadConditionsRisk(trafficCoefficient, segment.transportType);
    const conditions = this.getRoadConditions(trafficCoefficient);
    
    const route = routeData.routes[0];
    const estimatedDuration = route.duration?.value;
    const durationInTraffic = route.durationInTraffic?.value;
    
    const riskData: RoadConditionsRiskData = {
      riskLevel,
      trafficCoefficient,
      conditions,
      estimatedDuration,
      durationInTraffic,
    };
    
    await this.cacheService.setRoadConditions(fromKey, toKey, riskData);
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
  ): Promise<{
    fromLatitude: number;
    fromLongitude: number;
    toLatitude: number;
    toLongitude: number;
  } | null> {
    // TODO: Реализовать получение координат из базы данных или кэша
    // Пока возвращаем null для использования дефолтных значений
    return null;
  }
  
  /**
   * Вычислить уровень риска от дорожных условий
   * 
   * @param trafficCoefficient - Коэффициент загруженности
   * @param transportType - Тип транспорта
   * @returns Уровень риска (0-1)
   */
  private calculateRoadConditionsRisk(
    trafficCoefficient: number,
    transportType: TransportType
  ): number {
    let baseRisk = trafficCoefficient * 0.6;
    
    if (transportType === TransportType.BUS) {
      baseRisk *= 1.1;
    } else if (transportType === TransportType.TAXI) {
      baseRisk *= 0.9;
    }
    
    if (trafficCoefficient > 0.7) {
      baseRisk = Math.max(baseRisk, 0.7);
    }
    
    return Math.min(1, baseRisk);
  }
  
  /**
   * Получить описание дорожных условий
   * 
   * @param trafficCoefficient - Коэффициент загруженности
   * @returns Массив условий
   */
  private getRoadConditions(trafficCoefficient: number): string[] {
    const conditions: string[] = [];
    
    if (trafficCoefficient > 0.7) {
      conditions.push('Сильные пробки');
    } else if (trafficCoefficient > 0.4) {
      conditions.push('Умеренные пробки');
    } else if (trafficCoefficient > 0.1) {
      conditions.push('Лёгкие пробки');
    } else {
      conditions.push('Свободное движение');
    }
    
    return conditions;
  }
  
  /**
   * Проверить, является ли транспорт дорожным
   * 
   * @param transportType - Тип транспорта
   * @returns true, если транспорт дорожный
   */
  private isRoadTransport(transportType: TransportType): boolean {
    return [TransportType.BUS, TransportType.TAXI, TransportType.WINTER_ROAD].includes(transportType);
  }
  
  /**
   * Получить дефолтные данные о дорожных условиях
   * 
   * @returns Дефолтные данные
   */
  private getDefaultRoadConditionsData(): RoadConditionsRiskData {
    return {
      riskLevel: 0.2,
      trafficCoefficient: 0.2,
      conditions: [],
    };
  }
  
  /**
   * Проверить доступность провайдера
   * 
   * @throws Error, если провайдер недоступен
   */
  protected async checkAvailability(): Promise<void> {
    const available = await this.routerClient.isAvailable();
    if (!available) {
      throw new Error('Road conditions API provider is not available');
    }
  }
}

