/**
 * Построитель признаков для ML-модели оценки риска
 */

import { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import {
  IRiskFeatures,
  IRiskFeatureVector,
} from '../../../domain/entities/RiskFeatures';
import {
  IHistoricalDelayData,
  ICancellationData,
  IOccupancyData,
  ISeasonalityData,
} from '../../../domain/entities/RiskAssessment';
import { TransportType } from '../../../domain/entities/RouteSegment';

export class RiskFeatureBuilder {
  /**
   * Построить признаки из маршрута и исторических данных
   */
  buildFeatures(
    route: IBuiltRoute,
    historicalData: {
      delays: IHistoricalDelayData;
      cancellations: ICancellationData;
      occupancy: IOccupancyData;
    },
    scheduleRegularity: number,
    weatherRisk: number,
    seasonality: ISeasonalityData
  ): IRiskFeatures {
    const date = new Date(route.date);
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    const transportTypes = route.transportTypes ?? [];
    const hasFerry = transportTypes.includes(TransportType.FERRY);
    const hasRiverTransport = transportTypes.includes(TransportType.FERRY) || transportTypes.some(t => t.toString().toLowerCase().includes('river'));
    const hasMixedTransport = transportTypes.length > 1;

    const segments = route.segments ?? [];
    const segmentDurations = segments.map((s) => s.duration ?? 0);
    const longestSegmentDuration =
      segmentDurations.length > 0
        ? Math.max(...segmentDurations)
        : 0;

    const transferTimes = segments
      .map((s) => s.transferTime)
      .filter((t): t is number => t !== undefined && t > 0);
    const shortestTransferTime =
      transferTimes.length > 0 ? Math.min(...transferTimes) : undefined;

    return {
      transferCount: route.transferCount ?? 0,
      transportTypes,
      totalDuration: route.totalDuration ?? 0,
      segmentCount: segments.length,
      historicalDelays30: historicalData.delays.averageDelay30Days,
      historicalDelays60: historicalData.delays.averageDelay60Days,
      historicalDelays90: historicalData.delays.averageDelay90Days,
      delayFrequency: historicalData.delays.delayFrequency,
      cancellationRate30: historicalData.cancellations.cancellationRate30Days,
      cancellationRate60: historicalData.cancellations.cancellationRate60Days,
      cancellationRate90: historicalData.cancellations.cancellationRate90Days,
      averageOccupancy: historicalData.occupancy.averageOccupancy,
      highOccupancySegments: historicalData.occupancy.highOccupancySegments,
      lowAvailabilitySegments: historicalData.occupancy.lowAvailabilitySegments,
      weatherRisk,
      month,
      dayOfWeek,
      seasonFactor: seasonality.seasonFactor,
      scheduleRegularity,
      hasFerry,
      hasRiverTransport,
      hasMixedTransport,
      longestSegmentDuration,
      shortestTransferTime,
    };
  }

  /**
   * Преобразовать признаки в вектор для ML-модели
   */
  buildFeatureVector(features: Partial<IRiskFeatures>): IRiskFeatureVector {
    const featureNames: string[] = [];
    const featureValues: number[] = [];

    featureNames.push('transferCount');
    featureValues.push(features.transferCount ?? 0);

    featureNames.push('totalDuration');
    featureValues.push((features.totalDuration ?? 0) / 60);

    featureNames.push('segmentCount');
    featureValues.push(features.segmentCount ?? 0);

    featureNames.push('historicalDelays30');
    featureValues.push((features.historicalDelays30 ?? 0) / 60);

    featureNames.push('historicalDelays60');
    featureValues.push((features.historicalDelays60 ?? 0) / 60);

    featureNames.push('historicalDelays90');
    featureValues.push((features.historicalDelays90 ?? 0) / 60);

    featureNames.push('delayFrequency');
    featureValues.push(features.delayFrequency ?? 0);

    featureNames.push('cancellationRate30');
    featureValues.push(features.cancellationRate30 ?? 0);

    featureNames.push('cancellationRate60');
    featureValues.push(features.cancellationRate60 ?? 0);

    featureNames.push('cancellationRate90');
    featureValues.push(features.cancellationRate90 ?? 0);

    featureNames.push('averageOccupancy');
    featureValues.push(features.averageOccupancy ?? 0);

    featureNames.push('highOccupancySegments');
    featureValues.push(features.highOccupancySegments ?? 0);

    featureNames.push('lowAvailabilitySegments');
    featureValues.push(features.lowAvailabilitySegments ?? 0);

    featureNames.push('weatherRisk');
    featureValues.push(features.weatherRisk ?? 0);

    featureNames.push('month');
    featureValues.push((features.month ?? 1) / 12);

    featureNames.push('dayOfWeek');
    featureValues.push((features.dayOfWeek ?? 1) / 7);

    featureNames.push('seasonFactor');
    featureValues.push(features.seasonFactor ?? 1);

    featureNames.push('scheduleRegularity');
    featureValues.push(features.scheduleRegularity ?? 1);

    featureNames.push('hasFerry');
    featureValues.push(features.hasFerry ? 1 : 0);

    featureNames.push('hasRiverTransport');
    featureValues.push(features.hasRiverTransport ? 1 : 0);

    featureNames.push('hasMixedTransport');
    featureValues.push(features.hasMixedTransport ? 1 : 0);

    featureNames.push('longestSegmentDuration');
    featureValues.push((features.longestSegmentDuration ?? 0) / 60);

    featureNames.push('shortestTransferTime');
    featureValues.push(
      features.shortestTransferTime ? features.shortestTransferTime / 60 : 0
    );

    const transportTypeFeatures = this.encodeTransportTypes(
      features.transportTypes ?? []
    );
    featureNames.push(...transportTypeFeatures.names);
    featureValues.push(...transportTypeFeatures.values);

    return {
      features: featureValues,
      featureNames,
    };
  }

  /**
   * Закодировать типы транспорта в бинарные признаки
   */
  private encodeTransportTypes(transportTypes: TransportType[]): {
    names: string[];
    values: number[];
  } {
    const allTypes = [
      TransportType.AIRPLANE,
      TransportType.BUS,
      TransportType.TRAIN,
      TransportType.FERRY,
      TransportType.TAXI,
    ];

    const names = allTypes.map((t) => `transport_${t}`);
    const values = allTypes.map((t) => (transportTypes.includes(t) ? 1 : 0));

    return { names, values };
  }

  /**
   * Вычислить сезонность
   */
  calculateSeasonality(date: string): ISeasonalityData {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const dayOfWeek = d.getDay();

    let seasonFactor = 1.0;

    if (month >= 12 || month <= 2) {
      seasonFactor = 1.2;
    } else if (month >= 6 && month <= 8) {
      seasonFactor = 1.1;
    }

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      seasonFactor *= 1.1;
    }

    return {
      month,
      dayOfWeek,
      seasonFactor,
    };
  }
}

