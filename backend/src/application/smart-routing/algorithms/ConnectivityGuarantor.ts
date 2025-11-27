/**
 * Гарант связности транспортной сети
 * 
 * Обеспечивает, что каждый город связан хотя бы одним маршрутом
 * с остальными городами в сети. Автоматически добавляет недостающие связи.
 * 
 * Алгоритм:
 * 1. Строит граф из городов и соединений
 * 2. Проверяет связность графа (BFS)
 * 3. Находит изолированные города или компоненты
 * 4. Автоматически добавляет недостающие связи через ближайшие города или хабы
 */

import { ALL_CITIES, type CityReference } from '../../../domain/smart-routing/data/cities-reference';
import {
  ALL_CONNECTIONS,
  type CityConnection,
  type ConnectionType,
} from '../../../domain/smart-routing/data/connections-model';
import { ALL_HUBS } from '../../../domain/smart-routing/data/hubs-reference';
import { DistanceCalculator } from './DistanceCalculator';
import { PriceCalculator } from './PriceCalculator';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Season } from '../../../domain/smart-routing/enums/Season';
import { Coordinates } from '../../../domain/smart-routing/value-objects/Coordinates';

/**
 * Результат проверки связности
 */
export interface ConnectivityResult {
  /**
   * Является ли граф связным
   */
  isConnected: boolean;

  /**
   * Количество компонент связности
   */
  componentCount: number;

  /**
   * Компоненты связности (массив массивов ID городов)
   */
  components: string[][];

  /**
   * Изолированные города (города без соединений)
   */
  isolatedCities: string[];

  /**
   * Добавленные соединения для обеспечения связности
   */
  addedConnections: CityConnection[];
}

/**
 * Гарант связности транспортной сети
 */
export class ConnectivityGuarantor {
  private readonly distanceCalculator: DistanceCalculator;
  private readonly priceCalculator: PriceCalculator;

  constructor() {
    this.distanceCalculator = new DistanceCalculator();
    this.priceCalculator = new PriceCalculator();
  }

  /**
   * Проверяет связность графа и добавляет недостающие связи
   * 
   * @param connections - Текущие соединения (по умолчанию ALL_CONNECTIONS)
   * @returns Результат проверки связности с добавленными соединениями
   */
  public guaranteeConnectivity(
    connections: CityConnection[] = ALL_CONNECTIONS
  ): ConnectivityResult {
    // Строим граф из городов и соединений
    const graph = this.buildGraph(connections);

    // Проверяем связность графа
    const connectivity = this.checkConnectivity(graph);

    // Если граф уже связный, возвращаем результат
    if (connectivity.isConnected) {
      return {
        ...connectivity,
        addedConnections: [],
      };
    }

    // Находим и добавляем недостающие связи
    const addedConnections = this.addMissingConnections(connectivity);

    // Проверяем связность после добавления связей
    const updatedGraph = this.buildGraph([...connections, ...addedConnections]);
    const updatedConnectivity = this.checkConnectivity(updatedGraph);

    return {
      ...updatedConnectivity,
      addedConnections,
    };
  }

