/**
 * Тесты для построения паромных маршрутов
 * 
 * Проверяет:
 * - Построение маршрутов по рекам (Лена, Алдан, Вилюй)
 * - Обработку устьев рек при переходе между реками
 * - Сезонность паромов (лето, переходный, зимний)
 * - Визуализацию паромов волнистой линией
 * - Расчёт расстояния с коэффициентом извилистости
 */

import { SmartRouteBuilder } from '../../../application/smart-routing/algorithms/SmartRouteBuilder';
import { TransportType } from '../../../domain/entities/RouteSegment';
import { Season } from '../../../domain/smart-routing/enums/Season';
import { getCityById } from '../../../domain/smart-routing/data/cities-reference';
import { getConnectionBetweenCities } from '../../../domain/smart-routing/data/connections-model';

// Мокаем зависимости
jest.mock('../../../infrastructure/cache/RedisCacheService');

describe('SmartRouteBuilder - Паромные маршруты', () => {
  let builder: SmartRouteBuilder;

  beforeEach(() => {
    builder = new SmartRouteBuilder();
  });

  describe('buildRouteViaRivers', () => {
    it('should build route Якутск → Ленск (по реке Лена, лето)', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('lensk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15', // Лето
        preferredTransport: TransportType.FERRY,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThan(0);
      expect(result?.route.segments[0].type).toBe(TransportType.FERRY);
      
      // Проверяем, что путь не является прямой линией (волнистая линия)
      const pathGeometry = result?.route.segments[0].pathGeometry;
      expect(pathGeometry?.coordinates.length).toBeGreaterThan(2);
    });

    it('should not build ferry route in winter', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('lensk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-01-15', // Зима
        preferredTransport: TransportType.FERRY,
      });

      // Паромы недоступны зимой (кроме коротких маршрутов)
      // Для длинных маршрутов должен вернуть null
      if (result) {
        // Если маршрут найден, это должен быть короткий маршрут (Якутск ↔ Нижний Бестях)
        const totalDistance = result.route.segments.reduce((sum, seg) => sum + seg.distance.value, 0);
        expect(totalDistance).toBeLessThanOrEqual(20); // Только короткие маршруты
      }
    });

    it('should build route Хандыга → Якутск (через устье Алдана)', async () => {
      const fromCity = getCityById('khandyga');
      const toCity = getCityById('yakutsk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15', // Лето
        preferredTransport: TransportType.FERRY,
      });

      expect(result).not.toBeNull();
      // Маршрут может быть прямым или через устье
      expect(result?.route.segments.length).toBeGreaterThan(0);
    });

    it('should build route Вилюйск → Якутск (через устье Вилюя)', async () => {
      const fromCity = getCityById('vilyuisk');
      const toCity = getCityById('yakutsk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15', // Лето
        preferredTransport: TransportType.FERRY,
      });

      expect(result).not.toBeNull();
      expect(result?.route.segments.length).toBeGreaterThan(0);
    });
  });

  describe('Ferry path visualization', () => {
    it('should create wavy line for ferry routes', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('lensk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.FERRY,
      });

      expect(result).not.toBeNull();
      
      // Проверяем визуализацию
      const visualization = result?.route.visualization;
      expect(visualization).toBeDefined();
      
      const ferrySegment = result?.route.segments.find(s => s.type === TransportType.FERRY);
      if (ferrySegment) {
        const pathLine = visualization?.polylines.find(
          p => p.geometry === ferrySegment.pathGeometry.coordinates
        );
        expect(pathLine?.color).toBe('#00CCFF'); // Голубой
        expect(pathLine?.weight).toBe(2); // 2px
        expect(pathLine?.style).toBe('wavy'); // Волнистая линия
      }
    });

    it('should show ferry piers as markers', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('lensk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.FERRY,
      });

      expect(result).not.toBeNull();
      
      // Проверяем маркеры
      const markers = result?.route.visualization.markers;
      expect(markers).toBeDefined();
      expect(markers?.length).toBeGreaterThan(0);
      
      // Проверяем, что есть маркеры для пристаней
      const ferryPierMarkers = markers?.filter(m => m.icon === 'ferry_pier');
      expect(ferryPierMarkers?.length).toBeGreaterThan(0);
    });
  });

  describe('River distance calculation', () => {
    it('should use river coefficient for distance calculation', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('lensk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15',
        preferredTransport: TransportType.FERRY,
      });

      expect(result).not.toBeNull();
      
      // Проверяем, что расстояние учитывает извилистость реки
      const ferrySegment = result?.route.segments.find(s => s.type === TransportType.FERRY);
      if (ferrySegment) {
        // Расстояние по реке должно быть больше расстояния по прямой
        const straightDistance = Math.sqrt(
          Math.pow(toCity.coordinates.latitude - fromCity.coordinates.latitude, 2) +
          Math.pow(toCity.coordinates.longitude - fromCity.coordinates.longitude, 2)
        ) * 111; // Примерное преобразование в км
        
        // Расстояние по реке должно быть больше (коэффициент 1.15-1.2 для Лены)
        expect(ferrySegment.distance.value).toBeGreaterThan(straightDistance * 1.1);
      }
    });
  });

  describe('Ferry seasonality', () => {
    it('should allow ferry routes in summer', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('lensk');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-07-15', // Лето
        preferredTransport: TransportType.FERRY,
      });

      expect(result).not.toBeNull();
    });

    it('should allow short ferry routes in transition period', async () => {
      const fromCity = getCityById('yakutsk');
      const toCity = getCityById('nizhny-bestyakh');

      if (!fromCity || !toCity) {
        throw new Error('Города не найдены');
      }

      // Переходный период (май)
      const result = await builder.buildRoute({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        date: '2024-05-15',
        preferredTransport: TransportType.FERRY,
      });

      // Короткие маршруты могут быть доступны в переходный период
      expect(result).not.toBeNull();
    });
  });

  describe('Ferry connections validation', () => {
    it('should validate ferry connections exist', () => {
      const connections = getConnectionBetweenCities('yakutsk', 'lensk', TransportType.FERRY);
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should validate river metadata in connections', () => {
      const connection = getConnectionBetweenCities('yakutsk', 'lensk', TransportType.FERRY)[0];
      expect(connection).toBeDefined();
      expect(connection.type).toBe('ferry');
      // Проверяем, что есть метаданные о реке
      expect(connection.metadata?.river).toBeDefined();
    });
  });
});






