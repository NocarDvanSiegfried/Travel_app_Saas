/**
 * Graph Consistency Check Module
 * 
 * Проверяет согласованность данных в БД и графа в Redis.
 * Используется в dev-режиме для автоматического обнаружения расхождений.
 * 
 * @module infrastructure/startup
 */

import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import { PostgresStopRepository } from '../repositories/PostgresStopRepository';
import { PostgresGraphRepository } from '../repositories/PostgresGraphRepository';

/**
 * Результат проверки согласованности
 */
export type ConsistencyCheckResult = {
  isConsistent: boolean;
  issues: string[];
  dbStopsCount: number;
  graphNodesCount: number;
  dbCities: string[];
  graphCities: string[];
  missingInGraph: string[];
};

/**
 * Проверка согласованности данных БД и графа
 * 
 * Сравнивает:
 * - Количество остановок в БД vs количество nodes в графе
 * - Список городов из БД vs города в графе
 * 
 * @param pool - PostgreSQL connection pool
 * @param redis - Redis client
 * @returns Результат проверки согласованности
 */
export async function checkGraphConsistency(
  pool: Pool,
  redis: RedisClientType
): Promise<ConsistencyCheckResult> {
  const issues: string[] = [];
  const missingInGraph: string[] = [];

  try {
    // Получаем данные из БД
    const stopRepository = new PostgresStopRepository(pool);
    const allStops = await stopRepository.getAllRealStops();
    const dbStopsCount = allStops.length;

    // Извлекаем уникальные города из БД
    const dbCitiesSet = new Set<string>();
    for (const stop of allStops) {
      if (stop.cityId) {
        dbCitiesSet.add(stop.cityId);
      }
    }
    const dbCities = Array.from(dbCitiesSet).sort();

    // Получаем данные из графа
    const graphRepository = new PostgresGraphRepository(pool, redis);
    const graphVersion = await graphRepository.getGraphVersion();
    
    if (!graphVersion) {
      return {
        isConsistent: false,
        issues: ['Graph not found in Redis'],
        dbStopsCount,
        graphNodesCount: 0,
        dbCities,
        graphCities: [],
        missingInGraph: dbCities,
      };
    }

    const allNodes = await graphRepository.getAllNodes();
    const graphNodesCount = allNodes.length;

    // Извлекаем города из графа (по названиям остановок)
    // Для этого нужно получить информацию о каждой остановке
    const graphCitiesSet = new Set<string>();
    for (const nodeId of allNodes) {
      // Пытаемся найти остановку в БД по ID
      const stop = await stopRepository.findRealStopById(nodeId);
      if (stop && stop.cityId) {
        graphCitiesSet.add(stop.cityId);
      }
    }
    const graphCities = Array.from(graphCitiesSet).sort();

    // Проверяем расхождения
    if (dbStopsCount !== graphNodesCount) {
      issues.push(
        `Stop count mismatch: DB has ${dbStopsCount} stops, graph has ${graphNodesCount} nodes`
      );
    }

    // Находим города, которые есть в БД, но отсутствуют в графе
    for (const city of dbCities) {
      if (!graphCities.includes(city)) {
        missingInGraph.push(city);
      }
    }

    if (missingInGraph.length > 0) {
      issues.push(
        `Cities missing in graph: ${missingInGraph.join(', ')}`
      );
    }

    const isConsistent = issues.length === 0;

    return {
      isConsistent,
      issues,
      dbStopsCount,
      graphNodesCount,
      dbCities,
      graphCities,
      missingInGraph,
    };
  } catch (error: any) {
    return {
      isConsistent: false,
      issues: [`Consistency check failed: ${error?.message || String(error)}`],
      dbStopsCount: 0,
      graphNodesCount: 0,
      dbCities: [],
      graphCities: [],
      missingInGraph: [],
    };
  }
}

/**
 * Проверка, включена ли автоматическая проверка согласованности
 */
export function isConsistencyCheckEnabled(): boolean {
  return process.env.ENABLE_GRAPH_CONSISTENCY_CHECK === 'true' && process.env.NODE_ENV !== 'production';
}















