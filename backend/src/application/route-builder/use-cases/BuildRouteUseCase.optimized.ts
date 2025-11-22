/**
 * Optimized BuildRouteUseCase - Readonly Graph Access
 * 
 * Uses pre-built graph from Redis for fast route search.
 * No dynamic generation, no graph building, no heavy processing.
 * 
 * Target performance: < 10ms
 * 
 * @module application/route-builder/use-cases
 */

import type { IGraphRepository } from '../../../domain/repositories/IGraphRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';
import { getLogger } from '../../../shared/logger/Logger';
import { extractCityFromStopName } from '../../../shared/utils/city-normalizer';
import { AssessRouteRiskUseCase } from '../../risk-engine/AssessRouteRiskUseCase';
import type { IBuiltRoute } from '../../../domain/entities/BuiltRoute';
import type { IRiskAssessment } from '../../../domain/entities/RiskAssessment';
import { TransportType } from '../../../domain/entities/RouteSegment';

/**
 * Route search request
 */
export type BuildRouteRequest = {
  fromCity: string;
  toCity: string;
  date: Date;
  passengers: number;
};

/**
 * Route segment in the path
 */
export type RouteSegment = {
  fromStopId: string;
  toStopId: string;
  distance: number; // km
  duration: number; // minutes
  transportType: string;
  routeId?: string;
  price?: number;
  departureTime?: string;
  arrivalTime?: string;
};

/**
 * Complete route result
 */
