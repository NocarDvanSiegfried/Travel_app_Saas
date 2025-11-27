/**
 * Селектор хабов для умной маршрутизации
 * 
 * Определяет, какие хабы использовать для построения авиамаршрутов:
 * - Принудительно использует хабы для малых аэропортов
 * - Запрещает прямые рейсы между малыми аэропортами
 * - Выбирает оптимальные хабы для маршрута
 */

import type { CityReference } from '../../../domain/smart-routing/data/cities-reference';
import { ALL_CITIES } from '../../../domain/smart-routing/data/cities-reference';
import { Hub } from '../../../domain/smart-routing/entities/Hub';
import {
  ALL_HUBS,
  getNearestRegionalHub,
  getHubsByLevel,
} from '../../../domain/smart-routing/data/hubs-reference';
import { HubLevel } from '../../../domain/smart-routing/enums/HubLevel';
import { hasConnection } from '../../../domain/smart-routing/data/connections-model';

/**
 * Результат выбора хабов
 */
export interface HubSelectionResult {
  /**
   * Требуется ли использование хабов (true для малых аэропортов)
   */
  requiresHubs: boolean;

  /**
   * Хаб для города отправления (если требуется)
   */
  fromHub?: Hub;

  /**
   * Хаб для города назначения (если требуется)
   */
  toHub?: Hub;

  /**
   * Можно ли построить прямой рейс
   */
  canBeDirect: boolean;

  /**
   * Причина, почему требуется использование хабов
   */
  reason?: string;
}

/**
 * Селектор хабов
 */
export class HubSelector {
  /**
   * Максимальное расстояние для прямых рейсов между малыми аэропортами (км)
   */
  private static readonly MAX_DIRECT_DISTANCE_SMALL_AIRPORTS = 500;

  /**
   * Проверяет, является ли город малым аэропортом
   */
  public static isSmallAirport(city: CityReference): boolean {
    return (
      city.infrastructure.hasAirport &&
      city.infrastructure.airportClass === 'D' &&
      !city.isHub
    );
  }

  /**
   * Проверяет, является ли город хабом (федеральным или региональным)
   */
  public static isHub(city: CityReference): boolean {
    return city.isHub && (city.hubLevel === 'federal' || city.hubLevel === 'regional');
  }

  /**
   * Выбирает хабы для маршрута между двумя городами
   */
  public static selectHubs(
    fromCity: CityReference,
    toCity: CityReference
  ): HubSelectionResult {
    const fromIsSmall = this.isSmallAirport(fromCity);
    const toIsSmall = this.isSmallAirport(toCity);
    const fromIsHub = this.isHub(fromCity);
    const toIsHub = this.isHub(toCity);

    // Если оба города - хабы, проверяем наличие прямого connection
    if (fromIsHub && toIsHub) {
      // КРИТИЧЕСКИЙ ФИКС: Проверяем наличие прямого connection
      const hasDirectConnection = hasConnection(fromCity.id, toCity.id, 'airplane');
      if (hasDirectConnection) {
        return {
          requiresHubs: false,
          canBeDirect: true,
        };
      }
      // Если прямого connection нет, требуем поиск через промежуточные хабы
      const fromHub = ALL_HUBS.find((h) => h.id === `${fromCity.id}-hub`);
      const toHub = ALL_HUBS.find((h) => h.id === `${toCity.id}-hub`);
      return {
        requiresHubs: true,
        fromHub: fromHub || undefined,
        toHub: toHub || undefined,
        canBeDirect: false,
        reason: `Прямого connection между хабами ${fromCity.name} и ${toCity.name} нет, требуется маршрут через промежуточные хабы`,
      };
    }

    // Если один из городов - малый аэропорт, требуется использование хабов
    if (fromIsSmall || toIsSmall) {
      const fromHub = fromIsSmall
        ? getNearestRegionalHub(fromCity.id)
        : fromIsHub
          ? ALL_HUBS.find((h) => h.id === `${fromCity.id}-hub`)
          : undefined;

      const toHub = toIsSmall
        ? getNearestRegionalHub(toCity.id)
        : toIsHub
          ? ALL_HUBS.find((h) => h.id === `${toCity.id}-hub`)
          : undefined;

      let reason = '';
      if (fromIsSmall && toIsSmall) {
        reason = 'Оба города - малые аэропорты, требуется маршрут через региональные хабы';
      } else if (fromIsSmall) {
        reason = `Город отправления ${fromCity.name} - малый аэропорт, требуется маршрут через региональный хаб`;
      } else {
        reason = `Город назначения ${toCity.name} - малый аэропорт, требуется маршрут через региональный хаб`;
      }

      return {
        requiresHubs: true,
        fromHub: fromHub || undefined,
        toHub: toHub || undefined,
        canBeDirect: false,
        reason,
      };
    }

    // Если оба города - не хабы и не малые аэропорты, проверяем расстояние
    // Для таких городов прямой рейс возможен, если расстояние < 2000 км
    const distance = this.calculateDistance(fromCity, toCity);
    if (distance > 2000) {
      // Для больших расстояний используем хабы
      const fromHub = getNearestRegionalHub(fromCity.id);
      const toHub = getNearestRegionalHub(toCity.id);

      return {
        requiresHubs: true,
        fromHub: fromHub || undefined,
        toHub: toHub || undefined,
        canBeDirect: false,
        reason: `Расстояние ${distance.toFixed(0)} км слишком большое для прямого рейса, требуется маршрут через хабы`,
      };
    }

    // Прямой рейс возможен
    return {
      requiresHubs: false,
      canBeDirect: true,
    };
  }

