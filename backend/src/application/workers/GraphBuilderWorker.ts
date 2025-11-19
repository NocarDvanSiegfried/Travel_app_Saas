/**
 * Graph Builder Worker
 * 
 * Builds transportation graph from stops, routes, and flights data.
 * Saves graph to Redis for fast runtime access.
 * 
 * Lifecycle:
 * 1. Load all stops (real + virtual) from PostgreSQL
 * 2. Load all routes (real + virtual) from PostgreSQL
 * 3. Load all flights from PostgreSQL
 * 4. Build graph structure (nodes + edges)
 * 5. Save graph to Redis
 * 6. Create graph metadata in PostgreSQL
 * 7. Backup graph to MinIO (optional)
 * 8. Activate new graph version
 * 
 * @module application/workers
 */

import { BaseBackgroundWorker } from './base/BaseBackgroundWorker';
import type { WorkerExecutionResult } from './base/IBackgroundWorker';
import type { IStopRepository } from '../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';
import type { IGraphRepository, GraphNode, GraphNeighbor } from '../../domain/repositories/IGraphRepository';
import { Graph } from '../../domain/entities/Graph';
import type { TransportType } from '../../domain/entities/Route';

/**
 * Graph edge data
 */
type GraphEdge = {
  fromStopId: string;
  toStopId: string;
  weight: number; // duration in minutes
  distance?: number; // km
  transportType?: string;
  routeId?: string;
};

/**
 * Graph Builder Worker
 * 
 * Builds and caches transportation graph.
 * 
 * @class
 */
export class GraphBuilderWorker extends BaseBackgroundWorker {
  constructor(
    private readonly stopRepository: IStopRepository,
    private readonly routeRepository: IRouteRepository,
    private readonly flightRepository: IFlightRepository,
    private readonly datasetRepository: IDatasetRepository,
    private readonly graphRepository: IGraphRepository
  ) {
    super('graph-builder', 'Graph Builder Worker', '1.0.0');
  }

  /**
   * Check if worker can run
   * 
   * Only run if new dataset exists without corresponding graph.
   */
  public async canRun(): Promise<boolean> {
    const isRunning = await super.canRun();
    if (!isRunning) {
      return false;
    }

    // Check if latest dataset exists
    const latestDataset = await this.datasetRepository.getLatestDataset();
    if (!latestDataset) {
      this.log('INFO', 'No dataset found - cannot build graph');
      return false;
    }

    // Check if graph already exists for this dataset
    const existingGraph = await this.graphRepository.getGraphMetadataByDatasetVersion(
      latestDataset.version
    );
    
    if (existingGraph && existingGraph.length > 0) {
      this.log('INFO', `Graph already exists for dataset ${latestDataset.version} - skipping`);
      return false;
    }

    return true;
  }

