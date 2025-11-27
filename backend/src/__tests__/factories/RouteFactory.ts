/**
 * Route Factory
 * 
 * Фабрика для создания тестовых маршрутов.
 * Детерминированные, реалистичные данные без случайности.
 */

import { SmartRoute, type ISmartRoute } from '../../domain/smart-routing/entities/SmartRoute';
import type { City } from '../../domain/smart-routing/entities/City';
import type { SmartRouteSegment } from '../../domain/smart-routing/entities/SmartRouteSegment';
import { DistanceModel, createDistanceModel } from '../../domain/smart-routing/value-objects/DistanceModel';
import { PriceModel, createPriceModel } from '../../domain/smart-routing/value-objects/PriceModel';
import { VisualizationMetadata, createVisualizationMetadata } from '../../domain/smart-routing/value-objects/VisualizationMetadata';
import { DistanceCalculationMethod } from '../../domain/smart-routing/enums/DistanceCalculationMethod';
import { formatTotalDuration } from '../../domain/smart-routing/entities/SmartRoute';

/**
 * Параметры для создания маршрута
 */
export interface RouteFactoryParams {
  id?: string;
  fromCity: City;
  toCity: City;
  segments: SmartRouteSegment[];
  totalDistance?: DistanceModel;
  totalDuration?: ISmartRoute['totalDuration'];
  totalPrice?: PriceModel;
  validation?: ISmartRoute['validation'];
  visualization?: VisualizationMetadata;
}

/**
 * Создаёт mock маршрут
 */
export function generateMockRoute(params: RouteFactoryParams): SmartRoute {
  const id = params.id || `route-${params.fromCity.id}-${params.toCity.id}`;
  
  // Вычисляем общее расстояние из сегментов
  const totalDistance = params.totalDistance || (() => {
    const totalKm = params.segments.reduce((sum, segment) => sum + segment.distance.value, 0);
    const breakdown = params.segments.reduce(
      (acc, segment) => {
        const type = segment.type;
        if (type in acc) {
          acc[type as keyof typeof acc] += segment.distance.value;
        }
        return acc;
      },
      {
        airplane: 0,
        train: 0,
        bus: 0,
        ferry: 0,
        winter_road: 0,
        taxi: 0,
      }
    );
    return createDistanceModel(totalKm, DistanceCalculationMethod.HAVERSINE, breakdown);
  })();
  
  // Вычисляем общую длительность из сегментов
  const totalDuration = params.totalDuration || (() => {
    const travelMinutes = params.segments.reduce((sum, segment) => sum + segment.duration.value, 0);
    const transferMinutes = Math.max(0, params.segments.length - 1) * 30; // 30 минут на пересадку
    return {
      value: travelMinutes + transferMinutes,
      unit: 'minutes',
      breakdown: {
        travel: travelMinutes,
        transfers: transferMinutes,
      },
      display: formatTotalDuration(travelMinutes, transferMinutes),
    };
  })();
  
  // Вычисляем общую цену из сегментов
  const totalPrice = params.totalPrice || (() => {
    const base = params.segments.reduce((sum, segment) => sum + segment.price.base, 0);
    return createPriceModel(base);
  })();
  
  // Валидация по умолчанию
  const validation = params.validation || {
    isValid: true,
    errors: [],
    warnings: [],
  };
  
  // Визуализация по умолчанию
  const visualization = params.visualization || (() => {
    const polylines = params.segments.map((segment, index) => {
      let color = '#0066CC';
      let style: 'solid' | 'dashed' | 'dotted' | 'wavy' = 'solid';
      
      switch (segment.type) {
        case 'airplane':
          color = '#0066CC';
          style = 'solid';
          break;
        case 'train':
          color = '#CC6600';
          style = 'solid';
          break;
        case 'bus':
          color = '#00CC66';
          style = 'solid';
          break;
        case 'ferry':
          color = '#0066CC';
          style = 'wavy';
          break;
        case 'winter_road':
          color = '#CCCCCC';
          style = 'dashed';
          break;
      }
      
      return {
        geometry: segment.pathGeometry.coordinates,
        color,
        weight: 3,
        style,
      };
    });
    
    const markers = [
      {
        coordinates: params.fromCity.coordinates,
        icon: 'airport' as const,
        label: params.fromCity.name,
        type: 'start' as const,
      },
      ...params.segments.slice(0, -1).map((segment) => ({
        coordinates: segment.to.coordinates,
        icon: 'transfer' as const,
        label: segment.to.name,
        type: 'transfer' as const,
      })),
      {
        coordinates: params.toCity.coordinates,
        icon: 'airport' as const,
        label: params.toCity.name,
        type: 'end' as const,
      },
    ];
    
    return createVisualizationMetadata(polylines, markers);
  })();
  
  return new SmartRoute(
    id,
    params.fromCity,
    params.toCity,
    params.segments,
    totalDistance,
    totalDuration,
    totalPrice,
    validation,
    visualization
  );
}

/**
 * Создаёт простой прямой маршрут (один сегмент)
 */
export function generateDirectRoute(
  fromCity: City,
  toCity: City,
  segment: SmartRouteSegment,
  params: Partial<RouteFactoryParams> = {}
): SmartRoute {
  return generateMockRoute({
    fromCity,
    toCity,
    segments: [segment],
    ...params,
  });
}

/**
 * Создаёт маршрут через хаб (два сегмента)
 */
export function generateHubRoute(
  fromCity: City,
  toCity: City,
  hubSegment1: SmartRouteSegment,
  hubSegment2: SmartRouteSegment,
  params: Partial<RouteFactoryParams> = {}
): SmartRoute {
  return generateMockRoute({
    fromCity,
    toCity,
    segments: [hubSegment1, hubSegment2],
    ...params,
  });
}

/**
 * Создаёт мультимодальный маршрут (несколько сегментов разных типов)
 */
export function generateMultimodalRoute(
  fromCity: City,
  toCity: City,
  segments: SmartRouteSegment[],
  params: Partial<RouteFactoryParams> = {}
): SmartRoute {
  return generateMockRoute({
    fromCity,
    toCity,
    segments,
    ...params,
  });
}




