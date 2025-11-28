/**
 * OData Sync Worker
 * 
 * Fetches data from OData API, detects changes, and updates PostgreSQL.
 * 
 * Lifecycle:
 * 1. Fetch OData API response
 * 2. Calculate SHA256 hash
 * 3. Compare with last hash
 * 4. If changed: parse, save to PostgreSQL, create dataset version, backup to MinIO
 * 5. Trigger next worker (Virtual Entities Generator)
 * 
 * @module application/workers
 */

import crypto from 'crypto';
import { BaseBackgroundWorker } from './base/BaseBackgroundWorker';
import type { WorkerExecutionResult } from './base/IBackgroundWorker';
import type { IStopRepository } from '../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';
import { RealStop } from '../../domain/entities/RealStop';
import { Route, type RouteStop } from '../../domain/entities/Route';
import { TransportType } from '../../domain/entities/RouteSegment';
import { Flight } from '../../domain/entities/Flight';
import { Dataset } from '../../domain/entities/Dataset';
import { extractCityFromStopName, normalizeCityName } from '../../shared/utils/city-normalizer';
import { getCityByAirportName } from '../../shared/utils/airports-loader';
import { getMainCityBySuburb } from '../../shared/utils/suburbs-loader';
import { validateStopData } from '../../shared/validators/stop-validator';
import { isCityInUnifiedReference } from '../../shared/utils/unified-cities-loader';

/**
 * OData API response structure
 */
type ODataResponse = {
  stops: Array<{
    id: string;
    name: string;
    latitude?: number;
    longitude?: number;
    type?: string;
    address?: string;
    cityName?: string;
  }>;
  routes: Array<{
    id: string;
    routeNumber: string;
    name: string;
    transportType: string;
    stops: string[];
    baseFare?: number;
    carrier?: string;
  }>;
  flights: Array<{
    id: string;
    routeId: string;
    fromStopId: string;
    toStopId: string;
    departureTime: string;
    arrivalTime: string;
    daysOfWeek?: string[];
    priceRub?: number;
    availableSeats?: number;
  }>;
};

/**
 * OData Client Interface
 */
export interface IODataClient {
  fetchAll(): Promise<ODataResponse>;
}

/**
 * MinIO Client Interface (simple)
 */
export interface IMinioClient {
  uploadDataset(datasetId: string, data: string): Promise<void>;
}

/**
 * OData Sync Worker
 * 
 * Synchronizes data from OData API to PostgreSQL.
 * 
 * @class
 */
export class ODataSyncWorker extends BaseBackgroundWorker {
  private lastHash?: string;

  constructor(
    private readonly odataClient: IODataClient,
    private readonly stopRepository: IStopRepository,
    private readonly routeRepository: IRouteRepository,
    private readonly flightRepository: IFlightRepository,
    private readonly datasetRepository: IDatasetRepository,
    private readonly minioClient?: IMinioClient
  ) {
    super('odata-sync-worker', 'OData Synchronization Worker', '1.0.0');
  }

