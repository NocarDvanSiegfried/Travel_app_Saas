/**
 * Контроллер для работы с городами
 * 
 * Использует новую архитектуру Phase 2:
 * - PostgresStopRepository с методами getAllRealStops() и getAllVirtualStops()
 * - Domain-модели RealStop и VirtualStop
 * - Правильная типизация без implicit any
 */

import { Request, Response } from 'express';
import { getLogger } from '../../shared/logger/Logger';
import { parsePaginationParams, createPaginatedResponse } from '../../shared/utils/pagination';

const logger = getLogger('CitiesController');

/**
 * Извлекает название города из названия остановки
 * 
 * @param stopName - Название остановки
 * @returns Название города или null
 */
function extractCityName(stopName: string): string | null {
  if (!stopName || stopName.trim().length === 0) {
    return null;
  }

  // Эвристика 1: если название содержит "г. ГородName"
  const cityMatch = stopName.match(/г\.\s*([А-Яа-яЁё\-\s]+)/);
  if (cityMatch) {
    return cityMatch[1].trim();
  }

  // Эвристика 2: если название начинается с города (первое слово)
  const words = stopName.split(/[\s,]/).filter((w: string) => w.length > 2);
  if (words.length > 0) {
    const firstWord = words[0];
    if (firstWord && /^[А-ЯЁ]/.test(firstWord)) {
      return firstWord;
    }
  }

  return null;
}

/**
 * @swagger
 * /cities:
 *   get:
 *     summary: Получить список доступных городов
 *     description: Возвращает список городов, доступных для построения маршрутов. Поддерживает пагинацию.
 *     tags: [Cities]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Номер страницы (начиная с 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Количество элементов на странице
 *     responses:
 *       200:
 *         description: Список городов успешно получен
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     mode:
 *                       type: string
 *                       example: database
 *                     quality:
 *                       type: number
 *                       example: 100
 *                     source:
 *                       type: string
 *                       example: PostgreSQL
 *                     loadedAt:
 *                       type: string
 *                       format: date-time
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         realStopsCount:
 *                           type: integer
 *                         virtualStopsCount:
 *                           type: integer
 *                         totalStopsCount:
 *                           type: integer
 *             example:
 *               data: ["Москва", "Санкт-Петербург", "Казань"]
 *               pagination:
 *                 totalItems: 50
 *                 totalPages: 5
 *                 currentPage: 1
 *                 itemsPerPage: 10
 *                 hasNextPage: true
 *                 hasPreviousPage: false
 *               mode: database
 *               quality: 100
 *               source: PostgreSQL
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function getCities(req: Request, res: Response): Promise<void> {
  try {
    logger.info('Getting available cities', { module: 'CitiesController' });

    const { DatabaseConfig } = await import('../../infrastructure/config/database.config');
    const { PostgresStopRepository } = await import('../../infrastructure/repositories/PostgresStopRepository');
    
    const pool = DatabaseConfig.getPool();
    const stopRepository = new PostgresStopRepository(pool);

    // Получаем все остановки (реальные и виртуальные) через новые методы
    const [realStops, virtualStops] = await Promise.all([
      stopRepository.getAllRealStops(),
      stopRepository.getAllVirtualStops(),
    ]);

    // Извлекаем уникальные города
    const citiesSet = new Set<string>();
    
    // Обрабатываем реальные остановки
    for (const stop of realStops) {
      // Приоритет: используем cityId, если доступен
      if (stop.cityId) {
        citiesSet.add(stop.cityId);
      } else if (stop.name) {
        // Fallback: извлекаем из названия
        const cityName = extractCityName(stop.name);
        if (cityName) {
          citiesSet.add(cityName);
        }
      }
    }

    // Обрабатываем виртуальные остановки
    for (const stop of virtualStops) {
      // Виртуальные остановки используют cityId, как и реальные
      if (stop.cityId) {
        citiesSet.add(stop.cityId);
      } else if (stop.name) {
        // Fallback: извлекаем из названия
        const cityName = extractCityName(stop.name);
        if (cityName) {
          citiesSet.add(cityName);
        }
      }
    }

    const cities = Array.from(citiesSet).sort();

    // Apply pagination
    const { page, limit } = parsePaginationParams(req.query);
    const total = cities.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCities = cities.slice(startIndex, endIndex);

    logger.info('Cities loaded from database', {
      module: 'CitiesController',
      count: cities.length,
      realStopsCount: realStops.length,
      virtualStopsCount: virtualStops.length,
      page,
      limit,
    });

    const response = createPaginatedResponse(paginatedCities, total, page, limit);

    res.json({
      ...response,
      mode: 'database',
      quality: 100,
      source: 'PostgreSQL',
      loadedAt: new Date().toISOString(),
      statistics: {
        realStopsCount: realStops.length,
        virtualStopsCount: virtualStops.length,
        totalStopsCount: realStops.length + virtualStops.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get cities', error as Error, {
      module: 'CitiesController',
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Ошибка при получении списка городов',
      },
    });
  }
}

