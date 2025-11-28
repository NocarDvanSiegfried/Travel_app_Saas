/**
 * Сервис для оценки риска маршрута
 * 
 * Оценивает риск для всего маршрута, используя данные от провайдеров и факторы риска.
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRiskAssessment } from '../../../domain/entities/RiskAssessment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import { HistoricalDataCollector } from '../data-collector/HistoricalDataCollector';
import { ScheduleRegularityCollector } from '../data-collector/ScheduleRegularityCollector';
import { WeatherDataCollector } from '../data-collector/WeatherDataCollector';
import { RiskFeatureBuilder } from '../feature-builder/RiskFeatureBuilder';
import type { IRiskModel } from '../risk-model/IRiskModel';

/**
 * Сервис для оценки риска маршрута
 */
export class RouteRiskService {
  constructor(
    private readonly historicalDataCollector: HistoricalDataCollector,
    private readonly scheduleRegularityCollector: ScheduleRegularityCollector,
    private readonly weatherDataCollector: WeatherDataCollector,
    private readonly featureBuilder: RiskFeatureBuilder,
    private readonly riskModel: IRiskModel
  ) {}
  
  /**
   * Оценить риск маршрута
   * 
   * @param route - Маршрут для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с оценкой риска маршрута
   */
  async assessRisk(route: IBuiltRoute, context?: IRiskDataContext): Promise<IRiskAssessment> {
    const defaultContext: IRiskDataContext = {
      date: route.date,
      passengers: route.passengers,
    };
    const riskContext = context || defaultContext;
    
    const [
      historicalData,
      scheduleRegularity,
      weatherData,
      seasonality,
    ] = await Promise.all([
      this.historicalDataCollector.collectHistoricalData(route),
      this.scheduleRegularityCollector.calculateRegularity(route),
      this.weatherDataCollector.collectWeatherData(route),
      Promise.resolve(this.featureBuilder.calculateSeasonality(route.date)),
    ]);
    
    const features = this.featureBuilder.buildFeatures(
      route,
      historicalData,
      scheduleRegularity,
      weatherData.riskLevel,
      seasonality
    );
    
    const riskScore = await this.riskModel.predict(features);
    
    const recommendations = this.generateRecommendations(
      features,
      riskScore.value
    );
    
    return {
      routeId: route.routeId,
      riskScore,
      factors: {
        transferCount: features.transferCount ?? 0,
        transportTypes: (features.transportTypes ?? []).map((t) => t.toString()),
        totalDuration: features.totalDuration ?? 0,
        historicalDelays: historicalData.delays,
        cancellations: historicalData.cancellations,
        occupancy: historicalData.occupancy,
        weather: weatherData,
        seasonality,
        scheduleRegularity: scheduleRegularity ?? 0,
      },
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }
  
  /**
   * Сгенерировать рекомендации на основе оценки риска
   * 
   * @param features - Признаки маршрута
   * @param riskScore - Оценка риска
   * @returns Массив рекомендаций
   */
  private generateRecommendations(
    features: {
      transferCount?: number;
      hasFerry?: boolean;
      hasRiverTransport?: boolean;
      averageOccupancy?: number;
      scheduleRegularity?: number;
      cancellationRate90?: number;
    },
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskScore >= 7) {
      recommendations.push(
        'Рекомендуем оформить страховку на случай задержек и отмен'
      );
    }
    
    const transferCount = features.transferCount ?? 0;
    if (transferCount > 2) {
      recommendations.push(
        'Маршрут содержит много пересадок, рекомендуем прибыть заранее'
      );
    }
    
    if (features.hasFerry || features.hasRiverTransport) {
      recommendations.push(
        'Маршрут включает водный транспорт, возможны задержки из-за погоды'
      );
    }
    
    const averageOccupancy = features.averageOccupancy ?? 0;
    if (averageOccupancy > 0.9) {
      recommendations.push('Высокая загруженность, бронируйте места заранее');
    }
    
    const scheduleRegularity = features.scheduleRegularity ?? 1;
    if (scheduleRegularity < 0.6) {
      recommendations.push(
        'Нерегулярное расписание, уточняйте актуальное время отправления'
      );
    }
    
    const cancellationRate90 = features.cancellationRate90 ?? 0;
    if (cancellationRate90 > 0.1) {
      recommendations.push(
        'Высокий процент отмен на данном направлении, рассмотрите альтернативы'
      );
    }
    
    return recommendations;
  }
}

