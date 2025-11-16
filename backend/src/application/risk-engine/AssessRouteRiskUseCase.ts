/**
 * Use Case для оценки риска маршрута
 */

import { IBuiltRoute } from '../../domain/entities/BuiltRoute';
import { IRiskAssessment, RiskLevel } from '../../domain/entities/RiskAssessment';
import { RiskService } from './risk-service/RiskService';
import { HistoricalDataCollector } from './data-collector/HistoricalDataCollector';
import { ScheduleRegularityCollector } from './data-collector/ScheduleRegularityCollector';
import { WeatherDataCollector } from './data-collector/WeatherDataCollector';
import { RiskFeatureBuilder } from './feature-builder/RiskFeatureBuilder';
import { RuleBasedRiskModel } from './risk-model/RuleBasedRiskModel';
import { createODataClient } from '../../infrastructure/api/odata-client';
import {
  FlightsService,
  RoutesService,
  ScheduleService,
  SeatOccupancyService,
} from '../../infrastructure/api/odata-client';

export class AssessRouteRiskUseCase {
  private riskService: RiskService | null = null;

  constructor() {
    try {
      const odataClient = createODataClient();
      if (!odataClient) {
        return;
      }

      const flightsService = new FlightsService(odataClient);
      const routesService = new RoutesService(odataClient);
      const scheduleService = new ScheduleService(odataClient);
      const seatOccupancyService = new SeatOccupancyService(odataClient);

    const historicalDataCollector = new HistoricalDataCollector(
      flightsService,
      routesService,
      scheduleService,
      seatOccupancyService
    );

    const scheduleRegularityCollector = new ScheduleRegularityCollector(
      scheduleService
    );

    const weatherDataCollector = new WeatherDataCollector();
    const featureBuilder = new RiskFeatureBuilder();
    const riskModel = new RuleBasedRiskModel();

      this.riskService = new RiskService(
        historicalDataCollector,
        scheduleRegularityCollector,
        weatherDataCollector,
        featureBuilder,
        riskModel
      );
    } catch (error) {
      // OData client не создан, будет использоваться fallback
    }
  }

  /**
   * Выполнить оценку риска маршрута
   */
  async execute(route: IBuiltRoute): Promise<IRiskAssessment> {
    // Если riskService не инициализирован, возвращаем дефолтную оценку
    if (!this.riskService) {
      return {
        routeId: route.routeId,
        riskScore: {
          value: 5,
          level: RiskLevel.MEDIUM,
          description: 'Средний риск (оценка по умолчанию, OData недоступен)',
        },
        factors: {
          transferCount: route.transferCount || 0,
          transportTypes: route.transportTypes || [],
          totalDuration: route.totalDuration || 0,
          historicalDelays: {
            averageDelay30Days: 0,
            averageDelay60Days: 0,
            averageDelay90Days: 0,
            delayFrequency: 0,
          },
          cancellations: {
            cancellationRate30Days: 0,
            cancellationRate60Days: 0,
            cancellationRate90Days: 0,
            totalCancellations: 0,
          },
          occupancy: {
            averageOccupancy: 0,
            highOccupancySegments: 0,
            lowAvailabilitySegments: 0,
          },
          seasonality: {
            month: new Date(route.date).getMonth() + 1,
            dayOfWeek: new Date(route.date).getDay(),
            seasonFactor: 1,
          },
          scheduleRegularity: 0,
        },
        recommendations: ['OData API недоступен. Используется оценка по умолчанию.'],
      };
    }

    try {
      return await this.riskService.assessRisk(route);
    } catch (error) {
      // Возвращаем дефолтную оценку при ошибке
      return {
        routeId: route.routeId,
        riskScore: {
          value: 5,
          level: RiskLevel.MEDIUM,
          description: 'Средний риск (ошибка при оценке)',
        },
        factors: {
          transferCount: route.transferCount || 0,
          transportTypes: route.transportTypes || [],
          totalDuration: route.totalDuration || 0,
          historicalDelays: {
            averageDelay30Days: 0,
            averageDelay60Days: 0,
            averageDelay90Days: 0,
            delayFrequency: 0,
          },
          cancellations: {
            cancellationRate30Days: 0,
            cancellationRate60Days: 0,
            cancellationRate90Days: 0,
            totalCancellations: 0,
          },
          occupancy: {
            averageOccupancy: 0,
            highOccupancySegments: 0,
            lowAvailabilitySegments: 0,
          },
          seasonality: {
            month: new Date(route.date).getMonth() + 1,
            dayOfWeek: new Date(route.date).getDay(),
            seasonFactor: 1,
          },
          scheduleRegularity: 0,
        },
        recommendations: ['Ошибка при оценке риска. Используется оценка по умолчанию.'],
      };
    }
  }
}

