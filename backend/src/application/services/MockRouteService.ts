import { Route } from '@domain/entities/Route';
import { RouteSegment, TransportType } from '@domain/entities/RouteSegment';
import { Coordinates } from '@domain/value-objects/Coordinates';
import { Price } from '@domain/value-objects/Price';
import { RoutePreference, RoutePreferenceType } from '@domain/value-objects/RoutePreference';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

interface MockCity {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface MockSegment {
  id: string;
  transportType: TransportType;
  fromCityId: string;
  toCityId: string;
  departureTime: string;
  arrivalTime: string;
  priceAmount: number;
  priceCurrency: string;
  carrier?: string;
  vehicleNumber?: string;
}

interface MockRoute {
  id: string;
  segments: string[];
  riskScore?: number;
}

/**
 * Сервис для работы с mock данными маршрутов
 */
export class MockRouteService {
  private cities: MockCity[] = [];
  private segments: MockSegment[] = [];
  private routes: MockRoute[] = [];
  private loaded = false;

  /**
   * Загрузка mock данных из JSON файлов
   */
  loadRoutes(): void {
    if (this.loaded) {
      return;
    }

    try {
      // Поддержка запуска как из корня проекта, так и из папки backend
      const dataDir = fs.existsSync(path.join(process.cwd(), 'data', 'mock-data'))
        ? path.join(process.cwd(), 'data', 'mock-data')
        : path.join(process.cwd(), 'backend', 'data', 'mock-data');
      
      // Загрузка городов
      const citiesPath = path.join(dataDir, 'cities.json');
      if (fs.existsSync(citiesPath)) {
        this.cities = JSON.parse(fs.readFileSync(citiesPath, 'utf-8'));
      }

      // Загрузка сегментов
      const segmentsPath = path.join(dataDir, 'segments.json');
      if (fs.existsSync(segmentsPath)) {
        this.segments = JSON.parse(fs.readFileSync(segmentsPath, 'utf-8'));
      }

      // Загрузка маршрутов
      const routesPath = path.join(dataDir, 'routes.json');
      if (fs.existsSync(routesPath)) {
        this.routes = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));
      }

