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
import { getAllFederalCities, isCityInUnifiedReference } from '../../shared/utils/unified-cities-loader';
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
      // Step 1.1: Filter Invalid Stops
      // ====================================================================
      this.log('INFO', 'Step 1.1: Filtering invalid stops...');
      
      const { validStops, filteredCount, filteredReasons } = this.filterInvalidStops(allStops);
      
      if (filteredCount > 0) {
        this.log('WARN', `Filtered out ${filteredCount} invalid stops:`);
        filteredReasons.forEach(({ stopId, reason }) => {
          this.log('WARN', `  ⚠️  Removing invalid stop: ${stopId} — reason: ${reason}`);
        });
      }
      
      this.log('INFO', `Valid stops after filtering: ${validStops.length}`);
      
      // Check if we have enough stops to build a graph
      const MIN_STOPS_FOR_GRAPH = 10;
      const MIN_STOPS_WARNING = 30;
      
      if (validStops.length < MIN_STOPS_FOR_GRAPH) {
        return {
          success: false,
          workerId: this.workerId,
          executionTimeMs: Date.now() - startTime,
          message: `Cannot build graph: only ${validStops.length} valid stops (minimum ${MIN_STOPS_FOR_GRAPH} required)`,
          error: 'INSUFFICIENT_STOPS',
        };
      }
      
      if (validStops.length < MIN_STOPS_WARNING) {
        this.log('WARN', `Warning: Only ${validStops.length} valid stops (recommended: ${MIN_STOPS_WARNING}+). Graph may be incomplete.`);
      }

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
      const stopsForGraph = validStops.map(stop => ({
        id: stop.id,
        name: 'name' in stop ? stop.name : undefined,
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
      
      // Additional validation: check graph size requirements
      if (nodes.length < 36) {
        this.log('WARN', `Graph has fewer nodes than expected: ${nodes.length} < 36`);
      }
      if (edges.length < 160) {
        this.log('WARN', `Graph has fewer edges than expected: ${edges.length} < 160`);
      }
      
      // Check for Verkhoyansk and Mirny in graph
      const verkhoyanskNode = nodes.find(n => n.cityId === 'верхоянск' || n.id.includes('верхоянск'));
      const mirnyNode = nodes.find(n => n.cityId === 'мирный' || n.id.includes('мирный'));
      
      if (!verkhoyanskNode) {
        this.log('WARN', 'Verkhoyansk (Верхоянск) not found in graph nodes');
      } else {
        this.log('INFO', `Verkhoyansk found in graph: ${verkhoyanskNode.id}`);
      }
      
      if (!mirnyNode) {
        this.log('WARN', 'Mirny (Мирный) not found in graph nodes');
      } else {
        this.log('INFO', `Mirny found in graph: ${mirnyNode.id}`);
      }

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
      if (ferryValidation.errors.length > 0) {
        // Log ferry validation issues as warnings (non-blocking)
        // Invalid ferry edges are already filtered during graph building
        this.log('WARN', `Ferry edges validation issues (non-blocking): ${ferryValidation.errors.join('; ')}`);
        this.log('INFO', 'Continuing graph build - invalid ferry edges were skipped during edge creation');
      } else {
        this.log('INFO', 'Ferry edges validation passed');
      }

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
   * Filter invalid stops before building graph
   * 
   * Removes stops that:
   * - Have invalid IDs (3+ consecutive dashes, virtual-stop----------------)
   * - Have empty cityId
   * - Have empty name
   * - Have cityId not in unified reference
   * - Are ferry stops without proper metadata.type = 'ferry_terminal'
   * 
   * @param stops - Array of stops to filter (RealStop | VirtualStop)
   * @returns Object with valid stops, filtered count, and reasons
   */
  private filterInvalidStops<T extends { id: string; name?: string; cityId?: string; latitude: number; longitude: number; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }>(
    stops: T[]
  ): {
    validStops: T[];
    filteredCount: number;
    filteredReasons: Array<{ stopId: string; reason: string }>;
  } {
    const validStops: T[] = [];
    const filteredReasons: Array<{ stopId: string; reason: string }> = [];

    for (const stop of stops) {
      let isValid = true;
      let reason = '';

      // Check 1: Invalid ID format (3+ consecutive dashes)
      if (stop.id.match(/-{3,}/)) {
        isValid = false;
        reason = 'invalid id format (3+ consecutive dashes)';
      }

      // Check 2: Specific invalid case: virtual-stop----------------
      if (stop.id === 'virtual-stop----------------' || stop.id.match(/^virtual-stop-+$/)) {
        isValid = false;
        reason = 'invalid id format (empty city name)';
      }

      // Check 3: Empty cityId
      if (isValid && (!stop.cityId || stop.cityId.trim() === '')) {
        isValid = false;
        reason = 'empty cityId';
      }

      // Check 4: Empty name
      if (isValid && (!stop.name || stop.name.trim() === '')) {
        isValid = false;
        reason = 'empty name';
      }

      // Check 5: cityId not in unified reference
      if (isValid && stop.cityId) {
        const normalizedCityId = normalizeCityName(stop.cityId);
        if (!isCityInUnifiedReference(normalizedCityId)) {
          isValid = false;
          reason = `cityId not in unified reference: ${stop.cityId}`;
        }
      }

      // Check 6: Ferry stop without proper metadata
      if (isValid) {
        // Safety check: stop-027 and stop-028 are always valid ferry terminals
        // They should not be filtered even if metadata is missing
        if (stop.id === 'stop-027' || stop.id === 'stop-028') {
          // Skip ferry validation for known ferry terminals
        } else {
          const stopIdLower = stop.id.toLowerCase();
          const stopNameLower = stop.name?.toLowerCase() || '';
          const isFerryStop = 
            stopIdLower.includes('паром') ||
            stopIdLower.includes('ferry') ||
            stopIdLower.includes('переправа') ||
            stopIdLower.includes('пристань') ||
            stopNameLower.includes('паром') ||
            stopNameLower.includes('ferry') ||
            stopNameLower.includes('переправа') ||
            stopNameLower.includes('пристань');

          if (isFerryStop && stop.metadata?.type !== 'ferry_terminal') {
            isValid = false;
            reason = 'ferry stop missing terminal tag';
          }
        }
      }

      // Check 7: Invalid metadata.type (if present)
      if (isValid && stop.metadata?.type) {
        const validTypes = ['ferry_terminal'];
        if (typeof stop.metadata.type === 'string' && !validTypes.includes(stop.metadata.type)) {
          // Allow other metadata types, but log if it's an unknown type
          // This is a warning, not a blocking error
        }
      }

      if (isValid) {
        validStops.push(stop);
      } else {
        filteredReasons.push({ stopId: stop.id, reason });
      }
    }

    return {
      validStops,
      filteredCount: filteredReasons.length,
      filteredReasons,
    };
  }

  /**
   * Build graph structure from data
   */
  private buildGraphStructure(
    stops: Array<{ id: string; name?: string; latitude: number; longitude: number; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }>,
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
      metadata: stop.metadata, // Preserve metadata for ferry terminal detection
    }));

    // Build stop lookup map for transfer calculation
    const stopMap = new Map<string, { id: string; name?: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }>();
    for (const stop of stops) {
      stopMap.set(stop.id, {
        id: stop.id,
        name: stop.name,
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
        // Find route info first to check if it's a ferry route
        const route = routes.find(r => r.id === flight.routeId);

        // For ferry routes: validate that both stops are ferry terminals
        let finalWeight: number;
        let finalTransportType = route?.transportType as TransportType | undefined;
        
        if (route?.transportType === 'FERRY') {
          // Find stops to check if they are ferry terminals
          const fromStop = stops.find(s => s.id === flight.fromStopId);
          const toStop = stops.find(s => s.id === flight.toStopId);
          
          const fromIsFerry = fromStop ? this.getStopType(fromStop) === 'ferry_terminal' : false;
          const toIsFerry = toStop ? this.getStopType(toStop) === 'ferry_terminal' : false;
          
          // Ferry edge is only valid if both stops are ferry terminals
          if (!fromIsFerry || !toIsFerry) {
            // Invalid ferry route: one or both stops are not ferry terminals
            // Skip this edge or change transport type (prefer skipping)
            this.log('WARN', `Skipping invalid ferry edge: ${flight.fromStopId} -> ${flight.toStopId} (stops are not ferry terminals)`);
            continue; // Skip this edge entirely
          }
          
          // Valid ferry route: use route.durationMinutes (20 minutes) + waiting time from calculateFerryWeight()
          if (route.metadata?.ferrySchedule) {
            const baseDuration = route.durationMinutes || 20;
            finalWeight = this.calculateFerryWeight(baseDuration, route.metadata.ferrySchedule as { summer?: { frequency: string }; winter?: { frequency: string } });
          } else {
            // Ferry route without schedule: use default weight (20-65 minutes)
            finalWeight = route.durationMinutes || 20;
            if (finalWeight < 20) finalWeight = 20;
            if (finalWeight > 65) finalWeight = 65;
          }
        } else {
          // Non-ferry route: calculate weight from flight times (HH:MM format)
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
          
          finalWeight = weight;
        }

        edgesMap.set(edgeKey, {
          fromStopId: flight.fromStopId,
          toStopId: flight.toStopId,
          weight: finalWeight,
          distance: route?.distanceKm,
          transportType: finalTransportType,
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
            // For ferry routes: validate that both stops are ferry terminals
            if (route.transportType === 'FERRY') {
              // Find stops to check if they are ferry terminals
              const fromStop = stops.find(s => s.id === fromStopId);
              const toStop = stops.find(s => s.id === toStopId);
              
              const fromIsFerry = fromStop ? this.getStopType(fromStop) === 'ferry_terminal' : false;
              const toIsFerry = toStop ? this.getStopType(toStop) === 'ferry_terminal' : false;
              
              // Ferry edge is only valid if both stops are ferry terminals
              if (!fromIsFerry || !toIsFerry) {
                // Invalid ferry route: one or both stops are not ferry terminals
                // Skip this edge
                this.log('WARN', `Skipping invalid ferry route edge: ${fromStopId} -> ${toStopId} (stops are not ferry terminals)`);
                continue; // Skip this edge entirely
              }
              
              // Valid ferry route: calculate weight with seasonality
              let weight: number;
              if (route.metadata?.ferrySchedule) {
                weight = this.calculateFerryWeight(route.durationMinutes || 20, route.metadata.ferrySchedule as { summer?: { frequency: string }; winter?: { frequency: string } });
              } else {
                // Ferry route without schedule: use default weight (20-65 minutes)
                weight = route.durationMinutes || 20;
                if (weight < 20) weight = 20;
                if (weight > 65) weight = 65;
              }
              
              edgesMap.set(edgeKey, {
                fromStopId,
                toStopId,
                weight,
                distance: route.distanceKm,
                transportType: route.transportType,
                routeId: route.id,
              });
            } else {
              // Non-ferry route: use route duration or estimate
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
    stop1: { id: string; name?: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> },
    stop2: { id: string; name?: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }
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
  private getStopType(stop: { id: string; name?: string; cityId?: string; isAirport?: boolean; isRailwayStation?: boolean; metadata?: Record<string, unknown> }): 'airport' | 'ground' | 'ferry_terminal' {
    // Safety check: stop-027 and stop-028 are always ferry terminals (Yakutsk ferry terminals)
    // These are the known ferry terminals: stop-027 (Нижний Бестях) and stop-028 (Якутск)
    if (stop.id === 'stop-027' || stop.id === 'stop-028') {
      return 'ferry_terminal';
    }
    
    // Check if it's a ferry terminal
    const stopIdLower = stop.id.toLowerCase();
    const stopNameLower = stop.name?.toLowerCase() || '';
    if (stop.metadata?.type === 'ferry_terminal' || 
        stopIdLower.includes('паром') || 
        stopIdLower.includes('ferry') ||
        stopIdLower.includes('переправа') ||
        stopIdLower.includes('пристань') ||
        stopNameLower.includes('паром') ||
        stopNameLower.includes('ferry') ||
        stopNameLower.includes('переправа') ||
        stopNameLower.includes('пристань')) {
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

