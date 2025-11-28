/**
 * Сервис для оценки риска маршрута
 * 
 * @deprecated Используйте RouteRiskService для оценки риска маршрутов
 * Этот класс оставлен для обратной совместимости
 */

import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRiskAssessment } from '../../../domain/entities/RiskAssessment';
import { HistoricalDataCollector } from '../data-collector/HistoricalDataCollector';
import { ScheduleRegularityCollector } from '../data-collector/ScheduleRegularityCollector';
import { WeatherDataCollector } from '../data-collector/WeatherDataCollector';
import { RiskFeatureBuilder } from '../feature-builder/RiskFeatureBuilder';
import type { IRiskModel } from '../risk-model/IRiskModel';
import { RouteRiskService } from './RouteRiskService';

/**
 * @deprecated Используйте RouteRiskService
 */
export class RiskService {
  private readonly routeRiskService: RouteRiskService;
  
  constructor(
    historicalDataCollector: HistoricalDataCollector,
    scheduleRegularityCollector: ScheduleRegularityCollector,
    weatherDataCollector: WeatherDataCollector,
    featureBuilder: RiskFeatureBuilder,
    riskModel: IRiskModel
  ) {
    this.routeRiskService = new RouteRiskService(
      historicalDataCollector,
      scheduleRegularityCollector,
      weatherDataCollector,
      featureBuilder,
      riskModel
    );
  }

  /**
   * Оценить риск маршрута
   * 
   * @deprecated Используйте RouteRiskService.assessRisk()
   */
  async assessRisk(route: IBuiltRoute): Promise<IRiskAssessment> {
    return this.routeRiskService.assessRisk(route);
  }
}

