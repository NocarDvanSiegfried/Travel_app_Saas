/**
 * Air Route Generator Worker
 * 
 * Generates air routes from federal cities to Yakutsk.
 * 
 * Lifecycle:
 * 1. Check if new dataset version exists
 * 2. Load all federal cities from unified reference
 * 3. For each federal city:
 *    - Check if air route exists (Yakutsk ↔ federal city)
 *    - If not → create routes (direct and return)
 *    - Generate flights for routes (daily, 2-3 flights: 08:00, 14:00, 20:00)
 * 4. Save routes and flights to PostgreSQL
 * 
 * @module application/workers
 */

import { BaseBackgroundWorker } from './base/BaseBackgroundWorker';
import type { WorkerExecutionResult } from './base/IBackgroundWorker';
import type { IStopRepository } from '../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';
import { Route, type RouteStop } from '../../domain/entities/Route';
import { Flight } from '../../domain/entities/Flight';
import { TransportType } from '../../domain/entities/RouteSegment';
import { normalizeCityName } from '../../shared/utils/city-normalizer';
import { getAllFederalCities, isCityInUnifiedReference } from '../../shared/utils/unified-cities-loader';

/**
 * Hub city (Yakutsk)
 */
const HUB_CITY_NAME = 'Якутск';
const HUB_CITY_NORMALIZED = normalizeCityName(HUB_CITY_NAME);

/**
 * Air Route Generator Worker
 * 
 * Generates air routes from federal cities to Yakutsk hub.
 * 
 * @class
 */
export class AirRouteGeneratorWorker extends BaseBackgroundWorker {
  constructor(
    private readonly stopRepository: IStopRepository,
    private readonly routeRepository: IRouteRepository,
    private readonly flightRepository: IFlightRepository,
    private readonly datasetRepository: IDatasetRepository
  ) {
    super('air-route-generator-worker', 'Air Route Generator Worker', '1.0.0');
  }