  /**
   * Check if worker can run (idempotency)
   * 
   * Only run if enough time has passed since last successful run.
   */
  public async canRun(): Promise<boolean> {
    const isRunning = await super.canRun();
    if (!isRunning) {
      return false;
    }

    // Check if we ran recently (within last hour)
    if (this.lastRun) {
      const hoursSinceLastRun = (Date.now() - this.lastRun.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRun < 1) {
        this.log('INFO', `Skipping run - last run was ${Math.round(hoursSinceLastRun * 60)} minutes ago`);
        return false;
      }
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
      // Step 1: Fetch OData API Response
      // ====================================================================
      this.log('INFO', 'Step 1: Fetching OData API response...');
      const odataResponse = await this.odataClient.fetchAll();

      this.log('INFO', `Fetched: ${odataResponse.stops.length} stops, ${odataResponse.routes.length} routes, ${odataResponse.flights.length} flights`);

      // ====================================================================
      // Step 2: Calculate SHA256 Hash
      // ====================================================================
      this.log('INFO', 'Step 2: Calculating data hash...');
      const responseString = JSON.stringify(odataResponse);
      const currentHash = crypto.createHash('sha256').update(responseString).digest('hex');

      this.log('INFO', `Data hash: ${currentHash.substring(0, 16)}...`);

      // ====================================================================
      // Step 3: Compare with Last Hash
      // ====================================================================
      this.log('INFO', 'Step 3: Checking for changes...');
      
      const lastDataset = await this.datasetRepository.getLatestDataset();
      const lastHash = lastDataset?.odataHash;

      if (lastHash === currentHash) {
        this.log('INFO', 'No changes detected - data is up to date');
        return {
          success: true,
          workerId: this.workerId,
          executionTimeMs: Date.now() - startTime,
          message: 'No changes detected',
        };
      }

      this.log('INFO', 'Changes detected - proceeding with update');

      // ====================================================================
      // Step 4: Parse and Validate Data
      // ====================================================================
      this.log('INFO', 'Step 4: Parsing and validating data...');
      
      const { stops, routes, flights } = this.parseODataResponse(odataResponse);

      this.log('INFO', `Parsed: ${stops.length} stops, ${routes.length} routes, ${flights.length} flights`);

      // ====================================================================
      // Step 5: Save to PostgreSQL (Transactional)
      // ====================================================================
      this.log('INFO', 'Step 5: Saving to PostgreSQL...');

      const savedCounts = await this.saveDataToPostgreSQL(stops, routes, flights);

      this.log('INFO', `Saved: ${savedCounts.stops} stops, ${savedCounts.routes} routes, ${savedCounts.flights} flights`);

      // ====================================================================
      // Step 6: Create New Dataset Version
      // ====================================================================
      this.log('INFO', 'Step 6: Creating new dataset version...');

      const newDataset = new Dataset(
        0, // ID will be assigned by database (SERIAL)
        `v${Date.now()}`,
        'ODATA',
        this.calculateQuality(stops, routes, flights),
        stops.length,
        routes.length,
        flights.length,
        0, // totalVirtualStops - will be updated by Worker 2
        0, // totalVirtualRoutes - will be updated by Worker 2
        currentHash,
        undefined, // metadata
        new Date(),
        false // isActive - will be activated after graph build
      );

      await this.datasetRepository.saveDataset(newDataset);

      this.log('INFO', `Created dataset: ${newDataset.id} (v${newDataset.version})`);

      // ====================================================================
      // Step 7: Backup to MinIO (Optional)
      // ====================================================================
      if (this.minioClient) {
        this.log('INFO', 'Step 7: Backing up to MinIO...');
        
        try {
          await this.minioClient.uploadDataset(newDataset.version, responseString);
          this.log('INFO', 'Backup successful');
        } catch (error: any) {
          this.log('WARN', `Backup failed: ${error?.message}`, error);
          // Non-fatal error - continue
        }
      } else {
        this.log('INFO', 'Step 7: Skipping MinIO backup (no client provided)');
      }

      // ====================================================================
      // Step 8: Invalidate cities cache
      // ====================================================================
      try {
        const { RedisCacheService } = await import('../../infrastructure/cache/RedisCacheService');
        const cacheService = new RedisCacheService();
        await cacheService.deleteByPattern('cities:list:*');
        this.log('INFO', 'Cities cache invalidated');
      } catch (error: any) {
        this.log('WARN', `Failed to invalidate cities cache: ${error?.message}`, error);
        // Non-fatal error - continue
      }

      // ====================================================================
      // Step 9: Return Success
      // ====================================================================
      this.lastHash = currentHash;

      return {
        success: true,
        workerId: this.workerId,
        executionTimeMs: Date.now() - startTime,
        message: `OData sync completed - ${savedCounts.stops + savedCounts.routes + savedCounts.flights} records updated`,
        dataProcessed: {
          added: savedCounts.stops + savedCounts.routes + savedCounts.flights,
          updated: 0,
          deleted: 0,
        },
        nextWorker: 'virtual-entities-generator',
      };
    } catch (error: any) {
      this.log('ERROR', 'OData sync failed', error);
      throw error;
    }
  }

