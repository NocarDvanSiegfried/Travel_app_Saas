/**
 * Test Data Helpers
 * 
 * Utility functions for creating test data in integration tests.
 */

import { RealStop } from '../../../domain/entities/RealStop';
import { VirtualStop } from '../../../domain/entities/VirtualStop';
import { Route } from '../../../domain/entities/Route';
import { Flight } from '../../../domain/entities/Flight';
import type { GraphNeighbor } from '../../../domain/repositories/IGraphRepository';
import { TransportType } from '../../../domain/entities/RouteSegment';

/**
 * Options for creating a test RealStop
 */
export type TestRealStopOptions = {
  id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  cityId?: string;
  isAirport?: boolean;
  isRailwayStation?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Creates a test RealStop with default or provided values
 */
export function createTestRealStop(options: TestRealStopOptions = {}): RealStop {
  return new RealStop(
    options.id || 'test-stop-1',
    options.name || 'Тестовая Остановка',
    options.latitude ?? 62.0355,
    options.longitude ?? 129.6755,
    options.cityId || 'test-city',
    options.isAirport ?? false,
    options.isRailwayStation ?? false,
    options.metadata
  );
}

/**
 * Options for creating a test VirtualStop
 */
export type TestVirtualStopOptions = {
  id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  gridType?: 'MAIN_GRID' | 'DENSE_CITY' | 'AIRPORT_GRID';
  gridPosition?: { x: number; y: number };
  nearbyRealStops?: Array<{ stopId: string; distance: number }>;
  metadata?: Record<string, unknown>;
};

/**
 * Creates a test VirtualStop with default or provided values
 */
export function createTestVirtualStop(options: TestVirtualStopOptions = {}): VirtualStop {
  return new VirtualStop(
    options.id || 'test-virtual-stop-1',
    options.name || 'Виртуальная Остановка',
    options.latitude ?? 62.0355,
    options.longitude ?? 129.6755,
    options.gridType || 'MAIN_GRID',
    undefined, // cityId
    options.gridPosition || { x: 0, y: 0 },
    options.nearbyRealStops || []
  );
}

/**
 * Options for creating a test Route
 */
export type TestRouteOptions = {
  id?: string;
  routeNumber?: string;
  transportType?: TransportType;
  fromStopId?: string;
  toStopId?: string;
  stopsSequence?: Array<{ stopId: string; order: number; arrivalTime?: string; departureTime?: string }>;
  durationMinutes?: number;
  distanceKm?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Creates a test Route with default or provided values
 */
export function createTestRoute(options: TestRouteOptions = {}): Route {
  return new Route(
    options.id || 'test-route-1',
    options.transportType || TransportType.BUS,
    options.fromStopId || 'stop-1',
    options.toStopId || 'stop-2',
    options.stopsSequence || [
      { stopId: options.fromStopId || 'stop-1', order: 1, departureTime: '08:00' },
      { stopId: options.toStopId || 'stop-2', order: 2, arrivalTime: '14:00' },
    ],
    options.routeNumber || 'TEST-001',
    options.durationMinutes ?? 360,
    options.distanceKm ?? 500,
    undefined, // operator
    options.metadata
  );
}

/**
 * Options for creating a test Flight
 */
export type TestFlightOptions = {
  id?: string;
  routeId?: string;
  fromStopId?: string;
  toStopId?: string;
  departureTime?: string;
  arrivalTime?: string;
  daysOfWeek?: number[];
  priceRub?: number;
  transportType?: TransportType;
  isVirtual?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Creates a test Flight with default or provided values
 */
export function createTestFlight(options: TestFlightOptions = {}): Flight {
  return new Flight(
    options.id || 'test-flight-1',
    options.fromStopId || 'stop-1',
    options.toStopId || 'stop-2',
    options.departureTime || '08:00',
    options.arrivalTime || '14:00',
    options.daysOfWeek || [1, 2, 3, 4, 5],
    options.routeId,
    options.priceRub ?? 1000,
    options.isVirtual ?? false,
    options.transportType || TransportType.BUS,
    options.metadata
  );
}

/**
 * Options for creating a test graph structure
 */
export type TestGraphStructureOptions = {
  nodes?: string[];
  edges?: Record<string, GraphNeighbor[]>;
};

/**
 * Creates a test graph structure with default or provided values
 */
export function createTestGraphStructure(options: TestGraphStructureOptions = {}): {
  nodes: string[];
  edges: Record<string, GraphNeighbor[]>;
} {
  const defaultNodes = ['stop-1', 'stop-2', 'stop-3'];
  const defaultEdges: Record<string, GraphNeighbor[]> = {
    'stop-1': [
      {
        neighborId: 'stop-2',
        weight: 60,
        metadata: {
          distance: 50,
          transportType: TransportType.BUS,
          routeId: 'route-1',
        },
      },
    ],
    'stop-2': [
      {
        neighborId: 'stop-3',
        weight: 120,
        metadata: {
          distance: 100,
          transportType: TransportType.TRAIN,
          routeId: 'route-2',
        },
      },
    ],
    'stop-3': [],
  };

  return {
    nodes: options.nodes || defaultNodes,
    edges: options.edges || defaultEdges,
  };
}

/**
 * Options for creating a test graph (for saveGraph method)
 */
export type TestGraphOptions = {
  version?: string;
  nodes?: string[];
  edges?: Map<string, GraphNeighbor[]>;
  metadata?: {
    version: string;
    nodes: number;
    edges: number;
    buildTimestamp: number;
    datasetVersion: string;
  };
};

/**
 * Creates a test graph with default or provided values
 * Returns data in format suitable for saveGraph() method
 */
export function createTestGraph(options: TestGraphOptions = {}): {
  version: string;
  nodes: string[];
  edges: Map<string, GraphNeighbor[]>;
  metadata: {
    version: string;
    nodes: number;
    edges: number;
    buildTimestamp: number;
    datasetVersion: string;
  };
} {
  const defaultNodes = ['stop-1', 'stop-2'];
  const defaultEdgesMap = new Map<string, GraphNeighbor[]>([
    [
      'stop-1',
      [
        {
          neighborId: 'stop-2',
          weight: 360,
          metadata: {
            distance: 4900,
            transportType: TransportType.AIRPLANE,
            routeId: 'route-1',
          },
        },
      ],
    ],
    ['stop-2', []],
  ]);

  const version = options.version || 'graph-v1.0.0';
  const nodes = options.nodes || defaultNodes;
  const edges = options.edges || defaultEdgesMap;
  const metadata = options.metadata || {
    version,
    nodes: nodes.length,
    edges: Array.from(edges.values()).reduce((sum, neighbors) => sum + neighbors.length, 0),
    buildTimestamp: Date.now(),
    datasetVersion: 'dataset-v1.0.0',
  };

  return {
    version,
    nodes,
    edges,
    metadata,
  };
}