  /**
   * Вычисляет расстояние между двумя городами (Haversine)
   */
  private static calculateDistance(city1: CityReference, city2: CityReference): number {
    const R = 6371; // Радиус Земли в км
    const lat1 = (city1.coordinates.latitude * Math.PI) / 180;
    const lat2 = (city2.coordinates.latitude * Math.PI) / 180;
    const deltaLat = ((city2.coordinates.latitude - city1.coordinates.latitude) * Math.PI) / 180;
    const deltaLon = ((city2.coordinates.longitude - city1.coordinates.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Находит оптимальный федеральный хаб для маршрута между двумя региональными хабами
   */
  public static findOptimalFederalHub(
    fromRegionalHub: Hub,
    toRegionalHub: Hub
  ): Hub | null {
    const federalHubs = ALL_HUBS.filter((h) => h.level === HubLevel.FEDERAL);

    // Ищем федеральный хаб, который связан с обоими региональными хабами
    for (const federalHub of federalHubs) {
      if (
        fromRegionalHub.hasConnection(federalHub.id) &&
        federalHub.hasConnection(toRegionalHub.id)
      ) {
        return federalHub;
      }
    }

    return null;
  }

  /**
   * Проверяет, можно ли построить прямой рейс между двумя городами
   */
  public static canBuildDirectRoute(
    fromCity: CityReference,
    toCity: CityReference
  ): boolean {
    const selection = this.selectHubs(fromCity, toCity);
    return selection.canBeDirect && !selection.requiresHubs;
  }

  /**
   * Находит путь через несколько хабов между двумя городами
   * 
   * Использует алгоритм поиска кратчайшего пути в графе хабов (упрощённый Dijkstra)
   * 
   * @param fromCity - Город отправления
   * @param toCity - Город назначения
   * @returns Массив хабов, через которые нужно пройти (включая начальный и конечный), или null, если путь не найден
   * 
   * @example
   * Среднеколымск → Москва → Санкт-Петербург → Новосибирск → Якутск
   * Вернёт: [yakutsk-hub, moscow-hub, novosibirsk-hub, yakutsk-hub]
   */
  public static findPathViaHubs(
    fromCity: CityReference,
    toCity: CityReference
  ): Hub[] | null {
    // Получаем начальный и конечный хабы
    const hubSelection = this.selectHubs(fromCity, toCity);
    
    if (!hubSelection.requiresHubs) {
      // КРИТИЧЕСКИЙ ФИКС: Проверяем наличие прямого connection перед возвратом null
      const hasDirectConnection = hasConnection(fromCity.id, toCity.id, 'airplane');
      if (hasDirectConnection) {
        // Прямой рейс возможен, путь через хабы не требуется
        return null;
      }
      // Если прямого connection нет, продолжаем поиск пути через промежуточные хабы
    }

    const fromHub = hubSelection.fromHub;
    const toHub = hubSelection.toHub;

    if (!fromHub || !toHub) {
      return null;
    }

    // Если начальный и конечный хабы совпадают, путь состоит из одного хаба
    if (fromHub.id === toHub.id) {
      return [fromHub];
    }

    // Ищем путь между хабами
    const path = this.findPathBetweenHubs(fromHub, toHub);
    
    if (!path || path.length === 0) {
      return null;
    }

    // Добавляем начальный и конечный хабы, если их ещё нет
    const fullPath: Hub[] = [];
    
    // Начальный хаб
    if (path[0].id !== fromHub.id) {
      fullPath.push(fromHub);
    }
    
    // Промежуточные хабы
    fullPath.push(...path);
    
    // Конечный хаб
    if (path[path.length - 1].id !== toHub.id) {
      fullPath.push(toHub);
    }

    return fullPath;
  }

  /**
   * Находит кратчайший путь между двумя хабами в графе хабов
   * 
   * Использует упрощённый алгоритм поиска в ширину (BFS), так как граф хабов небольшой
   * 
   * @param fromHub - Начальный хаб
   * @param toHub - Конечный хаб
   * @returns Массив хабов, через которые нужно пройти, или null, если путь не найден
   */
  private static findPathBetweenHubs(
    fromHub: Hub,
    toHub: Hub
  ): Hub[] | null {
    // Если хабы совпадают, возвращаем один хаб
    if (fromHub.id === toHub.id) {
      return [fromHub];
    }

    // Проверяем прямую связь
    if (fromHub.hasConnection(toHub.id)) {
      return [fromHub, toHub];
    }

    // Используем BFS для поиска пути
    const queue: { hub: Hub; path: Hub[] }[] = [{ hub: fromHub, path: [fromHub] }];
    const visited = new Set<string>([fromHub.id]);

    while (queue.length > 0) {
      const { hub: currentHub, path: currentPath } = queue.shift()!;

      // Получаем все связи текущего хаба
      const connections = currentHub.getAllConnections();

      for (const connectionId of connections) {
        // Пропускаем уже посещённые хабы
        if (visited.has(connectionId)) {
          continue;
        }

        // Находим хаб по ID
        const connectedHub = ALL_HUBS.find((h) => h.id === connectionId);
        if (!connectedHub) {
          continue;
        }

        // Проверяем, достигли ли мы конечного хаба
        if (connectedHub.id === toHub.id) {
          return [...currentPath, connectedHub];
        }

        // Добавляем в очередь для дальнейшего поиска
        visited.add(connectionId);
        queue.push({
          hub: connectedHub,
          path: [...currentPath, connectedHub],
        });

        // Ограничиваем глубину поиска (максимум 4 пересадки)
        if (currentPath.length >= 4) {
          continue;
        }
      }
    }

    // Путь не найден
    return null;
  }

  /**
   * Находит все возможные пути между двумя хабами (для альтернативных маршрутов)
   * 
   * @param fromHub - Начальный хаб
   * @param toHub - Конечный хаб
   * @param maxPaths - Максимальное количество путей для поиска
   * @returns Массив путей (каждый путь - массив хабов)
   */
  public static findAllPathsBetweenHubs(
    fromHub: Hub,
    toHub: Hub,
    maxPaths: number = 3
  ): Hub[][] {
    const paths: Hub[][] = [];

    // Если хабы совпадают, возвращаем один путь
    if (fromHub.id === toHub.id) {
      return [[fromHub]];
    }

    // Проверяем прямую связь
    if (fromHub.hasConnection(toHub.id)) {
      paths.push([fromHub, toHub]);
    }

    // Используем DFS для поиска всех путей (с ограничением глубины)
    const findAllPaths = (
      currentHub: Hub,
      targetHub: Hub,
      currentPath: Hub[],
      visited: Set<string>,
      maxDepth: number
    ): void => {
      if (paths.length >= maxPaths) {
        return;
      }

      if (currentHub.id === targetHub.id) {
        paths.push([...currentPath]);
        return;
      }

      if (currentPath.length >= maxDepth) {
        return;
      }

      const connections = currentHub.getAllConnections();
      for (const connectionId of connections) {
        if (visited.has(connectionId)) {
          continue;
        }

        const connectedHub = ALL_HUBS.find((h) => h.id === connectionId);
        if (!connectedHub) {
          continue;
        }

        visited.add(connectionId);
        currentPath.push(connectedHub);

        findAllPaths(connectedHub, targetHub, currentPath, visited, maxDepth);

        currentPath.pop();
        visited.delete(connectionId);
      }
    };

    findAllPaths(fromHub, toHub, [fromHub], new Set([fromHub.id]), 5);

    return paths;
  }
}