  /**
   * Parse OData response into Domain entities
   */
  private parseODataResponse(response: ODataResponse): {
    stops: RealStop[];
    routes: Route[];
    flights: Flight[];
  } {
    // Parse stops - handle both OData format and mock format
    // Statistics for validation logging
    let validStopsCount = 0;
    let invalidStopsCount = 0;
    const validationErrors: string[] = [];
    const cityMappingStats = {
      suburbsMapped: 0,
      airportsMapped: 0,
      notInReference: 0,
      extractedFromName: 0,
    };

    const stops = response.stops
      .map((stopData: any) => {
        // Handle mock format: { id, name, coordinates: { latitude, longitude }, type }
        const latitude = stopData.coordinates?.latitude ?? stopData.latitude;
        const longitude = stopData.coordinates?.longitude ?? stopData.longitude;
        
        // Extract city name from stop name if not provided
        // Use unified utility for consistent city extraction across the system
        let cityName = stopData.cityName;
        if (!cityName && stopData.name) {
          cityName = extractCityFromStopName(stopData.name, stopData.address);
        }

        // Step 1: Check if cityName is a suburb - replace with main city
        if (cityName) {
          const mainCity = getMainCityBySuburb(cityName);
          if (mainCity) {
            cityMappingStats.suburbsMapped++;
            cityName = mainCity;
          }
        }

        // Step 2: Check if cityName is an airport - replace with city
        if (cityName) {
          const cityFromAirport = getCityByAirportName(cityName);
          if (cityFromAirport) {
            cityMappingStats.airportsMapped++;
            cityName = cityFromAirport;
          }
        }
        
        // Track if city was extracted from stop name
        if (!stopData.cityName && cityName) {
          cityMappingStats.extractedFromName++;
        }

        // Step 3: Normalize cityName
        let normalizedCityName = cityName ? normalizeCityName(cityName) : '';

        // Step 4: If normalized cityName is not in unified reference, try to find it through airports/suburbs again
        // This handles cases where extractCityFromStopName returns airport/suburb name instead of city name
        if (normalizedCityName && !isCityInUnifiedReference(normalizedCityName)) {
          // Try to find city through airports reference (using original stop name)
          if (stopData.name) {
            const cityFromAirportName = getCityByAirportName(stopData.name);
            if (cityFromAirportName) {
              cityName = cityFromAirportName;
              normalizedCityName = normalizeCityName(cityName);
            }
          }
          
          // Try to find city through suburbs reference (using original stop name)
          if (!isCityInUnifiedReference(normalizedCityName) && stopData.name) {
            const mainCityFromSuburb = getMainCityBySuburb(stopData.name);
            if (mainCityFromSuburb) {
              cityName = mainCityFromSuburb;
              normalizedCityName = normalizeCityName(cityName);
            }
          }
        }

        // Step 5: Validate stop data
        const stopDataForValidation = {
          name: stopData.name,
          latitude,
          longitude,
          cityId: normalizedCityName,
        };

        const validationResult = validateStopData(stopDataForValidation);
        if (!validationResult.isValid) {
          invalidStopsCount++;
          const errorMsg = `Stop "${stopData.name}" (ID: ${stopData.id}): ${validationResult.errors.join('; ')}`;
          validationErrors.push(errorMsg);
          this.log('WARN', errorMsg);
          return null; // Skip invalid stop
        }

        // Step 6: Check if normalized cityName is in unified reference (Yakutia + Federal cities)
        if (normalizedCityName && !isCityInUnifiedReference(normalizedCityName)) {
          cityMappingStats.notInReference++;
          invalidStopsCount++;
          const errorMsg = `Stop "${stopData.name}" (ID: ${stopData.id}): City "${cityName}" (normalized: "${normalizedCityName}") is not in unified reference`;
          validationErrors.push(errorMsg);
          this.log('WARN', errorMsg);
          return null; // Skip stop with city not in reference
        }

        // Determine if airport or railway station
        const isAirport = stopData.type === 'airport' || stopData.name?.toLowerCase().includes('аэропорт');
        const isRailwayStation = stopData.type === 'railway' || stopData.name?.toLowerCase().includes('вокзал');

        // Build metadata: include address if present, and copy type for ferry_terminal
        const metadata: Record<string, unknown> = {};
        if (stopData.address) {
          metadata.address = stopData.address;
        }
        if (stopData.type === 'ferry_terminal') {
          metadata.type = 'ferry_terminal';
        }

        validStopsCount++;
        return new RealStop(
          stopData.id,
          stopData.name,
          latitude,
          longitude,
          normalizedCityName, // cityId - use normalized name
          isAirport,
          isRailwayStation,
          Object.keys(metadata).length > 0 ? metadata : undefined
        );
      })
      .filter((stop): stop is RealStop => stop !== null); // Remove null entries

    // Log validation statistics
    this.log('INFO', `Stop validation statistics: ${validStopsCount} valid, ${invalidStopsCount} invalid`);
    this.log('INFO', `City mapping statistics: ${cityMappingStats.suburbsMapped} suburbs mapped, ${cityMappingStats.airportsMapped} airports mapped, ${cityMappingStats.extractedFromName} extracted from name, ${cityMappingStats.notInReference} not in reference`);
    if (validationErrors.length > 0) {
      this.log('WARN', `Validation errors (${validationErrors.length}):`);
      validationErrors.forEach((error, index) => {
        if (index < 10) {
          // Log first 10 errors to avoid spam
          this.log('WARN', `  ${index + 1}. ${error}`);
        }
      });
      if (validationErrors.length > 10) {
        this.log('WARN', `  ... and ${validationErrors.length - 10} more errors`);
      }
    }

    // Parse routes - handle both OData format and mock format
    const routes = response.routes
      .filter((routeData: any) => {
        // Filter out routes with invalid stops
        const stops = routeData.stops || [];
        return Array.isArray(stops) && stops.length >= 2;
      })
      .map((routeData: any) => {
        // Convert stops array to RouteStop format
        const stopsSequence: RouteStop[] = (routeData.stops || []).map((stopId: string, index: number) => ({
          stopId,
          order: index + 1,
        }));

        // Extract from_stop_id and to_stop_id from stops sequence
        const fromStopId = stopsSequence[0].stopId;
        const toStopId = stopsSequence[stopsSequence.length - 1].stopId;

        // Normalize transportType to domain type
        const transportType = this.normalizeTransportType(routeData.transportType) || TransportType.BUS;

        return new Route(
          routeData.id,
          transportType,
          fromStopId,
          toStopId,
          stopsSequence,
          routeData.routeNumber || routeData.id,
          undefined, // durationMinutes - will be calculated if needed
          undefined, // distanceKm - will be calculated if needed
          routeData.carrier || routeData.operator, // operator
          routeData.name ? { name: routeData.name, baseFare: routeData.baseFare } : undefined, // metadata
          undefined, // createdAt
          undefined // updatedAt
        );
      });

    // Parse flights - handle both OData format and mock format
    const flights = response.flights.map((flightData: any) => {
      // Handle mock format: { price } vs OData format: { priceRub }
      const priceRub = flightData.priceRub ?? flightData.price;
      
      // Convert ISO time format to HH:MM if needed
      const departureTime = this.convertTimeToHHMM(flightData.departureTime);
      const arrivalTime = this.convertTimeToHHMM(flightData.arrivalTime);
      
      // Handle daysOfWeek - default to all days if not provided
      let daysOfWeek: number[] = flightData.daysOfWeek;
      if (!daysOfWeek || !Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        daysOfWeek = [1, 2, 3, 4, 5, 6, 7]; // Default to all days
      }
      
      // Normalize transportType if provided
      const transportType = flightData.transportType 
        ? this.normalizeTransportType(flightData.transportType)
        : undefined;

      return new Flight(
        flightData.id,
        flightData.fromStopId,
        flightData.toStopId,
        departureTime,
        arrivalTime,
        daysOfWeek,
        flightData.routeId,
        priceRub,
        false, // isVirtual
        transportType,
        undefined, // metadata
        undefined // createdAt
      );
    });

    return { stops, routes, flights };
  }

