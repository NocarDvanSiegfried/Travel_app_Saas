/**
 * Тесты для OSRM клиента
 */

import { OsrmClient } from '../../../../infrastructure/api/osrm/OsrmClient';
import { Coordinates } from '../../../../domain/smart-routing/value-objects/Coordinates';
import type { ICacheService } from '../../../../infrastructure/cache/ICacheService';

// Мокаем fetch
global.fetch = jest.fn();

describe('OsrmClient', () => {
  let mockCache: jest.Mocked<ICacheService>;
  let osrmClient: OsrmClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      deleteByPattern: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      mget: jest.fn(),
      mset: jest.fn(),
      flushAll: jest.fn(),
    };
    osrmClient = new OsrmClient(undefined, mockCache);
  });

  describe('getRoute', () => {
    it('должен возвращать маршрут из кэша, если он есть', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 113.9611);

      const cachedResult = {
        geometry: {
          type: 'LineString' as const,
          coordinates: [[129.7042, 62.0278], [113.9611, 62.5353]],
        },
        distance: 1000000,
        duration: 3600,
        fromCache: false,
      };

      mockCache.get.mockResolvedValue(cachedResult);

      const result = await osrmClient.getRoute({ from, to });

      expect(result.fromCache).toBe(true);
      expect(mockCache.get).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('должен запрашивать маршрут через OSRM API, если его нет в кэше', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 113.9611);

      mockCache.get.mockResolvedValue(null);

      const mockResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000000,
            duration: 3600,
            geometry: {
              type: 'LineString',
              coordinates: [[129.7042, 62.0278], [129.5, 62.2], [113.9611, 62.5353]],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await osrmClient.getRoute({ from, to });

      expect(result.fromCache).toBe(false);
      expect(result.geometry.coordinates.length).toBeGreaterThan(2);
      expect(mockCache.set).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
    });

    it('должен обрабатывать промежуточные точки', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const via = new Coordinates(62.12, 129.73);
      const to = new Coordinates(62.5353, 113.9611);

      mockCache.get.mockResolvedValue(null);

      const mockResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000000,
            duration: 3600,
            geometry: {
              type: 'LineString',
              coordinates: [
                [129.7042, 62.0278],
                [129.73, 62.12],
                [113.9611, 62.5353],
              ],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await osrmClient.getRoute({ from, to, via: [via] });

      expect(result.geometry.coordinates.length).toBe(3);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('129.7042,62.0278;129.73,62.12;113.9611,62.5353'),
        expect.any(Object)
      );
    });
  });

  describe('getRouteWithFallback', () => {
    it('должен возвращать упрощённый путь при ошибке OSRM API', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 113.9611);

      mockCache.get.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await osrmClient.getRouteWithFallback({ from, to });

      expect(result.fromCache).toBe(false);
      expect(result.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('должен использовать промежуточные точки в fallback', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const via = new Coordinates(62.12, 129.73);
      const to = new Coordinates(62.5353, 113.9611);

      mockCache.get.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await osrmClient.getRouteWithFallback({ from, to, via: [via] });

      expect(result.geometry.coordinates.length).toBe(3);
      expect(result.geometry.coordinates[0]).toEqual([129.7042, 62.0278]);
      expect(result.geometry.coordinates[1]).toEqual([129.73, 62.12]);
      expect(result.geometry.coordinates[2]).toEqual([113.9611, 62.5353]);
    });
  });

  describe('getRouteWithFederalRoadsPriority', () => {
    it('должен пытаться получить маршрут с приоритетом федеральных дорог', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 113.9611);

      mockCache.get.mockResolvedValue(null);

      const mockResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000000,
            duration: 3600,
            geometry: {
              type: 'LineString',
              coordinates: [
                [129.7042, 62.0278],
                [129.5, 62.2],
                [113.9611, 62.5353],
              ],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await osrmClient.getRouteWithFederalRoadsPriority({ from, to });

      expect(result.geometry.coordinates.length).toBeGreaterThan(2);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('должен использовать fallback при ошибке', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 113.9611);

      mockCache.get.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await osrmClient.getRouteWithFederalRoadsPriority({ from, to });

      // Должен использовать fallback
      expect(result.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('кэширование', () => {
    it('должен сохранять результат в кэш после успешного запроса', async () => {
      const from = new Coordinates(62.0278, 129.7042);
      const to = new Coordinates(62.5353, 113.9611);

      mockCache.get.mockResolvedValue(null);

      const mockResponse = {
        code: 'Ok',
        routes: [
          {
            distance: 1000000,
            duration: 3600,
            geometry: {
              type: 'LineString',
              coordinates: [[129.7042, 62.0278], [113.9611, 62.5353]],
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await osrmClient.getRoute({ from, to });

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('osrm:route'),
        expect.objectContaining({
          geometry: expect.any(Object),
          distance: expect.any(Number),
          duration: expect.any(Number),
        }),
        24 * 60 * 60 // 24 часа
      );
    });
  });
});

