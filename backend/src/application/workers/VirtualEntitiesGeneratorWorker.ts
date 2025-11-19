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

/**
 * City coordinates from directory
 */
type CityCoordinates = {
  [cityName: string]: {
    latitude: number;
    longitude: number;
  };
};

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
    private readonly datasetRepository: IDatasetRepository,
    private readonly citiesDirectory: CityCoordinates
  ) {
    super('virtual-entities-generator', 'Virtual Entities Generator Worker', '1.0.0');
  }

  /**
   * Check if worker can run
   * 
   * Only run if new dataset version exists without virtual entities.
   */
  public async canRun(): Promise<boolean> {
    const isRunning = await super.canRun();
    if (!isRunning) {
      return false;
    }

    // Check if latest dataset has virtual entities
    const latestDataset = await this.datasetRepository.getLatestDataset();
    if (!latestDataset) {
      this.log('INFO', 'No dataset found - cannot run');
      return false;
    }

    // Check if virtual stops already exist for this dataset
    const virtualStopsCount = await this.stopRepository.countVirtualStops();
    if (virtualStopsCount > 0) {
      this.log('INFO', `Virtual entities already exist (${virtualStopsCount} stops) - skipping`);
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
      
      const realStops = await this.stopRepository.getAllRealStops();
      const citiesWithStops = new Set(
        realStops
          .filter(stop => stop.cityId)
          .map(stop => this.normalizeCity(stop.cityId!))
      );

      const missingCities = Object.keys(this.citiesDirectory).filter(
        cityName => !citiesWithStops.has(this.normalizeCity(cityName))
      );

      this.log('INFO', `Found ${missingCities.length} cities without real stops: ${missingCities.slice(0, 5).join(', ')}${missingCities.length > 5 ? '...' : ''}`);

      // ====================================================================
      // Step 3: Generate Virtual Stops
      // ====================================================================
      this.log('INFO', 'Step 3: Generating virtual stops...');
      
      const virtualStops = this.generateVirtualStops(missingCities);
      
      if (virtualStops.length > 0) {
        const savedStops = await this.stopRepository.saveVirtualStopsBatch(virtualStops);
        this.log('INFO', `Generated ${savedStops.length} virtual stops`);
      }

      // ====================================================================
      // Step 4: Generate Virtual Routes
      // ====================================================================
      this.log('INFO', 'Step 4: Generating virtual routes...');
      
      const virtualRoutes = await this.generateVirtualRoutes(virtualStops);
      
      if (virtualRoutes.length > 0) {
        const savedRoutes = await this.routeRepository.saveVirtualRoutesBatch(virtualRoutes);
        this.log('INFO', `Generated ${savedRoutes.length} virtual routes`);
      }

      // ====================================================================
      // Step 5: Generate Virtual Flights
      // ====================================================================
      this.log('INFO', 'Step 5: Generating virtual flights...');
      
      const virtualFlights = this.generateVirtualFlights(virtualRoutes);
      
      if (virtualFlights.length > 0) {
        const savedFlights = await this.flightRepository.saveFlightsBatch(virtualFlights);
        this.log('INFO', `Generated ${savedFlights.length} virtual flights`);
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
      return {
        success: true,
        workerId: this.workerId,
        executionTimeMs: Date.now() - startTime,
        message: `Virtual entities generated: ${virtualStops.length} stops, ${virtualRoutes.length} routes, ${virtualFlights.length} flights`,
        dataProcessed: {
          added: virtualStops.length + virtualRoutes.length + virtualFlights.length,
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
    return cityNames.map(cityName => {
      const coordinates = this.citiesDirectory[cityName];
      
      return new VirtualStop(
        `virtual-stop-${this.generateStableId(cityName)}`,
        `г. ${cityName}`,
        coordinates.latitude,
        coordinates.longitude,
        'MAIN_GRID', // gridType
        cityName, // cityId
        undefined, // gridPosition
        [], // realStopsNearby
        new Date() // createdAt
      );
    });
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
    const normalizedHub = this.normalizeCity(this.hubCityName);
    
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
   * Normalize city name
   */
  private normalizeCity(cityName: string): string {
    return cityName.toLowerCase().trim().replace(/[^а-яa-z0-9]/g, '');
  }

  /**
   * Generate stable ID from city name or stop IDs
   */
  private generateStableId(...parts: string[]): string {
    const input = parts.join('-');
    return input.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }
}

