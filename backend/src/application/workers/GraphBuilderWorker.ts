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
import { validateGraphStructure, validateTransferEdges, validateFerryEdges } from '../../shared/validators/graph-validator';
import { getAllFederalCities } from '../../shared/utils/unified-cities-loader';
import { normalizeCityName } from '../../shared/utils/city-normalizer';

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
            metadata: 'metadata' in route ? route.metadata : undefined,
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
            metadata: 'metadata' in route ? route.metadata : undefined,
          };
        }
      });

      // Convert stops to compatible format
      const stopsForGraph = allStops.map(stop => ({
        id: stop.id,
        latitude: stop.latitude,
        longitude: stop.longitude,
        cityId: stop.cityId,
        isAirport: 'isAirport' in stop ? stop.isAirport : false,
        isRailwayStation: 'isRailwayStation' in stop ? stop.isRailwayStation : false,
        metadata: 'metadata' in stop ? stop.metadata : undefined,
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

      // ====================================================================
      // Step 4.1: Validate Graph Structure
      // ====================================================================
      this.log('INFO', 'Step 4.1: Validating graph structure...');
      
      const graphValidation = validateGraphStructure(nodes, edges);
      if (!graphValidation.isValid) {
        this.log('ERROR', `Graph structure validation failed: ${graphValidation.errors.join('; ')}`);
        throw new Error(`Graph structure validation failed: ${graphValidation.errors.join('; ')}`);
      }
      
      if (graphValidation.warnings.length > 0) {
        this.log('WARN', `Graph structure validation warnings: ${graphValidation.warnings.join('; ')}`);
      }
      
      this.log('INFO', `Graph structure validation passed. Stats: ${JSON.stringify(graphValidation.stats)}`);

      // ====================================================================
      // Step 4.2: Validate Transfer Edges
      // ====================================================================
      this.log('INFO', 'Step 4.2: Validating transfer edges...');
      
      const transferValidation = validateTransferEdges(edges, nodes);
      if (!transferValidation.isValid) {
        this.log('ERROR', `Transfer edges validation failed: ${transferValidation.errors.join('; ')}`);
        throw new Error(`Transfer edges validation failed: ${transferValidation.errors.join('; ')}`);
      }
      
      this.log('INFO', 'Transfer edges validation passed');

      // ====================================================================
      // Step 4.3: Validate Ferry Edges
      // ====================================================================
      this.log('INFO', 'Step 4.3: Validating ferry edges...');
      
      const ferryValidation = validateFerryEdges(edges, nodes);
      if (!ferryValidation.isValid) {
        this.log('ERROR', `Ferry edges validation failed: ${ferryValidation.errors.join('; ')}`);
        throw new Error(`Ferry edges validation failed: ${ferryValidation.errors.join('; ')}`);
      }
      
      this.log('INFO', 'Ferry edges validation passed');

      // ====================================================================
      // Step 4.4: Log Federal Cities Statistics
      // ====================================================================
      this.log('INFO', 'Step 4.4: Logging federal cities statistics...');
      
      try {
        const federalCities = getAllFederalCities();
        const hubCityName = 'якутск';
        
        for (const federalCity of federalCities) {
          const normalizedFederalCityName = normalizeCityName(federalCity.normalizedName || federalCity.name);
          
          // Count nodes for this federal city
          const federalCityNodes = nodes.filter(n => 
            n.cityId && normalizeCityName(n.cityId) === normalizedFederalCityName
          );
          
          // Count edges connecting federal city to Yakutia
          const federalCityEdges = edges.filter(e => {
            const fromNode = nodes.find(n => n.id === e.fromStopId);
            const toNode = nodes.find(n => n.id === e.toStopId);
            
            if (!fromNode || !toNode) return false;
            
            const fromCityId = fromNode.cityId ? normalizeCityName(fromNode.cityId) : undefined;
            const toCityId = toNode.cityId ? normalizeCityName(toNode.cityId) : undefined;
            
            const isFromFederal = fromCityId === normalizedFederalCityName;
            const isToFederal = toCityId === normalizedFederalCityName;
            const isFromYakutia = fromCityId === normalizeCityName(hubCityName);
            const isToYakutia = toCityId === normalizeCityName(hubCityName);
            
            // Edge connects federal city to Yakutia or vice versa
            return (isFromFederal && isToYakutia) || (isFromYakutia && isToFederal);
          });
          
          // Check connectivity to hub (Yakutsk)
          const hubNodes = nodes.filter(n => 
            n.cityId && normalizeCityName(n.cityId) === normalizeCityName(hubCityName)
          );
          
          let isConnectedToHub = false;
          if (hubNodes.length > 0 && federalCityNodes.length > 0) {
            // Simple check: if there are edges between federal city and hub
            const connectivityEdges = edges.filter(e => {
              const fromNode = nodes.find(n => n.id === e.fromStopId);
              const toNode = nodes.find(n => n.id === e.toStopId);
              
              if (!fromNode || !toNode) return false;
              
              const fromCityId = fromNode.cityId ? normalizeCityName(fromNode.cityId) : undefined;
              const toCityId = toNode.cityId ? normalizeCityName(toNode.cityId) : undefined;
              
              const isFromFederal = fromCityId === normalizedFederalCityName;
              const isToFederal = toCityId === normalizedFederalCityName;
              const isFromHub = fromCityId === normalizeCityName(hubCityName);
              const isToHub = toCityId === normalizeCityName(hubCityName);
              
              return (isFromFederal && isToHub) || (isFromHub && isToFederal);
            });
            
            isConnectedToHub = connectivityEdges.length > 0;
          }
          
          this.log('INFO', `Federal city "${federalCity.name}": nodes=${federalCityNodes.length}, edges_to_yakutia=${federalCityEdges.length}, connected_to_hub=${isConnectedToHub}`);
        }
      } catch (error) {
        this.log('WARN', `Failed to log federal cities statistics: ${error instanceof Error ? error.message : String(error)}`);
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
        message: `Graph built successfully: ${nodes.length} nodes, ${edges.length} edges. Validation: graph=${graphValidation.isValid}, transfers=${transferValidation.isValid}, ferry=${ferryValidation.isValid}`,
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
    stops: Array<{ id: string; latitude: number; longitude: number; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }>,
    routes: Array<{ id: string; fromStopId: string; toStopId: string; stopsSequence: Array<{ stopId: string }>; transportType: string; durationMinutes?: number; distanceKm?: number; metadata?: Record<string, unknown> }>,
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

    // Build stop lookup map for transfer calculation
    const stopMap = new Map<string, { id: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }>();
    for (const stop of stops) {
      stopMap.set(stop.id, {
        id: stop.id,
        cityId: stop.cityId,
        isAirport: stop.isAirport,
        isRailwayStation: stop.isRailwayStation,
        metadata: stop.metadata,
      });
    }

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

        // Calculate weight for ferry routes with seasonality
        let finalWeight = weight;
        if (route?.transportType === 'FERRY' && route.metadata?.ferrySchedule) {
          finalWeight = this.calculateFerryWeight(route.durationMinutes || 20, route.metadata.ferrySchedule as { summer?: { frequency: string }; winter?: { frequency: string } });
        }

        edgesMap.set(edgeKey, {
          fromStopId: flight.fromStopId,
          toStopId: flight.toStopId,
          weight: finalWeight,
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
            let weight = route.durationMinutes || 60; // Default 1 hour
            
            // Calculate weight for ferry routes with seasonality
            if (route.transportType === 'FERRY' && route.metadata?.ferrySchedule) {
              weight = this.calculateFerryWeight(route.durationMinutes || 20, route.metadata.ferrySchedule as { summer?: { frequency: string }; winter?: { frequency: string } });
            }
            
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

    // ====================================================================
    // Step 5: Add Transfer Edges Between Stops in Same City
    // ====================================================================
    this.log('INFO', 'Step 5: Adding transfer edges between stops in same city...');
    
    // Group stops by cityId
    const stopsByCity = new Map<string, string[]>();
    for (const stop of stops) {
      if (stop.cityId) {
        if (!stopsByCity.has(stop.cityId)) {
          stopsByCity.set(stop.cityId, []);
        }
        stopsByCity.get(stop.cityId)!.push(stop.id);
      }
    }

    // Create transfer edges between stops in the same city
    let transferEdgesCount = 0;
    for (const [cityId, cityStopIds] of stopsByCity.entries()) {
      if (cityStopIds.length < 2) {
        continue; // Need at least 2 stops to create transfers
      }

      // Create bidirectional transfer edges between all stops in the city
      for (let i = 0; i < cityStopIds.length; i++) {
        for (let j = i + 1; j < cityStopIds.length; j++) {
          const stop1Id = cityStopIds[i];
          const stop2Id = cityStopIds[j];
          
          const stop1 = stopMap.get(stop1Id);
          const stop2 = stopMap.get(stop2Id);
          
          if (!stop1 || !stop2) {
            continue;
          }

          // Calculate transfer weight
          const transferWeight = this.calculateTransferWeight(stop1, stop2);
          
          // Create bidirectional edges
          const edgeKey1 = `${stop1Id}-${stop2Id}-TRANSFER`;
          const edgeKey2 = `${stop2Id}-${stop1Id}-TRANSFER`;
          
          if (!edgesMap.has(edgeKey1)) {
            edgesMap.set(edgeKey1, {
              fromStopId: stop1Id,
              toStopId: stop2Id,
              weight: transferWeight,
              transportType: 'TRANSFER',
            });
            transferEdgesCount++;
          }
          
          if (!edgesMap.has(edgeKey2)) {
            edgesMap.set(edgeKey2, {
              fromStopId: stop2Id,
              toStopId: stop1Id,
              weight: transferWeight,
              transportType: 'TRANSFER',
            });
            transferEdgesCount++;
          }
        }
      }
    }

    this.log('INFO', `Added ${transferEdgesCount} transfer edges between stops in same cities`);

    const edges = Array.from(edgesMap.values());

    return { nodes, edges };
  }

  /**
   * Calculate transfer weight between two stops
   * 
   * @param stop1 - First stop
   * @param stop2 - Second stop
   * @returns Transfer weight in minutes
   */
  private calculateTransferWeight(
    stop1: { id: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> },
    stop2: { id: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }
  ): number {
    // Determine stop types
    const stop1Type = this.getStopType(stop1);
    const stop2Type = this.getStopType(stop2);

    // Air → Ground: 90 minutes (time to get from airport to city center)
    if (stop1Type === 'airport' && stop2Type === 'ground') {
      return 90;
    }

    // Ground → Air: 120 minutes (more time needed for check-in, security)
    if (stop1Type === 'ground' && stop2Type === 'airport') {
      return 120;
    }

    // Air → Ferry: 90 minutes (airport to ferry terminal)
    if (stop1Type === 'airport' && stop2Type === 'ferry_terminal') {
      return 90;
    }

    // Ferry → Ground: 30 minutes (ferry terminal to city center)
    if (stop1Type === 'ferry_terminal' && stop2Type === 'ground') {
      return 30;
    }

    // Ground → Ground: 60 minutes (typical city transfer)
    if (stop1Type === 'ground' && stop2Type === 'ground') {
      return 60;
    }

    // Ground → Ferry: 30 minutes (city center to ferry terminal)
    if (stop1Type === 'ground' && stop2Type === 'ferry_terminal') {
      return 30;
    }

    // Ferry → Air: 90 minutes (ferry terminal to airport)
    if (stop1Type === 'ferry_terminal' && stop2Type === 'airport') {
      return 90;
    }

    // Default: 60 minutes
    return 60;
  }

  /**
   * Get stop type (airport, ground, ferry_terminal)
   * 
   * @param stop - Stop to analyze
   * @returns Stop type
   */
  private getStopType(stop: { id: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }): 'airport' | 'ground' | 'ferry_terminal' {
    // Check if it's a ferry terminal
    if (stop.metadata?.type === 'ferry_terminal' || 
        stop.id.toLowerCase().includes('паром') || 
        stop.id.toLowerCase().includes('ferry') ||
        stop.id.toLowerCase().includes('переправа') ||
        stop.id.toLowerCase().includes('пристань')) {
      return 'ferry_terminal';
    }

    // Check if it's an airport
    if (stop.isAirport || 
        stop.id.toLowerCase().includes('аэропорт') || 
        stop.id.toLowerCase().includes('airport')) {
      return 'airport';
    }

    // Default to ground
    return 'ground';
  }

  /**
   * Calculate ferry weight with seasonality
   * 
   * @param baseDuration - Base ferry duration in minutes (typically 20)
   * @param ferrySchedule - Ferry schedule metadata
   * @returns Total weight including waiting time
   */
  private calculateFerryWeight(
    baseDuration: number,
    ferrySchedule: { summer?: { frequency: string }; winter?: { frequency: string } }
  ): number {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const isSummer = currentMonth >= 4 && currentMonth <= 9; // April-September

    // Determine waiting time based on season
    let waitTime: number;
    if (isSummer) {
      // Summer: frequent schedule, 15-20 minutes waiting
      waitTime = 17.5; // Average of 15-20
    } else {
      // Winter: rare schedule, 30-45 minutes waiting
      waitTime = 37.5; // Average of 30-45
    }

    // Total weight = base duration + waiting time
    return baseDuration + waitTime;
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

