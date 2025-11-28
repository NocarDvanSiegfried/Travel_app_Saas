/**
 * Сервис для оценки риска сегментов маршрута
 * 
 * Оценивает риск для отдельных сегментов маршрута с использованием факторов риска.
 */

import type { IRouteSegment } from '../../../domain/entities/RouteSegment';
import type { IRiskScore, ISegmentRiskFactors } from '../../../domain/entities/RiskAssessment';
import type { IRiskDataContext } from '../../../domain/interfaces/risk-engine/IRiskDataProvider';
import { RiskLevel } from '../../../domain/entities/RiskAssessment';
import { RiskFactorFactory } from '../risk-factors/RiskFactorFactory';
import { UnifiedRiskCalculator } from '../risk-calculator/UnifiedRiskCalculator';
import { WeatherDataProvider } from '../data-providers/WeatherDataProvider';
import { HistoricalDataCollector } from '../data-collector/HistoricalDataCollector';
import { ScheduleRegularityCollector } from '../data-collector/ScheduleRegularityCollector';
import { RiskContext } from '../base/RiskContext';

/**
 * Сервис для оценки риска сегментов маршрута
 */
export class SegmentRiskService {
  private readonly riskCalculator: UnifiedRiskCalculator;
  private readonly weatherProvider: WeatherDataProvider;
  
  constructor() {
    this.riskCalculator = new UnifiedRiskCalculator();
    this.weatherProvider = new WeatherDataProvider();
    RiskFactorFactory.initialize();
  }
  
  /**
   * Оценить риск для сегмента маршрута
   * 
   * @param segment - Сегмент для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с оценкой риска сегмента (включая factors)
   */
  async assessSegmentRisk(
    segment: IRouteSegment,
    context: IRiskDataContext
  ): Promise<IRiskScore> {
    try {
      // Получаем факторы риска для типа транспорта
      const factors = RiskFactorFactory.getFactorsForTransportType(segment.transportType);
      
      // Собираем данные для факторов
      const dataMap = new Map<string, unknown>();
      
      // Погода
      try {
        const weatherData = await this.weatherProvider.getDataForSegment(segment, context);
        dataMap.set('weather', {
          riskLevel: weatherData.riskLevel,
          conditions: weatherData.conditions || [],
          visibility: weatherData.visibility,
          windSpeed: weatherData.windSpeed,
          temperature: weatherData.temperature,
        });
      } catch (error) {
        console.warn('[SegmentRiskService] Failed to get weather data:', error);
        dataMap.set('weather', { riskLevel: 0.2, conditions: [] });
      }
      
      // Исторические данные (заглушки, так как нужен доступ к OData)
      dataMap.set('historicalDelay', 0);
      dataMap.set('delayFrequency', 0);
      dataMap.set('cancellationRate', 0);
      dataMap.set('occupancy', 0.5);
      dataMap.set('availableSeats', undefined);
      dataMap.set('scheduleRegularity', 0.8);
      
      // Вычисляем результаты факторов
      const factorResults = await Promise.all(
        factors.map((factor) => factor.calculateForSegment(segment, context, dataMap))
      );
      
      // Вычисляем итоговый риск
      const riskScore = await this.riskCalculator.calculate(factorResults);
      
      // Собираем факторы для возврата
      const factorsData: ISegmentRiskFactors = {
        weather: dataMap.get('weather') as ISegmentRiskFactors['weather'] | undefined,
        delays: {
          avg30: 0,
          avg60: 0,
          avg90: 0,
          delayFreq: 0,
        },
        cancellations: {
          rate30: 0,
          rate60: 0,
          rate90: 0,
          total: 0,
        },
        occupancy: {
          avg: 0.5,
          highLoadPercent: 0,
        },
        seasonality: {
          month: new Date(context.date).getMonth() + 1,
          riskFactor: 1,
        },
        schedule: {
          regularityScore: 0.8,
        },
      };
      
      // Если есть данные о погоде, обновляем factors
      const weatherData = dataMap.get('weather') as any;
      if (weatherData) {
        factorsData.weather = {
          temperature: weatherData.temperature,
          visibility: weatherData.visibility,
          wind: weatherData.windSpeed,
          storms: weatherData.conditions?.some((c: string) => 
            c.toLowerCase().includes('гроза') || 
            c.toLowerCase().includes('storm') ||
            c.toLowerCase().includes('шторм')
          ),
        };
      }
      
      return {
        ...riskScore,
        factors: factorsData,
      };
    } catch (error) {
      console.error('[SegmentRiskService] Error assessing segment risk:', error);
      // Возвращаем дефолтную оценку с пустыми факторами
      return {
        value: 5,
        level: RiskLevel.MEDIUM,
        description: 'Средний риск (оценка по умолчанию)',
        factors: {
          weather: undefined,
          delays: { avg30: 0, avg60: 0, avg90: 0, delayFreq: 0 },
          cancellations: { rate30: 0, rate60: 0, rate90: 0, total: 0 },
          occupancy: { avg: 0, highLoadPercent: 0 },
          seasonality: {
            month: new Date(context.date).getMonth() + 1,
            riskFactor: 1,
          },
          schedule: { regularityScore: 0 },
        },
      };
    }
  }
  
  /**
   * Оценить риск для нескольких сегментов параллельно
   * 
   * @param segments - Сегменты для оценки
   * @param context - Контекст оценки риска
   * @returns Promise с массивом оценок риска
   */
  async assessSegmentsRisk(
    segments: IRouteSegment[],
    context: IRiskDataContext
  ): Promise<IRiskScore[]> {
    const assessments = await Promise.all(
      segments.map((segment) => this.assessSegmentRisk(segment, context))
    );
    return assessments;
  }
}