  /**
   * Execute worker logic
   */
  protected async executeWorkerLogic(): Promise<WorkerExecutionResult> {
    const startTime = Date.now();

    try {
      // ====================================================================
      // Step 1: Load All Stops
      // ====================================================================
      this.log('INFO', 'Step 1: Loading stops from PostgreSQL...');
      
      const realStops = await this.stopRepository.getAllRealStops();
      const virtualStops = await this.stopRepository.getAllVirtualStops();
      const allStops = [...realStops, ...virtualStops];

      this.log('INFO', `Loaded ${allStops.length} stops (${realStops.length} real, ${virtualStops.length} virtual)`);

      // ====================================================================
      // Step 2: Load All Routes
      // ====================================================================
      this.log('INFO', 'Step 2: Loading routes from PostgreSQL...');
      
      const realRoutes = await this.routeRepository.getAllRoutes();
      const virtualRoutes = await this.routeRepository.getAllVirtualRoutes();
      const allRoutes = [...realRoutes, ...virtualRoutes];

      this.log('INFO', `Loaded ${allRoutes.length} routes (${realRoutes.length} real, ${virtualRoutes.length} virtual)`);

      // ====================================================================
      // Step 3: Load All Flights
      // ====================================================================
      this.log('INFO', 'Step 3: Loading flights from PostgreSQL...');
      
      const allFlights = await this.flightRepository.getAllFlights();

      this.log('INFO', `Loaded ${allFlights.length} flights`);

      // ====================================================================
      // Step 4: Build Graph Structure
      // ====================================================================
      this.log('INFO', 'Step 4: Building graph structure...');
      
      // Convert routes to compatible format
      // Handle both Route and VirtualRoute types
      const routesForGraph = allRoutes.map(route => {
        // Check if it's a Route (has stopsSequence and transportType)
        if ('stopsSequence' in route && 'transportType' in route) {
          return {
            id: route.id,
            fromStopId: route.fromStopId,
            toStopId: route.toStopId,
            stopsSequence: route.stopsSequence.map(s => ({ stopId: s.stopId })), // Convert RouteStop[] to { stopId }[]
            transportType: String(route.transportType), // Convert TransportType to string
            durationMinutes: route.durationMinutes,
            distanceKm: route.distanceKm,
          };
        } else {
          // It's a VirtualRoute (has routeType and transportMode)
          // Create a simple stopsSequence from fromStopId to toStopId
          return {
            id: route.id,
            fromStopId: route.fromStopId,
            toStopId: route.toStopId,
            stopsSequence: [{ stopId: route.fromStopId }, { stopId: route.toStopId }],
            transportType: 'SHUTTLE', // Default for virtual routes
            durationMinutes: route.durationMinutes,
            distanceKm: route.distanceKm,
          };
        }
      });

      // Convert stops to compatible format
      const stopsForGraph = allStops.map(stop => ({
        id: stop.id,
        latitude: stop.latitude,
        longitude: stop.longitude,
        cityId: stop.cityId,
      }));

      // Convert flights to compatible format
      const flightsForGraph = allFlights.map(flight => ({
        id: flight.id,
        routeId: flight.routeId,
        fromStopId: flight.fromStopId,
        toStopId: flight.toStopId,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        isVirtual: flight.isVirtual,
      }));

      const { nodes, edges } = this.buildGraphStructure(stopsForGraph, routesForGraph, flightsForGraph);

      this.log('INFO', `Built graph: ${nodes.length} nodes, ${edges.length} edges`);

      // Validate graph
      const validation = this.validateGraph(nodes, edges);
      if (!validation.valid) {
        throw new Error(`Graph validation failed: ${validation.errors.join(', ')}`);
      }

      // ====================================================================
      // Step 5: Save Graph to Redis
      // ====================================================================
      this.log('INFO', 'Step 5: Saving graph to Redis...');
      
      const graphVersion = `graph-v${Date.now()}`;
      await this.saveGraphToRedis(graphVersion, nodes, edges);

      this.log('INFO', `Saved graph to Redis: ${graphVersion}`);

      // ====================================================================
      // Step 6: Create Graph Metadata
      // ====================================================================
      this.log('INFO', 'Step 6: Creating graph metadata...');
      
      const latestDataset = await this.datasetRepository.getLatestDataset();
      if (!latestDataset) {
        throw new Error('Dataset disappeared during graph building');
      }

      const buildDurationMs = Date.now() - startTime;
      const redisKey = `graph:${graphVersion}`;
      const minioBackupPath = `graph/export-${graphVersion}.json`;

      const graphMetadata = new Graph(
        0, // ID will be assigned by database (SERIAL)
        graphVersion,
        latestDataset.version,
        nodes.length,
        edges.length,
        buildDurationMs,
        redisKey,
        minioBackupPath,
        Graph.createMetadata({ buildDurationMs }),
        new Date(),
        false // Will be activated after successful save
      );

      await this.graphRepository.saveGraphMetadata(graphMetadata);

      this.log('INFO', `Created graph metadata: ${graphMetadata.id}`);

      // ====================================================================
      // Step 7: Activate New Graph Version
      // ====================================================================
      this.log('INFO', 'Step 7: Activating new graph version...');
      
      await this.graphRepository.setActiveGraphMetadata(graphVersion);
      await this.graphRepository.setGraphVersion(graphVersion);

      this.log('INFO', `Activated graph version: ${graphVersion}`);

      // ====================================================================
      // Step 8: Return Success
      // ====================================================================
      return {
        success: true,
        workerId: this.workerId,
        executionTimeMs: Date.now() - startTime,
        message: `Graph built successfully: ${nodes.length} nodes, ${edges.length} edges`,
        dataProcessed: {
          added: nodes.length + edges.length,
          updated: 0,
          deleted: 0,
        },
      };
    } catch (error: any) {
      this.log('ERROR', 'Graph building failed', error);
      throw error;
    }
  }

