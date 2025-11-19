/**
 * Workers Initialization
 * 
 * Initialize and register all background workers.
 * 
 * @module infrastructure/workers
 */

import { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import {
  getWorkerOrchestrator,
  ODataSyncWorker,
  VirtualEntitiesGeneratorWorker,
  GraphBuilderWorker,
} from '../../application/workers';
import type { IODataClient, IMinioClient } from '../../application/workers';
import {
  PostgresStopRepository,
  PostgresRouteRepository,
  PostgresFlightRepository,
  PostgresDatasetRepository,
  PostgresGraphRepository,
} from '../repositories';

/**
 * Yakutia cities coordinates directory
 * 
 * TODO: Move to separate data file
 */
const YAKUTIA_CITIES: Record<string, { latitude: number; longitude: number }> = {
  'Якутск': { latitude: 62.0355, longitude: 129.6755 },
  'Мирный': { latitude: 62.5354, longitude: 113.9564 },
  'Нерюнгри': { latitude: 56.6669, longitude: 124.7164 },
  'Ленск': { latitude: 60.7242, longitude: 114.9166 },
  'Алдан': { latitude: 58.6031, longitude: 125.3883 },
  'Удачный': { latitude: 66.4167, longitude: 112.4000 },
  'Вилюйск': { latitude: 63.7547, longitude: 121.6274 },
  'Нюрба': { latitude: 63.2842, longitude: 118.3362 },
  'Покровск': { latitude: 61.4833, longitude: 129.1500 },
  'Олёкминск': { latitude: 60.3744, longitude: 120.4272 },
};

/**
 * Simple OData Client Mock
 * 
 * Loads mock data from JSON files for initial data population.
 * In production, this should fetch from real OData API.
 */
class SimpleODataClient implements IODataClient {
  async fetchAll() {
    const fs = require('fs');
    const path = require('path');

    try {
      // Load mock data from JSON files
      const dataDir = path.join(__dirname, '../../../data/mock');
      
      const stopsPath = path.join(dataDir, 'stops.json');
      const routesPath = path.join(dataDir, 'routes.json');
      const flightsPath = path.join(dataDir, 'flights.json');

      let stops: any[] = [];
      let routes: any[] = [];
      let flights: any[] = [];

      // Load stops
      if (fs.existsSync(stopsPath)) {
        const stopsData = fs.readFileSync(stopsPath, 'utf-8');
        stops = JSON.parse(stopsData);
        console.log(`[ODataClient] Loaded ${stops.length} stops from mock data`);
      } else {
        console.warn(`[ODataClient] Mock stops file not found: ${stopsPath}`);
      }

      // Load routes
      if (fs.existsSync(routesPath)) {
        const routesData = fs.readFileSync(routesPath, 'utf-8');
        routes = JSON.parse(routesData);
        console.log(`[ODataClient] Loaded ${routes.length} routes from mock data`);
      } else {
        console.warn(`[ODataClient] Mock routes file not found: ${routesPath}`);
      }

      // Load flights
      if (fs.existsSync(flightsPath)) {
        const flightsData = fs.readFileSync(flightsPath, 'utf-8');
        flights = JSON.parse(flightsData);
        console.log(`[ODataClient] Loaded ${flights.length} flights from mock data`);
      } else {
        console.warn(`[ODataClient] Mock flights file not found: ${flightsPath}`);
      }

      console.log(`[ODataClient] Total mock data: ${stops.length} stops, ${routes.length} routes, ${flights.length} flights`);

      return {
        stops,
        routes,
        flights,
      };
    } catch (error: any) {
      console.error('[ODataClient] Error loading mock data:', error?.message || String(error));
      // Return empty data on error
      return {
        stops: [],
        routes: [],
        flights: [],
      };
    }
  }
}

/**
 * Simple MinIO Client Mock
 * 
 * TODO: Replace with real MinIO client implementation
 */
class SimpleMinioClient implements IMinioClient {
  async uploadDataset(datasetId: string, data: string): Promise<void> {
    // Mock implementation - logs to console
    // In production, this should upload to MinIO
    console.log(`[MinIO] Would upload dataset ${datasetId} (${data.length} bytes)`);
  }
}

/**
 * Initialize all background workers
 * 
 * Creates worker instances and registers them with orchestrator.
 */
export async function initializeWorkers(
  pool: Pool,
  redis: RedisClientType
): Promise<void> {
  console.log('[Workers] Initializing background workers...');

  try {
    // ====================================================================
    // Initialize Repositories
    // ====================================================================
    const stopRepository = new PostgresStopRepository(pool);
    const routeRepository = new PostgresRouteRepository(pool);
    const flightRepository = new PostgresFlightRepository(pool);
    const datasetRepository = new PostgresDatasetRepository(pool);
    const graphRepository = new PostgresGraphRepository(pool, redis);

    console.log('[Workers] ✅ Repositories initialized');

    // ====================================================================
    // Initialize Clients
    // ====================================================================
    const odataClient = new SimpleODataClient();
    const minioClient = new SimpleMinioClient();

    console.log('[Workers] ✅ Clients initialized');

    // ====================================================================
    // Create Workers
    // ====================================================================
    
    // Worker 1: OData Sync
    const odataSyncWorker = new ODataSyncWorker(
      odataClient,
      stopRepository,
      routeRepository,
      flightRepository,
      datasetRepository,
      minioClient
    );

    // Worker 2: Virtual Entities Generator
    const virtualEntitiesWorker = new VirtualEntitiesGeneratorWorker(
      stopRepository,
      routeRepository,
      flightRepository,
      datasetRepository,
      YAKUTIA_CITIES
    );

    // Worker 3: Graph Builder
    const graphBuilderWorker = new GraphBuilderWorker(
      stopRepository,
      routeRepository,
      flightRepository,
      datasetRepository,
      graphRepository
    );

    console.log('[Workers] ✅ Workers created');

    // ====================================================================
    // Register Workers with Orchestrator
    // ====================================================================
    const orchestrator = getWorkerOrchestrator();

    orchestrator.registerWorker('odata-sync-worker', odataSyncWorker);
    orchestrator.registerWorker('virtual-entities-generator', virtualEntitiesWorker);
    orchestrator.registerWorker('graph-builder', graphBuilderWorker);

    console.log('[Workers] ✅ All workers registered with orchestrator');

    // ====================================================================
    // Optional: Schedule Periodic Execution
    // ====================================================================
    // Uncomment to enable automatic execution every 6 hours
    /*
    setInterval(async () => {
      console.log('[Workers] 🔄 Starting scheduled pipeline execution...');
      const result = await orchestrator.executeFullPipeline();
      
      if (result.success) {
        console.log('[Workers] ✅ Scheduled pipeline completed successfully');
      } else {
        console.error('[Workers] ❌ Scheduled pipeline failed:', result.error);
      }
    }, 6 * 60 * 60 * 1000); // Every 6 hours
    */

    console.log('[Workers] ✅ Workers initialization complete');
  } catch (error: any) {
    console.error('[Workers] ❌ Workers initialization failed:', error);
    throw error;
  }
}

