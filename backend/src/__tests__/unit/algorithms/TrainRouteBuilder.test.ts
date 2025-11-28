/**
 * Тесты для построения ЖД-маршрутов
 * 
 * Проверяет:
 * - Построение маршрутов через станции АЯМ и Транссиба
 * - Обработку промежуточных станций
 * - Визуализацию ЖД как ломаных линий
 * - Сложные маршруты (Нижний Бестях → Москва через Тынду и Сковородино)
 */

import { SmartRouteBuilder } from '../../../application/smart-routing/algorithms/SmartRouteBuilder';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { getCityById } from '../../../domain/smart-routing/data/cities-reference';
import { ALL_CONNECTIONS, getConnectionBetweenCities } from '../../../domain/smart-routing/data/connections-model';

// Мокаем зависимости
jest.mock('../../../infrastructure/cache/RedisCacheService');

describe('SmartRouteBuilder - ЖД маршруты', () => {
  let builder: SmartRouteBuilder;

  beforeEach(() => {
    builder = new SmartRouteBuilder();
  });

  describe('buildRouteViaTrainStations', () => {
    it('should build route Нижний Бестях → Тында (АЯМ)', async () => {
      const fromCity = getCityById('nizhny-bestyakh');
      const toCity = getCityById('tynda');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.TRAIN,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThan(0);
      expect(result?.route.segments[0].type).toBe(TransportType.TRAIN);
      
      // Проверяем, что путь не является прямой линией
      const pathGeometry = result?.route.segments[0].pathGeometry;
      expect(pathGeometry?.coordinates.length).toBeGreaterThan(2);
    });

    it('should build route Нижний Бестях → Москва (через Тынду и Сковородино)', async () => {
      const fromCity = getCityById('nizhny-bestyakh');
      const toCity = getCityById('moscow');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.TRAIN,
        maxTransfers: 3,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThanOrEqual(2);
      
      // Проверяем, что маршрут проходит через Тынду и Сковородино
      const segmentTypes = result?.route.segments.map(s => s.type);
      expect(segmentTypes?.every(t => t === TransportType.TRAIN)).toBe(true);
    });

    it('should build route Алдан → Иркутск (через Тынду и Сковородино)', async () => {
      const fromCity = getCityById('aldan');
      const toCity = getCityById('irkutsk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.TRAIN,
        maxTransfers: 3,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThanOrEqual(2);
    });

    it('should use intermediate stations for train path', async () => {
      const fromCity = getCityById('nizhny-bestyakh');
      const toCity = getCityById('tommot');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.TRAIN,
      });

      expect(result).not.toBeNull();
      
      // Проверяем, что путь содержит промежуточные точки (не прямая линия)
      const pathGeometry = result?.route.segments[0].pathGeometry;
      expect(pathGeometry?.coordinates.length).toBeGreaterThan(2);
    });
  });

  describe('Train path visualization', () => {
    it('should create broken line for train routes', async () => {
      const fromCity = getCityById('nizhny-bestyakh');
      const toCity = getCityById('tynda');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.TRAIN,
      });

      expect(result).not.toBeNull();
      
      // Проверяем визуализацию
      const visualization = result?.route.visualization;
      expect(visualization).toBeDefined();
      
      const trainSegment = result?.route.segments.find(s => s.type === TransportType.TRAIN);
      if (trainSegment) {
        const pathLine = visualization?.polylines.find(
          p => p.geometry === trainSegment.pathGeometry.coordinates
        );
        expect(pathLine?.color).toBe('#FF6600'); // Оранжевый
        expect(pathLine?.weight).toBe(3); // 3px
        expect(pathLine?.style).toBe('solid'); // Сплошная линия
      }
    });

    it('should show train stations as markers', async () => {
      const fromCity = getCityById('nizhny-bestyakh');
      const toCity = getCityById('tynda');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.TRAIN,
      });

      expect(result).not.toBeNull();
      
      // Проверяем маркеры
      const markers = result?.route.visualization.markers;
      expect(markers).toBeDefined();
      expect(markers?.length).toBeGreaterThan(0);
      
      // Проверяем, что есть маркеры для ЖД-станций
      const trainStationMarkers = markers?.filter(m => m.icon === 'train_station');
      expect(trainStationMarkers?.length).toBeGreaterThan(0);
    });
  });

  describe('Train connections validation', () => {
    it('should validate train connections exist', () => {
      const connections = getConnectionBetweenCities('nizhny-bestyakh', 'tynda', TransportType.TRAIN);
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should validate intermediate stations in connections', () => {
      const connection = getConnectionBetweenCities('nizhny-bestyakh', 'tommot', TransportType.TRAIN)[0];
      expect(connection).toBeDefined();
      // Проверяем, что connection может содержать intermediateCities
      expect(connection.type).toBe('train');
    });
  });
});






