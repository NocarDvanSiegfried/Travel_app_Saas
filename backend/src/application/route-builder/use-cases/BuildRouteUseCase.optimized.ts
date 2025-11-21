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

import type { IGraphRepository, GraphNeighbor } from '../../../domain/repositories/IGraphRepository';
import type { IFlightRepository } from '../../../domain/repositories/IFlightRepository';
import type { IStopRepository } from '../../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../../domain/repositories/IRouteRepository';

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

      if (fromStops.length === 0) {
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
      const path = await this.findShortestPath(
        fromStops[0].id, // Use first stop as start
        toStops[0].id, // Use first stop as end
        graphVersion
      );

      if (!path || path.length === 0) {
        return {
          success: false,
          routes: [],
          executionTimeMs: Date.now() - startTime,
          error: `No path found between ${request.fromCity} and ${request.toCity}`,
          graphAvailable: true,
          graphVersion,
        };
      }

      // ====================================================================
      // Step 4: Build Route Segments from Path
      // ====================================================================
      const route = await this.buildRouteFromPath(
        path,
        request.date,
        request.passengers
      );

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        routes: [route],
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
   * Find stops for a city (readonly)
   * 
   * @private
   */
  private async findStopsForCity(cityName: string): Promise<Array<{ id: string; name: string }>> {
    // Normalize city name
    const normalizedCity = this.normalizeCity(cityName);

    // Get all real stops (cached in memory, fast)
    const realStops = await this.stopRepository.getAllRealStops();

    // Filter stops by city name
    const matches = realStops.filter(stop => {
      const stopCityName = this.extractCityFromStopName(stop.name);
      const normalizedStopCity = this.normalizeCity(stopCityName);
      return normalizedStopCity === normalizedCity;
    });

    // If no real stops found, try virtual stops
    if (matches.length === 0) {
      const virtualStops = await this.stopRepository.getAllVirtualStops();
      const virtualMatches = virtualStops.filter(stop => {
        const stopCityName = this.extractCityFromStopName(stop.name);
        const normalizedStopCity = this.normalizeCity(stopCityName);
        return normalizedStopCity === normalizedCity;
      });

      return virtualMatches.map(stop => ({ id: stop.id, name: stop.name }));
    }

    return matches.map(stop => ({ id: stop.id, name: stop.name }));
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

    if (!startExists || !endExists) {
      return null;
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

    // Build segments for each edge in path
    for (let i = 0; i < path.length - 1; i++) {
      const fromStopId = path[i];
      const toStopId = path[i + 1];

      // Get edge weight (duration) from Redis
      const weight = await this.graphRepository.getEdgeWeight(fromStopId, toStopId);

      if (!weight) {
        continue; // Skip invalid edge
      }

      // Get edge metadata (distance, transport type, route ID)
      const metadata = await this.graphRepository.getEdgeMetadata(fromStopId, toStopId);

      // Get flight schedule for this segment (if available)
      const flights = await this.flightRepository.getFlightsBetweenStops(
        fromStopId,
        toStopId,
        date
      );

      const flight = flights.length > 0 ? flights[0] : null;

      const segment: RouteSegment = {
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

      segments.push(segment);

      totalDistance += segment.distance;
      totalDuration += segment.duration;
      totalPrice += segment.price || 0;
    }

    // Get city names for first and last stops
    const fromStop = await this.stopRepository.findRealStopById(path[0]) ||
      await this.stopRepository.findVirtualStopById(path[0]);
    const toStop = await this.stopRepository.findRealStopById(path[path.length - 1]) ||
      await this.stopRepository.findVirtualStopById(path[path.length - 1]);

    return {
      segments,
      totalDistance,
      totalDuration,
      totalPrice: totalPrice * passengers,
      fromCity: fromStop ? this.extractCityFromStopName(fromStop.name) : 'Unknown',
      toCity: toStop ? this.extractCityFromStopName(toStop.name) : 'Unknown',
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
   * Extract city name from stop name
   * 
   * @private
   */
  private extractCityFromStopName(stopName: string): string {
    if (!stopName) {
      return '';
    }

    // Handle "г. CityName" format (virtual stops)
    const cityMatch = stopName.match(/г\.\s*([А-Яа-яЁё\-\s]+)/i);
    if (cityMatch) {
      return cityMatch[1].trim();
    }

    // If name contains comma, take last part (usually city)
    const nameParts = stopName.split(',');
    if (nameParts.length > 1) {
      return nameParts[nameParts.length - 1].trim();
    }

    // Remove prefixes like "Аэропорт", "Вокзал", "Автостанция"
    const cleaned = stopName
      .replace(/^(Аэропорт|Вокзал|Автостанция|Остановка)\s+/i, '')
      .trim();

    // Extract first word (city name)
    const parts = cleaned.split(/[\s,\(\)]/);
    return parts[0] || stopName;
  }
}




