/**
 * Построитель умных мультимодальных маршрутов
 * 
 * Основной алгоритм построения маршрутов с учётом:
 * - Системы хабов (для авиа)
 * - Сезонности транспорта
 * - Реалистичных путей (не прямые линии)
 * - Валидации физической возможности
 * - Оптимизации по цене/времени
 */

import { SmartRoute } from '../../../domain/smart-routing/entities/SmartRoute';
import { SmartRouteSegment } from '../../../domain/smart-routing/entities/SmartRouteSegment';
import type { City } from '../../../domain/smart-routing/entities/City';
import type { IStop } from '../../../domain/smart-routing/entities/Stop';
import { Hub } from '../../../domain/smart-routing/entities/Hub';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Season } from '../../../domain/smart-routing/enums/Season';
import { DistanceCalculator } from './DistanceCalculator';
import { PriceCalculator } from './PriceCalculator';
import { RealisticPathCalculator } from './RealisticPathCalculator';
import {
  ALL_CITIES,
  getCityById,
  searchCities,
} from '../../../domain/smart-routing/data/cities-reference';
import {
  ALL_HUBS,
  getHubById,
  getNearestRegionalHub,
} from '../../../domain/smart-routing/data/hubs-reference';
import {
  ALL_STOPS,
  getStopsByCity,
  getStopsByType,
} from '../../../domain/smart-routing/data/stops-reference';
import {
  ALL_CONNECTIONS,
  getConnectionBetweenCities,
  hasConnection,
  getConnectionsByType,
  getConnectionsFromCity,
  getConnectionsToCity,
  type ConnectionType,
} from '../../../domain/smart-routing/data/connections-model';
import { createSeasonality, isAvailableOnDate } from '../../../domain/smart-routing/value-objects/Seasonality';
import { formatDuration } from '../../../domain/smart-routing/entities/SmartRouteSegment';
import { formatTotalDuration } from '../../../domain/smart-routing/entities/SmartRoute';
import { createVisualizationMetadata } from '../../../domain/smart-routing/value-objects/VisualizationMetadata';
import { createDistanceModel } from '../../../domain/smart-routing/value-objects/DistanceModel';
import { DistanceCalculationMethod } from '../../../domain/smart-routing/enums/DistanceCalculationMethod';
import { HubSelector } from './HubSelector';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';
import { RedisCacheService } from '../../../infrastructure/cache/RedisCacheService';
import { TrainStationGraph } from './TrainStationGraph';

/**
 * Параметры построения маршрута
 */
export interface BuildRouteParams {
  /**
   * ID города отправления
   */
  fromCityId: string;

  /**
   * ID города назначения
   */
  toCityId: string;

  /**
   * Дата поездки (ISO 8601)
   */
  date: string;

  /**
   * Предпочтительный тип транспорта (опционально)
   */
  preferredTransport?: TransportType;

  /**
   * Максимальное количество пересадок
   */
  maxTransfers?: number;

  /**
   * Приоритет: 'price' | 'time' | 'comfort'
   */
  priority?: 'price' | 'time' | 'comfort';
}

/**
 * Результат построения маршрута
 */
export interface BuildRouteResult {
  /**
   * Умный маршрут
   */
  route: SmartRoute;

  /**
   * Альтернативные маршруты (опционально)
   */
  alternatives?: SmartRoute[];
}

/**
 * Построитель умных маршрутов
 */
export class SmartRouteBuilder {
  private readonly distanceCalculator: DistanceCalculator;
  private readonly priceCalculator: PriceCalculator;
  private readonly pathCalculator: RealisticPathCalculator;

  /**
   * Граф ЖД-станций для поиска кратчайшего пути
   */
  private readonly trainGraph: TrainStationGraph;

  constructor() {
    this.distanceCalculator = new DistanceCalculator();
    this.priceCalculator = new PriceCalculator();
    // Передаём кэш в RealisticPathCalculator для кэширования OSRM запросов
    const cache = new RedisCacheService();
    this.pathCalculator = new RealisticPathCalculator(cache);
    // Инициализируем граф ЖД-станций
    this.trainGraph = new TrainStationGraph();
  }

  /**
   * Построить умный маршрут
   */
  public async buildRoute(params: BuildRouteParams): Promise<BuildRouteResult | null> {
    console.log('[SmartRouteBuilder] buildRoute called:', {
      fromCityId: params.fromCityId,
      toCityId: params.toCityId,
      date: params.date,
      preferredTransport: params.preferredTransport,
      maxTransfers: params.maxTransfers,
      priority: params.priority,
    });

    const fromCity = getCityById(params.fromCityId);
    const toCity = getCityById(params.toCityId);

    if (!fromCity || !toCity) {
      console.error('[SmartRouteBuilder] City not found:', {
        fromCityId: params.fromCityId,
        toCityId: params.toCityId,
        fromCityFound: !!fromCity,
        toCityFound: !!toCity,
      });
      throw new Error(`Город не найден: ${params.fromCityId} или ${params.toCityId}`);
    }

    console.log('[SmartRouteBuilder] Cities found:', {
      from: { id: fromCity.id, name: fromCity.name },
      to: { id: toCity.id, name: toCity.name },
    });

    // Определяем сезон по дате
    const season = this.getSeasonFromDate(params.date);
    const date = new Date(params.date);

    console.log('[SmartRouteBuilder] Season determined:', {
      date: params.date,
      season,
    });

    // Пытаемся найти прямой маршрут
    const directRoute = await this.tryDirectRoute(fromCity, toCity, season, date, params.preferredTransport);

    if (directRoute) {
      console.log('[SmartRouteBuilder] Direct route found:', {
        routeId: directRoute.id,
        segmentsCount: directRoute.segments.length,
      });
      return { route: directRoute };
    }

    console.log('[SmartRouteBuilder] Direct route not found, trying multi-segment route');

    // Если прямого маршрута нет, строим через промежуточные точки
    const multiSegmentRoute = await this.buildMultiSegmentRoute(
      fromCity,
      toCity,
      season,
      date,
      params.preferredTransport,
      params.maxTransfers || 3,
      params.priority || 'price'
    );

    if (!multiSegmentRoute) {
      console.error('[SmartRouteBuilder] Multi-segment route not found:', {
        fromCityId: params.fromCityId,
        toCityId: params.toCityId,
        season,
        preferredTransport: params.preferredTransport,
        maxTransfers: params.maxTransfers || 3,
        priority: params.priority || 'price',
        triedDirectRoute: !!directRoute,
        directRouteFound: !!directRoute,
      });
      
      // ФАЗА 3 ФИКС: Добавляем универсальный fallback механизм
      // Пытаемся построить маршрут через любые доступные соединения
      console.log('[SmartRouteBuilder] Attempting fallback route via any available connections');
      const fallbackRoute = await this.buildFallbackRoute(fromCity, toCity, season, date);
      if (fallbackRoute) {
        console.log('[SmartRouteBuilder] Fallback route found:', {
          routeId: fallbackRoute.id,
          segmentsCount: fallbackRoute.segments.length,
        });
        return { route: fallbackRoute };
      }
      
      return null;
    }

    console.log('[SmartRouteBuilder] Multi-segment route found:', {
      routeId: multiSegmentRoute.id,
      segmentsCount: multiSegmentRoute.segments.length,
    });

    // КРИТИЧЕСКИЙ ФИКС: Добавляем поиск альтернативных маршрутов
    const alternatives = await this.findAlternativeRoutes(
      fromCity,
      toCity,
      season,
      date,
      multiSegmentRoute,
      params.preferredTransport,
      params.maxTransfers || 3,
      params.priority || 'price'
    );

    return { 
      route: multiSegmentRoute,
      alternatives: alternatives.length > 0 ? alternatives : undefined
    };
  }

  /**
   * КРИТИЧЕСКИЙ ФИКС: Находит альтернативные маршруты
   * 
   * Ищет альтернативные варианты маршрута с другими типами транспорта
   * или через другие промежуточные города.
   */
  private async findAlternativeRoutes(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date,
    mainRoute: SmartRoute,
    preferredTransport: TransportType | undefined,
    maxTransfers: number,
    priority: 'price' | 'time' | 'comfort'
  ): Promise<SmartRoute[]> {
    console.log('[SmartRouteBuilder] findAlternativeRoutes called:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      mainRouteId: mainRoute.id,
      mainRouteSegmentsCount: mainRoute.segments.length,
    });

    const alternatives: SmartRoute[] = [];
    const maxAlternatives = 3; // Максимум 3 альтернативных маршрута
    let foundCount = 0;

    // Если основной маршрут использует авиа, пробуем найти альтернативу через другие типы транспорта
    const mainRouteUsesAirplane = mainRoute.segments.some(s => s.type === TransportType.AIRPLANE);
    
    if (mainRouteUsesAirplane && !preferredTransport) {
      // Пробуем найти альтернативу через автобус/поезд
      console.log('[SmartRouteBuilder] Main route uses airplane, trying alternatives with bus/train');
      
      const alternativeViaBus = await this.buildRouteViaCities(
        fromCity,
        toCity,
        season,
        date,
        TransportType.BUS,
        maxTransfers
      );
      
      if (alternativeViaBus && alternativeViaBus.id !== mainRoute.id) {
        alternatives.push(alternativeViaBus);
        foundCount++;
        console.log('[SmartRouteBuilder] Alternative route via bus found:', {
          routeId: alternativeViaBus.id,
          segmentsCount: alternativeViaBus.segments.length,
        });
      }

      if (foundCount < maxAlternatives) {
        const alternativeViaTrain = await this.buildRouteViaCities(
          fromCity,
          toCity,
          season,
          date,
          TransportType.TRAIN,
          maxTransfers
        );
        
        if (alternativeViaTrain && alternativeViaTrain.id !== mainRoute.id && 
            !alternatives.some(a => a.id === alternativeViaTrain.id)) {
          alternatives.push(alternativeViaTrain);
          foundCount++;
          console.log('[SmartRouteBuilder] Alternative route via train found:', {
            routeId: alternativeViaTrain.id,
            segmentsCount: alternativeViaTrain.segments.length,
          });
        }
      }
    }

