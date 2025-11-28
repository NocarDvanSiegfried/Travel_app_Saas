/**
 * Контроллер для построения умных мультимодальных маршрутов
 * 
 * Предоставляет эндпоинт POST /smart-routes/build для построения
 * реалистичных маршрутов с учётом хабов, сезонности и валидации
 */

import type { Request, Response } from 'express';
import {
  SmartRouteBuilder,
  type BuildRouteParams,
  ConnectivityGuarantor,
} from '../../application/smart-routing/algorithms';
import { RouteValidator, RealityChecker } from '../../application/smart-routing/validation';
import { getCityById, searchCities, type CityReference } from '../../domain/smart-routing/data/cities-reference';
import { getStopsByCity } from '../../domain/smart-routing/data/stops-reference';
import { getUnifiedCity } from '../../shared/utils/unified-cities-loader';
import { normalizeCityName } from '../../shared/utils/city-normalizer';
import { AssessSegmentRiskUseCase } from '../../application/risk-engine';
import { RiskContext } from '../../application/risk-engine/base/RiskContext';
import type { IRouteSegment } from '../../domain/entities/RouteSegment';
import { TransportType } from '../../domain/entities/RouteSegment';
import type { IRiskScore } from '../../domain/entities/RiskAssessment';
import { RiskLevel } from '../../domain/entities/RiskAssessment';

/**
 * Нормализует строковое значение типа транспорта в enum TransportType
 */
function normalizeTransportType(input: string | unknown): TransportType {
  if (typeof input !== 'string') {
    return TransportType.UNKNOWN;
  }

  const normalized = input.trim().toUpperCase();

  if (normalized === 'AIRPLANE' || normalized === 'PLANE' || normalized === 'АВИА') {
    return TransportType.AIRPLANE;
  }
  if (normalized === 'BUS' || normalized === 'АВТОБУС') {
    return TransportType.BUS;
  }
  if (normalized === 'TRAIN' || normalized === 'ПОЕЗД') {
    return TransportType.TRAIN;
  }
  if (normalized === 'FERRY' || normalized === 'ПАРОМ' || normalized === 'ПАРОМНАЯ ПЕРЕПРАВА' || normalized === 'WATER') {
    return TransportType.FERRY;
  }
  if (normalized === 'TAXI' || normalized === 'ТАКСИ') {
    return TransportType.TAXI;
  }
  if (normalized === 'WINTER_ROAD' || normalized === 'ЗИМНИК') {
    return TransportType.WINTER_ROAD;
  }

  // Если уже валидное enum-значение
  if (Object.values(TransportType).includes(normalized as TransportType)) {
    return normalized as TransportType;
  }

  return TransportType.UNKNOWN;
}

/**
 * Тип для сегмента из JSON
 */
interface SegmentJSON {
  id?: string;
  type?: string | TransportType;
  from?: { id?: string };
  to?: { id?: string };
  metadata?: { routeNumber?: string };
  distance?: { value?: number };
  duration?: { value?: number };
  price?: { total?: number };
  riskScore?: IRiskScore;
  [key: string]: unknown;
}

/**
 * Тип для маршрута из JSON
 */
