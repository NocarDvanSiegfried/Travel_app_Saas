/**
 * Граф ЖД-станций для поиска кратчайшего пути
 * 
 * Использует алгоритм Dijkstra для поиска оптимального маршрута
 * между станциями АЯМ и Транссиба.
 */

import type { CityConnection } from '../../../domain/smart-routing/data/connections-model';
import { getConnectionsByType } from '../../../domain/smart-routing/data/connections-model';
import { TransportType } from '../../../domain/entities/RouteSegment';

/**
 * Узел графа (станция)
 */
interface GraphNode {
  /**
   * ID города/станции
   */
  cityId: string;

  /**
   * Расстояние от начальной точки (для Dijkstra)
   */
  distance: number;

  /**
   * Предыдущий узел в пути
   */
  previous: string | null;

  /**
   * Посещён ли узел
   */
  visited: boolean;
}

/**
 * Результат поиска пути
 */
export interface TrainPathResult {
  /**
   * Последовательность ID городов/станций
   */
  path: string[];

  /**
   * Общее расстояние (в км)
   */
  totalDistance: number;

  /**
   * Общее время в пути (в минутах)
   */
  totalDuration: number;

  /**
   * Соединения между станциями
   */
  connections: CityConnection[];
}

/**
 * Граф ЖД-станций
 */
export class TrainStationGraph {
  /**
   * Все ЖД-соединения
   */
  private readonly connections: CityConnection[];

  /**
   * Граф (Map<fromCityId, Map<toCityId, connection>>)
   */
  private readonly graph: Map<string, Map<string, CityConnection>>;

  constructor() {
    this.connections = getConnectionsByType('train');
    this.graph = this.buildGraph();
  }

  /**
   * Построить граф из соединений
   */
  private buildGraph(): Map<string, Map<string, CityConnection>> {
    const graph = new Map<string, Map<string, CityConnection>>();

    for (const connection of this.connections) {
      if (!graph.has(connection.fromCityId)) {
        graph.set(connection.fromCityId, new Map());
      }

      const fromNode = graph.get(connection.fromCityId)!;
      
      // Если уже есть соединение, выбираем более короткое
      if (!fromNode.has(connection.toCityId) || fromNode.get(connection.toCityId)!.distance > connection.distance) {
        fromNode.set(connection.toCityId, connection);
      }
    }

    return graph;
  }

  /**
   * Найти кратчайший путь между двумя станциями (алгоритм Dijkstra)
   * 
   * @param fromCityId - ID начальной станции
   * @param toCityId - ID конечной станции
   * @param maxTransfers - Максимальное количество пересадок (по умолчанию 5)
   * @returns Результат поиска пути или null, если путь не найден
   */
  public findShortestPath(
    fromCityId: string,
    toCityId: string,
    maxTransfers: number = 5
  ): TrainPathResult | null {
    // Если начальная и конечная станции совпадают
    if (fromCityId === toCityId) {
      return {
        path: [fromCityId],
        totalDistance: 0,
        totalDuration: 0,
        connections: [],
      };
    }

    // Инициализация узлов
    const nodes = new Map<string, GraphNode>();
    const unvisited = new Set<string>();

    // Инициализируем все узлы
    for (const [fromId] of this.graph) {
      nodes.set(fromId, {
        cityId: fromId,
        distance: fromId === fromCityId ? 0 : Infinity,
        previous: null,
        visited: false,
      });
      unvisited.add(fromId);
    }

    // Добавляем конечную станцию, если её нет в графе
    if (!nodes.has(toCityId)) {
      nodes.set(toCityId, {
        cityId: toCityId,
        distance: Infinity,
        previous: null,
        visited: false,
      });
      unvisited.add(toCityId);
    }

    // Алгоритм Dijkstra
    while (unvisited.size > 0) {
      // Находим узел с минимальным расстоянием
      let currentNodeId: string | null = null;
      let minDistance = Infinity;

      for (const nodeId of unvisited) {
        const node = nodes.get(nodeId)!;
        if (node.distance < minDistance) {
          minDistance = node.distance;
          currentNodeId = nodeId;
        }
      }

      if (currentNodeId === null || minDistance === Infinity) {
        break; // Нет пути
      }

      // Если достигли конечной станции
      if (currentNodeId === toCityId) {
        return this.reconstructPath(nodes, fromCityId, toCityId);
      }

      // Помечаем текущий узел как посещённый
      const currentNode = nodes.get(currentNodeId)!;
      currentNode.visited = true;
      unvisited.delete(currentNodeId);

      // Проверяем ограничение на количество пересадок
      const transferCount = this.countTransfers(nodes, fromCityId, currentNodeId);
      if (transferCount > maxTransfers) {
        continue;
      }

      // Обновляем расстояния до соседних узлов
      const neighbors = this.graph.get(currentNodeId);
      if (neighbors) {
        for (const [neighborId, connection] of neighbors) {
          if (!unvisited.has(neighborId)) {
            continue;
          }

          const neighbor = nodes.get(neighborId)!;
          const newDistance = currentNode.distance + connection.distance;

          if (newDistance < neighbor.distance) {
            neighbor.distance = newDistance;
            neighbor.previous = currentNodeId;
          }
        }
      }
    }

    return null; // Путь не найден
  }