      this.loaded = true;
    } catch (error) {
      console.error('Error loading mock data:', error);
      // Инициализация дефолтными данными
      this.initializeDefaultData();
      this.loaded = true;
    }
  }

  /**
   * Инициализация дефолтными данными для тестовых сценариев
   */
  private initializeDefaultData(): void {
    this.cities = [
      { id: 'moscow', name: 'Москва', coordinates: { latitude: 55.7558, longitude: 37.6173 } },
      { id: 'yakutsk', name: 'Якутск', coordinates: { latitude: 62.0355, longitude: 129.6755 } },
      { id: 'olekminsk', name: 'Олёкминск', coordinates: { latitude: 60.3733, longitude: 120.4264 } },
      { id: 'sangar', name: 'Сангар', coordinates: { latitude: 63.9244, longitude: 127.4739 } },
    ];

    this.segments = [
      // Москва → Якутск (авиа)
      {
        id: 'seg-msk-ykt-air',
        transportType: 'air',
        fromCityId: 'moscow',
        toCityId: 'yakutsk',
        departureTime: '2024-06-15T08:00:00Z',
        arrivalTime: '2024-06-15T18:30:00Z',
        priceAmount: 25000,
        priceCurrency: 'RUB',
        carrier: 'Аэрофлот',
        vehicleNumber: 'SU-1234',
      },
      // Москва → Якутск (ЖД)
      {
        id: 'seg-msk-ykt-rail',
        transportType: 'rail',
        fromCityId: 'moscow',
        toCityId: 'yakutsk',
        departureTime: '2024-06-15T10:00:00Z',
        arrivalTime: '2024-06-17T14:00:00Z',
        priceAmount: 12000,
        priceCurrency: 'RUB',
        carrier: 'РЖД',
        vehicleNumber: '001М',
      },
      // Якутск → Олёкминск (речной)
      {
        id: 'seg-ykt-olk-river',
        transportType: 'river',
        fromCityId: 'yakutsk',
        toCityId: 'olekminsk',
        departureTime: '2024-06-16T06:00:00Z',
        arrivalTime: '2024-06-16T20:00:00Z',
        priceAmount: 3500,
        priceCurrency: 'RUB',
        carrier: 'Ленское речное пароходство',
        vehicleNumber: 'Лена-42',
      },
      // Якутск → Сангар (речной)
      {
        id: 'seg-ykt-sang-river',
        transportType: 'river',
        fromCityId: 'yakutsk',
        toCityId: 'sangar',
        departureTime: '2024-06-16T08:00:00Z',
        arrivalTime: '2024-06-16T22:00:00Z',
        priceAmount: 3200,
        priceCurrency: 'RUB',
        carrier: 'Ленское речное пароходство',
        vehicleNumber: 'Лена-38',
      },
    ];

    this.routes = [
      {
        id: 'route-msk-ykt-olk',
        segments: ['seg-msk-ykt-air', 'seg-ykt-olk-river'],
        riskScore: 0.15,
      },
      {
        id: 'route-msk-ykt-olk-rail',
        segments: ['seg-msk-ykt-rail', 'seg-ykt-olk-river'],
        riskScore: 0.12,
      },
      {
        id: 'route-msk-ykt-sang',
        segments: ['seg-msk-ykt-air', 'seg-ykt-sang-river'],
        riskScore: 0.18,
      },
      {
        id: 'route-msk-ykt-sang-rail',
        segments: ['seg-msk-ykt-rail', 'seg-ykt-sang-river'],
        riskScore: 0.14,
      },
    ];
  }

  /**
   * Фильтрация маршрутов по критериям
   */
  filterRoutes(
    fromCity: string,
    toCity: string,
    date: Date,
    preference?: RoutePreferenceType
  ): Route[] {
    this.loadRoutes();

    const fromCityData = this.cities.find(c => c.name.toLowerCase() === fromCity.toLowerCase());
    const toCityData = this.cities.find(c => c.name.toLowerCase() === toCity.toLowerCase());

    if (!fromCityData || !toCityData) {
      return [];
    }

    const matchingRoutes: Route[] = [];

    for (const routeData of this.routes) {
      const routeSegments = this.mergeSegmentsIntoRouteChain(routeData.segments);

      if (!routeSegments || routeSegments.length === 0) {
        continue;
      }

      const firstSegment = routeSegments[0];
      const lastSegment = routeSegments[routeSegments.length - 1];

      // Проверка соответствия начального и конечного города
      if (
        firstSegment.fromCity.toLowerCase() !== fromCity.toLowerCase() ||
        lastSegment.toCity.toLowerCase() !== toCity.toLowerCase()
      ) {
        continue;
      }

      // Проверка даты
      const routeDate = new Date(firstSegment.departureTime);
      if (
        routeDate.getFullYear() !== date.getFullYear() ||
        routeDate.getMonth() !== date.getMonth() ||
        routeDate.getDate() !== date.getDate()
      ) {
        continue;
      }

      // Создание domain Route
      const totalPrice = routeSegments.reduce(
        (sum, seg) => sum.add(seg.price),
        new Price(0)
      );

      const route = new Route(
        routeData.id,
        routeSegments,
        fromCity,
        toCity,
        totalPrice,
        'available',
        routeData.riskScore
      );

      matchingRoutes.push(route);
    }

    // Сортировка по предпочтениям
    if (preference) {
      const pref = new RoutePreference(preference);
      matchingRoutes.sort((a, b) => {
        const weightA = pref.getWeight(
          a.getTotalDurationMinutes(),
          a.totalPrice.amount,
          a.riskScore || 0
        );
        const weightB = pref.getWeight(
          b.getTotalDurationMinutes(),
          b.totalPrice.amount,
          b.riskScore || 0
        );
        return weightA - weightB;
      });
    }

    return matchingRoutes;
  }

  /**
   * Объединение сегментов в цепочку маршрута
   */
  mergeSegmentsIntoRouteChain(segmentIds: string[]): RouteSegment[] | null {
    const routeSegments: RouteSegment[] = [];

    for (const segmentId of segmentIds) {
      const segmentData = this.segments.find(s => s.id === segmentId);
      if (!segmentData) {
        return null;
      }

      const fromCityData = this.cities.find(c => c.id === segmentData.fromCityId);
      const toCityData = this.cities.find(c => c.id === segmentData.toCityId);

      if (!fromCityData || !toCityData) {
        return null;
      }

      const segment = new RouteSegment(
        segmentData.id,
        segmentData.transportType,
        fromCityData.name,
        toCityData.name,
        new Coordinates(fromCityData.coordinates.latitude, fromCityData.coordinates.longitude),
        new Coordinates(toCityData.coordinates.latitude, toCityData.coordinates.longitude),
        new Date(segmentData.departureTime),
        new Date(segmentData.arrivalTime),
        new Price(segmentData.priceAmount, segmentData.priceCurrency),
        segmentData.carrier,
        segmentData.vehicleNumber
      );

      routeSegments.push(segment);
    }

    return routeSegments;
  }

  /**
   * Вычисление risk score для маршрута
   */
  calculateRiskScore(segments: RouteSegment[]): number {
    let riskScore = 0;

    for (const segment of segments) {
      // Базовый риск по типу транспорта
      const transportRisk: Record<TransportType, number> = {
        air: 0.1,
        rail: 0.05,
        bus: 0.15,
        river: 0.2,
      };

      riskScore += transportRisk[segment.transportType] || 0.1;

      // Дополнительный риск за пересадки
      if (segments.length > 1) {
        riskScore += 0.05 * (segments.length - 1);
      }
    }

    return Math.min(riskScore, 1.0);
  }

  /**
   * Получение маршрута по ID
   */
  getRouteById(routeId: string): Route | null {
    this.loadRoutes();

    const routeData = this.routes.find(r => r.id === routeId);
    if (!routeData) {
      return null;
    }

    const routeSegments = this.mergeSegmentsIntoRouteChain(routeData.segments);
    if (!routeSegments || routeSegments.length === 0) {
      return null;
    }

    const firstSegment = routeSegments[0];
    const lastSegment = routeSegments[routeSegments.length - 1];

    const totalPrice = routeSegments.reduce(
      (sum, seg) => sum.add(seg.price),
      new Price(0)
    );

    return new Route(
      routeData.id,
      routeSegments,
      firstSegment.fromCity,
      lastSegment.toCity,
      totalPrice,
      'available',
      routeData.riskScore
    );
  }
}

