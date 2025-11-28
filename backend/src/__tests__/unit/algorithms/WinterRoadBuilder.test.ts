/**
 * Тесты для построения зимних маршрутов
 * 
 * Проверяет:
 * - Построение маршрутов по зимникам (только зимой)
 * - Сезонность зимников (декабрь - апрель)
 * - Визуализацию зимников пунктирной линией
 * - Правила выбора альтернативного транспорта при закрытии зимников
 */

import { SmartRouteBuilder } from '../../../application/smart-routing/algorithms/SmartRouteBuilder';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Season } from '../../../domain/smart-routing/enums/Season';
import { getCityById } from '../../../domain/smart-routing/data/cities-reference';
import { getConnectionBetweenCities } from '../../../domain/smart-routing/data/connections-model';

// Мокаем зависимости
jest.mock('../../../infrastructure/cache/RedisCacheService');

describe('SmartRouteBuilder - Зимние маршруты', () => {
  let builder: SmartRouteBuilder;

  beforeEach(() => {
    builder = new SmartRouteBuilder();
  });

  describe('buildRouteViaWinterRoad', () => {
    it('should build route Якутск → Верхоянск (зимник, зима)', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-01-15', // Зима
        preferredTransport: TransportType.WINTER_ROAD,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThan(0);
      expect(result?.route.segments[0].type).toBe(TransportType.WINTER_ROAD);
      
      // Проверяем, что путь не является прямой линией
      const pathGeometry = result?.route.segments[0].pathGeometry;
      expect(pathGeometry?.coordinates.length).toBeGreaterThan(2);
    });

    it('should not build winter road route in summer', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15', // Лето
        preferredTransport: TransportType.WINTER_ROAD,
      });

      // Зимники недоступны летом - должен вернуть альтернативный маршрут или null
      if (result) {
        // Если маршрут найден, это должен быть альтернативный транспорт (авиа, паром, автобус)
        const hasWinterRoad = result.route.segments.some(s => s.type === TransportType.WINTER_ROAD);
        expect(hasWinterRoad).toBe(false);
      }
    });

    it('should build route Якутск → Среднеколымск (1200 км, зима)', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('srednekolymsk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-01-15', // Зима
        preferredTransport: TransportType.WINTER_ROAD,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThan(0);
    });

    it('should build route Жиганск → Среднеколымск (400 км, зима)', async () => {
      const fromCity = getCityById('zhigansk');
      const toCity = getCityById('srednekolymsk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-02-15', // Зима
        preferredTransport: TransportType.WINTER_ROAD,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThan(0);
    });
  });

  describe('Winter road seasonality', () => {
    it('should allow winter roads in December', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-12-15', // Декабрь
        preferredTransport: TransportType.WINTER_ROAD,
      });

      expect(result).not.toBeNull();
    });

    it('should allow winter roads in April (first 15 days)', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-04-10', // Апрель (до 15 числа)
        preferredTransport: TransportType.WINTER_ROAD,
      });

      expect(result).not.toBeNull();
    });

    it('should not allow winter roads in May', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-05-15', // Май (переходный период)
        preferredTransport: TransportType.WINTER_ROAD,
      });

      // Зимники недоступны в мае
      if (result) {
        const hasWinterRoad = result.route.segments.some(s => s.type === TransportType.WINTER_ROAD);
        expect(hasWinterRoad).toBe(false);
      }
    });
  });

  describe('Alternative transport when winter roads closed', () => {
    it('should suggest airplane when winter road closed in summer', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15', // Лето
        preferredTransport: TransportType.WINTER_ROAD,
      });

      // Должен предложить альтернативу (авиа, паром или автобус)
      if (result) {
        const hasAlternative = result.route.segments.some(
          s => s.type === TransportType.AIRPLANE || 
               s.type === TransportType.FERRY || 
               s.type === TransportType.BUS
        );
        expect(hasAlternative).toBe(true);
      }
    });
  });

  describe('Winter road visualization', () => {
    it('should create dotted line for winter roads', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-01-15',
        preferredTransport: TransportType.WINTER_ROAD,
      });

      expect(result).not.toBeNull();
      
      // Проверяем визуализацию
      const visualization = result?.route.visualization;
      expect(visualization).toBeDefined();
      
      const winterRoadSegment = result?.route.segments.find(s => s.type === TransportType.WINTER_ROAD);
      if (winterRoadSegment) {
        const pathLine = visualization?.polylines.find(
          p => p.geometry === winterRoadSegment.pathGeometry.coordinates
        );
        expect(pathLine?.color).toBe('#CCCCCC'); // Светло-серый
        expect(pathLine?.weight).toBe(2); // 2px
        expect(pathLine?.style).toBe('dotted'); // Пунктирная линия
      }
    });

    it('should show winter road points as markers', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('verkhoyansk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-01-15',
        preferredTransport: TransportType.WINTER_ROAD,
      });

      expect(result).not.toBeNull();
      
      // Проверяем маркеры
      const markers = result?.route.visualization.markers;
      expect(markers).toBeDefined();
      expect(markers?.length).toBeGreaterThan(0);
    });
  });

  describe('Winter road connections validation', () => {
    it('should validate winter road connections exist', () => {
      const connections = getConnectionBetweenCities('yakutsk', 'verkhoyansk', TransportType.WINTER_ROAD);
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should validate season metadata in connections', () => {
      const connection = getConnectionBetweenCities('yakutsk', 'verkhoyansk', TransportType.WINTER_ROAD)[0];
      expect(connection).toBeDefined();
      expect(connection.type).toBe('winter_road');
      expect(connection.season).toBe('winter');
    });
  });
});