  /**
   * Save data to PostgreSQL (transactional)
   */
  private async saveDataToPostgreSQL(
    stops: RealStop[],
    routes: Route[],
    flights: Flight[]
  ): Promise<{ stops: number; routes: number; flights: number }> {
    // Save stops in batch
    const savedStops = await this.stopRepository.saveRealStopsBatch(stops);

    // Save routes in batch
    const savedRoutes = await this.routeRepository.saveRoutesBatch(routes);

    // Save flights in batch
    const savedFlights = await this.flightRepository.saveFlightsBatch(flights);

    return {
      stops: savedStops.length,
      routes: savedRoutes.length,
      flights: savedFlights.length,
    };
  }

  /**
   * Normalize transport type to domain TransportType
   * Handles various input formats: "airplane", "bus", "train" -> TransportType.AIRPLANE, TransportType.BUS, TransportType.TRAIN
   */
  private normalizeTransportType(input: string | undefined | null): TransportType | undefined {
    if (!input) {
      return undefined;
    }

    const normalized = input.trim().toUpperCase();

    // Map common variations to domain types
    if (normalized === 'AIRPLANE' || normalized === 'PLANE' || normalized === 'АВИА') {
      return TransportType.AIRPLANE;
    }
    if (normalized === 'BUS' || normalized === 'АВТОБУС') {
      return TransportType.BUS;
    }
    if (normalized === 'TRAIN' || normalized === 'ПОЕЗД') {
      return TransportType.TRAIN;
    }
    if (normalized === 'FERRY' || normalized === 'ПАРОМ' || normalized === 'ПАРОМНАЯ ПЕРЕПРАВА') {
      return TransportType.FERRY;
    }
    if (normalized === 'WATER') {
      return TransportType.FERRY; // WATER maps to FERRY
    }
    if (normalized === 'TAXI' || normalized === 'ТАКСИ') {
      return TransportType.TAXI;
    }
    if (normalized === 'WINTER_ROAD' || normalized === 'ЗИМНИК') {
      return TransportType.WINTER_ROAD;
    }

    // If already a valid domain type (lowercase), try to match
    const lowerNormalized = input.trim().toLowerCase();
    if (lowerNormalized === 'airplane' || lowerNormalized === 'plane') {
      return TransportType.AIRPLANE;
    }
    if (lowerNormalized === 'bus') {
      return TransportType.BUS;
    }
    if (lowerNormalized === 'train') {
      return TransportType.TRAIN;
    }
    if (lowerNormalized === 'ferry') {
      return TransportType.FERRY;
    }
    if (lowerNormalized === 'taxi' || lowerNormalized === 'car') {
      return TransportType.TAXI; // car maps to TAXI
    }
    if (lowerNormalized === 'winter_road' || lowerNormalized === 'winter road') {
      return TransportType.WINTER_ROAD;
    }
    if (lowerNormalized === 'water') {
      return TransportType.FERRY; // water maps to FERRY
    }

    // If already a valid enum value, return as is
    if (Object.values(TransportType).includes(lowerNormalized as TransportType)) {
      return lowerNormalized as TransportType;
    }

    // Default to UNKNOWN for unknown types (not BUS)
    return TransportType.UNKNOWN;
  }