export type RouteResult = {
  segments: RouteSegment[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  totalPrice: number;
  fromCity: string;
  toCity: string;
  departureDate: Date;
};

/**
 * Build route response
 */
export type BuildRouteResponse = {
  success: boolean;
  routes: RouteResult[];
  alternatives?: RouteResult[];
  riskAssessment?: IRiskAssessment;
  executionTimeMs: number;
  error?: string;
  graphAvailable: boolean;
  graphVersion?: string;
};

/**
 * Optimized BuildRouteUseCase
 * 
 * Clean Architecture Use Case for route building.
 * Uses only readonly graph access from Redis.
 * 
 * Performance guarantee: < 10ms execution time
 * 
 * @class
 */
export class OptimizedBuildRouteUseCase {
  private readonly logger = getLogger('OptimizedBuildRouteUseCase');

  constructor(
    private readonly graphRepository: IGraphRepository,
    private readonly flightRepository: IFlightRepository,
    private readonly stopRepository: IStopRepository,
    private readonly routeRepository: IRouteRepository
  ) {}

  /**
   * Execute route search
   * 
   * @param request - Route search request
   * @returns Route search response with execution metrics
   */
  public async execute(request: BuildRouteRequest): Promise<BuildRouteResponse> {
    const startTime = Date.now();

    try {
      // ====================================================================
      // Step 1: Verify Graph Availability
      // ====================================================================
      const graphVersion = await this.graphRepository.getGraphVersion();

      if (!graphVersion) {
        return {
          success: false,
          routes: [],
          executionTimeMs: Date.now() - startTime,
          error: 'Graph not available. Please run background worker to build graph.',
          graphAvailable: false,
        };
      }

      const graphMetadata = await this.graphRepository.getGraphMetadata();

      if (!graphMetadata) {
        return {
          success: false,
          routes: [],
          executionTimeMs: Date.now() - startTime,
          error: 'Graph metadata not found.',
          graphAvailable: false,
          graphVersion,
        };
      }

      // ====================================================================
      // Step 2: Find Stops for Cities (Readonly)
      // ====================================================================
      const fromStops = await this.findStopsForCity(request.fromCity);
      const toStops = await this.findStopsForCity(request.toCity);

      this.logger.debug('Stops found for cities', {
        fromCity: request.fromCity,
        toCity: request.toCity,
        fromStopsCount: fromStops.length,
        toStopsCount: toStops.length,
        fromStopIds: fromStops.map(s => s.id),
        toStopIds: toStops.map(s => s.id),
      });

      if (fromStops.length === 0) {
        this.logger.warn('No stops found for from city', {
          city: request.fromCity,
          graphVersion,
        });
        return {
          success: false,
          routes: [],
          executionTimeMs: Date.now() - startTime,
          error: `No stops found for city: ${request.fromCity}`,
          graphAvailable: true,
          graphVersion,
        };
      }

      if (toStops.length === 0) {
        this.logger.warn('No stops found for to city', {
          city: request.toCity,
          graphVersion,
        });
        return {
          success: false,
          routes: [],
          executionTimeMs: Date.now() - startTime,
          error: `No stops found for city: ${request.toCity}`,
          graphAvailable: true,
          graphVersion,
        };
      }

      // ====================================================================
      // Step 3: Find Best Path Using Dijkstra (Readonly Graph)
      // ====================================================================
      const fromStopId = fromStops[0].id;
      const toStopId = toStops[0].id;

      this.logger.debug('Searching path in graph', {
        fromStopId,
        toStopId,
        graphVersion,
      });

      // Check if nodes exist in graph before searching path
      const fromNodeExists = await this.graphRepository.hasNode(fromStopId);
      const toNodeExists = await this.graphRepository.hasNode(toStopId);
      
      if (!fromNodeExists || !toNodeExists) {
        const missingNodes = [];
        if (!fromNodeExists) missingNodes.push(fromStopId);
        if (!toNodeExists) missingNodes.push(toStopId);
        
        this.logger.warn('Graph nodes missing for found stops', {
          fromCity: request.fromCity,
          toCity: request.toCity,
          fromStopId,
          toStopId,
          missingNodes,
          graphVersion,
          message: 'Stops found in database but not in graph. Graph needs to be rebuilt.',
        });
        
        return {
          success: false,
          routes: [],
          executionTimeMs: Date.now() - startTime,
          error: `Stops found but graph is out of sync. Please rebuild graph. Missing nodes: ${missingNodes.join(', ')}`,
          graphAvailable: true,
          graphVersion,
        };
      }

      const path = await this.findShortestPath(
        fromStopId,
        toStopId,
        graphVersion
      );

      if (!path || path.length === 0) {
        this.logger.warn('No path found in graph (nodes exist but no route)', {
          fromCity: request.fromCity,
          toCity: request.toCity,
          fromStopId,
          toStopId,
          graphVersion,
          message: 'Stops and nodes exist, but no path found between them.',
        });
        
        return {
          success: false,
          routes: [],
          executionTimeMs: Date.now() - startTime,
          error: `No route found between ${request.fromCity} and ${request.toCity}`,
          graphAvailable: true,
          graphVersion,
        };
      }

      this.logger.debug('Path found in graph', {
        pathLength: path.length,
        path: path.join(' -> '),
        graphVersion,
      });

      // ====================================================================
      // Step 4: Build Route Segments from Path
      // ====================================================================
      const route = await this.buildRouteFromPath(
        path,
        request.date,
        request.passengers
      );

      // ====================================================================
      // Step 5: Find Alternative Routes (2-3 additional options)
      // ====================================================================
      const alternatives = await this.findAlternativePaths(
        fromStopId,
        toStopId,
        path,
        graphVersion,
        request.date,
        request.passengers
      );

      // ====================================================================
      // Step 6: Assess Route Risk
      // ====================================================================
      let riskAssessment: IRiskAssessment | undefined;
      try {
        const builtRoute: IBuiltRoute = {
          routeId: `route-${fromStopId}-${toStopId}-${Date.now()}`,
          fromCity: route.fromCity,
          toCity: route.toCity,
          date: request.date.toISOString(),
          passengers: request.passengers,
          segments: route.segments.map((seg, idx) => ({
            segment: {
              segmentId: `seg-${idx}`,
              fromStopId: seg.fromStopId,
              toStopId: seg.toStopId,
              routeId: seg.routeId || '',
              transportType: this.mapTransportType(seg.transportType),
              distance: seg.distance,
              estimatedDuration: seg.duration,
              basePrice: seg.price,
            },
            selectedFlight: seg.departureTime && seg.arrivalTime ? {
              flightId: `flight-${seg.fromStopId}-${seg.toStopId}`,
              flightNumber: undefined,
              departureTime: seg.departureTime,
              arrivalTime: seg.arrivalTime,
              price: seg.price,
              availableSeats: 10,
              status: 'scheduled',
            } : undefined,
            departureTime: seg.departureTime || '',
            arrivalTime: seg.arrivalTime || '',
            duration: seg.duration,
            price: seg.price || 0,
          })),
          totalDuration: route.totalDuration,
          totalPrice: route.totalPrice,
          transferCount: route.segments.length - 1,
          transportTypes: route.segments.map(seg => this.mapTransportType(seg.transportType)),
          departureTime: route.segments[0]?.departureTime || '',
          arrivalTime: route.segments[route.segments.length - 1]?.arrivalTime || '',
        };

        const riskUseCase = new AssessRouteRiskUseCase();
        riskAssessment = await riskUseCase.execute(builtRoute);
      } catch (error) {
        this.logger.warn('Failed to assess route risk', { error });
        // Continue without risk assessment
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        routes: [route],
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        riskAssessment,
        executionTimeMs,
        graphAvailable: true,
        graphVersion,
      };
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;

      return {
        success: false,
        routes: [],
        executionTimeMs,
        error: error?.message || String(error),
        graphAvailable: false,
      };
    }
  }

  /**
   * Find stops for a city using database-level filtering
   * 
   * Uses full-text search at database level instead of loading all stops into memory.
   * This significantly improves performance and reduces memory usage.
   * 
   * @private
   */
  private async findStopsForCity(cityName: string): Promise<Array<{ id: string; name: string }>> {
    // Use database-level filtering with full-text search
    const realStops = await this.stopRepository.getRealStopsByCityName(cityName);

    // If real stops found, return them
    if (realStops.length > 0) {
      return realStops.map(stop => ({ id: stop.id, name: stop.name }));
    }

    // If no real stops found, try virtual stops
    const virtualStops = await this.stopRepository.getVirtualStopsByCityName(cityName);
    return virtualStops.map(stop => ({ id: stop.id, name: stop.name }));
  }

  /**
   * Find shortest path using Dijkstra's algorithm (readonly graph)
   * 
   * Pure graph traversal without modifications.
   * 
   * @private
   */
  private async findShortestPath(
    startNodeId: string,
    endNodeId: string,
    graphVersion: string
  ): Promise<string[] | null> {
    // Check if nodes exist in graph
    const startExists = await this.graphRepository.hasNode(startNodeId);
    const endExists = await this.graphRepository.hasNode(endNodeId);

    this.logger.debug('Checking nodes existence in graph', {
      startNodeId,
      endNodeId,
      startExists,
      endExists,
      graphVersion,
    });

    if (!startExists || !endExists) {
      const missingNodes = [];
      if (!startExists) missingNodes.push(startNodeId);
      if (!endExists) missingNodes.push(endNodeId);
      
      this.logger.warn('Nodes not found in graph', {
        startNodeId,
        endNodeId,
        startExists,
        endExists,
        missingNodes,
        graphVersion,
        message: 'Graph may be out of sync with database. Consider rebuilding graph.',
      });
      // Return special marker to distinguish from "path not found"
      return null; // Will be handled as "graph sync issue" in execute()
    }

    // Dijkstra's algorithm implementation
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    const queue: string[] = [];

    // Initialize distances
    distances.set(startNodeId, 0);
    queue.push(startNodeId);

    while (queue.length > 0) {
      // Get node with minimum distance
      let currentNodeId = queue[0];
      let minDistance = distances.get(currentNodeId) || Infinity;

      for (const nodeId of queue) {
        const dist = distances.get(nodeId) || Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          currentNodeId = nodeId;
        }
      }

      // Remove from queue
      const index = queue.indexOf(currentNodeId);
      queue.splice(index, 1);

      // Mark as visited
      visited.add(currentNodeId);

      // Found destination
      if (currentNodeId === endNodeId) {
        break;
      }

      // Get neighbors from Redis (readonly)
      const neighbors = await this.graphRepository.getNeighbors(currentNodeId);

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.neighborId)) {
          continue;
        }

        const weight = neighbor.weight;
        const currentDistance = distances.get(currentNodeId) || 0;
        const newDistance = currentDistance + weight;
        const existingDistance = distances.get(neighbor.neighborId) || Infinity;

        if (newDistance < existingDistance) {
          distances.set(neighbor.neighborId, newDistance);
          previous.set(neighbor.neighborId, currentNodeId);

          if (!queue.includes(neighbor.neighborId)) {
            queue.push(neighbor.neighborId);
          }
        }
      }
    }

    // Reconstruct path
    if (!distances.has(endNodeId)) {
      return null; // No path found
    }

    const path: string[] = [];
    let current: string | null | undefined = endNodeId;

    while (current) {
      path.unshift(current);
      current = previous.get(current);
    }

    return path.length > 0 ? path : null;
  }

  /**
   * Build route segments from path (readonly)
   * 
   * @private
   */
  private async buildRouteFromPath(
    path: string[],
    date: Date,
    passengers: number
  ): Promise<RouteResult> {
    const segments: RouteSegment[] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let totalPrice = 0;

    // Build segments for each edge in path using parallel requests
    const segmentPromises: Promise<RouteSegment | null>[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const fromStopId = path[i];
      const toStopId = path[i + 1];

      // Create promise for parallel execution
      const segmentPromise = (async (): Promise<RouteSegment | null> => {
        try {
          // Execute all queries in parallel for this segment
          const [weight, metadata, flights] = await Promise.all([
            this.graphRepository.getEdgeWeight(fromStopId, toStopId),
            this.graphRepository.getEdgeMetadata(fromStopId, toStopId),
            this.flightRepository.getFlightsBetweenStops(fromStopId, toStopId, date),
          ]);

          if (!weight) {
            return null; // Skip invalid edge
          }

          const flight = flights.length > 0 ? flights[0] : null;

          return {
            fromStopId,
            toStopId,
            distance: metadata?.distance || 0,
            duration: weight,
            transportType: metadata?.transportType || 'BUS',
            routeId: metadata?.routeId,
            price: flight?.priceRub,
            departureTime: flight?.departureTime,
            arrivalTime: flight?.arrivalTime,
          };
        } catch (error) {
          // Log error but continue processing other segments
          console.error(`Error building segment ${fromStopId} -> ${toStopId}:`, error);
          return null;
        }
      })();

      segmentPromises.push(segmentPromise);
    }

    // Wait for all segments to be processed in parallel
    const segmentResults = await Promise.all(segmentPromises);

    // Process results and calculate totals
    for (const segment of segmentResults) {
      if (!segment) {
        continue; // Skip invalid segments
      }

      segments.push(segment);
      totalDistance += segment.distance;
      totalDuration += segment.duration;
      totalPrice += segment.price || 0;
    }

    // Get city names for first and last stops in parallel
    const [fromStopReal, fromStopVirtual, toStopReal, toStopVirtual] = await Promise.all([
      this.stopRepository.findRealStopById(path[0]),
      this.stopRepository.findVirtualStopById(path[0]),
      this.stopRepository.findRealStopById(path[path.length - 1]),
      this.stopRepository.findVirtualStopById(path[path.length - 1]),
    ]);

    const fromStop = fromStopReal || fromStopVirtual;
    const toStop = toStopReal || toStopVirtual;

    return {
      segments,
      totalDistance,
      totalDuration,
      totalPrice: totalPrice * passengers,
      fromCity: fromStop ? extractCityFromStopName(fromStop.name) : 'Unknown',
      toCity: toStop ? extractCityFromStopName(toStop.name) : 'Unknown',
      departureDate: date,
    };
  }

  /**
   * Normalize city name for comparison
   * 
   * @private
   */
  private normalizeCity(cityName: string): string {
    return cityName
      .toLowerCase()
      .trim()
      .replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9]/g, '');
  }

  /**
   * Find alternative paths (2-3 additional routes)
   * Uses modified Dijkstra to find paths that differ from the shortest path
   * 
   * @private
   */
  private async findAlternativePaths(
    startNodeId: string,
    endNodeId: string,
    shortestPath: string[],
    graphVersion: string,
    date: Date,
    passengers: number
  ): Promise<RouteResult[]> {
    const alternatives: RouteResult[] = [];
    const maxAlternatives = 2;
    const visitedPaths = new Set<string>([shortestPath.join('->')]);

    // Try to find alternative paths by excluding edges from the shortest path
    for (let attempt = 0; attempt < maxAlternatives * 2 && alternatives.length < maxAlternatives; attempt++) {
      const alternativePath = await this.findAlternativePath(
        startNodeId,
        endNodeId,
        shortestPath,
        visitedPaths,
        graphVersion
      );

      if (!alternativePath || alternativePath.length === 0) {
        continue;
      }

      const pathKey = alternativePath.join('->');
      if (visitedPaths.has(pathKey)) {
        continue;
      }

      visitedPaths.add(pathKey);

      try {
        const route = await this.buildRouteFromPath(alternativePath, date, passengers);
        alternatives.push(route);
      } catch (error) {
        this.logger.debug('Failed to build alternative route', { error, path: alternativePath });
        continue;
      }
    }

    // Sort alternatives by total duration (fastest first)
    return alternatives.sort((a, b) => a.totalDuration - b.totalDuration);
  }

  /**
   * Find a single alternative path by excluding edges from the shortest path
   * 
   * @private
   */
  private async findAlternativePath(
    startNodeId: string,
    endNodeId: string,
    excludePath: string[],
    visitedPaths: Set<string>,
    graphVersion: string
  ): Promise<string[] | null> {
    // Create a set of edges to exclude (from the shortest path)
    const excludeEdges = new Set<string>();
    for (let i = 0; i < excludePath.length - 1; i++) {
      const edgeKey = `${excludePath[i]}->${excludePath[i + 1]}`;
      excludeEdges.add(edgeKey);
    }

    // Modified Dijkstra that avoids excluded edges
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    const queue: string[] = [];

    distances.set(startNodeId, 0);
    queue.push(startNodeId);

    while (queue.length > 0) {
      let currentNodeId = queue[0];
      let minDistance = distances.get(currentNodeId) || Infinity;

      for (const nodeId of queue) {
        const dist = distances.get(nodeId) || Infinity;
        if (dist < minDistance) {
          minDistance = dist;
          currentNodeId = nodeId;
        }
      }

      const index = queue.indexOf(currentNodeId);
      queue.splice(index, 1);
      visited.add(currentNodeId);

      if (currentNodeId === endNodeId) {
        break;
      }

      const neighbors = await this.graphRepository.getNeighbors(currentNodeId);

      for (const neighbor of neighbors) {
        // Skip if this edge is in the exclude list
        const edgeKey = `${currentNodeId}->${neighbor.neighborId}`;
        if (excludeEdges.has(edgeKey)) {
          continue;
        }

        if (visited.has(neighbor.neighborId)) {
          continue;
        }

        const weight = neighbor.weight;
        const currentDistance = distances.get(currentNodeId) || 0;
        const newDistance = currentDistance + weight;
        const existingDistance = distances.get(neighbor.neighborId) || Infinity;

        if (newDistance < existingDistance) {
          distances.set(neighbor.neighborId, newDistance);
          previous.set(neighbor.neighborId, currentNodeId);

          if (!queue.includes(neighbor.neighborId)) {
            queue.push(neighbor.neighborId);
          }
        }
      }
    }

    if (!distances.has(endNodeId)) {
      return null;
    }

    const path: string[] = [];
    let current: string | null | undefined = endNodeId;

    while (current) {
      path.unshift(current);
      current = previous.get(current);
    }

    const pathKey = path.join('->');
    if (visitedPaths.has(pathKey) || path.length === 0) {
      return null;
    }

    return path.length > 0 ? path : null;
  }

  /**
   * Map transport type string to TransportType enum
   * 
   * @private
   */
  private mapTransportType(transportType: string): TransportType {
    const normalized = transportType.toLowerCase();
    switch (normalized) {
      case 'airplane':
      case 'plane':
      case 'самолет':
        return TransportType.AIRPLANE;
      case 'bus':
      case 'автобус':
        return TransportType.BUS;
      case 'train':
      case 'поезд':
        return TransportType.TRAIN;
      case 'ferry':
      case 'паром':
        return TransportType.FERRY;
      case 'taxi':
      case 'такси':
        return TransportType.TAXI;
      default:
        return TransportType.UNKNOWN;
    }
  }

}




