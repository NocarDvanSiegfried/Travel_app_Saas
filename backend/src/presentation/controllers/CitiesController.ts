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
import type { RealStop, VirtualStop } from '../../domain/entities';

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
 * Получить список доступных городов для построения маршрутов
 * 
 * Использует новую архитектуру Phase 2:
 * - Получает города из PostgreSQL через PostgresStopRepository
 * - Извлекает уникальные города из реальных и виртуальных остановок
 * - Использует cityId из RealStop, если доступен
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

    logger.info('Cities loaded from database', {
      module: 'CitiesController',
      count: cities.length,
      realStopsCount: realStops.length,
      virtualStopsCount: virtualStops.length,
    });

    res.json({
      cities,
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

