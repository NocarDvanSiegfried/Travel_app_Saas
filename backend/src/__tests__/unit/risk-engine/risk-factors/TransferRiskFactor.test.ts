/**
 * Unit Tests: TransferRiskFactor
 * 
 * Tests for transfer risk factor calculation.
 */

import { TransferRiskFactor } from '../../../../application/risk-engine/risk-factors/TransferRiskFactor';
import type { IBuiltRoute } from '../../../../domain/entities/BuiltRoute';
import type { IRouteSegment } from '../../../../domain/entities/RouteSegment';
import { TransportType } from '../../../../domain/entities/RouteSegment';

describe('TransferRiskFactor', () => {
  let factor: TransferRiskFactor;

  beforeEach(() => {
    factor = new TransferRiskFactor();
  });

  describe('calculateForRoute', () => {
    it('should return low risk for direct route (no transfers)', async () => {
      const route: IBuiltRoute = {
        routeId: 'route-1',
        fromCity: 'Москва',
        toCity: 'Санкт-Петербург',
        date: '2024-12-20',
        passengers: 1,
        segments: [
          {
            segment: {
              segmentId: 'seg-1',
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              routeId: 'route-1',
              transportType: TransportType.AIRPLANE,
              distance: 1000,
              estimatedDuration: 120,
              basePrice: 5000,
            },
            departureTime: '2024-12-20T10:00:00Z',
            arrivalTime: '2024-12-20T12:00:00Z',
            duration: 120,
            price: 5000,
          },
        ],
        totalDuration: 120,
        totalPrice: 5000,
        transferCount: 0,
        transportTypes: [TransportType.AIRPLANE],
      };

      const context = {
        date: '2024-12-20',
        passengers: 1,
      };

      const result = await factor.calculateForRoute(route, context, new Map());

      expect(result.value).toBe(0);
      expect(result.weight).toBeGreaterThan(0);
      expect(result.description).toContain('пересадок');
    });

    it('should return higher risk for route with multiple transfers', async () => {
      const route: IBuiltRoute = {
        routeId: 'route-2',
        fromCity: 'Москва',
        toCity: 'Казань',
        date: '2024-12-20',
        passengers: 1,
        segments: [
          {
            segment: {
              segmentId: 'seg-1',
              fromStopId: 'stop-a',
              toStopId: 'stop-b',
              routeId: 'route-1',
              transportType: TransportType.BUS,
              distance: 200,
              estimatedDuration: 30,
              basePrice: 1000,
            },
            departureTime: '2024-12-20T10:00:00Z',
            arrivalTime: '2024-12-20T10:30:00Z',
            duration: 30,
            price: 1000,
          },
          {
            segment: {
              segmentId: 'seg-2',
              fromStopId: 'stop-b',
              toStopId: 'stop-c',
              routeId: 'route-2',
              transportType: TransportType.TRAIN,
              distance: 500,
              estimatedDuration: 60,
              basePrice: 2000,
            },
            departureTime: '2024-12-20T11:00:00Z',
            arrivalTime: '2024-12-20T12:00:00Z',
            duration: 60,
            price: 2000,
          },
        ],
        totalDuration: 90,
        totalPrice: 3000,
        transferCount: 1,
        transportTypes: [TransportType.BUS, TransportType.TRAIN],
      };

      const context = {
        date: '2024-12-20',
        passengers: 1,
      };

      const result = await factor.calculateForRoute(route, context, new Map());

      expect(result.value).toBeGreaterThan(0);
      expect(result.description).toContain('пересадок');
    });
  });

  describe('getWeight', () => {
    it('should have appropriate weight for transfer risk', () => {
      expect(factor.getWeight(TransportType.AIRPLANE)).toBeGreaterThan(0);
      expect(factor.getWeight(TransportType.TRAIN)).toBeGreaterThan(0);
      expect(factor.getWeight(TransportType.BUS)).toBeGreaterThan(0);
    });
  });
});