  /**
   * Check if worker can run
   * 
   * Only run if latest dataset exists.
   */
  public async canRun(): Promise<boolean> {
    const isRunning = await super.canRun();
    if (!isRunning) {
      return false;
    }

    // Check if latest dataset exists
    const latestDataset = await this.datasetRepository.getLatestDataset();
    if (!latestDataset) {
      this.log('INFO', 'No dataset found - cannot run');
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
      this.log('INFO', 'Step 1: Loading latest dataset...');
      const latestDataset = await this.datasetRepository.getLatestDataset();
      if (!latestDataset) {
        return {
          success: false,
          workerId: this.workerId,
          executionTimeMs: Date.now() - startTime,
          message: 'No dataset found',
          error: 'NO_DATASET',
        };
      }

      this.log('INFO', `Dataset: ${latestDataset.version} (${latestDataset.totalStops} stops)`);

      this.log('INFO', 'Step 2: Loading federal cities...');
      const federalCities = getAllFederalCities();
      this.log('INFO', `Loaded ${federalCities.length} federal cities`);

      this.log('INFO', 'Step 3: Finding hub city stops (Yakutsk)...');
      const hubStops = await this.findCityStops(HUB_CITY_NAME, HUB_CITY_NORMALIZED);
      if (hubStops.length === 0) {
        this.log('WARN', `Hub city "${HUB_CITY_NAME}" has no stops - skipping air route generation`);
        return {
          success: false,
          workerId: this.workerId,
          executionTimeMs: Date.now() - startTime,
          message: `Hub city "${HUB_CITY_NAME}" has no stops`,
          error: 'NO_HUB_STOPS',
        };
      }

      // Find airport stop in Yakutsk (prefer airport, fallback to any stop)
      const hubAirportStop = hubStops.find((stop) => stop.isAirport) || hubStops[0];
      this.log('INFO', `Using hub stop: ${hubAirportStop.name} (${hubAirportStop.id})`);

      this.log('INFO', 'Step 4: Generating air routes for federal cities...');
      const generatedRoutes: Route[] = [];
      const generatedFlights: Flight[] = [];

      for (const federalCity of federalCities) {
        this.log('INFO', `Processing city: ${federalCity.name}...`);

        // Find stops in federal city
        const cityStops = await this.findCityStops(federalCity.name, federalCity.normalizedName);
        
        // Filter invalid stops
        const validCityStops = this.filterValidStops(cityStops, federalCity.name);
        
        if (validCityStops.length === 0) {
          this.log('WARN', `City "${federalCity.name}" has no valid stops after filtering - skipping`);
          continue;
        }

        this.log('INFO', `City "${federalCity.name}" has ${validCityStops.length} valid stops`);

        // Find airport stop in federal city (prefer airport, fallback to any stop)
        const cityAirportStop = validCityStops.find((stop) => stop.isAirport) || validCityStops[0];
        
        // Validate that stop exists in database
        const stopExists = await this.validateStopExists(cityAirportStop.id);
        if (!stopExists) {
          this.log('WARN', `Stop ${cityAirportStop.id} for city "${federalCity.name}" does not exist in database - skipping`);
          continue;
        }

        this.log('INFO', `  Using stop: ${cityAirportStop.name} (${cityAirportStop.id})`);

        // Validate hub stop exists
        const hubStopExists = await this.validateStopExists(hubAirportStop.id);
        if (!hubStopExists) {
          this.log('WARN', `Hub stop ${hubAirportStop.id} does not exist in database - skipping city "${federalCity.name}"`);
          continue;
        }

        // Check if route already exists (both directions)
        const existingRouteForward = await this.routeRepository.findDirectRoutes(
          cityAirportStop.id,
          hubAirportStop.id
        );
        const existingRouteBackward = await this.routeRepository.findDirectRoutes(
          hubAirportStop.id,
          cityAirportStop.id
        );

        if (existingRouteForward.length > 0 && existingRouteBackward.length > 0) {
          this.log('INFO', `  Routes already exist for ${federalCity.name} ↔ ${HUB_CITY_NAME} - skipping`);
          continue;
        }

        // Generate forward route: federal city → Yakutsk
        if (existingRouteForward.length === 0) {
          const forwardRoute = this.createAirRoute(
            cityAirportStop.id,
            hubAirportStop.id,
            federalCity.name,
            HUB_CITY_NAME,
            'forward'
          );
          generatedRoutes.push(forwardRoute);

          // Generate flights for forward route
          const forwardFlights = this.generateFlights(forwardRoute.id, cityAirportStop.id, hubAirportStop.id);
          generatedFlights.push(...forwardFlights);
        }

        // Generate backward route: Yakutsk → federal city
        if (existingRouteBackward.length === 0) {
          const backwardRoute = this.createAirRoute(
            hubAirportStop.id,
            cityAirportStop.id,
            HUB_CITY_NAME,
            federalCity.name,
            'backward'
          );
          generatedRoutes.push(backwardRoute);

          // Generate flights for backward route
          const backwardFlights = this.generateFlights(backwardRoute.id, hubAirportStop.id, cityAirportStop.id);
          generatedFlights.push(...backwardFlights);
        }
      }

      this.log('INFO', `Generated ${generatedRoutes.length} routes, ${generatedFlights.length} flights`);

      if (generatedRoutes.length === 0 && generatedFlights.length === 0) {
        this.log('INFO', 'No new routes to generate - all routes already exist');
        return {
          success: true,
          workerId: this.workerId,
          executionTimeMs: Date.now() - startTime,
          message: 'No new routes to generate',
        };
      }

      this.log('INFO', 'Step 5: Saving routes to PostgreSQL...');
      const savedRoutes = await this.routeRepository.saveRoutesBatch(generatedRoutes);
      this.log('INFO', `Saved ${savedRoutes.length} routes`);

      this.log('INFO', 'Step 6: Saving flights to PostgreSQL...');
      const savedFlights = await this.flightRepository.saveFlightsBatch(generatedFlights);
      this.log('INFO', `Saved ${savedFlights.length} flights`);

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        workerId: this.workerId,
        executionTimeMs: executionTime,
        message: `Generated ${savedRoutes.length} routes and ${savedFlights.length} flights`,
      };
    } catch (error: any) {
      this.log('ERROR', 'Air route generation failed', error);
      return {
        success: false,
        workerId: this.workerId,
        executionTimeMs: Date.now() - startTime,
        message: `Air route generation failed: ${error?.message || String(error)}`,
        error: 'EXECUTION_ERROR',
      };
    }
  }

  /**
   * Find stops by city name (checks both real and virtual stops)
   */
  private async findCityStops(cityName: string, normalizedCityName: string): Promise<any[]> {
    // Try real stops first
    const realStops = await this.stopRepository.getRealStopsByCity(normalizedCityName);
    if (realStops.length > 0) {
      return realStops;
    }

    // Try virtual stops
    const virtualStops = await this.stopRepository.getVirtualStopsByCity(normalizedCityName);
    return virtualStops;
  }

  /**
   * Filter valid stops for route generation
   * 
   * Removes stops that:
   * - Have empty cityId
   * - Have cityId not in unified reference
   * - Have invalid ID (virtual-stop-% with empty cityId)
   * - Have invalid ID format (3+ consecutive dashes)
   * 
   * @param stops - Array of stops to filter
   * @param cityName - City name for logging
   * @returns Array of valid stops
   */
  private filterValidStops(stops: any[], cityName: string): any[] {
    const validStops: any[] = [];

    for (const stop of stops) {
      let isValid = true;
      let reason = '';

      // Check 1: Empty cityId
      if (!stop.cityId || stop.cityId.trim() === '') {
        isValid = false;
        reason = 'empty cityId';
      }

      // Check 2: Invalid ID format (3+ consecutive dashes)
      if (isValid && stop.id.match(/-{3,}/)) {
        isValid = false;
        reason = 'invalid id format (3+ consecutive dashes)';
      }

      // Check 3: virtual-stop-% with empty cityId
      if (isValid && stop.id.startsWith('virtual-stop-') && (!stop.cityId || stop.cityId.trim() === '')) {
        isValid = false;
        reason = 'virtual-stop with empty cityId';
      }

      // Check 4: cityId not in unified reference
      if (isValid && stop.cityId) {
        const normalizedCityId = normalizeCityName(stop.cityId);
        if (!isCityInUnifiedReference(normalizedCityId)) {
          isValid = false;
          reason = `cityId not in unified reference: ${stop.cityId}`;
        }
      }

      if (isValid) {
        validStops.push(stop);
      } else {
        this.log('WARN', `Excluding stop ${stop.id} for city "${cityName}", reason: ${reason}`);
      }
    }

    return validStops;
  }

  /**
   * Validate that stop exists in database
   * 
   * @param stopId - Stop ID to validate
   * @returns True if stop exists, false otherwise
   */
  private async validateStopExists(stopId: string): Promise<boolean> {
    try {
      // Check if stop exists in real stops
      const realStop = await this.stopRepository.findRealStopById(stopId);
      if (realStop) {
        return true;
      }

      // Check if stop exists in virtual stops
      const virtualStop = await this.stopRepository.findVirtualStopById(stopId);
      if (virtualStop) {
        return true;
      }

      return false;
    } catch (error) {
      this.log('ERROR', `Error validating stop ${stopId}: ${error}`);
      return false;
    }
  }

  /**
   * Create air route between two stops
   */
  private createAirRoute(
    fromStopId: string,
    toStopId: string,
    fromCityName: string,
    toCityName: string,
    direction: 'forward' | 'backward'
  ): Route {
    const routeId = `air-route-${normalizeCityName(fromCityName)}-${normalizeCityName(toCityName)}-${direction}`;
    const routeNumber = `AIR-${fromCityName.substring(0, 3).toUpperCase()}-${toCityName.substring(0, 3).toUpperCase()}`;

    const stopsSequence: RouteStop[] = [
      { stopId: fromStopId, order: 1 },
      { stopId: toStopId, order: 2 },
    ];

    // Air route: 240 minutes (4 hours), 2000 km
    return new Route(
      routeId,
      TransportType.AIRPLANE,
      fromStopId,
      toStopId,
      stopsSequence,
      routeNumber,
      240, // durationMinutes
      2000, // distanceKm
      'Air Route Generator', // operator
      { name: `${fromCityName} → ${toCityName}`, baseFare: 15000 }, // metadata
      undefined, // createdAt
      undefined // updatedAt
    );
  }

  /**
   * Generate flights for a route (daily, 2-3 flights: 08:00, 14:00, 20:00)
   */
  private generateFlights(routeId: string, fromStopId: string, toStopId: string): Flight[] {
    const flights: Flight[] = [];
    const flightTimes = ['08:00', '14:00', '20:00']; // 3 flights per day
    const flightDuration = 240; // 4 hours in minutes

    for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
      // All days of week (Monday-Sunday)
      for (const departureTime of flightTimes) {
        const arrivalTime = this.calculateArrivalTime(departureTime, flightDuration);
        const flightId = `flight-${routeId}-${dayOfWeek}-${departureTime.replace(':', '')}`;

        flights.push(
          new Flight(
            flightId,
            fromStopId,
            toStopId,
            departureTime,
            arrivalTime,
            [dayOfWeek], // Single day
            routeId,
            15000, // priceRub
            false, // isVirtual
            TransportType.AIRPLANE,
            { generatedBy: 'AirRouteGeneratorWorker' }, // metadata
            undefined // createdAt
          )
        );
      }
    }

    return flights;
  }

  /**
   * Calculate arrival time from departure time and duration
   */
  private calculateArrivalTime(departureTime: string, durationMinutes: number): string {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const arrivalHours = Math.floor(totalMinutes / 60) % 24;
    const arrivalMins = totalMinutes % 60;
    return `${String(arrivalHours).padStart(2, '0')}:${String(arrivalMins).padStart(2, '0')}`;
  }
}

