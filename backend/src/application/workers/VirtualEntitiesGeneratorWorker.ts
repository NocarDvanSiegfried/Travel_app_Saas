/**
 * Virtual Entities Generator Worker
 * 
 * Generates virtual stops, routes, and flights to ensure graph connectivity.
 * 
 * Lifecycle:
 * 1. Check if new dataset version exists
 * 2. Load cities directory
 * 3. Generate virtual stops for cities without real stops
 * 4. Generate virtual routes (hub-based or direct connections)
 * 5. Generate virtual flights for virtual routes
 * 6. Save to PostgreSQL
 * 7. Trigger next worker (Graph Builder)
 * 
 * @module application/workers
 */

import { BaseBackgroundWorker } from './base/BaseBackgroundWorker';
import type { WorkerExecutionResult } from './base/IBackgroundWorker';
import type { IStopRepository } from '../../domain/repositories/IStopRepository';
import type { IRouteRepository } from '../../domain/repositories/IRouteRepository';
import type { IFlightRepository } from '../../domain/repositories/IFlightRepository';
import type { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';
import { VirtualStop } from '../../domain/entities/VirtualStop';
import { VirtualRoute } from '../../domain/entities/VirtualRoute';
import { Flight } from '../../domain/entities/Flight';
import { TransportType } from '../../domain/entities/RouteSegment';
import {
  getAllFederalCities,
  getAllYakutiaCitiesUnified,
  isCityInUnifiedReference,
  type UnifiedCity,
} from '../../shared/utils/unified-cities-loader';
import { normalizeCityName, extractCityFromStopName } from '../../shared/utils/city-normalizer';
import { getCityByAirportName } from '../../shared/utils/airports-loader';
import { getMainCityBySuburb } from '../../shared/utils/suburbs-loader';

/**
 * Virtual Entities Generator Worker
 * 
 * Generates virtual transportation entities for cities without real data.
 * 
 * @class
 */
export class VirtualEntitiesGeneratorWorker extends BaseBackgroundWorker {
  private hubCityName: string = 'Якутск'; // Hub city for connectivity

  constructor(
    private readonly stopRepository: IStopRepository,
    private readonly routeRepository: IRouteRepository,
    private readonly flightRepository: IFlightRepository,
    private readonly datasetRepository: IDatasetRepository
  ) {
    super('virtual-entities-generator', 'Virtual Entities Generator Worker', '1.0.0');
  }

  /**
   * Check if worker can run
   * 
   * Worker should run whenever pipeline is triggered by DataInitialization.
   * This method only checks minimal conditions required for worker execution.
   * 
   * All business logic about "should pipeline run" is handled by DataInitialization.checkDataCompleteness().
   * This method does NOT check:
   * - Whether virtual stops already exist (handled by DataInitialization)
   * - Whether virtual routes already exist (handled by DataInitialization)
   * - Whether data is complete (handled by DataInitialization)
   * 
   * This method ONLY checks:
   * - Worker is not already running
   * - Dataset exists (required for worker to function)
   */
  public async canRun(): Promise<boolean> {
    // Check if worker is already running
    const isRunning = await super.canRun();
    if (!isRunning) {
      this.log('INFO', 'Worker is already running - skipping');
      return false;
    }

    // Check if dataset exists (minimal requirement for worker to function)
    const latestDataset = await this.datasetRepository.getLatestDataset();
    if (!latestDataset) {
      this.log('INFO', 'No dataset found - cannot run (dataset is required for virtual entities generation)');
      return false;
    }

    // Worker can run - all minimal conditions are met
    // DataInitialization.checkDataCompleteness() has already determined that pipeline should run
    this.log('INFO', `Worker can run - dataset exists (${latestDataset.version})`);
    return true;
  }

  /**
   * Execute worker logic
   */
  protected async executeWorkerLogic(): Promise<WorkerExecutionResult> {
    const startTime = Date.now();

    try {
      // ====================================================================
      // Step 1: Get Latest Dataset
      // ====================================================================
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

      // ====================================================================
      // Step 2: Load Real Stops and Find Missing Cities
      // ====================================================================
      this.log('INFO', 'Step 2: Finding cities without real stops...');
      
      // Load all cities from unified reference
      const yakutiaCities = getAllYakutiaCitiesUnified();
      const federalCities = getAllFederalCities();
      const allCities = [...yakutiaCities, ...federalCities];
      
      const realStops = await this.stopRepository.getAllRealStops();
      // Create set of normalized city names from real stops
      // Ensure both city.name and stop.cityId are normalized for comparison
      const citiesWithStops = new Set<string>();
      for (const stop of realStops) {
        if (stop.cityId) {
          // stop.cityId is already normalized (from ODataSyncWorker)
          // But we normalize again to ensure consistency
          const normalizedStopCityId = normalizeCityName(stop.cityId);
          citiesWithStops.add(normalizedStopCityId);
        }
      }

      // Filter cities: must be in unified reference, must not have real stops
      // Compare normalized city names from reference with normalized stop cityIds
      const missingCities = allCities
        .filter(city => {
          const normalizedCityName = normalizeCityName(city.name);
          // Check if this normalized city name is NOT in the set of cities with stops
          return !citiesWithStops.has(normalizedCityName);
        })
        .map(city => city.name);

      this.log('INFO', `Found ${missingCities.length} cities without real stops: ${missingCities.slice(0, 10).join(', ')}${missingCities.length > 10 ? `... (${missingCities.length - 10} more)` : ''}`);
      
      // Log statistics: cities by type
      const missingYakutia = missingCities.filter(cityName => {
        const normalized = normalizeCityName(cityName);
        const city = yakutiaCities.find(c => normalizeCityName(c.name) === normalized);
        return !!city;
      });
      const missingFederal = missingCities.filter(cityName => {
        const normalized = normalizeCityName(cityName);
        const city = federalCities.find(c => normalizeCityName(c.name) === normalized);
        return !!city;
      });
      this.log('INFO', `Missing cities breakdown: ${missingYakutia.length} Yakutia, ${missingFederal.length} federal`);
      
      // Log key cities that are missing
      const keyCities = ['Якутск', 'Олёкминск', 'Мирный', 'Верхоянск', 'Нерюнгри', 'Алдан', 'Ленск', 'Покровск'];
      const missingKeyCities = keyCities.filter(cityName => {
        const normalized = normalizeCityName(cityName);
        return missingCities.some(mc => normalizeCityName(mc) === normalized);
      });
      if (missingKeyCities.length > 0) {
        this.log('WARN', `Key cities missing real stops: ${missingKeyCities.join(', ')}`);
      }

      // ====================================================================
      // Step 3: Generate Virtual Stops
      // ====================================================================
      this.log('INFO', 'Step 3: Generating virtual stops...');
      
      const virtualStops = this.generateVirtualStops(missingCities);
      
      if (virtualStops.length > 0) {
        const savedStops = await this.stopRepository.saveVirtualStopsBatch(virtualStops);
        this.log('INFO', `Generated ${savedStops.length} virtual stops from ${missingCities.length} missing cities`);
        
        // Log cities that were not found in unified reference
        const notFoundCount = missingCities.length - virtualStops.length;
        if (notFoundCount > 0) {
          this.log('WARN', `${notFoundCount} cities from missing list were not found in unified reference and skipped`);
        }
      } else {
        this.log('WARN', `No virtual stops generated from ${missingCities.length} missing cities - check unified reference`);
      }

      // ====================================================================
      // Step 4: Generate Virtual Routes
      // ====================================================================
      this.log('INFO', 'Step 4: Generating virtual routes...');
      
      // Step 4a: Generate hub-based routes for newly created virtual stops
      const hubBasedRoutes = await this.generateVirtualRoutes(virtualStops);
      
      // Step 4b: Ensure connectivity for all cities
      const connectivityRoutes = await this.ensureCitiesConnectivity();
      
      // Combine all virtual routes
      const allVirtualRoutes = [...hubBasedRoutes, ...connectivityRoutes];
      
      if (allVirtualRoutes.length > 0) {
        const savedRoutes = await this.routeRepository.saveVirtualRoutesBatch(allVirtualRoutes);
        this.log('INFO', `Generated ${savedRoutes.length} virtual routes (${hubBasedRoutes.length} hub-based, ${connectivityRoutes.length} connectivity)`);
        
        // Log statistics by route type
        const routesByType = new Map<string, number>();
        for (const route of allVirtualRoutes) {
          const routeType = route.routeType || 'UNKNOWN';
          routesByType.set(routeType, (routesByType.get(routeType) || 0) + 1);
        }
        this.log('INFO', `Virtual routes by type: ${JSON.stringify(Object.fromEntries(routesByType))}`);
        
        // Log statistics by generation method
        const routesByMethod = new Map<string, number>();
        for (const route of allVirtualRoutes) {
          const method = (route.metadata as any)?.generationMethod || 'unknown';
          routesByMethod.set(method, (routesByMethod.get(method) || 0) + 1);
        }
        this.log('INFO', `Virtual routes by generation method: ${JSON.stringify(Object.fromEntries(routesByMethod))}`);
      } else {
        this.log('WARN', 'No virtual routes generated - connectivity may be limited');
      }

      // ====================================================================
      // Step 5: Generate Virtual Flights
      // ====================================================================
      this.log('INFO', 'Step 5: Generating virtual flights...');
      
      const virtualFlights = this.generateVirtualFlights(allVirtualRoutes);
      
      if (virtualFlights.length > 0) {
        const savedFlights = await this.flightRepository.saveFlightsBatch(virtualFlights);
        this.log('INFO', `Generated ${savedFlights.length} virtual flights for ${allVirtualRoutes.length} virtual routes`);
        
        // Log statistics: flights per route
        const flightsByRoute = new Map<string, number>();
        for (const flight of virtualFlights) {
          const routeId = flight.routeId || 'UNKNOWN';
          flightsByRoute.set(routeId, (flightsByRoute.get(routeId) || 0) + 1);
        }
        const avgFlightsPerRoute = flightsByRoute.size > 0 ? Math.round(virtualFlights.length / flightsByRoute.size) : 0;
        this.log('INFO', `Virtual flights: ${flightsByRoute.size} routes, average ${avgFlightsPerRoute} flights per route`);
        
        // Log if some routes don't have flights
        const routesWithoutFlights = allVirtualRoutes.filter(r => !flightsByRoute.has(r.id));
        if (routesWithoutFlights.length > 0) {
          this.log('WARN', `${routesWithoutFlights.length} virtual routes have no flights generated`);
        }
      } else {
        this.log('WARN', `No virtual flights generated for ${allVirtualRoutes.length} routes - routes may not be usable`);
      }

      // ====================================================================
      // Step 6: Update Dataset Statistics
      // ====================================================================
      this.log('INFO', 'Step 6: Updating dataset statistics...');
      
      const totalStops = await this.stopRepository.countRealStops() + await this.stopRepository.countVirtualStops();
      const totalRoutes = await this.routeRepository.countRoutes() + await this.routeRepository.countVirtualRoutes();
      const totalFlights = await this.flightRepository.countFlights();

      await this.datasetRepository.updateStatistics(latestDataset.version, {
        totalStops: totalStops,
        totalRoutes: totalRoutes,
        totalFlights: totalFlights,
        totalVirtualStops: await this.stopRepository.countVirtualStops(),
        totalVirtualRoutes: await this.routeRepository.countVirtualRoutes(),
      });

      this.log('INFO', `Updated statistics: ${totalStops} stops, ${totalRoutes} routes, ${totalFlights} flights`);

      // ====================================================================
      // Step 7: Return Success
      // ====================================================================
      // ====================================================================
      // Invalidate cities cache
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

      return {
        success: true,
        workerId: this.workerId,
        executionTimeMs: Date.now() - startTime,
        message: `Virtual entities generated: ${virtualStops.length} stops, ${allVirtualRoutes.length} routes, ${virtualFlights.length} flights`,
        dataProcessed: {
          added: virtualStops.length + allVirtualRoutes.length + virtualFlights.length,
          updated: 0,
          deleted: 0,
        },
        nextWorker: 'graph-builder',
      };
    } catch (error: any) {
      this.log('ERROR', 'Virtual entities generation failed', error);
      throw error;
    }
  }

  /**
   * Generate virtual stops for cities
   */
  private generateVirtualStops(cityNames: string[]): VirtualStop[] {
    // Load cities from unified reference to get coordinates
    const yakutiaCities = getAllYakutiaCitiesUnified();
    const federalCities = getAllFederalCities();
    const allCities = [...yakutiaCities, ...federalCities];
    
    // Create map with both original name and normalized name as keys
    // This ensures we can find cities regardless of how they're referenced
    const citiesMapByName = new Map<string, UnifiedCity>();
    const citiesMapByNormalized = new Map<string, UnifiedCity>();
    for (const city of allCities) {
      citiesMapByName.set(city.name, city);
      const normalized = normalizeCityName(city.name);
      citiesMapByNormalized.set(normalized, city);
    }
    
    const generatedStops: VirtualStop[] = [];
    const notFoundCities: string[] = [];
    
    for (const cityName of cityNames) {
      // Only generate if city is in unified reference
      if (!isCityInUnifiedReference(cityName)) {
        notFoundCities.push(cityName);
        continue;
      }
      
      // Try to find city by original name first, then by normalized name
      let city = citiesMapByName.get(cityName);
      if (!city) {
        const normalized = normalizeCityName(cityName);
        city = citiesMapByNormalized.get(normalized);
      }
      
      if (!city) {
        notFoundCities.push(cityName);
        this.log('WARN', `City "${cityName}" not found in unified reference maps (skipping virtual stop generation)`);
        continue;
      }
      
      // CRITICAL: Use original city name from unified reference for stop name
      // and normalized name for cityId
      generatedStops.push(new VirtualStop(
        `virtual-stop-${this.generateStableId(city.name)}`, // Use original city name for ID generation
        `г. ${city.name}`, // Use original city name from unified reference
        city.latitude,
        city.longitude,
        'MAIN_GRID', // gridType
        normalizeCityName(city.name), // cityId - use normalized name from unified reference
        undefined, // gridPosition
        [], // realStopsNearby
        new Date() // createdAt
      ));
    }
    
    // Log cities that were not found in unified reference
    if (notFoundCities.length > 0) {
      this.log('WARN', `Virtual cities not found in unified reference: ${notFoundCities.length} cities`, {
        cities: notFoundCities.slice(0, 10), // Log first 10
      });
    }
    
    this.log('INFO', `Generated ${generatedStops.length} virtual stops from ${cityNames.length} city names`);
    
    return generatedStops;
  }

  /**
   * Generate virtual routes (hub-based)
   */
  private async generateVirtualRoutes(virtualStops: VirtualStop[]): Promise<VirtualRoute[]> {
    const routes: VirtualRoute[] = [];

    // Find hub stop (Yakutsk)
    const hubStop = await this.findHubStop();
    
    if (!hubStop) {
      this.log('WARN', `Hub city "${this.hubCityName}" not found - generating direct connections`);
      return this.generateDirectVirtualRoutes(virtualStops);
    }

    this.log('INFO', `Using hub: ${hubStop.name} (${hubStop.id})`);

    // Generate routes from each virtual stop to hub and back
    for (const virtualStop of virtualStops) {
      const distance = this.calculateDistance(virtualStop, hubStop);
      const duration = this.estimateDuration(virtualStop, hubStop);
      
      // Determine route type based on stop types
      const routeTypeToHub = virtualStop.cityId ? 'VIRTUAL_TO_REAL' : 'VIRTUAL_TO_VIRTUAL';
      const routeTypeFromHub = virtualStop.cityId ? 'REAL_TO_VIRTUAL' : 'VIRTUAL_TO_VIRTUAL';

      // Route TO hub
      routes.push(
        new VirtualRoute(
          `virtual-route-${this.generateStableId(virtualStop.id, hubStop.id)}`,
          routeTypeToHub,
          virtualStop.id,
          hubStop.id,
          distance,
          duration,
          'SHUTTLE', // transportMode
          { 
            name: `${virtualStop.cityId || virtualStop.name} → ${this.hubCityName}`,
            generationMethod: 'hub-based',
          },
          new Date()
        )
      );

      // Route FROM hub
      routes.push(
        new VirtualRoute(
          `virtual-route-${this.generateStableId(hubStop.id, virtualStop.id)}`,
          routeTypeFromHub,
          hubStop.id,
          virtualStop.id,
          distance,
          duration,
          'SHUTTLE', // transportMode
          { 
            name: `${this.hubCityName} → ${virtualStop.cityId || virtualStop.name}`,
            generationMethod: 'hub-based',
          },
          new Date()
        )
      );
    }

    return routes;
  }

  /**
   * Generate direct virtual routes (if no hub)
   */
  private generateDirectVirtualRoutes(virtualStops: VirtualStop[]): VirtualRoute[] {
    const routes: VirtualRoute[] = [];

    // Generate full mesh of connections
    for (let i = 0; i < virtualStops.length; i++) {
      for (let j = i + 1; j < virtualStops.length; j++) {
        const stop1 = virtualStops[i];
        const stop2 = virtualStops[j];

        const distance = this.calculateDistance(stop1, stop2);
        const duration = this.estimateDuration(stop1, stop2);

        // Route stop1 → stop2
        routes.push(
          new VirtualRoute(
            `virtual-route-${this.generateStableId(stop1.id, stop2.id)}`,
            'VIRTUAL_TO_VIRTUAL',
            stop1.id,
            stop2.id,
            distance,
            duration,
            'SHUTTLE', // transportMode
            { 
              name: `${stop1.cityId || stop1.name} → ${stop2.cityId || stop2.name}`,
              generationMethod: 'direct',
            },
            new Date()
          )
        );

        // Route stop2 → stop1
        routes.push(
          new VirtualRoute(
            `virtual-route-${this.generateStableId(stop2.id, stop1.id)}`,
            'VIRTUAL_TO_VIRTUAL',
            stop2.id,
            stop1.id,
            distance,
            duration,
            'SHUTTLE', // transportMode
            { 
              name: `${stop2.cityId || stop2.name} → ${stop1.cityId || stop1.name}`,
              generationMethod: 'direct',
            },
            new Date()
          )
        );
      }
    }

    return routes;
  }

  /**
   * Generate virtual flights for virtual routes
   */
  private generateVirtualFlights(virtualRoutes: VirtualRoute[]): Flight[] {
    const flights: Flight[] = [];
    const daysToGenerate = 365; // 1 year ahead
    const flightsPerDay = 2; // Morning and evening

    for (const route of virtualRoutes) {
      for (let day = 0; day < daysToGenerate; day++) {
        for (let flightIndex = 0; flightIndex < flightsPerDay; flightIndex++) {
          const departureHour = 8 + flightIndex * 8; // 08:00 and 16:00
          const departureTime = new Date();
          departureTime.setDate(departureTime.getDate() + day);
          departureTime.setHours(departureHour, 0, 0, 0);

          const arrivalTime = new Date(departureTime.getTime() + (route.durationMinutes || 180) * 60 * 1000);

          // Format times as HH:MM
          const departureTimeStr = `${String(departureTime.getHours()).padStart(2, '0')}:${String(departureTime.getMinutes()).padStart(2, '0')}`;
          const arrivalTimeStr = `${String(arrivalTime.getHours()).padStart(2, '0')}:${String(arrivalTime.getMinutes()).padStart(2, '0')}`;

          // Extract price from metadata or use default
          const priceRub = (route.metadata?.baseFare as number) || 1000;

          flights.push(
            new Flight(
              `virtual-flight-${route.id}-${day}-${flightIndex}`,
              route.fromStopId,
              route.toStopId,
              departureTimeStr,
              arrivalTimeStr,
              [1, 2, 3, 4, 5, 6, 7], // daysOfWeek - all days
              route.id, // routeId
              priceRub,
              true, // isVirtual
              undefined, // transportType
              { createdBy: 'system', generationMethod: 'virtual-route-flight' }, // metadata
              new Date() // createdAt
            )
          );
        }
      }
    }

    return flights;
  }

  /**
   * Find hub stop (Yakutsk)
   */
  private async findHubStop(): Promise<{ id: string; name: string; latitude?: number; longitude?: number; cityName?: string } | null> {
    const normalizedHub = normalizeCityName(this.hubCityName);
    
    // Try real stops first
    const realStops = await this.stopRepository.getRealStopsByCity(normalizedHub);
    if (realStops.length > 0) {
      return realStops[0];
    }

    // Try virtual stops
    const virtualStops = await this.stopRepository.getVirtualStopsByCity(normalizedHub);
    if (virtualStops.length > 0) {
      return virtualStops[0];
    }

    return null;
  }

  /**
   * Calculate distance between two stops (Haversine formula)
   */
  private calculateDistance(
    stop1: { latitude?: number; longitude?: number },
    stop2: { latitude?: number; longitude?: number }
  ): number {
    if (!stop1.latitude || !stop1.longitude || !stop2.latitude || !stop2.longitude) {
      return 0;
    }

    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(stop2.latitude - stop1.latitude);
    const dLon = this.deg2rad(stop2.longitude - stop1.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(stop1.latitude)) *
        Math.cos(this.deg2rad(stop2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Estimate duration based on distance (assume 60 km/h average speed)
   */
  private estimateDuration(
    stop1: { latitude?: number; longitude?: number },
    stop2: { latitude?: number; longitude?: number }
  ): number {
    const distance = this.calculateDistance(stop1, stop2);
    const averageSpeed = 60; // km/h
    const duration = (distance / averageSpeed) * 60; // minutes
    return Math.max(60, Math.round(duration)); // Minimum 60 minutes
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Generate stable ID from city name or stop IDs
   * Ensures non-empty result to prevent invalid IDs like "virtual-stop----------------"
   * 
   * Handles Cyrillic characters correctly by using normalizeCityName first,
   * then converting to safe ASCII characters for ID generation.
   */
  private generateStableId(...parts: string[]): string {
    // Filter out empty parts and normalize
    const validParts = parts
      .filter(part => part && part.trim().length > 0)
      .map(part => part.trim());
    
    if (validParts.length === 0) {
      throw new Error('Cannot generate stable ID from empty parts');
    }
    
    // Normalize each part using city normalizer (handles Cyrillic correctly)
    const normalizedParts = validParts.map(part => {
      // First normalize using city normalizer (handles Cyrillic, ё->е, etc.)
      const cityNormalized = normalizeCityName(part);
      
      // Then convert to safe ID format: replace spaces and special chars with dashes
      // Keep only alphanumeric and dashes, but preserve Cyrillic characters
      let safeId = cityNormalized
        .replace(/\s+/g, '-')           // Spaces to dashes
        .replace(/[^\wа-яё-]/gi, '-')   // Non-word chars (except Cyrillic) to dashes
        .replace(/-+/g, '-')             // Multiple dashes to single
        .replace(/^-|-$/g, '');         // Trim leading/trailing dashes
      
      // If after normalization we still have content, use it
      // Otherwise, create a fallback from original part
      if (!safeId || safeId.length === 0) {
        // Fallback: use first letters/numbers from original part
        safeId = part
          .replace(/[^\wа-яё]/gi, '')    // Keep only word chars and Cyrillic
          .toLowerCase()
          .substring(0, 20);             // Limit length
      }
      
      return safeId;
    });
    
    // Filter out any parts that became empty after normalization
    const finalParts = normalizedParts.filter(p => p && p.length > 0);
    
    if (finalParts.length === 0) {
      // Last resort: use hash-like ID from original parts
      const fallbackId = validParts
        .join('-')
        .replace(/[^\wа-яё]/gi, '')
        .toLowerCase()
        .substring(0, 30);
      
      if (!fallbackId || fallbackId.length === 0) {
        throw new Error(`Cannot generate stable ID from parts: ${parts.join(', ')}`);
      }
      
      return fallbackId;
    }
    
    // Join parts and ensure final ID is valid
    const finalId = finalParts.join('-')
      .replace(/-+/g, '-')               // Multiple dashes to single
      .replace(/^-|-$/g, '')             // Trim leading/trailing dashes
      .toLowerCase();
    
    // Final validation: ensure ID is not empty and doesn't contain only dashes
    if (!finalId || finalId.length === 0 || /^-+$/.test(finalId)) {
      // Generate fallback ID using first characters from each part
      const fallbackId = validParts
        .map(p => p.substring(0, 5).replace(/[^\wа-яё]/gi, '').toLowerCase())
        .filter(p => p.length > 0)
        .join('-')
        .substring(0, 50);
      
      if (!fallbackId || fallbackId.length === 0) {
        throw new Error(`Generated empty ID from parts: ${parts.join(', ')}`);
      }
      
      return fallbackId;
    }
    
    return finalId;
  }

  /**
   * Ensure connectivity for all cities
   * 
   * For each pair of cities that have stops but no route,
   * creates a virtual route to ensure connectivity.
   * 
   * Logic:
   * - Federal city → Yakutia city: hub-based routes via Yakutsk (PLANE + BUS)
   * - Federal city → Federal city: direct virtual routes (PLANE)
   * - Yakutia city → Yakutia city: direct virtual routes (BUS)
   * 
   * @returns Array of virtual routes for connectivity
   */
  private async ensureCitiesConnectivity(): Promise<VirtualRoute[]> {
    const routes: VirtualRoute[] = [];
    const yakutiaCities = getAllYakutiaCitiesUnified();
    const federalCities = getAllFederalCities();

    if (yakutiaCities.length === 0 && federalCities.length === 0) {
      this.log('WARN', 'No cities found in unified reference - skipping connectivity check');
      return routes;
    }

    this.log('INFO', `Ensuring connectivity for ${yakutiaCities.length} Yakutia cities and ${federalCities.length} federal cities...`);

    // Get all stops (real + virtual) grouped by city
    const allRealStops = await this.stopRepository.getAllRealStops();
    const allVirtualStops = await this.stopRepository.getAllVirtualStops();
    const allStops = [...allRealStops, ...allVirtualStops];

    // Group stops by normalized city name
    const stopsByCity = new Map<string, Array<{ id: string; name: string; latitude?: number; longitude?: number; cityType: 'yakutia' | 'federal' }>>();
    
    // Create map of city names to types
    const cityTypeMap = new Map<string, 'yakutia' | 'federal'>();
    for (const city of yakutiaCities) {
      cityTypeMap.set(normalizeCityName(city.name), 'yakutia');
    }
    for (const city of federalCities) {
      cityTypeMap.set(normalizeCityName(city.name), 'federal');
    }
    
    for (const stop of allStops) {
      // Extract city name from stop
      let cityName = stop.cityId || extractCityFromStopName(stop.name);
      if (!cityName) continue;

      // Normalize city name for consistent comparison
      let normalizedCity = normalizeCityName(cityName);
      
      // If normalized city is not in unified reference, try to find it through airports/suburbs
      if (!isCityInUnifiedReference(normalizedCity)) {
        // Try to find city through airports reference
        const cityFromAirport = getCityByAirportName(cityName);
        if (cityFromAirport) {
          cityName = cityFromAirport;
          normalizedCity = normalizeCityName(cityName);
        }
        
        // Try to find city through suburbs reference
        if (!isCityInUnifiedReference(normalizedCity)) {
          const mainCity = getMainCityBySuburb(cityName);
          if (mainCity) {
            cityName = mainCity;
            normalizedCity = normalizeCityName(cityName);
          }
        }
      }
      
      // Only process cities in unified reference
      if (!isCityInUnifiedReference(normalizedCity)) continue;

      const cityType = cityTypeMap.get(normalizedCity);
      if (!cityType) continue;

      if (!stopsByCity.has(normalizedCity)) {
        stopsByCity.set(normalizedCity, []);
      }
      stopsByCity.get(normalizedCity)!.push({
        id: stop.id,
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        cityType,
      });
    }

    this.log('INFO', `Found stops for ${stopsByCity.size} cities`);

    // Find hub stop (Yakutsk)
    const hubCityNormalized = normalizeCityName(this.hubCityName);
    const hubStops = stopsByCity.get(hubCityNormalized);
    const hubStop = hubStops ? this.selectMainStop(hubStops) : null;

    // For each pair of cities, check if route exists
    const cityNames = Array.from(stopsByCity.keys());
    let routesCreated = 0;
    let routesSkipped = 0;

    for (let i = 0; i < cityNames.length; i++) {
      for (let j = i + 1; j < cityNames.length; j++) {
        const city1Name = cityNames[i];
        const city2Name = cityNames[j];

        const city1Stops = stopsByCity.get(city1Name)!;
        const city2Stops = stopsByCity.get(city2Name)!;

        // Get "main" stop for each city (prefer airport, then first stop)
        const city1MainStop = this.selectMainStop(city1Stops);
        const city2MainStop = this.selectMainStop(city2Stops);

        if (!city1MainStop || !city2MainStop) continue;

        const city1Type = city1Stops[0]?.cityType || 'yakutia';
        const city2Type = city2Stops[0]?.cityType || 'yakutia';

        // Check if route already exists (real or virtual)
        const existingRoute = await this.checkRouteExists(
          city1MainStop.id,
          city2MainStop.id
        );

        if (existingRoute) {
          routesSkipped++;
          continue; // Route already exists, skip
        }

        // Logic for different city pair types
        if (city1Type === 'federal' && city2Type === 'yakutia') {
          // Federal city → Yakutia city: hub-based via Yakutsk
          if (hubStop && city2Name === hubCityNormalized) {
            // Direct: federal city → Yakutsk (PLANE)
            const distance = this.calculateDistance(city1MainStop, hubStop);
            routes.push(
              new VirtualRoute(
                `virtual-route-connectivity-${this.generateStableId(city1Name, city2Name)}`,
                'VIRTUAL_TO_VIRTUAL',
                city1MainStop.id,
                hubStop.id,
                distance,
                240, // 4 hours for plane
                'SHUTTLE', // transportMode (PLANE info in metadata)
                {
                  name: `${city1Name} → ${city2Name}`,
                  generationMethod: 'federal-to-yakutia-hub',
                  sourceCity: city1Name,
                  targetCity: city2Name,
                  transportType: TransportType.AIRPLANE, // Actual transport type in metadata
                },
                new Date()
              )
            );
            routes.push(
              new VirtualRoute(
                `virtual-route-connectivity-${this.generateStableId(city2Name, city1Name)}`,
                'VIRTUAL_TO_VIRTUAL',
                hubStop.id,
                city1MainStop.id,
                distance,
                240,
                'SHUTTLE', // transportMode (PLANE info in metadata)
                {
                  name: `${city2Name} → ${city1Name}`,
                  generationMethod: 'federal-to-yakutia-hub',
                  sourceCity: city2Name,
                  targetCity: city1Name,
                  transportType: TransportType.AIRPLANE, // Actual transport type in metadata
                },
                new Date()
              )
            );
            routesCreated += 2;
          } else if (hubStop) {
            // Two-step: federal city → Yakutsk (PLANE) + Yakutsk → Yakutia city (BUS)
            const distance1 = this.calculateDistance(city1MainStop, hubStop);
            const distance2 = this.calculateDistance(hubStop, city2MainStop);
            
            // Route 1: federal city → Yakutsk
            routes.push(
              new VirtualRoute(
                `virtual-route-connectivity-${this.generateStableId(city1Name, hubCityNormalized)}`,
                'VIRTUAL_TO_VIRTUAL',
                city1MainStop.id,
                hubStop.id,
                distance1,
                240, // 4 hours for plane
                'SHUTTLE', // transportMode (PLANE info in metadata)
                {
                  name: `${city1Name} → ${this.hubCityName}`,
                  generationMethod: 'federal-to-yakutia-hub',
                  sourceCity: city1Name,
                  targetCity: this.hubCityName,
                  transportType: TransportType.AIRPLANE, // Actual transport type in metadata
                },
                new Date()
              )
            );
            
            // Route 2: Yakutsk → Yakutia city
            routes.push(
              new VirtualRoute(
                `virtual-route-connectivity-${this.generateStableId(hubCityNormalized, city2Name)}`,
                'VIRTUAL_TO_VIRTUAL',
                hubStop.id,
                city2MainStop.id,
                distance2,
                180, // 3 hours for bus
                'SHUTTLE', // transportMode (BUS info in metadata)
                {
                  name: `${this.hubCityName} → ${city2Name}`,
                  generationMethod: 'federal-to-yakutia-hub',
                  sourceCity: this.hubCityName,
                  targetCity: city2Name,
                  transportType: TransportType.BUS, // Actual transport type in metadata
                },
                new Date()
              )
            );
            
            // Reverse routes
            routes.push(
              new VirtualRoute(
                `virtual-route-connectivity-${this.generateStableId(hubCityNormalized, city1Name)}`,
                'VIRTUAL_TO_VIRTUAL',
                hubStop.id,
                city1MainStop.id,
                distance1,
                240,
                'SHUTTLE', // transportMode (PLANE info in metadata)
                {
                  name: `${this.hubCityName} → ${city1Name}`,
                  generationMethod: 'federal-to-yakutia-hub',
                  sourceCity: this.hubCityName,
                  targetCity: city1Name,
                  transportType: TransportType.AIRPLANE, // Actual transport type in metadata
                },
                new Date()
              )
            );
            
            routes.push(
              new VirtualRoute(
                `virtual-route-connectivity-${this.generateStableId(city2Name, hubCityNormalized)}`,
                'VIRTUAL_TO_VIRTUAL',
                city2MainStop.id,
                hubStop.id,
                distance2,
                180,
                'SHUTTLE', // transportMode (BUS info in metadata)
                {
                  name: `${city2Name} → ${this.hubCityName}`,
                  generationMethod: 'federal-to-yakutia-hub',
                  sourceCity: city2Name,
                  targetCity: this.hubCityName,
                  transportType: TransportType.BUS, // Actual transport type in metadata
                },
                new Date()
              )
            );
            
            routesCreated += 4;
          }
        } else if (city1Type === 'federal' && city2Type === 'federal') {
          // Federal city → Federal city: direct virtual route (PLANE)
          const distance = this.calculateDistance(city1MainStop, city2MainStop);
          routes.push(
            new VirtualRoute(
              `virtual-route-connectivity-${this.generateStableId(city1Name, city2Name)}`,
              'VIRTUAL_TO_VIRTUAL',
              city1MainStop.id,
              city2MainStop.id,
              distance,
              180, // 3 hours for plane
              'SHUTTLE', // transportMode (PLANE info in metadata)
              {
                name: `${city1Name} → ${city2Name}`,
                generationMethod: 'federal-to-federal',
                sourceCity: city1Name,
                targetCity: city2Name,
                transportType: TransportType.AIRPLANE, // Actual transport type in metadata
              },
              new Date()
            )
          );
          routes.push(
            new VirtualRoute(
              `virtual-route-connectivity-${this.generateStableId(city2Name, city1Name)}`,
              'VIRTUAL_TO_VIRTUAL',
              city2MainStop.id,
              city1MainStop.id,
              distance,
              180,
              'SHUTTLE', // transportMode (PLANE info in metadata)
              {
                name: `${city2Name} → ${city1Name}`,
                generationMethod: 'federal-to-federal',
                sourceCity: city2Name,
                targetCity: city1Name,
                transportType: TransportType.AIRPLANE, // Actual transport type in metadata
              },
              new Date()
            )
          );
          routesCreated += 2;
        } else {
          // Yakutia city → Yakutia city: direct virtual route (BUS) - existing logic
          const distance = this.calculateDistance(city1MainStop, city2MainStop);
          const duration = this.estimateDuration(city1MainStop, city2MainStop);
          
          routes.push(
            new VirtualRoute(
              `virtual-route-connectivity-${this.generateStableId(city1Name, city2Name)}`,
              'VIRTUAL_TO_VIRTUAL',
              city1MainStop.id,
              city2MainStop.id,
              distance,
              duration,
              'SHUTTLE', // transportMode (BUS info in metadata)
              {
                name: `${city1Name} → ${city2Name}`,
                generationMethod: 'yakutia-connectivity',
                sourceCity: city1Name,
                targetCity: city2Name,
                transportType: TransportType.BUS, // Actual transport type in metadata
              },
              new Date()
            )
          );
          routes.push(
            new VirtualRoute(
              `virtual-route-connectivity-${this.generateStableId(city2Name, city1Name)}`,
              'VIRTUAL_TO_VIRTUAL',
              city2MainStop.id,
              city1MainStop.id,
              distance,
              duration,
              'SHUTTLE', // transportMode (BUS info in metadata)
              {
                name: `${city2Name} → ${city1Name}`,
                generationMethod: 'yakutia-connectivity',
                sourceCity: city2Name,
                targetCity: city1Name,
                transportType: TransportType.BUS, // Actual transport type in metadata
              },
              new Date()
            )
          );
          routesCreated += 2;
        }
      }
    }

    this.log(
      'INFO',
      `Connectivity check: ${routesCreated} routes created, ${routesSkipped} routes already exist`
    );

    return routes;
  }

  /**
   * Check if route exists between two stops (real or virtual)
   * 
   * @param fromStopId - Source stop ID
   * @param toStopId - Target stop ID
   * @returns True if route exists
   */
  private async checkRouteExists(
    fromStopId: string,
    toStopId: string
  ): Promise<boolean> {
    // Check real routes
    const realRoutes = await this.routeRepository.findDirectRoutes(fromStopId, toStopId);
    if (realRoutes.length > 0) return true;

    // Check virtual routes
    const virtualRoutes = await this.routeRepository.findVirtualConnections(fromStopId, toStopId);
    if (virtualRoutes.length > 0) return true;

    return false;
  }

  /**
   * Select "main" stop for a city
   * 
   * Priority: airport > railway station > first stop
   * 
   * @param stops - Array of stops for the city
   * @returns Main stop or undefined
   */
  private selectMainStop(
    stops: Array<{ id: string; name: string; latitude?: number; longitude?: number; cityType?: 'yakutia' | 'federal' }>
  ): { id: string; name: string; latitude?: number; longitude?: number; cityType?: 'yakutia' | 'federal' } | undefined {
    if (stops.length === 0) return undefined;

    // Prefer airport
    const airport = stops.find(s =>
      s.name.toLowerCase().includes('аэропорт') ||
      s.name.toLowerCase().includes('airport')
    );
    if (airport) return airport;

    // Then railway station
    const railway = stops.find(s =>
      s.name.toLowerCase().includes('вокзал') ||
      s.name.toLowerCase().includes('railway') ||
      s.name.toLowerCase().includes('station')
    );
    if (railway) return railway;

    // Otherwise, first stop
    return stops[0];
  }

  /**
   * Extract city name from stop name
   * 
   * @param stopName - Stop name
   * @returns City name or empty string
   */
  private extractCityFromStopName(stopName: string): string {
    // Try to extract city from common patterns
    const patterns = [
      /(?:г\.\s*)?([А-Яа-яЁё]+)/, // "г. Город" or "Город"
      /([А-Яа-яЁё]+)(?:\s+\([^)]+\))?$/, // "Город (доп. инф)"
    ];

    for (const pattern of patterns) {
      const match = stopName.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return '';
  }
}