  /**
   * Строит граф из городов и соединений
   * 
   * Граф представлен как Map<cityId, Set<connectedCityId>>
   * (ненаправленный граф - соединения двусторонние)
   */
  private buildGraph(connections: CityConnection[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Инициализируем все города
    for (const city of ALL_CITIES) {
      graph.set(city.id, new Set<string>());
    }

    // Добавляем соединения (ненаправленные)
    for (const connection of connections) {
      const fromSet = graph.get(connection.fromCityId);
      const toSet = graph.get(connection.toCityId);

      if (fromSet && toSet) {
        fromSet.add(connection.toCityId);
        toSet.add(connection.fromCityId); // Обратное соединение
      }
    }

    return graph;
  }

  /**
   * Проверяет связность графа с помощью BFS
   * 
   * @returns Результат проверки связности
   */
  private checkConnectivity(graph: Map<string, Set<string>>): Omit<ConnectivityResult, 'addedConnections'> {
    const visited = new Set<string>();
    const components: string[][] = [];
    const isolatedCities: string[] = [];

    // Проверяем каждый город
    for (const cityId of graph.keys()) {
      // Если город уже посещён, пропускаем
      if (visited.has(cityId)) {
        continue;
      }

      // Запускаем BFS для поиска компоненты связности
      const component = this.bfs(graph, cityId, visited);

      if (component.length === 1) {
        // Изолированный город (без соединений)
        isolatedCities.push(cityId);
      } else {
        // Компонента связности
        components.push(component);
      }
    }

    // Граф связный, если есть только одна компонента (или все города изолированы)
    const isConnected = components.length <= 1 && isolatedCities.length === 0;

    return {
      isConnected,
      componentCount: components.length + isolatedCities.length,
      components,
      isolatedCities,
    };
  }

  /**
   * BFS для поиска компоненты связности
   */
  private bfs(
    graph: Map<string, Set<string>>,
    startCityId: string,
    visited: Set<string>
  ): string[] {
    const component: string[] = [];
    const queue: string[] = [startCityId];
    visited.add(startCityId);

    while (queue.length > 0) {
      const currentCityId = queue.shift()!;
      component.push(currentCityId);

      const neighbors = graph.get(currentCityId);
      if (!neighbors) {
        continue;
      }

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    return component;
  }

  /**
   * Добавляет недостающие связи для обеспечения связности
   * 
   * Стратегия:
   * 1. Соединяем изолированные города с ближайшими городами или хабами
   * 2. Соединяем компоненты связности через ближайшие города или хабы
   */
  private addMissingConnections(
    connectivity: Omit<ConnectivityResult, 'addedConnections'>
  ): CityConnection[] {
    const addedConnections: CityConnection[] = [];

    // 1. Соединяем изолированные города
    for (const isolatedCityId of connectivity.isolatedCities) {
      const connection = this.findBestConnectionForIsolatedCity(isolatedCityId);
      if (connection) {
        addedConnections.push(connection);
      }
    }

    // 2. Соединяем компоненты связности
    if (connectivity.components.length > 1) {
      const connections = this.connectComponents(connectivity.components);
      addedConnections.push(...connections);
    }

    return addedConnections;
  }

  /**
   * Находит лучшее соединение для изолированного города
   * 
   * Приоритет:
   * 1. Ближайший хаб (федеральный или региональный)
   * 2. Ближайший город с инфраструктурой
   * 3. Ближайший город
   */
  private findBestConnectionForIsolatedCity(cityId: string): CityConnection | null {
    const city = ALL_CITIES.find((c) => c.id === cityId);
    if (!city) {
      return null;
    }

    // Ищем ближайший хаб
    const nearestHub = this.findNearestHub(city);
    if (nearestHub) {
      return this.createConnection(city, nearestHub, 'airplane');
    }

    // Ищем ближайший город с инфраструктурой
    const nearestCityWithInfrastructure = this.findNearestCityWithInfrastructure(city);
    if (nearestCityWithInfrastructure) {
      // Определяем тип транспорта на основе расстояния и инфраструктуры
      const transportType = this.determineTransportType(city, nearestCityWithInfrastructure);
      return this.createConnection(city, nearestCityWithInfrastructure, transportType);
    }

    // Ищем ближайший город
    const nearestCity = this.findNearestCity(city);
    if (nearestCity) {
      const transportType = this.determineTransportType(city, nearestCity);
      return this.createConnection(city, nearestCity, transportType);
    }

    return null;
  }

  /**
   * Соединяет компоненты связности
   * 
   * Находит ближайшие города между компонентами и создаёт соединения
   */
  private connectComponents(components: string[][]): CityConnection[] {
    const connections: CityConnection[] = [];

    // Соединяем каждую пару компонент
    for (let i = 0; i < components.length - 1; i++) {
      const component1 = components[i];
      const component2 = components[i + 1];

      // Находим ближайшие города между компонентами
      const bestConnection = this.findBestConnectionBetweenComponents(component1, component2);
      if (bestConnection) {
        connections.push(bestConnection);
      }
    }

    return connections;
  }

  /**
   * Находит лучшее соединение между двумя компонентами
   */
  private findBestConnectionBetweenComponents(
    component1: string[],
    component2: string[]
  ): CityConnection | null {
    let minDistance = Infinity;
    let bestFromCity: CityReference | null = null;
    let bestToCity: CityReference | null = null;

    // Ищем ближайшие города между компонентами
    for (const cityId1 of component1) {
      const city1 = ALL_CITIES.find((c) => c.id === cityId1);
      if (!city1) {
        continue;
      }

      for (const cityId2 of component2) {
        const city2 = ALL_CITIES.find((c) => c.id === cityId2);
        if (!city2) {
          continue;
        }

        const distance = this.distanceCalculator.calculateHaversineDistance(
          new Coordinates(city1.coordinates.latitude, city1.coordinates.longitude),
          new Coordinates(city2.coordinates.latitude, city2.coordinates.longitude)
        );

        if (distance < minDistance) {
          minDistance = distance;
          bestFromCity = city1;
          bestToCity = city2;
        }
      }
    }

    if (!bestFromCity || !bestToCity) {
      return null;
    }

    // Определяем тип транспорта
    const transportType = this.determineTransportType(bestFromCity, bestToCity);
    return this.createConnection(bestFromCity, bestToCity, transportType);
  }

  /**
   * Находит ближайший хаб
   * 
   * Хабы имеют id вида 'moscow-hub', 'yakutsk-hub' и т.д.
   * Города имеют id вида 'moscow', 'yakutsk' и т.д.
   * Сопоставляем по названию или по id (убирая '-hub' суффикс)
   */
  private findNearestHub(city: CityReference): CityReference | null {
    let minDistance = Infinity;
    let nearestHub: CityReference | null = null;

    for (const hub of ALL_HUBS) {
      // Ищем город по названию хаба или по id (убирая '-hub' суффикс)
      const hubCityId = hub.id.replace('-hub', '');
      const hubCity = ALL_CITIES.find(
        (c) => c.name === hub.name || c.id === hubCityId || c.normalizedName === hub.name.toLowerCase()
      );
      if (!hubCity) {
        continue;
      }

      const distance = this.distanceCalculator.calculateHaversineDistance(
        new Coordinates(city.coordinates.latitude, city.coordinates.longitude),
        new Coordinates(hubCity.coordinates.latitude, hubCity.coordinates.longitude)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestHub = hubCity;
      }
    }

    return nearestHub;
  }

  /**
   * Находит ближайший город с инфраструктурой
   */
  private findNearestCityWithInfrastructure(city: CityReference): CityReference | null {
    let minDistance = Infinity;
    let nearestCity: CityReference | null = null;

    for (const otherCity of ALL_CITIES) {
      if (otherCity.id === city.id) {
        continue;
      }

      // Проверяем, есть ли у города инфраструктура
      if (
        !otherCity.infrastructure.hasAirport &&
        !otherCity.infrastructure.hasTrainStation &&
        !otherCity.infrastructure.hasBusStation &&
        !otherCity.infrastructure.hasFerryPier
      ) {
        continue;
      }

      const distance = this.distanceCalculator.calculateHaversineDistance(
        new Coordinates(city.coordinates.latitude, city.coordinates.longitude),
        new Coordinates(otherCity.coordinates.latitude, otherCity.coordinates.longitude)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = otherCity;
      }
    }

    return nearestCity;
  }

  /**
   * Находит ближайший город
   */
  private findNearestCity(city: CityReference): CityReference | null {
    let minDistance = Infinity;
    let nearestCity: CityReference | null = null;

    for (const otherCity of ALL_CITIES) {
      if (otherCity.id === city.id) {
        continue;
      }

      const distance = this.distanceCalculator.calculateHaversineDistance(
        new Coordinates(city.coordinates.latitude, city.coordinates.longitude),
        new Coordinates(otherCity.coordinates.latitude, otherCity.coordinates.longitude)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = otherCity;
      }
    }

    return nearestCity;
  }

  /**
   * Определяет тип транспорта на основе расстояния и инфраструктуры
   */
  private determineTransportType(
    from: CityReference,
    to: CityReference
  ): ConnectionType {
    const distance = this.distanceCalculator.calculateHaversineDistance(
      new Coordinates(from.coordinates.latitude, from.coordinates.longitude),
      new Coordinates(to.coordinates.latitude, to.coordinates.longitude)
    );

    // Авиа: если оба города имеют аэропорты и расстояние > 200 км
    if (from.infrastructure.hasAirport && to.infrastructure.hasAirport && distance > 200) {
      return 'airplane';
    }

    // ЖД: если оба города имеют ЖД-станции и расстояние < 2000 км
    if (from.infrastructure.hasTrainStation && to.infrastructure.hasTrainStation && distance < 2000) {
      return 'train';
    }

    // Паром: если оба города имеют причалы и расстояние < 500 км
    if (from.infrastructure.hasFerryPier && to.infrastructure.hasFerryPier && distance < 500) {
      return 'ferry';
    }

    // Автобус: если расстояние < 1500 км
    if (distance < 1500) {
      return 'bus';
    }

    // По умолчанию: авиа для больших расстояний
    return 'airplane';
  }

  /**
   * Создаёт соединение между двумя городами
   */
  private createConnection(
    from: CityReference,
    to: CityReference,
    type: ConnectionType
  ): CityConnection {
    const distance = this.distanceCalculator.calculateHaversineDistance(
      new Coordinates(from.coordinates.latitude, from.coordinates.longitude),
      new Coordinates(to.coordinates.latitude, to.coordinates.longitude)
    );

    // Вычисляем время в пути (зависит от типа транспорта)
    const duration = this.calculateDuration(distance, type);

    // Вычисляем базовую цену
    const transportType = this.mapConnectionTypeToTransportType(type);
    const basePrice = this.priceCalculator.calculateBasePrice(
      transportType,
      {
        distance,
        season: Season.SUMMER,
        region: from.administrative.subject.name.includes('Якутия') ? 'yakutia' : 'russia',
      }
    );

    return {
      id: `connectivity-${from.id}-${to.id}-${type}-${Date.now()}`,
      type,
      fromCityId: from.id,
      toCityId: to.id,
      distance,
      duration,
      basePrice,
      season: 'all',
      isDirect: true,
    };
  }

  /**
   * Вычисляет время в пути (в минутах)
   */
  private calculateDuration(distance: number, type: ConnectionType): number {
    // Средние скорости (км/ч)
    const speeds: Record<ConnectionType, number> = {
      airplane: 800,
      train: 80,
      bus: 60,
      ferry: 30,
      winter_road: 50,
      taxi: 40,
    };

    const speed = speeds[type] || 60;
    const hours = distance / speed;
    return Math.round(hours * 60);
  }

  /**
   * Маппит ConnectionType в TransportType
   */
  private mapConnectionTypeToTransportType(type: ConnectionType): TransportType {
    const mapping: Record<ConnectionType, TransportType> = {
      airplane: TransportType.AIRPLANE,
      train: TransportType.TRAIN,
      bus: TransportType.BUS,
      ferry: TransportType.FERRY,
      winter_road: TransportType.WINTER_ROAD,
      taxi: TransportType.TAXI,
    };

    return mapping[type];
  }
}