  /**
   * Convert time to HH:MM format
   * Handles ISO format (2025-11-19T08:30:00.000Z) and HH:MM format
   */
  private convertTimeToHHMM(time: string): string {
    if (!time) {
      throw new Error('Time is required');
    }

    // If already in HH:MM format, return as is
    if (/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(time)) {
      return time;
    }

    // If ISO format, extract HH:MM
    if (time.includes('T')) {
      const date = new Date(time);
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    // Try to parse as Date and extract time
    try {
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    } catch {
      // Ignore parsing errors
    }

    // If all else fails, try to extract HH:MM from string
    const match = time.match(/([0-1][0-9]|2[0-3]):([0-5][0-9])/);
    if (match) {
      return match[0];
    }

    throw new Error(`Cannot convert time to HH:MM format: ${time}`);
  }

  /**
   * Calculate dataset quality score
   */
  private calculateQuality(stops: RealStop[], routes: Route[], flights: Flight[]): number {
    let score = 0;
    let maxScore = 0;

    // Check stops quality
    maxScore += 100;
    if (stops.length > 0) {
      score += 50;
      
      const stopsWithCoordinates = stops.filter(s => s.latitude !== undefined && s.longitude !== undefined).length;
      score += (stopsWithCoordinates / stops.length) * 50;
    }

    // Check routes quality
    maxScore += 100;
    if (routes.length > 0) {
      score += 50;
      
      // Check if routes have operator or metadata with fare info
      const routesWithInfo = routes.filter(r => 
        r.operator !== undefined || 
        (r.metadata && (r.metadata.baseFare !== undefined || r.metadata.name !== undefined))
      ).length;
      score += (routesWithInfo / routes.length) * 50;
    }

    // Check flights quality
    maxScore += 100;
    if (flights.length > 0) {
      score += 50;
      
      const flightsWithPrice = flights.filter(f => f.priceRub !== undefined).length;
      score += (flightsWithPrice / flights.length) * 50;
    }

    return Math.round((score / maxScore) * 100); // Return 0-100
  }
}