    // Пробуем найти альтернативу через другие промежуточные города
    if (foundCount < maxAlternatives) {
      // Если основной маршрут проходит через определённые города, пробуем другие
      const mainRouteCities = new Set([
        fromCity.id,
        ...mainRoute.segments.map(s => {
          // Извлекаем промежуточные города из сегментов
          // from и to - это IStop, у которых есть cityId
          const fromStopCity = s.from?.cityId || s.from?.id?.split('-')[0] || '';
          const toStopCity = s.to?.cityId || s.to?.id?.split('-')[0] || '';
          return [fromStopCity, toStopCity].filter(Boolean);
        }).flat(),
        toCity.id,
      ]);

      // Пробуем найти маршрут через другие промежуточные города
      const alternativeViaOtherCities = await this.buildRouteWithMultipleSegments(
        fromCity,
        toCity,
        season,
        date,
        preferredTransport,
        maxTransfers
      );

      if (alternativeViaOtherCities && 
          alternativeViaOtherCities.id !== mainRoute.id &&
          !alternatives.some(a => a.id === alternativeViaOtherCities.id)) {
        // Проверяем, что альтернативный маршрут действительно отличается
        const alternativeCities = new Set([
          fromCity.id,
          ...alternativeViaOtherCities.segments.map(s => {
            const fromStopCity = s.from?.cityId || s.from?.id?.split('-')[0] || '';
            const toStopCity = s.to?.cityId || s.to?.id?.split('-')[0] || '';
            return [fromStopCity, toStopCity].filter(Boolean);
          }).flat(),
          toCity.id,
        ]);

        // Если маршрут проходит через другие города, добавляем его
        const hasDifferentCities = Array.from(alternativeCities).some(cityId => !mainRouteCities.has(cityId));
        if (hasDifferentCities) {
          alternatives.push(alternativeViaOtherCities);
          foundCount++;
          console.log('[SmartRouteBuilder] Alternative route via other cities found:', {
            routeId: alternativeViaOtherCities.id,
            segmentsCount: alternativeViaOtherCities.segments.length,
          });
        }
      }
    }

    // Сортируем альтернативы по приоритету
    if (alternatives.length > 1) {
      alternatives.sort((a, b) => {
        if (priority === 'price') {
          return a.totalPrice.total - b.totalPrice.total;
        } else if (priority === 'time') {
          return a.totalDuration.value - b.totalDuration.value;
        } else {
          // comfort: приоритет маршрутам с меньшим количеством пересадок
          return a.segments.length - b.segments.length;
        }
      });
    }

    console.log('[SmartRouteBuilder] findAlternativeRoutes completed:', {
      alternativesCount: alternatives.length,
      alternativeRouteIds: alternatives.map(a => a.id),
    });