interface RouteJSON {
  id: string;
  fromCity: Record<string, unknown>;
  toCity: Record<string, unknown>;
  segments: SegmentJSON[];
  totalDistance: Record<string, unknown>;
  totalDuration: Record<string, unknown>;
  totalPrice: Record<string, unknown>;
  validation: Record<string, unknown>;
  visualization: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * @swagger
 * /smart-routes/build:
 *   post:
 *     summary: Построить умный мультимодальный маршрут
 *     description: Строит реалистичный маршрут между двумя городами с учётом хабов, сезонности, валидации и реалистичных путей
 *     tags: [Smart Routes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from
 *               - to
 *               - date
 *             properties:
 *               from:
 *                 type: string
 *                 description: ID города отправления или название города
 *                 example: "yakutsk"
 *               to:
 *                 type: string
 *                 description: ID города назначения или название города
 *                 example: "moscow"
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Дата поездки (ISO 8601)
 *                 example: "2024-07-15"
 *               preferredTransport:
 *                 type: string
 *                 enum: [airplane, train, bus, ferry, winter_road, taxi]
 *                 description: Предпочтительный тип транспорта (опционально)
 *                 example: "airplane"
 *               maxTransfers:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 5
 *                 default: 3
 *                 description: Максимальное количество пересадок
 *               priority:
 *                 type: string
 *                 enum: [price, time, comfort]
 *                 default: "price"
 *                 description: Приоритет оптимизации (цена/время/комфорт)
 *     responses:
 *       200:
 *         description: Маршрут успешно построен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 route:
 *                   type: object
 *                   description: Умный маршрут с сегментами, ценами, расстояниями и визуализацией
 *                   properties:
 *                     id:
 *                       type: string
 *                     riskScore:
 *                       $ref: '#/components/schemas/RiskScore'
 *                       description: Общий риск маршрута (максимум среди всех сегментов, опционально)
 *                     segments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           type:
 *                             type: string
 *                           riskScore:
 *                             $ref: '#/components/schemas/RiskScore'
 *                             description: Оценка риска для сегмента (опционально)
 *                 validation:
 *                   type: object
 *                   description: Результаты валидации маршрута
 *                 alternatives:
 *                   type: array
 *                   description: Альтернативные маршруты с оценкой риска (опционально)
 *                   items:
 *                     type: object
 *                 executionTimeMs:
 *                   type: integer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Маршрут не найден или города не найдены
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function buildSmartRoute(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  // КРИТИЧЕСКИЙ ФИКС: Добавляем логирование входа в контроллер
  console.log('[SmartRouteController] buildSmartRoute called:', {
    method: req.method,
    path: req.path,
    url: req.url,
    body: req.body,
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
  });

  try {
    // Получаем параметры из body
    const { from, to, date, preferredTransport, maxTransfers, priority } = req.body;

    // Валидация обязательных параметров
    if (!from || !to || !date) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Параметры "from", "to" и "date" обязательны',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Парсим дату
    let travelDate: Date;
    try {
      travelDate = new Date(date);
      if (isNaN(travelDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Неверный формат даты. Используйте ISO 8601 (YYYY-MM-DD).',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Находим города по ID или названию
    // CRITICAL: Add detailed logging for city resolution
    console.log('[SmartRouteController] Resolving cities:', {
      from: from,
      to: to,
      date: date,
    });

    // КРИТИЧЕСКИЙ ФИКС: Ищем город по id и по name (регистронезависимо)
    // Приоритет: 1) getCityById (если передан id), 2) searchCities (поиск по названию в cities-reference.ts), 3) unified reference
    let fromCityRef = getCityById(from);
    let fromSearchResults: CityReference[] = [];
    let fromUnifiedCity = null;
    
    if (!fromCityRef) {
      // Ищем по названию в cities-reference.ts
      fromSearchResults = searchCities(from);
      if (fromSearchResults.length > 0) {
        fromCityRef = fromSearchResults[0];
      } else {
        // Ищем в unified reference
        fromUnifiedCity = getUnifiedCity(from);
        if (fromUnifiedCity) {
          // Пытаемся найти в cities-reference.ts по названию из unified reference
          const unifiedSearchResults = searchCities(fromUnifiedCity.name);
          if (unifiedSearchResults.length > 0) {
            fromCityRef = unifiedSearchResults[0];
          }
        }
      }
    }
    
    if (!fromCityRef && !fromUnifiedCity) {
      console.error('[SmartRouteController] City not found (from):', {
        input: from,
        triedGetCityById: true,
        searchResultsCount: fromSearchResults.length,
        triedUnifiedReference: true,
      });
      res.status(404).json({
        success: false,
        error: {
          code: 'CITIES_NOT_FOUND',
          message: `Город отправления не найден: ${from}`,
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Аналогично для to
    let toCityRef = getCityById(to);
    let toSearchResults: CityReference[] = [];
    let toUnifiedCity = null;
    
    if (!toCityRef) {
      // Ищем по названию в cities-reference.ts
      toSearchResults = searchCities(to);
      if (toSearchResults.length > 0) {
        toCityRef = toSearchResults[0];
      } else {
        // Ищем в unified reference
        toUnifiedCity = getUnifiedCity(to);
        if (toUnifiedCity) {
          // Пытаемся найти в cities-reference.ts по названию из unified reference
          const unifiedSearchResults = searchCities(toUnifiedCity.name);
          if (unifiedSearchResults.length > 0) {
            toCityRef = unifiedSearchResults[0];
          }
        }
      }
    }
    
    if (!toCityRef && !toUnifiedCity) {
      console.error('[SmartRouteController] City not found (to):', {
        input: to,
        triedGetCityById: true,
        searchResultsCount: toSearchResults.length,
        triedUnifiedReference: true,
      });
      res.status(404).json({
        success: false,
        error: {
          code: 'CITIES_NOT_FOUND',
          message: `Город назначения не найден: ${to}`,
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // Определяем cityId: приоритет - cities-reference.ts, затем unified reference (генерируем id из normalizedName)
    const fromCityId = fromCityRef?.id || (fromUnifiedCity ? 
      normalizeCityName(fromUnifiedCity.normalizedName || fromUnifiedCity.name)
        .replace(/[^а-яёa-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') : null);
    const toCityId = toCityRef?.id || (toUnifiedCity ? 
      normalizeCityName(toUnifiedCity.normalizedName || toUnifiedCity.name)
        .replace(/[^а-яёa-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') : null);

    if (!fromCityId || !toCityId) {
      console.error('[SmartRouteController] Failed to resolve city IDs:', {
        from: from,
        to: to,
        fromCityId: fromCityId,
        toCityId: toCityId,
        fromCityRef: fromCityRef ? { id: fromCityRef.id, name: fromCityRef.name } : null,
        toCityRef: toCityRef ? { id: toCityRef.id, name: toCityRef.name } : null,
        fromSearchResults: fromSearchResults.map(c => ({ id: c.id, name: c.name })),
        toSearchResults: toSearchResults.map(c => ({ id: c.id, name: c.name })),
      });
      res.status(404).json({
        success: false,
        error: {
          code: 'CITIES_NOT_FOUND',
          message: `Город не найден: ${!fromCityId ? from : ''} ${!toCityId ? to : ''}`.trim(),
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    console.log('[SmartRouteController] Cities resolved:', {
      from: { 
        input: from, 
        cityId: fromCityId, 
        name: fromCityRef?.name || fromUnifiedCity?.name || fromSearchResults[0]?.name,
        source: fromCityRef ? 'cities-reference' : (fromUnifiedCity ? 'unified-reference' : 'unknown')
      },
      to: { 
        input: to, 
        cityId: toCityId, 
        name: toCityRef?.name || toUnifiedCity?.name || toSearchResults[0]?.name,
        source: toCityRef ? 'cities-reference' : (toUnifiedCity ? 'unified-reference' : 'unknown')
      },
    });

    // Парсим предпочтительный тип транспорта
    let preferredTransportType: BuildRouteParams['preferredTransport'] | undefined;
    if (preferredTransport) {
      // Нормализуем строку в enum, если это строка
      if (typeof preferredTransport === 'string') {
        preferredTransportType = normalizeTransportType(preferredTransport);
      } else if (Object.values(TransportType).includes(preferredTransport as TransportType)) {
        preferredTransportType = preferredTransport as TransportType;
      }
    }

    // Парсим приоритет
    const routePriority: BuildRouteParams['priority'] =
      priority && ['price', 'time', 'comfort'].includes(priority)
        ? (priority as BuildRouteParams['priority'])
        : 'price';

    // Парсим максимальное количество пересадок
    const maxTransfersCount =
      maxTransfers !== undefined
        ? Math.max(0, Math.min(5, parseInt(String(maxTransfers), 10) || 3))
        : 3;

    // Создаём параметры построения маршрута
    const buildParams: BuildRouteParams = {
      fromCityId: fromCityId,
      toCityId: toCityId,
      date: travelDate.toISOString().split('T')[0], // ISO date format YYYY-MM-DD
      preferredTransport: preferredTransportType,
      maxTransfers: maxTransfersCount,
      priority: routePriority,
    };

    console.log('[SmartRouteController] Building route with params:', {
      fromCityId,
      toCityId,
      date: buildParams.date,
      preferredTransport: preferredTransportType,
      maxTransfers: maxTransfersCount,
      priority: routePriority,
    });

    // Строим маршрут
    const routeBuilder = new SmartRouteBuilder();
    const result = await routeBuilder.buildRoute(buildParams);

    if (!result) {
      console.error('[SmartRouteController] Route not found:', {
        fromCityId,
        toCityId,
        date: buildParams.date,
        preferredTransport: preferredTransportType,
        maxTransfers: maxTransfersCount,
        priority: routePriority,
        reason: 'SmartRouteBuilder.buildRoute() returned null',
        fromCityName: fromCityRef?.name || fromUnifiedCity?.name,
        toCityName: toCityRef?.name || toUnifiedCity?.name,
      });
      
      // КРИТИЧЕСКИЙ ФИКС: Улучшаем сообщение об ошибке для пользователя
      const fromCityName = fromCityRef?.name || fromUnifiedCity?.name || from;
      const toCityName = toCityRef?.name || toUnifiedCity?.name || to;
      const errorMessage = `Маршрут не найден между городами ${fromCityName} и ${toCityName}`;
      
      // Определяем сезон из даты или из запроса
      const seasonFromRequest = req.body.season as string | undefined;
      let season: 'winter' | 'summer' | 'transition' | undefined;
      
      if (seasonFromRequest && ['winter', 'summer', 'transition'].includes(seasonFromRequest)) {
        season = seasonFromRequest as 'winter' | 'summer' | 'transition';
      } else if (travelDate) {
        // Определяем сезон из даты (месяц)
        const month = travelDate.getMonth() + 1; // 1-12
        if (month >= 11 || month <= 3) {
          season = 'winter'; // Ноябрь-Март
        } else if (month >= 6 && month <= 9) {
          season = 'summer'; // Июнь-Сентябрь
        } else {
          season = 'transition'; // Апрель-Май, Октябрь
        }
      }
      
      // Добавляем рекомендации в зависимости от сезона
      let recommendations: string[] = [];
      if (season === 'winter') {
        recommendations.push('Попробуйте поискать маршрут в летний период (июнь-октябрь)');
        recommendations.push('Проверьте наличие зимних дорог между городами');
      } else if (season === 'summer') {
        recommendations.push('Попробуйте поискать маршрут в зимний период (ноябрь-апрель)');
        recommendations.push('Проверьте наличие паромных соединений между городами');
      } else {
        recommendations.push('Попробуйте изменить дату поездки');
        recommendations.push('Проверьте наличие прямых или транзитных соединений');
      }
      
      res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: errorMessage,
          recommendations,
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    console.log('[SmartRouteController] Route built successfully:', {
      routeId: result.route.id,
      segmentsCount: result.route.segments.length,
      totalDistance: result.route.totalDistance.value,
      totalDuration: result.route.totalDuration.value,
      totalPrice: result.route.totalPrice.total,
      alternativesCount: result.alternatives?.length || 0,
    });

    // Валидируем маршрут
    const validator = new RouteValidator();
    const validation = validator.validateRoute(result.route, travelDate);

    // Оцениваем риск для каждого сегмента основного маршрута
    const segmentRiskUseCase = new AssessSegmentRiskUseCase();
    const riskContext = new RiskContext(
      buildParams.date,
      req.body.passengers || 1
    );

    const routeJSON = result.route.toJSON() as RouteJSON;
    if (routeJSON.segments && Array.isArray(routeJSON.segments)) {
      const segmentsWithRisk = await Promise.all(
        result.route.segments.map(async (segment, idx) => {
          try {
            const routeSegment: IRouteSegment = {
              segmentId: segment.id,
              fromStopId: segment.from.id,
              toStopId: segment.to.id,
              routeId: segment.metadata?.routeNumber || '',
              transportType: typeof segment.type === 'string' ? normalizeTransportType(segment.type) : segment.type,
              distance: segment.distance.value,
              estimatedDuration: segment.duration.value,
              basePrice: segment.price.total,
            };

            const segmentAssessment = await segmentRiskUseCase.execute(
              routeSegment,
              riskContext
            );

            return {
              ...routeJSON.segments[idx],
              riskScore: segmentAssessment.riskScore,
            };
          } catch (error) {
            console.warn('[SmartRouteController] Failed to assess segment risk', {
              segmentId: segment.id,
              error,
            });
            return routeJSON.segments[idx];
          }
        })
      );
      routeJSON.segments = segmentsWithRisk;

      // Вычисляем общий маршрутный риск как максимум среди всех сегментов
      const segmentRiskScores = segmentsWithRisk
        .map((seg) => seg.riskScore)
        .filter((riskScore): riskScore is IRiskScore => riskScore !== undefined && riskScore !== null);

      if (segmentRiskScores.length > 0) {
        // Находим максимальное значение riskScore.value
        const maxRiskValue = Math.max(...segmentRiskScores.map((rs) => rs.value));
        const maxRiskScore = segmentRiskScores.find((rs) => rs.value === maxRiskValue)!;

        // Вычисляем level на основе значения (на случай, если level не совпадает с value)
        const getRiskLevelFromValue = (value: number): RiskLevel => {
          if (value <= 2) return RiskLevel.VERY_LOW;
          if (value <= 4) return RiskLevel.LOW;
          if (value <= 6) return RiskLevel.MEDIUM;
          if (value <= 8) return RiskLevel.HIGH;
          return RiskLevel.VERY_HIGH;
        };

        // Добавляем общий риск маршрута
        routeJSON.riskScore = {
          value: maxRiskValue,
          level: getRiskLevelFromValue(maxRiskValue),
          description: `Общий риск маршрута: ${maxRiskScore.description}`,
        };
      }
    }

    // Оцениваем риск для альтернативных маршрутов
    let alternativesWithRisk = result.alternatives?.map((alt) => alt.toJSON() as RouteJSON);
    if (alternativesWithRisk) {
      alternativesWithRisk = await Promise.all(
        alternativesWithRisk.map(async (altRoute) => {
          const altSegments = altRoute.segments;
          if (altSegments && Array.isArray(altSegments)) {
            const altSegmentsWithRisk = await Promise.all(
              altSegments.map(async (segmentJSON: SegmentJSON, idx: number) => {
                try {
                  const routeSegment: IRouteSegment = {
                    segmentId: segmentJSON.id || `seg-alt-${idx}`,
                    fromStopId: segmentJSON.from?.id || '',
                    toStopId: segmentJSON.to?.id || '',
                    routeId: segmentJSON.metadata?.routeNumber || '',
                    transportType: normalizeTransportType(segmentJSON.type),
                    distance: segmentJSON.distance?.value || 0,
                    estimatedDuration: segmentJSON.duration?.value || 0,
                    basePrice: segmentJSON.price?.total || 0,
                  };

                  const segmentAssessment = await segmentRiskUseCase.execute(
                    routeSegment,
                    riskContext
                  );

                  return {
                    ...segmentJSON,
                    riskScore: segmentAssessment.riskScore,
                  };
                } catch (error) {
                  console.warn('[SmartRouteController] Failed to assess alternative segment risk', {
                    segmentId: segmentJSON.id,
                    error,
                  });
                  return segmentJSON;
                }
              })
            );
            // Вычисляем общий риск для альтернативного маршрута
            const altSegmentRiskScores = altSegmentsWithRisk
              .map((seg) => seg.riskScore)
              .filter((riskScore): riskScore is IRiskScore => riskScore !== undefined && riskScore !== null);

            if (altSegmentRiskScores.length > 0) {
              const maxRiskValue = Math.max(...altSegmentRiskScores.map((rs) => rs.value));
              const maxRiskScore = altSegmentRiskScores.find((rs) => rs.value === maxRiskValue)!;

              // Вычисляем level на основе значения
              const getRiskLevelFromValue = (value: number): RiskLevel => {
                if (value <= 2) return RiskLevel.VERY_LOW;
                if (value <= 4) return RiskLevel.LOW;
                if (value <= 6) return RiskLevel.MEDIUM;
                if (value <= 8) return RiskLevel.HIGH;
                return RiskLevel.VERY_HIGH;
              };

              return {
                ...altRoute,
                segments: altSegmentsWithRisk,
                riskScore: {
                  value: maxRiskValue,
                  level: getRiskLevelFromValue(maxRiskValue),
                  description: `Общий риск маршрута: ${maxRiskScore.description}`,
                },
              };
            }

            return {
              ...altRoute,
              segments: altSegmentsWithRisk,
            };
          }
          return altRoute;
        })
      );
    }

    // Формируем ответ
    const totalExecutionTime = Date.now() - requestStartTime;

    res.status(200).json({
      success: true,
      route: routeJSON,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        segmentValidations: validation.segmentValidations,
      },
      alternatives: alternativesWithRisk,
      executionTimeMs: totalExecutionTime,
    });
  } catch (error: any) {
    const totalExecutionTime = Date.now() - requestStartTime;
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || '';
    
    // КРИТИЧЕСКИЙ ФИКС: Улучшаем логирование ошибок
    console.error('[SmartRouteController] Error building route:', {
      errorMessage,
      errorName: error?.name,
      errorStack: errorStack.split('\n').slice(0, 10).join('\n'), // Первые 10 строк стека
      from: req.body.from,
      to: req.body.to,
      date: req.body.date,
      season: req.body.season,
      preferredTransport: req.body.preferredTransport,
      timestamp: new Date().toISOString(),
      error: error, // Полный объект ошибки для диагностики
    });
    
    // КРИТИЧЕСКИЙ ФИКС: Улучшаем сообщение об ошибке для пользователя
    const userFriendlyMessage = errorMessage.includes('City not found') 
      ? 'Один из указанных городов не найден в системе'
      : errorMessage.includes('Route not found')
      ? 'Маршрут не найден. Попробуйте изменить параметры поиска'
      : 'Произошла ошибка при построении маршрута. Попробуйте позже';
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: userFriendlyMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      executionTimeMs: totalExecutionTime,
    });
  }
}

/**
 * @swagger
 * /smart-routes/connectivity:
 *   get:
 *     summary: Проверить связность транспортной сети
 *     description: Проверяет связность графа городов и автоматически добавляет недостающие связи
 *     tags: [Smart Routes]
 *     responses:
 *       200:
 *         description: Результат проверки связности
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isConnected:
 *                       type: boolean
 *                       description: Является ли граф связным
 *                     componentCount:
 *                       type: number
 *                       description: Количество компонент связности
 *                     components:
 *                       type: array
 *                       items:
 *                         type: array
 *                         items:
 *                           type: string
 *                       description: Компоненты связности (массив массивов ID городов)
 *                     isolatedCities:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Изолированные города (без соединений)
 *                     addedConnections:
 *                       type: array
 *                       items:
 *                         type: object
 *                       description: Добавленные соединения для обеспечения связности
 *                 executionTimeMs:
 *                   type: number
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function checkConnectivity(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    const guarantor = new ConnectivityGuarantor();
    const result = guarantor.guaranteeConnectivity();

    res.status(200).json({
      success: true,
      data: {
        isConnected: result.isConnected,
        componentCount: result.componentCount,
        components: result.components,
        isolatedCities: result.isolatedCities,
        addedConnections: result.addedConnections,
      },
      executionTimeMs: Date.now() - requestStartTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to check connectivity: ${errorMessage}`,
      },
      executionTimeMs: Date.now() - requestStartTime,
    });
  }
}

/**
 * @swagger
 * /smart-routes/autocomplete:
 *   get:
 *     summary: Автодополнение городов с учётом административной структуры
 *     description: Возвращает список городов, соответствующих запросу, с учётом формата "Регион → Район → Город"
 *     tags: [Smart Routes]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Поисковый запрос (город, район или регион)
 *         example: "Олёкминск"
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Максимальное количество результатов
 *     responses:
 *       200:
 *         description: Список городов с административной структурой
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                         description: Полное название с административной структурой
 *                       nameWithContext:
 *                         type: string
 *                         description: Название с контекстом (район, регион)
 *                       coordinates:
 *                         type: object
 *                       administrative:
 *                         type: object
 *                         description: Административная структура (Регион → Район → Город)
 */
export async function autocomplete(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    // Валидация уже выполнена middleware, используем валидированные данные
    const query = req.query.q as string;
    const limitParam = req.query.limit;
    const limit: number = limitParam 
      ? (typeof limitParam === 'string' 
          ? parseInt(limitParam, 10) || 10
          : typeof limitParam === 'number' 
            ? limitParam 
            : Array.isArray(limitParam) 
              ? parseInt(String(limitParam[0]), 10) || 10
              : 10)
      : 10;

    // Выполняем поиск с учётом административной структуры
    const searchResults = searchCities(query);

    // Ограничиваем количество результатов
    const limitedResults = searchResults.slice(0, limit);

    // Преобразуем в формат для автодополнения
    const autocompleteResults = limitedResults.map((cityRef) => {
      const stops = getStopsByCity(cityRef.id);
      
      return {
        id: cityRef.id,
        name: cityRef.name,
        normalizedName: cityRef.normalizedName,
        fullName: cityRef.administrative.formats.full,
        nameWithContext: cityRef.administrative.formats.withContext,
        mediumName: cityRef.administrative.formats.medium,
        coordinates: {
          latitude: cityRef.coordinates.latitude,
          longitude: cityRef.coordinates.longitude,
        },
        administrative: {
          subject: cityRef.administrative.subject,
          district: cityRef.administrative.district,
          settlement: cityRef.administrative.settlement,
        },
        infrastructure: cityRef.infrastructure,
        stops: stops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          type: stop.type,
        })),
      };
    });

    res.status(200).json({
      success: true,
      data: autocompleteResults,
      meta: {
        query,
        total: searchResults.length,
        returned: autocompleteResults.length,
      },
      executionTimeMs: Date.now() - requestStartTime,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: errorMessage,
      },
      executionTimeMs: Date.now() - requestStartTime,
    });
  }
}

/**
 * @swagger
 * /smart-routes/reality-check:
 *   post:
 *     summary: Проверить реалистичность маршрута
 *     description: Проверяет маршрут на соответствие реальным данным (расстояния, цены, пути, хабы, пересадки, сезонность)
 *     tags: [Smart Routes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - route
 *             properties:
 *               route:
 *                 type: object
 *                 description: Умный маршрут для проверки
 *     responses:
 *       200:
 *         description: Результат проверки реалистичности
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasIssues:
 *                       type: boolean
 *                       description: Есть ли несоответствия с реальностью
 *                     issues:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             enum: [distance_mismatch, price_mismatch, route_mismatch, path_mismatch, hub_mismatch, transfer_mismatch, seasonality_mismatch]
 *                           segmentId:
 *                             type: string
 *                           message:
 *                             type: string
 *                           correction:
 *                             type: object
 *                           metadata:
 *                             type: object
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                 executionTimeMs:
 *                   type: number
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function checkReality(req: Request, res: Response): Promise<void> {
  const requestStartTime = Date.now();

  try {
    const { route } = req.body;

    if (!route) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Route is required',
        },
        executionTimeMs: Date.now() - requestStartTime,
      });
      return;
    }

    // В реальной системе здесь нужно десериализовать route в SmartRoute
    // Для упрощения предполагаем, что route уже является SmartRoute объектом
    const realityChecker = new RealityChecker();
    const result = realityChecker.checkReality(route);

    res.status(200).json({
      success: true,
      data: result,
      executionTimeMs: Date.now() - requestStartTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to check reality: ${errorMessage}`,
      },
      executionTimeMs: Date.now() - requestStartTime,
    });
  }
}