  /**
   * Build graph structure from data
   */
  private buildGraphStructure(
    stops: Array<{ id: string; latitude: number; longitude: number; cityId?: string }>,
    routes: Array<{ id: string; fromStopId: string; toStopId: string; stopsSequence: Array<{ stopId: string }>; transportType: string; durationMinutes?: number; distanceKm?: number }>,
    flights: Array<{ id: string; routeId?: string; fromStopId: string; toStopId: string; departureTime: string; arrivalTime: string; isVirtual?: boolean }>
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    // Build nodes from stops
    const nodes: GraphNode[] = stops.map(stop => ({
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      isVirtual: !stop.cityId, // Virtual stops might not have cityId
      cityId: stop.cityId,
    }));

    // Build edges from flights
    const edgesMap = new Map<string, GraphEdge>();

    for (const flight of flights) {
      const edgeKey = `${flight.fromStopId}-${flight.toStopId}-${flight.routeId || 'direct'}`;
      
      if (!edgesMap.has(edgeKey)) {
        // Calculate weight (duration) from flight times (HH:MM format)
        let weight = 180; // Default 3 hours
        
        if (flight.departureTime && flight.arrivalTime) {
          try {
            const depParts = flight.departureTime.split(':');
            const arrParts = flight.arrivalTime.split(':');
            
            if (depParts.length === 2 && arrParts.length === 2) {
              const depMinutes = parseInt(depParts[0], 10) * 60 + parseInt(depParts[1], 10);
              const arrMinutes = parseInt(arrParts[0], 10) * 60 + parseInt(arrParts[1], 10);
              
              let durationMinutes = arrMinutes - depMinutes;
              // Handle overnight flights
              if (durationMinutes < 0) {
                durationMinutes += 24 * 60; // Add 24 hours
              }
              
              if (durationMinutes > 0 && durationMinutes < 10000) {
                weight = durationMinutes;
              }
            }
          } catch {
            // Use default weight if parsing fails
          }
        }

        // Find route info
          const route = routes.find(r => r.id === flight.routeId);

        edgesMap.set(edgeKey, {
          fromStopId: flight.fromStopId,
          toStopId: flight.toStopId,
          weight,
          distance: route?.distanceKm,
          transportType: route?.transportType as TransportType | undefined,
          routeId: flight.routeId,
        });
      }
    }

    // Also add edges from routes (for routes without flights)
    for (const route of routes) {
      if (route.stopsSequence && route.stopsSequence.length >= 2) {
        // Create edges between consecutive stops in route
        for (let i = 0; i < route.stopsSequence.length - 1; i++) {
          const fromStopId = route.stopsSequence[i].stopId;
          const toStopId = route.stopsSequence[i + 1].stopId;
          const edgeKey = `${fromStopId}-${toStopId}-${route.id}`;
          
          if (!edgesMap.has(edgeKey)) {
            // Use route duration or estimate
            const weight = route.durationMinutes || 60; // Default 1 hour
            
            edgesMap.set(edgeKey, {
              fromStopId,
              toStopId,
              weight,
              distance: route.distanceKm,
              transportType: route.transportType,
              routeId: route.id,
            });
          }
        }
      }
    }

    const edges = Array.from(edgesMap.values());

    return { nodes, edges };
  }

  /**
   * Validate graph structure
   */
  private validateGraph(
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check nodes
    if (nodes.length === 0) {
      errors.push('Graph has no nodes');
    }

    // Check edges
    if (edges.length === 0) {
      errors.push('Graph has no edges');
    }

    // Check edge weights
    const invalidWeights = edges.filter(e => !e.weight || e.weight <= 0 || !isFinite(e.weight));
    if (invalidWeights.length > 0) {
      errors.push(`${invalidWeights.length} edges have invalid weights`);
    }

    // Check edge references
    const nodeIds = new Set(nodes.map(n => n.id));
    const invalidEdges = edges.filter(
      e => !nodeIds.has(e.fromStopId) || !nodeIds.has(e.toStopId)
    );
    if (invalidEdges.length > 0) {
      errors.push(`${invalidEdges.length} edges reference non-existent nodes`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Save graph to Redis
   */
  private async saveGraphToRedis(
    version: string,
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): Promise<void> {
    // Build neighbors map for fast lookups
    const neighborsMap = new Map<string, GraphNeighbor[]>();

    for (const edge of edges) {
      if (!neighborsMap.has(edge.fromStopId)) {
        neighborsMap.set(edge.fromStopId, []);
      }

      neighborsMap.get(edge.fromStopId)!.push({
        neighborId: edge.toStopId,
        weight: edge.weight,
        metadata: {
          distance: edge.distance,
          transportType: edge.transportType,
          routeId: edge.routeId,
        },
      });
    }

    // Convert nodes to string array for repository
    const nodeIds = nodes.map(n => n.id);

    // Save to repository (which will handle Redis operations)
    await this.graphRepository.saveGraph(
      version,
      nodeIds,
      neighborsMap,
      {
        version,
        nodes: nodes.length,
        edges: edges.length,
        buildTimestamp: Date.now(),
        datasetVersion: (await this.datasetRepository.getLatestDataset())?.version || 'unknown',
      }
    );
  }
}