  /**
   * Восстановить путь от начальной до конечной станции
   */
  private reconstructPath(
    nodes: Map<string, GraphNode>,
    fromCityId: string,
    toCityId: string
  ): TrainPathResult | null {
    const path: string[] = [];
    const connections: CityConnection[] = [];
    let currentId: string | null = toCityId;
    let totalDistance = 0;
    let totalDuration = 0;

    // Восстанавливаем путь в обратном порядке
    while (currentId !== null) {
      path.unshift(currentId);
      const node: GraphNode = nodes.get(currentId)!;

      if (node.previous !== null) {
        // Находим соединение между предыдущей и текущей станцией
        const connection = this.graph.get(node.previous)?.get(currentId);
        if (connection) {
          connections.unshift(connection);
          totalDistance += connection.distance;
          totalDuration += connection.duration;
        }
      }

      currentId = node.previous;
    }

    // Проверяем, что путь начинается с начальной станции
    if (path[0] !== fromCityId) {
      return null;
    }

    return {
      path,
      totalDistance,
      totalDuration,
      connections,
    };
  }

  /**
   * Подсчитать количество пересадок в пути
   * 
   * Количество пересадок = количество сегментов - 1
   * Например, путь A → B → C имеет 1 пересадку (в B)
   */
  private countTransfers(
    nodes: Map<string, GraphNode>,
    fromCityId: string,
    toCityId: string
  ): number {
    let count = 0;
    let currentId: string | null = toCityId;

    // Подсчитываем количество узлов в пути (кроме начального)
    while (currentId !== null && currentId !== fromCityId) {
      const node: GraphNode = nodes.get(currentId)!;
      if (node.previous !== null) {
        count++;
      }
      currentId = node.previous;
    }

    // Количество пересадок = количество сегментов - 1
    // Например, путь A → B → C имеет 2 сегмента (A→B и B→C) и 1 пересадку (в B)
    return Math.max(0, count - 1);
  }

  /**
   * Получить все соединения из станции
   */
  public getConnectionsFromStation(cityId: string): CityConnection[] {
    const connections: CityConnection[] = [];
    const fromNode = this.graph.get(cityId);

    if (fromNode) {
      for (const connection of fromNode.values()) {
        connections.push(connection);
      }
    }

    return connections;
  }

  /**
   * Получить все соединения в станцию
   */
  public getConnectionsToStation(cityId: string): CityConnection[] {
    const connections: CityConnection[] = [];

    for (const [fromId, toNodes] of this.graph) {
      if (toNodes.has(cityId)) {
        connections.push(toNodes.get(cityId)!);
      }
    }

    return connections;
  }

  /**
   * Проверить, есть ли соединение между двумя станциями
   */
  public hasConnection(fromCityId: string, toCityId: string): boolean {
    return this.graph.get(fromCityId)?.has(toCityId) ?? false;
  }

  /**
   * Получить соединение между двумя станциями
   */
  public getConnection(fromCityId: string, toCityId: string): CityConnection | null {
    return this.graph.get(fromCityId)?.get(toCityId) ?? null;
  }
}