    return alternatives;
  }

  /**
   * Пытается найти прямой маршрут между городами
   */
  private async tryDirectRoute(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date,
    preferredTransport?: TransportType
  ): Promise<SmartRoute | null> {
    // ФАЗА 4 ФИКС: Улучшенное логирование
    console.log('[SmartRouteBuilder] tryDirectRoute called:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      season,
      preferredTransport,
      hasDirectConnection: hasConnection(fromCity.id, toCity.id),
      availableConnections: getConnectionBetweenCities(fromCity.id, toCity.id).map(c => ({
        id: c.id,
        type: c.type,
        season: c.season,
      })),
    });
    // Для авиа: проверяем, можно ли построить прямой рейс
    if (!preferredTransport || preferredTransport === TransportType.AIRPLANE) {
      const hubSelection = HubSelector.selectHubs(fromCity, toCity);

      // Если требуется использование хабов, не строим прямой рейс
      if (hubSelection.requiresHubs) {
        // Прямой рейс невозможен, нужно использовать хабы
        // Это обработается в buildMultiSegmentRoute
        return null;
      }

      // Если прямой рейс запрещён (например, между малыми аэропортами)
      if (!hubSelection.canBeDirect) {
        return null;
      }
    }

    // ФАЗА 2 ФИКС: Изменяем приоритеты типов транспорта
    // Приоритет: BUS (самый доступный) → TRAIN → FERRY → WINTER_ROAD → AIRPLANE (последний, самый дорогой)
    // Это позволяет находить более реалистичные и доступные маршруты
    const transportTypes: TransportType[] = preferredTransport
      ? [preferredTransport]
      : [TransportType.BUS, TransportType.TRAIN, TransportType.FERRY, TransportType.WINTER_ROAD, TransportType.AIRPLANE];

    for (const transportType of transportTypes) {
      // Проверяем сезонность
      if (!this.isTransportAvailableInSeason(transportType, season)) {
        continue;
      }

      // Ищем соединение
      const connectionType = this.mapTransportTypeToConnectionType(transportType);
      if (!connectionType) {
        continue;
      }
      const connections = getConnectionBetweenCities(fromCity.id, toCity.id, connectionType);
      if (connections.length === 0) {
        continue;
      }

      // Дополнительная валидация соединения (на случай, если оно прошло через фильтр, но всё ещё нереалистично)
      const connection = connections[0]; // Берём первое соединение
      
      // Проверяем автобусные маршруты на максимальное расстояние
      if (transportType === TransportType.BUS && connection.distance > 1500) {
        console.warn(
          `[SmartRouteBuilder] Пропущен автобусный маршрут ${fromCity.id} → ${toCity.id}: расстояние ${connection.distance} км превышает максимум 1500 км`
        );
        continue;
      }

      // Проверяем доступность на дату
      const seasonality = createSeasonality(
        this.mapSeasonFromConnection(connection.season),
        undefined,
        date
      );

      if (!seasonality.available) {
        continue;
      }

      // Получаем остановки
      const fromStops = this.getStopsForCityAndType(fromCity.id, transportType);
      const toStops = this.getStopsForCityAndType(toCity.id, transportType);

      if (fromStops.length === 0 || toStops.length === 0) {
        continue;
      }

      const fromStop = fromStops[0];
      const toStop = toStops[0];

      // Для авиа: определяем хабы для создания ломаной линии
      let viaHubs: Hub[] | undefined;
      if (transportType === TransportType.AIRPLANE) {
        // Для прямых рейсов между хабами используем сами хабы
        if (fromCity.isHub && toCity.isHub) {
          const fromHub = ALL_HUBS.find((h) => h.id === `${fromCity.id}-hub`);
          const toHub = ALL_HUBS.find((h) => h.id === `${toCity.id}-hub`);
          if (fromHub && toHub) {
            viaHubs = [fromHub, toHub];
          }
        } else {
          // Для рейсов через региональные хабы
          const fromHub = getNearestRegionalHub(fromCity.id);
          const toHub = getNearestRegionalHub(toCity.id);
          if (fromHub && toHub) {
            viaHubs = [fromHub, toHub];
          }
        }
      }

      // Строим сегмент
      const segment = await this.buildSegment(
        transportType,
        fromStop,
        toStop,
        connection,
        seasonality,
        date,
        viaHubs
      );

      if (!segment) {
        continue;
      }

      // Создаём маршрут
      const route = await this.createRoute(
        fromCity,
        toCity,
        [segment],
        date
      );

      if (route) {
        return route;
      }
    }

    return null;
  }

  /**
   * Строит маршрут через несколько сегментов
   */
  private async buildMultiSegmentRoute(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date,
    preferredTransport: TransportType | undefined,
    maxTransfers: number,
    priority: 'price' | 'time' | 'comfort'
  ): Promise<SmartRoute | null> {
    console.log('[SmartRouteBuilder] buildMultiSegmentRoute called:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      season,
      preferredTransport,
      maxTransfers,
      priority,
    });

    // ✅ ФИКС: Если один из городов не имеет аэропорта, сразу пробуем buildRouteViaCities
    // Это ускоряет поиск маршрутов для городов без аэропортов (например, Ленск, Вилюйск)
    // и делает поиск более логичным (не проверяем авиарейсы для городов без аэропортов)
    if (!fromCity.infrastructure.hasAirport || !toCity.infrastructure.hasAirport) {
      console.log('[SmartRouteBuilder] Early check: one or both cities lack airport, trying buildRouteViaCities first');
      const routeViaCities = await this.buildRouteViaCities(
        fromCity,
        toCity,
        season,
        date,
        preferredTransport,
        maxTransfers
      );
      if (routeViaCities) {
        console.log('[SmartRouteBuilder] Route via cities found (early check):', {
          routeId: routeViaCities.id,
          segmentsCount: routeViaCities.segments.length,
        });
        return routeViaCities;
      }
      console.log('[SmartRouteBuilder] Early check: route via cities not found, continuing with other transport types');
    }

    // Для авиа: через хабы
    if (!preferredTransport || preferredTransport === TransportType.AIRPLANE) {
      const routeViaHubs = await this.buildRouteViaHubs(fromCity, toCity, season, date);
      if (routeViaHubs) {
        console.log('[SmartRouteBuilder] Route via hubs found:', {
          routeId: routeViaHubs.id,
          segmentsCount: routeViaHubs.segments.length,
        });
        return routeViaHubs;
      }
      console.log('[SmartRouteBuilder] Route via hubs not found');
    }

    // Для ЖД: через станции (АЯМ и Транссиб)
    if (!preferredTransport || preferredTransport === TransportType.TRAIN) {
      const routeViaStations = await this.buildRouteViaTrainStations(
        fromCity,
        toCity,
        season,
        date,
        maxTransfers
      );
      if (routeViaStations) {
        console.log('[SmartRouteBuilder] Route via train stations found:', {
          routeId: routeViaStations.id,
          segmentsCount: routeViaStations.segments.length,
        });
        return routeViaStations;
      }
      console.log('[SmartRouteBuilder] Route via train stations not found');
    }

    // Для паромов: через устья рек (если на разных реках)
    if (!preferredTransport || preferredTransport === TransportType.FERRY) {
      const routeViaRivers = await this.buildRouteViaRivers(
        fromCity,
        toCity,
        season,
        date
      );
      if (routeViaRivers) {
        console.log('[SmartRouteBuilder] Route via rivers found:', {
          routeId: routeViaRivers.id,
          segmentsCount: routeViaRivers.segments.length,
        });
        return routeViaRivers;
      }
      console.log('[SmartRouteBuilder] Route via rivers not found');
    }

    // Для зимников: только в зимний период
    if (!preferredTransport || preferredTransport === TransportType.WINTER_ROAD) {
      if (season === Season.WINTER || season === Season.ALL) {
        const routeViaWinterRoad = await this.buildRouteViaWinterRoad(
          fromCity,
          toCity,
          season,
          date
        );
        if (routeViaWinterRoad) {
          console.log('[SmartRouteBuilder] Route via winter road found:', {
            routeId: routeViaWinterRoad.id,
            segmentsCount: routeViaWinterRoad.segments.length,
          });
          return routeViaWinterRoad;
        }
        console.log('[SmartRouteBuilder] Route via winter road not found');
      } else {
        // Зимники недоступны - предлагаем альтернативу
        // Приоритет: авиа → паром (летом) → автобус
        const alternativeRoute = await this.buildAlternativeRouteWhenWinterRoadClosed(
          fromCity,
          toCity,
          season,
          date
        );
        if (alternativeRoute) {
          console.log('[SmartRouteBuilder] Alternative route when winter road closed found:', {
            routeId: alternativeRoute.id,
            segmentsCount: alternativeRoute.segments.length,
          });
          return alternativeRoute;
        }
        console.log('[SmartRouteBuilder] Alternative route when winter road closed not found');
      }
    }

    // Для других типов: через промежуточные города
    const routeViaCities = await this.buildRouteViaCities(
      fromCity,
      toCity,
      season,
      date,
      preferredTransport,
      maxTransfers
    );

    if (routeViaCities) {
      console.log('[SmartRouteBuilder] Route via cities found:', {
        routeId: routeViaCities.id,
        segmentsCount: routeViaCities.segments.length,
      });
    } else {
      console.error('[SmartRouteBuilder] Route via cities not found:', {
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        season,
        preferredTransport,
        maxTransfers,
      });
    }

    return routeViaCities;
  }

  /**
   * Строит маршрут через хабы (для авиа)
   * 
   * Принудительно использует хабы для малых аэропортов
   * Поддерживает сложные маршруты через несколько хабов (например, Среднеколымск → Москва → Новосибирск → Якутск)
   */
  private async buildRouteViaHubs(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date
  ): Promise<SmartRoute | null> {
    // Используем HubSelector для поиска пути через хабы
    const hubPath = HubSelector.findPathViaHubs(fromCity, toCity);

    // Если путь не найден, возвращаем null
    if (!hubPath || hubPath.length === 0) {
      // Проверяем, может ли быть прямой рейс
      const hubSelection = HubSelector.selectHubs(fromCity, toCity);
      if (!hubSelection.requiresHubs && hubSelection.canBeDirect) {
        // Прямой рейс возможен, но он должен обрабатываться в tryDirectRoute
        return null;
      }

      console.warn(
        `[SmartRouteBuilder] Не удалось найти путь через хабы для маршрута ${fromCity.id} → ${toCity.id}`
      );
      return null;
    }

    // Если путь состоит из одного хаба, строим прямой рейс через этот хаб
    if (hubPath.length === 1) {
      return this.buildDirectAirplaneRoute(fromCity, toCity, hubPath[0], season, date);
    }

    // Строим маршрут через несколько хабов
    return this.buildAirplaneRouteViaHubs(
      fromCity,
      toCity,
      hubPath,
      season,
      date
    );
  }

  /**
   * Строит прямой авиамаршрут через хаб
   */
  private async buildDirectAirplaneRoute(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    hub: Hub,
    season: Season,
    date: Date
  ): Promise<SmartRoute | null> {
    const fromStops = getStopsByCity(fromCity.id).filter((s) => s.type === 'airport');
    const toStops = getStopsByCity(toCity.id).filter((s) => s.type === 'airport');

    if (fromStops.length === 0 || toStops.length === 0) {
      return null;
    }

    const fromStop = fromStops[0];
    const toStop = toStops[0];

    // Ищем соединение
    const connections = getConnectionBetweenCities(fromCity.id, toCity.id, TransportType.AIRPLANE);
    if (connections.length === 0) {
      return null;
    }

    const connection = connections[0];
    const seasonality = createSeasonality(Season.ALL, undefined, date);

    const segment = await this.buildSegment(
      TransportType.AIRPLANE,
      fromStop,
      toStop,
      connection,
      seasonality,
      date,
      [hub]
    );

    if (!segment) {
      return null;
    }

    return this.createRoute(fromCity, toCity, [segment], date);
  }

  /**
   * Строит авиамаршрут через несколько хабов
   * 
   * @param fromCity - Город отправления
   * @param toCity - Город назначения
   * @param hubs - Массив хабов, через которые нужно пройти (включая начальный и конечный, если они являются хабами)
   * @param season - Сезон
   * @param date - Дата поездки
   */
  private async buildAirplaneRouteViaHubs(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    hubs: Hub[],
    season: Season,
    date: Date
  ): Promise<SmartRoute | null> {
    const segments: SmartRouteSegment[] = [];

    if (hubs.length === 0) {
      return null;
    }

    // Получаем остановки для начального города
    const fromStops = getStopsByCity(fromCity.id).filter((s) => s.type === 'airport');
    if (fromStops.length === 0) {
      return null;
    }

    // Получаем остановки для конечного города
    const toStops = getStopsByCity(toCity.id).filter((s) => s.type === 'airport');
    if (toStops.length === 0) {
      return null;
    }

    // Вспомогательная функция для получения остановки хаба по ID города
    const getHubStopByCityId = (cityId: string): IStop | null => {
      const hubCity = getCityById(cityId);
      if (!hubCity) {
        return null;
      }
      const hubStops = getStopsByCity(cityId).filter((s) => s.type === 'airport');
      return hubStops.length > 0 ? hubStops[0] : null;
    };

    // Вспомогательная функция для получения ID города из ID хаба
    const getCityIdFromHubId = (hubId: string): string => {
      return hubId.replace('-hub', '');
    };

    // Если начальный город не является первым хабом, строим сегмент: fromCity -> первый хаб
    const firstHub = hubs[0];
    const firstHubCityId = getCityIdFromHubId(firstHub.id);
    
    if (fromCity.id !== firstHubCityId) {
      const firstHubStop = getHubStopByCityId(firstHubCityId);
      if (!firstHubStop) {
        console.warn(
          `[SmartRouteBuilder] Не найдена остановка для первого хаба ${firstHub.id} (город: ${firstHubCityId})`
        );
        return null;
      }

      // Ищем соединение между начальным городом и первым хабом
      const connections = getConnectionBetweenCities(
        fromCity.id,
        firstHubCityId,
        TransportType.AIRPLANE
      );

      if (connections.length > 0) {
        const connection = connections[0];
        const seasonality = createSeasonality(Season.ALL, undefined, date);

        const segment = await this.buildSegment(
          TransportType.AIRPLANE,
          fromStops[0],
          firstHubStop,
          connection,
          seasonality,
          date,
          [firstHub] // Указываем хаб для создания ломаной линии: fromCity → firstHub
        );

        if (segment) {
          segments.push(segment);
        }
      }
    }

    // Строим сегменты между хабами
    for (let i = 0; i < hubs.length - 1; i++) {
      const currentHub = hubs[i];
      const nextHub = hubs[i + 1];

      const currentHubCityId = getCityIdFromHubId(currentHub.id);
      const nextHubCityId = getCityIdFromHubId(nextHub.id);

      const currentHubStop = getHubStopByCityId(currentHubCityId);
      const nextHubStop = getHubStopByCityId(nextHubCityId);

      if (!currentHubStop || !nextHubStop) {
        console.warn(
          `[SmartRouteBuilder] Не найдены остановки для хабов ${currentHub.id} → ${nextHub.id}`
        );
        return null;
      }

      // Ищем соединение между хабами
      const connections = getConnectionBetweenCities(
        currentHubCityId,
        nextHubCityId,
        TransportType.AIRPLANE
      );

      if (connections.length === 0) {
        console.warn(
          `[SmartRouteBuilder] Не найдено соединение между хабами ${currentHub.id} → ${nextHub.id}`
        );
        return null;
      }

      const connection = connections[0];
      const seasonality = createSeasonality(Season.ALL, undefined, date);

      const segment = await this.buildSegment(
        TransportType.AIRPLANE,
        currentHubStop,
        nextHubStop,
        connection,
        seasonality,
        date,
        [currentHub, nextHub] // Указываем хабы для создания ломаной линии: currentHub → nextHub
      );

      if (!segment) {
        console.warn(
          `[SmartRouteBuilder] Не удалось создать сегмент между хабами ${currentHub.id} → ${nextHub.id}`
        );
        return null;
      }

      segments.push(segment);
    }

    // Если конечный город не является последним хабом, строим сегмент: последний хаб -> toCity
    const lastHub = hubs[hubs.length - 1];
    const lastHubCityId = getCityIdFromHubId(lastHub.id);

    if (toCity.id !== lastHubCityId) {
      const lastHubStop = getHubStopByCityId(lastHubCityId);
      if (!lastHubStop) {
        console.warn(
          `[SmartRouteBuilder] Не найдена остановка для последнего хаба ${lastHub.id} (город: ${lastHubCityId})`
        );
        return null;
      }

      const connections = getConnectionBetweenCities(
        lastHubCityId,
        toCity.id,
        TransportType.AIRPLANE
      );

      if (connections.length === 0) {
        console.warn(
          `[SmartRouteBuilder] Не найдено соединение между последним хабом ${lastHub.id} и конечным городом ${toCity.id}`
        );
        return null;
      }

      const connection = connections[0];
      const seasonality = createSeasonality(Season.ALL, undefined, date);

      const segment = await this.buildSegment(
        TransportType.AIRPLANE,
        lastHubStop,
        toStops[0],
        connection,
        seasonality,
        date,
        [lastHub] // Указываем хаб для создания ломаной линии: lastHub → toCity
      );

      if (!segment) {
        console.warn(
          `[SmartRouteBuilder] Не удалось создать сегмент между последним хабом ${lastHub.id} и конечным городом ${toCity.id}`
        );
        return null;
      }

      segments.push(segment);
    }

    // Проверяем, что все сегменты созданы
    if (segments.length === 0) {
      console.warn(
        `[SmartRouteBuilder] Не удалось создать ни одного сегмента для маршрута ${fromCity.id} → ${toCity.id} через ${hubs.length} хабов`
      );
      return null;
    }

    return this.createRoute(fromCity, toCity, segments, date);
  }

  /**
   * Строит ЖД-маршрут через станции (АЯМ и Транссиб)
   * 
   * Использует граф станций для поиска кратчайшего пути через алгоритм Dijkstra.
   * Обрабатывает сложные маршруты:
   * - Нижний Бестях → Москва: Нижний Бестях → Томмот → Алдан → Тында → Сковородино → Москва
   * - Нижний Бестях → Новосибирск: Нижний Бестях → Томмот → Алдан → Тында → Сковородино → Новосибирск
   * - Алдан → Иркутск: Алдан → Тында → Сковородино → Иркутск
   * 
   * ВАЖНО: ЖД-маршруты должны быть ломаными линиями вдоль существующих трасс.
   */
  private async buildRouteViaTrainStations(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date,
    maxTransfers: number
  ): Promise<SmartRoute | null> {
    // Проверяем, есть ли ЖД-станции в обоих городах
    const fromStops = this.getStopsForCityAndType(fromCity.id, TransportType.TRAIN);
    const toStops = this.getStopsForCityAndType(toCity.id, TransportType.TRAIN);

    if (fromStops.length === 0 || toStops.length === 0) {
      return null;
    }

    // Пытаемся найти прямой ЖД-маршрут
    const directConnections = getConnectionBetweenCities(fromCity.id, toCity.id, TransportType.TRAIN);
    if (directConnections.length > 0) {
      const connection = directConnections[0];
      const seasonality = createSeasonality(
        this.mapSeasonFromConnection(connection.season),
        undefined,
        date
      );

      if (seasonality.available) {
        const segment = await this.buildSegment(
          TransportType.TRAIN,
          fromStops[0],
          toStops[0],
          connection,
          seasonality,
          date
        );

        if (segment) {
          return this.createRoute(fromCity, toCity, [segment], date);
        }
      }
    }

    // Используем граф станций для поиска кратчайшего пути
    const pathResult = this.trainGraph.findShortestPath(fromCity.id, toCity.id, maxTransfers);

    if (!pathResult || pathResult.path.length < 2) {
      return null;
    }

    // Строим сегменты для каждого участка пути
    const segments: SmartRouteSegment[] = [];

    for (let i = 0; i < pathResult.connections.length; i++) {
      const connection = pathResult.connections[i];
      const fromCityId = pathResult.path[i];
      const toCityId = pathResult.path[i + 1];

      // Проверяем сезонность
      const seasonality = createSeasonality(
        this.mapSeasonFromConnection(connection.season),
        undefined,
        date
      );

      if (!seasonality.available) {
        return null; // Один из сегментов недоступен в этот сезон
      }

      // ВАЖНО: Для ЖД-маршрутов создаём connection с промежуточными станциями из пути графа
      // Это обеспечит визуализацию пути через все станции (ломаная линия)
      // Если путь содержит промежуточные станции между fromCityId и toCityId, добавляем их
      const enhancedConnection = { ...connection };
      
      // Если путь содержит больше 2 станций и это не последний сегмент,
      // добавляем промежуточные станции из пути графа
      // Но так как мы строим сегменты последовательно, промежуточные станции уже включены в путь
      // Поэтому для каждого сегмента промежуточные станции будут пустыми (это нормально)
      // Главное - путь будет проходить через все станции из pathResult.path
      // Для визуализации это обеспечит ломаную линию, так как каждый сегмент будет проходить через свою пару станций

      // Строим сегмент
      const segment = await this.buildSegmentForConnection(
        fromCityId,
        toCityId,
        enhancedConnection,
        season,
        date
      );

      if (!segment) {
        return null; // Не удалось построить сегмент
      }

      segments.push(segment);
    }

    if (segments.length === 0) {
      return null;
    }

    return this.createRoute(fromCity, toCity, segments, date);
  }

  /**
   * Строит паромный маршрут через устья рек
   * 
   * Обрабатывает маршруты между пристанями на разных реках:
   * - Алдан → Лена: через устье Алдана (63.44°N, 129.15°E)
   * - Вилюй → Лена: через устье Вилюя (64.37°N, 126.40°E)
   * 
   * Пример: Хандыга (Алдан) → Якутск (Лена) = Хандыга → устье Алдана → Якутск
   */
  private async buildRouteViaRivers(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date
  ): Promise<SmartRoute | null> {
    // Проверяем, есть ли пристани в обоих городах
    const fromStops = this.getStopsForCityAndType(fromCity.id, TransportType.FERRY);
    const toStops = this.getStopsForCityAndType(toCity.id, TransportType.FERRY);

    if (fromStops.length === 0 || toStops.length === 0) {
      return null;
    }

    // Проверяем сезонность паромов
    if (!this.isTransportAvailableInSeason(TransportType.FERRY, season)) {
      return null;
    }

    // Пытаемся найти прямой паромный маршрут
    const directConnections = getConnectionBetweenCities(fromCity.id, toCity.id, TransportType.FERRY);
    if (directConnections.length > 0) {
      const connection = directConnections[0];
      const seasonality = createSeasonality(
        this.mapSeasonFromConnection(connection.season),
        undefined,
        date
      );

      if (seasonality.available) {
        const segment = await this.buildSegment(
          TransportType.FERRY,
          fromStops[0],
          toStops[0],
          connection,
          seasonality,
          date
        );

        if (segment) {
          return this.createRoute(fromCity, toCity, [segment], date);
        }
      }
    }

    // Ищем маршрут через устья рек
    // Координаты устьев рек:
    // - Устье Алдана (впадение в Лену): 63.44°N, 129.15°E
    // - Устье Вилюя (впадение в Лену): 64.37°N, 126.40°E
    
    // Упрощённая логика: если есть соединение через Якутск (на Лене)
    // и fromCity имеет соединение с Якутском, то используем его
    const fromToYakutsk = getConnectionBetweenCities(fromCity.id, 'yakutsk', TransportType.FERRY);
    const yakutskToTo = getConnectionBetweenCities('yakutsk', toCity.id, TransportType.FERRY);

    if (fromToYakutsk.length > 0 && yakutskToTo.length > 0) {
      // Проверяем, нужно ли добавить промежуточную точку (устье реки)
      const connection1 = fromToYakutsk[0];
      const connection2 = yakutskToTo[0];
      
      // Если соединение указывает на переход между реками, добавляем координаты устья
      let intermediatePiers1: Coordinates[] | undefined;
      let intermediatePiers2: Coordinates[] | undefined;
      
      // Проверяем метаданные соединения для определения устья
      if (connection1.metadata?.river && typeof connection1.metadata.river === 'string' && connection1.metadata.river.includes('→')) {
        // Соединение через устье (например, "Алдан → Лена" или "Вилюй → Лена")
        const riverName = connection1.metadata.river.split('→')[0].trim();
        if (riverName === 'Алдан') {
          // Устье Алдана: 63.44°N, 129.15°E
          intermediatePiers1 = [new Coordinates(63.44, 129.15)];
        } else if (riverName === 'Вилюй') {
          // Устье Вилюя: 64.37°N, 126.40°E
          intermediatePiers1 = [new Coordinates(64.37, 126.40)];
        }
      }
      
      if (connection2.metadata?.river && typeof connection2.metadata.river === 'string' && connection2.metadata.river.includes('→')) {
        const riverName = connection2.metadata.river.split('→')[0].trim();
        if (riverName === 'Алдан') {
          intermediatePiers2 = [new Coordinates(63.44, 129.15)];
        } else if (riverName === 'Вилюй') {
          intermediatePiers2 = [new Coordinates(64.37, 126.40)];
        }
      }
      
      // Создаём соединения с промежуточными точками для правильной визуализации
      // intermediateCities должен содержать объекты с координатами для устьев рек
      const enhancedConnection1 = intermediatePiers1 
        ? { 
            ...connection1, 
            intermediateCities: intermediatePiers1.map(p => ({ 
              latitude: p.latitude, 
              longitude: p.longitude 
            }))
          }
        : connection1;
      const enhancedConnection2 = intermediatePiers2
        ? { 
            ...connection2, 
            intermediateCities: intermediatePiers2.map(p => ({ 
              latitude: p.latitude, 
              longitude: p.longitude 
            }))
          }
        : connection2;
      
      const segment1 = await this.buildSegmentForConnection(
        fromCity.id,
        'yakutsk',
        enhancedConnection1,
        season,
        date
      );
      const segment2 = await this.buildSegmentForConnection(
        'yakutsk',
        toCity.id,
        enhancedConnection2,
        season,
        date
      );

      if (segment1 && segment2) {
        return this.createRoute(fromCity, toCity, [segment1, segment2], date);
      }
    }

    return null;
  }

  /**
   * Строит маршрут по зимнику
   * 
   * Обрабатывает маршруты по зимним дорогам (только в зимний период).
   * Зимники доступны только с 1 декабря по 15 апреля.
   */
  private async buildRouteViaWinterRoad(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date
  ): Promise<SmartRoute | null> {
    // Проверяем, есть ли зимние дороги в обоих городах
    const fromStops = this.getStopsForCityAndType(fromCity.id, TransportType.WINTER_ROAD);
    const toStops = this.getStopsForCityAndType(toCity.id, TransportType.WINTER_ROAD);

    if (fromStops.length === 0 || toStops.length === 0) {
      return null;
    }

    // Проверяем сезонность зимников (строго только зимой)
    if (season !== Season.WINTER && season !== Season.ALL) {
      return null;
    }

    // Пытаемся найти прямой зимний маршрут
    const directConnections = getConnectionBetweenCities(fromCity.id, toCity.id, TransportType.WINTER_ROAD);
    if (directConnections.length > 0) {
      const connection = directConnections[0];
      const seasonality = createSeasonality(
        this.mapSeasonFromConnection(connection.season),
        undefined,
        date
      );

      if (seasonality.available) {
        const segment = await this.buildSegment(
          TransportType.WINTER_ROAD,
          fromStops[0],
          toStops[0],
          connection,
          seasonality,
          date
        );

        if (segment) {
          return this.createRoute(fromCity, toCity, [segment], date);
        }
      }
    }

    return null;
  }

  /**
   * Строит альтернативный маршрут, когда зимники закрыты
   * 
   * Правила выбора альтернативного транспорта:
   * 1. Летом: паром (если доступен) → авиа → автобус
   * 2. Переходный период: авиа → автобус
   * 3. Зимой: не вызывается (зимники доступны)
   */
  private async buildAlternativeRouteWhenWinterRoadClosed(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date
  ): Promise<SmartRoute | null> {
    // ФАЗА 2 ФИКС: Изменяем приоритеты типов транспорта
    // Приоритет: BUS (самый доступный) → TRAIN → FERRY → WINTER_ROAD → AIRPLANE (последний, самый дорогой)
    
    // Приоритет 1: Автобус (если доступен)
    const busConnections = getConnectionBetweenCities(fromCity.id, toCity.id, TransportType.BUS);
    if (busConnections.length > 0) {
      const connection = busConnections[0];
      const seasonality = createSeasonality(
        this.mapSeasonFromConnection(connection.season),
        undefined,
        date
      );

      if (seasonality.available) {
        const fromStops = this.getStopsForCityAndType(fromCity.id, TransportType.BUS);
        const toStops = this.getStopsForCityAndType(toCity.id, TransportType.BUS);

        if (fromStops.length > 0 && toStops.length > 0) {
          const segment = await this.buildSegment(
            TransportType.BUS,
            fromStops[0],
            toStops[0],
            connection,
            seasonality,
            date
          );

          if (segment) {
            return this.createRoute(fromCity, toCity, [segment], date);
          }
        }
      }
    }

    // Приоритет 2: Поезд (если доступен)
    const trainConnections = getConnectionBetweenCities(fromCity.id, toCity.id, TransportType.TRAIN);
    if (trainConnections.length > 0) {
      const connection = trainConnections[0];
      const seasonality = createSeasonality(
        this.mapSeasonFromConnection(connection.season),
        undefined,
        date
      );

      if (seasonality.available) {
        const fromStops = this.getStopsForCityAndType(fromCity.id, TransportType.TRAIN);
        const toStops = this.getStopsForCityAndType(toCity.id, TransportType.TRAIN);

        if (fromStops.length > 0 && toStops.length > 0) {
          const segment = await this.buildSegment(
            TransportType.TRAIN,
            fromStops[0],
            toStops[0],
            connection,
            seasonality,
            date
          );

          if (segment) {
            return this.createRoute(fromCity, toCity, [segment], date);
          }
        }
      }
    }

    // Приоритет 3: Паром (только летом)
    if (season === Season.SUMMER || season === Season.ALL) {
      const ferryRoute = await this.buildRouteViaRivers(fromCity, toCity, season, date);
      if (ferryRoute) {
        return ferryRoute;
      }
    }

    // Приоритет 4: Зимник (только зимой)
    if (season === Season.WINTER || season === Season.ALL) {
      const winterRoadConnections = getConnectionBetweenCities(fromCity.id, toCity.id, TransportType.WINTER_ROAD);
      if (winterRoadConnections.length > 0) {
        const connection = winterRoadConnections[0];
        const seasonality = createSeasonality(
          this.mapSeasonFromConnection(connection.season),
          undefined,
          date
        );

        if (seasonality.available) {
          const fromStops = this.getStopsForCityAndType(fromCity.id, TransportType.WINTER_ROAD);
          const toStops = this.getStopsForCityAndType(toCity.id, TransportType.WINTER_ROAD);

          if (fromStops.length > 0 && toStops.length > 0) {
            const segment = await this.buildSegment(
              TransportType.WINTER_ROAD,
              fromStops[0],
              toStops[0],
              connection,
              seasonality,
              date
            );

            if (segment) {
              return this.createRoute(fromCity, toCity, [segment], date);
            }
          }
        }
      }
    }

    // Приоритет 5: Авиа (последний, самый дорогой)
    const airplaneRoute = await this.buildRouteViaHubs(fromCity, toCity, season, date);
    if (airplaneRoute) {
      return airplaneRoute;
    }

    return null;
  }

  /**
   * Строит маршрут через промежуточные города
   */
  private async buildRouteViaCities(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date,
    preferredTransport: TransportType | undefined,
    maxTransfers: number
  ): Promise<SmartRoute | null> {
    console.log('[SmartRouteBuilder] buildRouteViaCities called:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      season,
      preferredTransport,
      maxTransfers,
    });

    // Упрощённая версия: ищем путь через один промежуточный город
    // В полной версии здесь должен быть алгоритм поиска пути в графе

    const intermediateCities = ALL_CITIES.filter(
      (city) => city.id !== fromCity.id && city.id !== toCity.id
    );

    // КРИТИЧЕСКИЙ ФИКС: Приоритизируем хабы при поиске через промежуточные города
    const hubCities = intermediateCities.filter((city) => city.isHub);
    const nonHubCities = intermediateCities.filter((city) => !city.isHub);
    const prioritizedCities = [...hubCities, ...nonHubCities];

    // ✅ ФИКС: Увеличиваем лимит проверяемых городов до 30 (все хабы + основные города)
    // Это гарантирует проверку всех хабов и основных промежуточных городов
    const maxCitiesToCheck = 30;

    console.log('[SmartRouteBuilder] buildRouteViaCities - intermediate cities:', {
      total: intermediateCities.length,
      hubs: hubCities.length,
      nonHubs: nonHubCities.length,
      maxCitiesToCheck,
      prioritized: prioritizedCities.slice(0, maxCitiesToCheck).map(c => ({ id: c.id, name: c.name, isHub: c.isHub })),
    });
    for (const intermediateCity of prioritizedCities.slice(0, maxCitiesToCheck)) {
      console.log('[SmartRouteBuilder] buildRouteViaCities - trying intermediate city:', {
        intermediateCityId: intermediateCity.id,
        intermediateCityName: intermediateCity.name,
        isHub: intermediateCity.isHub,
      });
      // Проверяем: fromCity -> intermediateCity -> toCity
      // ФАЗА 2 ФИКС: Изменяем приоритеты типов транспорта
      // Приоритет: BUS (самый доступный) → TRAIN → FERRY → WINTER_ROAD → AIRPLANE (последний, самый дорогой)
      // Это позволяет находить более реалистичные и доступные маршруты
      const allTransportTypes = preferredTransport
        ? [preferredTransport]
        : [
            TransportType.BUS,        // Приоритет 1: Автобус (самый доступный)
            TransportType.TRAIN,      // Приоритет 2: Поезд (стабильный)
            TransportType.FERRY,      // Приоритет 3: Паром (сезонный)
            TransportType.WINTER_ROAD, // Приоритет 4: Зимник (только зимой)
            TransportType.AIRPLANE,   // Приоритет 5: Авиа (последний, самый дорогой)
          ];

      // Проверяем все комбинации типов транспорта для двух сегментов
      for (const transportType1 of allTransportTypes) {
        if (!this.isTransportAvailableInSeason(transportType1, season)) {
          continue;
        }

        const connectionType1 = this.mapTransportTypeToConnectionType(transportType1);
        if (!connectionType1) {
          continue;
        }

        const segment1Connections = getConnectionBetweenCities(fromCity.id, intermediateCity.id, connectionType1);
        if (segment1Connections.length === 0) {
          continue;
        }

        // Для второго сегмента проверяем все типы транспорта
        for (const transportType2 of allTransportTypes) {
          if (!this.isTransportAvailableInSeason(transportType2, season)) {
            continue;
          }

          const connectionType2 = this.mapTransportTypeToConnectionType(transportType2);
          if (!connectionType2) {
            continue;
          }

          const segment2Connections = getConnectionBetweenCities(intermediateCity.id, toCity.id, connectionType2);

          console.log('[SmartRouteBuilder] buildRouteViaCities - connections found:', {
            transportType1,
            transportType2,
            intermediateCityId: intermediateCity.id,
            segment1Connections: segment1Connections.length,
            segment2Connections: segment2Connections.length,
            segment1ConnectionIds: segment1Connections.map(c => c.id),
            segment2ConnectionIds: segment2Connections.map(c => c.id),
          });

          if (segment2Connections.length === 0) {
            continue;
          }

          // Строим два сегмента с разными типами транспорта
          console.log('[SmartRouteBuilder] buildRouteViaCities - building segment1:', {
            fromCityId: fromCity.id,
            intermediateCityId: intermediateCity.id,
            connectionId: segment1Connections[0].id,
            transportType: transportType1,
          });
          const segment1 = await this.buildSegmentForConnection(
            fromCity.id,
            intermediateCity.id,
            segment1Connections[0],
            season,
            date
          );

          console.log('[SmartRouteBuilder] buildRouteViaCities - building segment2:', {
            intermediateCityId: intermediateCity.id,
            toCityId: toCity.id,
            connectionId: segment2Connections[0].id,
            transportType: transportType2,
          });
          const segment2 = await this.buildSegmentForConnection(
            intermediateCity.id,
            toCity.id,
            segment2Connections[0],
            season,
            date
          );

          console.log('[SmartRouteBuilder] buildRouteViaCities - segments built:', {
            segment1: segment1 ? { id: segment1.id, type: segment1.type } : null,
            segment2: segment2 ? { id: segment2.id, type: segment2.type } : null,
          });

          if (segment1 && segment2) {
            const route = await this.createRoute(fromCity, toCity, [segment1, segment2], date);
            if (route) {
          console.log('[SmartRouteBuilder] buildRouteViaCities - route created successfully:', {
            routeId: route.id,
            segmentsCount: route.segments.length,
            segment1Type: segment1.type,
            segment2Type: segment2.type,
            transportType1,
            transportType2,
            intermediateCityId: intermediateCity.id,
          });
          // ФАЗА 2 ФИКС: Возвращаем маршрут сразу при нахождении (не ждём лучший)
          // Это позволяет находить более доступные маршруты (BUS, TRAIN) раньше дорогих (AIRPLANE)
          return route;
            } else {
              console.error('[SmartRouteBuilder] buildRouteViaCities - createRoute returned null:', {
                fromCityId: fromCity.id,
                toCityId: toCity.id,
                segment1Id: segment1.id,
                segment2Id: segment2.id,
              });
            }
          } else {
            console.error('[SmartRouteBuilder] buildRouteViaCities - segment build failed:', {
              fromCityId: fromCity.id,
              intermediateCityId: intermediateCity.id,
              toCityId: toCity.id,
              transportType1,
              transportType2,
              segment1Failed: !segment1,
              segment2Failed: !segment2,
            });
          }
        }
      }
    }

    // КРИТИЧЕСКИЙ ФИКС: Если маршрут с 2 сегментами не найден, пробуем через 3+ сегмента
    // maxTransfers = 3 означает до 4 сегментов (0 transfers = 1 segment, 1 transfer = 2 segments, 2 transfers = 3 segments, 3 transfers = 4 segments)
    if (maxTransfers >= 2) {
      console.log('[SmartRouteBuilder] buildRouteViaCities - trying routes with 3+ segments:', {
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        maxTransfers,
        maxSegments: maxTransfers + 1,
      });
      
      const routeWithMultipleSegments = await this.buildRouteWithMultipleSegments(
        fromCity,
        toCity,
        season,
        date,
        preferredTransport,
        maxTransfers
      );
      
      if (routeWithMultipleSegments) {
        console.log('[SmartRouteBuilder] buildRouteViaCities - route with multiple segments found:', {
          routeId: routeWithMultipleSegments.id,
          segmentsCount: routeWithMultipleSegments.segments.length,
        });
        return routeWithMultipleSegments;
      }
    }

    // ФАЗА 3 ФИКС: Улучшаем логирование для отладки
    console.error('[SmartRouteBuilder] buildRouteViaCities - no route found after trying all intermediate cities:', {
      fromCityId: fromCity.id,
      fromCityName: fromCity.name,
      toCityId: toCity.id,
      toCityName: toCity.name,
      season,
      preferredTransport,
      maxTransfers,
      triedCities: prioritizedCities.slice(0, maxCitiesToCheck).map(c => ({ 
        id: c.id, 
        name: c.name, 
        isHub: c.isHub,
        hasAirport: c.infrastructure.hasAirport,
        hasTrainStation: c.infrastructure.hasTrainStation,
        hasBusStation: c.infrastructure.hasBusStation,
      })),
      totalCitiesChecked: Math.min(maxCitiesToCheck, prioritizedCities.length),
      totalCitiesAvailable: prioritizedCities.length,
      // Добавляем информацию о том, какие типы транспорта проверялись
      checkedTransportTypes: preferredTransport 
        ? [preferredTransport] 
        : [TransportType.BUS, TransportType.TRAIN, TransportType.FERRY, TransportType.WINTER_ROAD, TransportType.AIRPLANE],
      // ФАЗА 3 ФИКС: Добавляем информацию о доступных соединениях
      availableConnectionsFrom: getConnectionsFromCity(fromCity.id).map(c => ({ 
        id: c.id, 
        type: c.type, 
        toCityId: c.toCityId 
      })),
      availableConnectionsTo: getConnectionsToCity(toCity.id).map(c => ({ 
        id: c.id, 
        type: c.type, 
        fromCityId: c.fromCityId 
      })),
    });

    return null;
  }

  /**
   * КРИТИЧЕСКИЙ ФИКС: Строит маршрут через несколько промежуточных городов (3+ сегмента)
   * 
   * Использует алгоритм поиска пути в графе (BFS) для нахождения маршрута
   * через несколько промежуточных городов с учётом maxTransfers.
   */
  private async buildRouteWithMultipleSegments(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date,
    preferredTransport: TransportType | undefined,
    maxTransfers: number
  ): Promise<SmartRoute | null> {
    console.log('[SmartRouteBuilder] buildRouteWithMultipleSegments called:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      season,
      preferredTransport,
      maxTransfers,
      maxSegments: maxTransfers + 1,
    });

    // Максимальное количество сегментов = maxTransfers + 1
    // maxTransfers = 3 означает до 4 сегментов
    const maxSegments = maxTransfers + 1;
    if (maxSegments < 3) {
      // Если maxSegments < 3, это уже обрабатывается в buildRouteViaCities
      return null;
    }

    // Используем BFS для поиска пути в графе
    interface QueueItem {
      cityId: string;
      path: Array<{ cityId: string; connectionId: string; transportType: TransportType }>;
      visited: Set<string>;
    }

    const queue: QueueItem[] = [{
      cityId: fromCity.id,
      path: [],
      visited: new Set([fromCity.id]),
    }];

    const allTransportTypes = preferredTransport
      ? [preferredTransport]
      : [
          TransportType.BUS,
          TransportType.TRAIN,
          TransportType.FERRY,
          TransportType.WINTER_ROAD,
          TransportType.AIRPLANE,
        ];

    // Ограничиваем глубину поиска для производительности
    const maxDepth = Math.min(maxSegments, 5); // Максимум 5 сегментов для производительности
    let iterations = 0;
    const maxIterations = 1000; // Защита от бесконечного цикла

    while (queue.length > 0 && iterations < maxIterations) {
      iterations++;
      const current = queue.shift()!;

      // КРИТИЧЕСКИЙ ФИКС: Проверяем цель ПЕРЕД проверкой глубины
      // Если достигли цели, строим маршрут (даже если путь длинный)
      if (current.cityId === toCity.id && current.path.length >= 1) {
        console.log('[SmartRouteBuilder] buildRouteWithMultipleSegments - path found:', {
          fromCityId: fromCity.id,
          toCityId: toCity.id,
          pathLength: current.path.length,
          path: current.path.map(p => ({ cityId: p.cityId, transportType: p.transportType })),
        });

        // Строим сегменты для найденного пути
        const segments: SmartRouteSegment[] = [];
        let previousCityId = fromCity.id;

        for (const pathItem of current.path) {
          const connection = ALL_CONNECTIONS.find(c => c.id === pathItem.connectionId);
          if (!connection) {
            console.error('[SmartRouteBuilder] buildRouteWithMultipleSegments - connection not found:', {
              connectionId: pathItem.connectionId,
            });
            return null;
          }

          const segment = await this.buildSegmentForConnection(
            previousCityId,
            pathItem.cityId,
            connection,
            season,
            date
          );

          if (!segment) {
            console.error('[SmartRouteBuilder] buildRouteWithMultipleSegments - segment build failed:', {
              fromCityId: previousCityId,
              toCityId: pathItem.cityId,
              connectionId: pathItem.connectionId,
            });
            return null;
          }

          segments.push(segment);
          previousCityId = pathItem.cityId;
        }

        if (segments.length > 0) {
          const route = await this.createRoute(fromCity, toCity, segments, date);
          if (route) {
            console.log('[SmartRouteBuilder] buildRouteWithMultipleSegments - route created:', {
              routeId: route.id,
              segmentsCount: route.segments.length,
            });
            return route;
          }
        }

        continue;
      }

      // Если достигли максимальной глубины, пропускаем (только если не достигли цели)
      if (current.path.length >= maxDepth) {
        continue;
      }

      // Ищем все возможные соединения из текущего города
      const connectionsFrom = getConnectionsFromCity(current.cityId);
      
      // КРИТИЧЕСКИЙ ФИКС: Логируем для диагностики (только первые несколько итераций)
      if (iterations <= 5 || (iterations % 20 === 0)) {
        console.log('[SmartRouteBuilder] buildRouteWithMultipleSegments - processing:', {
          iteration: iterations,
          currentCityId: current.cityId,
          pathLength: current.path.length,
          connectionsFromCount: connectionsFrom.length,
          visitedCities: Array.from(current.visited),
        });
      }
      
      let addedToQueue = 0;
      for (const connection of connectionsFrom) {
        // Пропускаем, если город уже посещён (избегаем циклов)
        if (current.visited.has(connection.toCityId)) {
          continue;
        }

        // Проверяем сезонность
        const connectionSeason = this.mapSeasonFromConnection(connection.season);
        if (connectionSeason !== 'all' && connectionSeason !== season) {
          if (iterations <= 5) {
            console.log('[SmartRouteBuilder] buildRouteWithMultipleSegments - connection skipped (season):', {
              connectionId: connection.id,
              connectionSeason,
              requiredSeason: season,
            });
          }
          continue;
        }

        // Определяем тип транспорта (используем существующий метод)
        const transportType = this.mapConnectionTypeToTransportType(connection.type);
        if (transportType === TransportType.UNKNOWN) {
          continue;
        }

        // Проверяем доступность транспорта в сезон
        if (!this.isTransportAvailableInSeason(transportType, season)) {
          if (iterations <= 5) {
            console.log('[SmartRouteBuilder] buildRouteWithMultipleSegments - connection skipped (transport not available):', {
              connectionId: connection.id,
              transportType,
              season,
            });
          }
          continue;
        }

        // Если указан preferredTransport, проверяем соответствие
        if (preferredTransport && transportType !== preferredTransport) {
          continue;
        }

        // Добавляем в очередь
        const newVisited = new Set(current.visited);
        newVisited.add(connection.toCityId);

        queue.push({
          cityId: connection.toCityId,
          path: [
            ...current.path,
            {
              cityId: connection.toCityId,
              connectionId: connection.id,
              transportType,
            },
          ],
          visited: newVisited,
        });
        addedToQueue++;
      }
      
      // КРИТИЧЕСКИЙ ФИКС: Логируем, если ничего не добавили в очередь
      if (addedToQueue === 0 && iterations <= 10) {
        console.warn('[SmartRouteBuilder] buildRouteWithMultipleSegments - no connections added to queue:', {
          iteration: iterations,
          currentCityId: current.cityId,
          connectionsFromCount: connectionsFrom.length,
          connectionsFrom: connectionsFrom.map(c => ({
            id: c.id,
            type: c.type,
            fromCityId: c.fromCityId,
            toCityId: c.toCityId,
            season: c.season,
          })),
        });
      }
    }

    if (iterations >= maxIterations) {
      console.warn('[SmartRouteBuilder] buildRouteWithMultipleSegments - max iterations reached:', {
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        maxIterations,
      });
    }

    console.log('[SmartRouteBuilder] buildRouteWithMultipleSegments - no route found:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      maxSegments,
      iterations,
      queueSize: queue.length,
      // КРИТИЧЕСКИЙ ФИКС: Логируем доступные соединения для диагностики
      availableConnectionsFromStart: getConnectionsFromCity(fromCity.id).map(c => ({
        id: c.id,
        type: c.type,
        toCityId: c.toCityId,
        season: c.season,
      })),
      availableConnectionsToEnd: getConnectionsToCity(toCity.id).map(c => ({
        id: c.id,
        type: c.type,
        fromCityId: c.fromCityId,
        season: c.season,
      })),
    });

    return null;
  }


  /**
   * ФАЗА 3 ФИКС: Строит fallback маршрут через любые доступные соединения
   * 
   * Используется когда основные методы не находят маршрут.
   * Пытается построить маршрут через любые доступные соединения,
   * даже если они не реалистичны (для демонстрации).
   */
  private async buildFallbackRoute(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    season: Season,
    date: Date
  ): Promise<SmartRoute | null> {
    console.log('[SmartRouteBuilder] buildFallbackRoute called:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
      season,
    });

    // Ищем любое соединение между городами (любого типа)
    const allConnectionTypes: ConnectionType[] = ['airplane', 'train', 'bus', 'ferry', 'winter_road'];
    
    for (const connectionType of allConnectionTypes) {
      const connections = getConnectionBetweenCities(fromCity.id, toCity.id, connectionType);
      
      if (connections.length > 0) {
        console.log('[SmartRouteBuilder] buildFallbackRoute - found direct connection:', {
          connectionId: connections[0].id,
          connectionType,
          fromCityId: fromCity.id,
          toCityId: toCity.id,
        });
        
        // Пытаемся построить сегмент
        const segment = await this.buildSegmentForConnection(
          fromCity.id,
          toCity.id,
          connections[0],
          season,
          date
        );
        
        if (segment) {
          const route = await this.createRoute(fromCity, toCity, [segment], date);
          if (route) {
            console.log('[SmartRouteBuilder] buildFallbackRoute - route created:', {
              routeId: route.id,
              connectionType,
            });
            return route;
          }
        }
      }
    }

    // Если прямого соединения нет, пытаемся через промежуточные города
    // Используем упрощённый алгоритм: ищем любой путь через один промежуточный город
    const intermediateCities = ALL_CITIES.filter(
      (city) => city.id !== fromCity.id && city.id !== toCity.id
    );

    // Приоритизируем хабы
    const hubCities = intermediateCities.filter((city) => city.isHub);
    const prioritizedCities = [...hubCities, ...intermediateCities.filter((city) => !city.isHub)];

    for (const intermediateCity of prioritizedCities.slice(0, 10)) {
      // Проверяем соединения: fromCity → intermediateCity и intermediateCity → toCity
      const connectionsFrom = getConnectionsFromCity(fromCity.id);
      const connectionsTo = getConnectionsToCity(toCity.id);
      
      const segment1Connections = connectionsFrom.filter(c => c.toCityId === intermediateCity.id);
      const segment2Connections = connectionsTo.filter(c => c.fromCityId === intermediateCity.id);
      
      if (segment1Connections.length > 0 && segment2Connections.length > 0) {
        console.log('[SmartRouteBuilder] buildFallbackRoute - found path via intermediate city:', {
          intermediateCityId: intermediateCity.id,
          segment1ConnectionId: segment1Connections[0].id,
          segment2ConnectionId: segment2Connections[0].id,
        });
        
        // Строим сегменты
        const segment1 = await this.buildSegmentForConnection(
          fromCity.id,
          intermediateCity.id,
          segment1Connections[0],
          season,
          date
        );
        
        const segment2 = await this.buildSegmentForConnection(
          intermediateCity.id,
          toCity.id,
          segment2Connections[0],
          season,
          date
        );
        
        if (segment1 && segment2) {
          const route = await this.createRoute(fromCity, toCity, [segment1, segment2], date);
          if (route) {
            console.log('[SmartRouteBuilder] buildFallbackRoute - route via intermediate city created:', {
              routeId: route.id,
              intermediateCityId: intermediateCity.id,
            });
            return route;
          }
        }
      }
    }

    console.error('[SmartRouteBuilder] buildFallbackRoute - no fallback route found:', {
      fromCityId: fromCity.id,
      toCityId: toCity.id,
    });

    return null;
  }

  /**
   * Строит сегмент для соединения
   */
  private async buildSegmentForConnection(
    fromCityId: string,
    toCityId: string,
    connection: typeof ALL_CONNECTIONS[0],
    season: Season,
    date: Date
  ): Promise<SmartRouteSegment | null> {
    console.log('[SmartRouteBuilder] buildSegmentForConnection called:', {
      fromCityId,
      toCityId,
      connectionId: connection.id,
      connectionType: connection.type,
      connectionSeason: connection.season,
    });

    const fromCity = getCityById(fromCityId);
    const toCity = getCityById(toCityId);

    if (!fromCity || !toCity) {
      console.error('[SmartRouteBuilder] buildSegmentForConnection - city not found:', {
        fromCityId,
        toCityId,
        fromCityFound: !!fromCity,
        toCityFound: !!toCity,
      });
      return null;
    }

    const transportType = this.mapConnectionTypeToTransportType(connection.type);
    const fromStops = this.getStopsForCityAndType(fromCityId, transportType);
    const toStops = this.getStopsForCityAndType(toCityId, transportType);

    console.log('[SmartRouteBuilder] buildSegmentForConnection - stops found:', {
      fromCityId,
      toCityId,
      transportType,
      fromStopsCount: fromStops.length,
      toStopsCount: toStops.length,
      fromStopIds: fromStops.map(s => s.id),
      toStopIds: toStops.map(s => s.id),
    });

    if (fromStops.length === 0 || toStops.length === 0) {
      console.error('[SmartRouteBuilder] buildSegmentForConnection - no stops found:', {
        fromCityId,
        toCityId,
        transportType,
        fromStopsCount: fromStops.length,
        toStopsCount: toStops.length,
      });
      return null;
    }

    const seasonality = createSeasonality(
      this.mapSeasonFromConnection(connection.season),
      undefined,
      date
    );

    console.log('[SmartRouteBuilder] buildSegmentForConnection - seasonality:', {
      connectionSeason: connection.season,
      seasonalityAvailable: seasonality.available,
      seasonalitySeason: seasonality.season,
      currentSeason: season,
    });

    if (!seasonality.available) {
      console.error('[SmartRouteBuilder] buildSegmentForConnection - seasonality not available:', {
        fromCityId,
        toCityId,
        connectionId: connection.id,
        connectionSeason: connection.season,
        seasonalityAvailable: seasonality.available,
        currentSeason: season,
      });
      return null;
    }

    const segment = await this.buildSegment(
      transportType,
      fromStops[0],
      toStops[0],
      connection,
      seasonality,
      date
    );

    if (!segment) {
      console.error('[SmartRouteBuilder] buildSegmentForConnection - buildSegment returned null:', {
        fromCityId,
        toCityId,
        connectionId: connection.id,
        transportType,
        fromStopId: fromStops[0].id,
        toStopId: toStops[0].id,
      });
    } else {
      console.log('[SmartRouteBuilder] buildSegmentForConnection - segment built successfully:', {
        segmentId: segment.id,
        transportType: segment.type,
        fromStopId: segment.from.id,
        toStopId: segment.to.id,
      });
    }

    return segment;
  }

  /**
   * Строит сегмент маршрута
   */
  private async buildSegment(
    transportType: TransportType,
    from: IStop,
    to: IStop,
    connection: typeof ALL_CONNECTIONS[0],
    seasonality: ReturnType<typeof createSeasonality>,
    date: Date,
    viaHubs?: Hub[]
  ): Promise<SmartRouteSegment | null> {
    // КРИТИЧЕСКИЙ ФИКС: Проверяем, что transportType валиден
    if (!transportType || transportType === TransportType.UNKNOWN) {
      console.warn('[SmartRouteBuilder] buildSegment called with invalid transportType:', {
        transportType,
        from: from.id,
        to: to.id,
        connectionType: connection.type,
      });
      return null;
    }
    // Вычисляем расстояние
    // Для паромов передаём connection для получения метаданных о реке
    const distance = await this.distanceCalculator.calculateDistanceForSegment(
      transportType,
      from.coordinates,
      to.coordinates,
      connection
    );

    // Вычисляем цену
    const season = this.getSeasonFromDate(date.toISOString());
    const viaHubsCount = viaHubs ? viaHubs.length : 0;
    const price = this.priceCalculator.calculatePriceForSegment(
      transportType,
      {
        distance: distance.value,
        season,
        region: from.cityId.includes('yakutsk') || to.cityId.includes('yakutsk') ? 'yakutia' : 'russia',
        date,
        departureTime: date, // Можно улучшить, если будет отдельное время отправления
        transfersCount: 0, // Для отдельного сегмента пересадок нет
        taxiDistanceToStop: transportType === TransportType.AIRPLANE ? 15 : transportType === TransportType.TRAIN ? 5 : undefined,
      },
      connection,
      viaHubsCount,
      from.cityId
    );

    // Вычисляем длительность
    const durationMinutes = connection.duration || this.estimateDuration(transportType, distance.value);
    const duration = {
      value: durationMinutes,
      unit: 'minutes' as const,
      display: formatDuration(durationMinutes),
    };

    // Вычисляем путь
    let pathGeometry = await this.pathCalculator.calculatePathForSegment(
      transportType,
      from.coordinates,
      to.coordinates,
      connection,
      viaHubs
    );

    // CRITICAL: Validate pathGeometry coordinates (no NaN, null, or invalid values)
    if (pathGeometry && pathGeometry.coordinates) {
      const hasInvalidCoords = pathGeometry.coordinates.some(
        coord => !Array.isArray(coord) || 
                  coord.length !== 2 || 
                  isNaN(coord[0]) || 
                  isNaN(coord[1]) ||
                  !isFinite(coord[0]) ||
                  !isFinite(coord[1]) ||
                  coord[0] === null ||
                  coord[1] === null ||
                  coord[0] === undefined ||
                  coord[1] === undefined
      );
      
      if (hasInvalidCoords) {
        console.warn('[SmartRouteBuilder] Invalid coordinates in pathGeometry, using fallback (straight line):', {
          transportType,
          from: from.id,
          to: to.id,
          coordinatesCount: pathGeometry.coordinates.length,
        });
        // Use fallback: straight line between from and to
        pathGeometry = {
          type: 'LineString',
          coordinates: [
            [from.coordinates.longitude, from.coordinates.latitude],
            [to.coordinates.longitude, to.coordinates.latitude],
          ],
        };
      }
    } else if (!pathGeometry) {
      // If pathGeometry is null/undefined, create fallback
      console.warn('[SmartRouteBuilder] pathGeometry is null/undefined, using fallback (straight line):', {
        transportType,
        from: from.id,
        to: to.id,
      });
      pathGeometry = {
        type: 'LineString',
        coordinates: [
          [from.coordinates.longitude, from.coordinates.latitude],
          [to.coordinates.longitude, to.coordinates.latitude],
        ],
      };
    }

    // Создаём сегмент
    const segment = new SmartRouteSegment(
      `seg-${from.id}-${to.id}-${Date.now()}`,
      transportType,
      from,
      to,
      distance,
      duration,
      price,
      seasonality,
      pathGeometry,
      connection.isDirect,
      undefined, // intermediateStops
      viaHubs,
      {
        routeNumber: connection.metadata?.routeNumber,
        carrier: connection.metadata?.carrier,
      }
    );

    return segment;
  }

  /**
   * Создаёт умный маршрут из сегментов
   */
  private async createRoute(
    fromCity: typeof ALL_CITIES[0],
    toCity: typeof ALL_CITIES[0],
    segments: SmartRouteSegment[],
    date: Date
  ): Promise<SmartRoute | null> {
    if (segments.length === 0) {
      return null;
    }

    // Вычисляем общее расстояние
    const totalDistance = segments.reduce(
      (sum, seg) => sum + seg.distance.value,
      0
    );

    const distanceBreakdown = segments.reduce(
      (sum, seg) => ({
        airplane: sum.airplane + seg.distance.breakdown.airplane,
        train: sum.train + seg.distance.breakdown.train,
        bus: sum.bus + seg.distance.breakdown.bus,
        ferry: sum.ferry + seg.distance.breakdown.ferry,
        winter_road: sum.winter_road + seg.distance.breakdown.winter_road,
        taxi: sum.taxi + seg.distance.breakdown.taxi,
      }),
      { airplane: 0, train: 0, bus: 0, ferry: 0, winter_road: 0, taxi: 0 }
    );

    const totalDistanceModel = createDistanceModel(
      totalDistance,
      DistanceCalculationMethod.MANUAL,
      distanceBreakdown
    );

    // Вычисляем общую длительность
    const travelTime = segments.reduce((sum, seg) => sum + seg.duration.value, 0);
    const transferTime = this.estimateTransferTime(segments.length - 1);
    const totalDuration = {
      value: travelTime + transferTime,
      unit: 'minutes' as const,
      breakdown: {
        travel: travelTime,
        transfers: transferTime,
      },
      display: formatTotalDuration(travelTime, transferTime),
    };

    // Вычисляем общую цену
    const totalPrice = this.priceCalculator.calculateTotalPrice(segments);
    
    // Добавляем доплату за пересадки (если есть)
    const transfersCount = segments.length - 1;
    if (transfersCount > 0) {
      const transferFee = transfersCount * 750; // 750₽ за каждую пересадку
      totalPrice.additional.transfer = transferFee;
      totalPrice.total = totalPrice.base + 
        totalPrice.additional.taxi + 
        totalPrice.additional.transfer + 
        totalPrice.additional.baggage + 
        totalPrice.additional.fees;
      // Обновляем display
      totalPrice.display = this.formatPriceDisplay(totalPrice);
    }

    // Валидация
    const validation = this.validateRoute(segments);

    // Визуализация
          const visualization = createVisualizationMetadata(
            segments.map((seg) => ({
              geometry: seg.pathGeometry.coordinates,
              color: this.getColorForTransportType(seg.type),
              weight: seg.type === TransportType.TRAIN ? 3 : 2, // ЖД: 3px (как в ТЗ)
              style: this.getStyleForTransportType(seg.type),
            })),
            this.createMarkersForRoute(segments)
          );

    // Создаём City объекты из справочника
    const fromCityEntity = this.createCityEntity(fromCity);
    const toCityEntity = this.createCityEntity(toCity);

    const route = new SmartRoute(
      `route-${fromCity.id}-${toCity.id}-${Date.now()}`,
      fromCityEntity,
      toCityEntity,
      segments,
      totalDistanceModel,
      totalDuration,
      totalPrice,
      validation,
      visualization
    );

    return route;
  }

  /**
   * Валидирует маршрут
   */
  private validateRoute(segments: SmartRouteSegment[]): SmartRoute['validation'] {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Проверка связности сегментов
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i].to.id !== segments[i + 1].from.id) {
        errors.push(`Сегменты не связаны: ${segments[i].to.id} -> ${segments[i + 1].from.id}`);
      }
    }

    // Проверка сезонности
    for (const segment of segments) {
      if (!segment.seasonality.available) {
        errors.push(`Сегмент недоступен в текущий сезон: ${segment.id}`);
      }
    }

    // Проверка реалистичности цен
    for (const segment of segments) {
      if (segment.price.total <= 0) {
        errors.push(`Некорректная цена сегмента: ${segment.id}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Создаёт маркеры для визуализации
   */
  private createMarkersForRoute(segments: SmartRouteSegment[]): Array<{
    coordinates: import('../../../domain/smart-routing/value-objects/Coordinates').Coordinates;
    icon: 'airport' | 'train_station' | 'bus_station' | 'ferry_pier' | 'hub' | 'transfer';
    label?: string;
    type: 'start' | 'end' | 'transfer' | 'hub' | 'intermediate';
  }> {
    const markers: Array<{
      coordinates: import('../../../domain/smart-routing/value-objects/Coordinates').Coordinates;
      icon: 'airport' | 'train_station' | 'bus_station' | 'ferry_pier' | 'hub' | 'transfer';
      label?: string;
      type: 'start' | 'end' | 'transfer' | 'hub' | 'intermediate';
    }> = [];

    if (segments.length === 0) {
      return markers;
    }

    // Начальная точка
    markers.push({
      coordinates: segments[0].from.coordinates,
      icon: this.getIconForStopType(segments[0].from.type),
      label: segments[0].from.name,
      type: 'start',
    });

    // Промежуточные точки (пересадки)
    for (let i = 0; i < segments.length - 1; i++) {
      markers.push({
        coordinates: segments[i].to.coordinates,
        icon: 'transfer',
        label: segments[i].to.name,
        type: 'transfer',
      });
    }

    // Конечная точка
    markers.push({
      coordinates: segments[segments.length - 1].to.coordinates,
      icon: this.getIconForStopType(segments[segments.length - 1].to.type),
      label: segments[segments.length - 1].to.name,
      type: 'end',
    });

    return markers;
  }

  /**
   * Вспомогательные методы
   */

  private getStopsForCityAndType(cityId: string, transportType: TransportType | ConnectionType): IStop[] {
    const stops = getStopsByCity(cityId);
    // Конвертируем ConnectionType в TransportType если нужно
    const actualTransportType = typeof transportType === 'string' && !Object.values(TransportType).includes(transportType as any)
      ? this.mapConnectionTypeToTransportType(transportType as ConnectionType)
      : transportType as TransportType;
    const stopType = this.mapTransportTypeToStopType(actualTransportType);
    return stops.filter((s) => s.type === stopType);
  }

  private mapTransportTypeToStopType(transportType: TransportType): IStop['type'] {
    switch (transportType) {
      case TransportType.AIRPLANE:
        return 'airport';
      case TransportType.TRAIN:
        return 'train_station';
      case TransportType.BUS:
        return 'bus_station';
      case TransportType.FERRY:
        return 'ferry_pier';
      case TransportType.WINTER_ROAD:
        return 'winter_road_point';
      case TransportType.TAXI:
        return 'taxi_stand';
      case TransportType.UNKNOWN:
        return 'bus_station';
      default:
        return 'bus_station';
    }
  }

  /**
   * Конвертирует TransportType в ConnectionType
   * 
   * @param transportType - Тип транспорта
   * @returns Тип соединения (без taxi и unknown)
   */
  private mapTransportTypeToConnectionType(transportType: TransportType): ConnectionType | null {
    switch (transportType) {
      case TransportType.AIRPLANE:
        return 'airplane';
      case TransportType.TRAIN:
        return 'train';
      case TransportType.BUS:
        return 'bus';
      case TransportType.FERRY:
        return 'ferry';
      case TransportType.WINTER_ROAD:
        return 'winter_road';
      case TransportType.TAXI:
        return 'taxi';
      case TransportType.UNKNOWN:
        return null;
      default:
        return null;
    }
  }

  /**
   * Конвертирует ConnectionType в TransportType
   * 
   * @param connectionType - Тип соединения
   * @returns Тип транспорта
   */
  private mapConnectionTypeToTransportType(connectionType: ConnectionType): TransportType {
    switch (connectionType) {
      case 'airplane':
        return TransportType.AIRPLANE;
      case 'train':
        return TransportType.TRAIN;
      case 'bus':
        return TransportType.BUS;
      case 'ferry':
        return TransportType.FERRY;
      case 'winter_road':
        return TransportType.WINTER_ROAD;
      case 'taxi':
        return TransportType.TAXI;
      default:
        return TransportType.UNKNOWN;
    }
  }

  private isTransportAvailableInSeason(transportType: TransportType, season: Season): boolean {
    switch (transportType) {
      case TransportType.FERRY:
        return season === Season.SUMMER || season === Season.ALL;
      case TransportType.WINTER_ROAD:
        return season === Season.WINTER || season === Season.ALL;
      default:
        return true;
    }
  }

  private getSeasonFromDate(dateString: string): Season {
    const date = new Date(dateString);
    const month = date.getMonth() + 1; // 1-12
    const day = date.getDate();

    // Летний период: 1 июня - 18 октября
    if (
      (month === 6 && day >= 1) ||
      (month >= 7 && month <= 9) ||
      (month === 10 && day <= 18)
    ) {
      return Season.SUMMER;
    }

    // Зимний период: 1 ноября - 15 апреля (расширено до 1 ноября для корректной работы зимних маршрутов)
    if (
      (month === 11 && day >= 1) || // ✅ ФИКС: Добавляем ноябрь в зимний период
      month === 12 ||
      month === 1 ||
      month === 2 ||
      month === 3 ||
      (month === 4 && day <= 15)
    ) {
      return Season.WINTER;
    }

    // Переходный период
    return Season.TRANSITION;
  }

  private mapSeasonFromConnection(season: string): Season {
    switch (season) {
      case 'summer':
        return Season.SUMMER;
      case 'winter':
        return Season.WINTER;
      case 'transition':
        return Season.TRANSITION;
      default:
        return Season.ALL;
    }
  }

  private estimateDuration(transportType: TransportType, distanceKm: number): number {
    // Средние скорости (км/ч)
    const speeds: Record<TransportType, number> = {
      [TransportType.AIRPLANE]: 800,
      [TransportType.TRAIN]: 80,
      [TransportType.BUS]: 60,
      [TransportType.FERRY]: 30,
      [TransportType.WINTER_ROAD]: 50,
      [TransportType.TAXI]: 40,
      [TransportType.UNKNOWN]: 60,
    };

    const speed = speeds[transportType] || 60;
    const hours = distanceKm / speed;
    return Math.round(hours * 60); // В минутах
  }

  private estimateTransferTime(transferCount: number): number {
    // Оценочное время пересадки: 30 минут на каждую пересадку
    return transferCount * 30;
  }

  /**
   * Форматирует отображение цены с разбивкой
   * 
   * Пример: "15600₽ (+600₽ такси +2000₽ багаж +1000₽ сборы)"
   * Или: "12000₽ (+100 км такси: 3500₽) (+5000₽ ЖД)"
   */
  private formatPriceDisplay(price: { base: number; additional: { taxi: number; transfer: number; baggage: number; fees: number }; total: number }): string {
    const parts: string[] = [];
    
    if (price.additional.taxi > 0) {
      parts.push(`+${price.additional.taxi}₽ такси`);
    }
    if (price.additional.transfer > 0) {
      parts.push(`+${price.additional.transfer}₽ пересадки`);
    }
    if (price.additional.baggage > 0) {
      parts.push(`+${price.additional.baggage}₽ багаж`);
    }
    if (price.additional.fees > 0) {
      parts.push(`+${price.additional.fees}₽ сборы`);
    }

    if (parts.length > 0) {
      return `${price.total}₽ (${parts.join(' ')})`;
    }
    return `${price.total}₽`;
  }

  private getColorForTransportType(transportType: TransportType): string {
    const colors: Record<TransportType, string> = {
      [TransportType.AIRPLANE]: '#0066CC', // Голубой
      [TransportType.TRAIN]: '#FF6600', // Оранжевый (как в ТЗ)
      [TransportType.BUS]: '#00CC00', // Зелёный
      [TransportType.FERRY]: '#00CCFF', // Голубой (как в ТЗ)
      [TransportType.WINTER_ROAD]: '#CCCCCC', // Светло-серый (как в ТЗ)
      [TransportType.TAXI]: '#FF9900', // Оранжевый
      [TransportType.UNKNOWN]: '#000000', // Чёрный
    };
    return colors[transportType] || '#000000';
  }

  private getStyleForTransportType(transportType: TransportType): 'solid' | 'dashed' | 'dotted' | 'wavy' {
    switch (transportType) {
      case TransportType.AIRPLANE:
        return 'dashed'; // Ломаная линия для авиа
      case TransportType.TRAIN:
        return 'solid'; // Сплошная линия для ЖД (вдоль трасс)
      case TransportType.FERRY:
        return 'wavy'; // Волнистая линия для паромов
      case TransportType.WINTER_ROAD:
        return 'dotted'; // Пунктирная линия для зимников
      default:
        return 'solid';
    }
  }

  private getIconForStopType(
    stopType: IStop['type']
  ): 'airport' | 'train_station' | 'bus_station' | 'ferry_pier' | 'hub' | 'transfer' {
    switch (stopType) {
      case 'airport':
        return 'airport';
      case 'train_station':
        return 'train_station';
      case 'bus_station':
        return 'bus_station';
      case 'ferry_pier':
        return 'ferry_pier';
      default:
        return 'transfer';
    }
  }

  private createCityEntity(cityRef: typeof ALL_CITIES[0]): City {
    // Преобразуем CityReference в City entity
    const { City } = require('../../../domain/smart-routing/entities/City');
    const { Coordinates } = require('../../../domain/smart-routing/value-objects/Coordinates');
    const { HubLevel } = require('../../../domain/smart-routing/enums/HubLevel');

    const stops = getStopsByCity(cityRef.id);
    const hubLevel =
      cityRef.hubLevel === 'federal'
        ? HubLevel.FEDERAL
        : cityRef.hubLevel === 'regional'
          ? HubLevel.REGIONAL
          : undefined;

    const coords = new Coordinates(cityRef.coordinates.latitude, cityRef.coordinates.longitude);

    return new City(
      cityRef.id,
      cityRef.name,
      cityRef.normalizedName,
      cityRef.administrative,
      coords,
      cityRef.timezone,
      cityRef.isKeyCity,
      cityRef.isHub,
      hubLevel,
      cityRef.infrastructure,
      stops,
      cityRef.synonyms,
      cityRef.population
    );
  }
}

