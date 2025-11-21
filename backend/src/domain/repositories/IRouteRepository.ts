import type { Route, VirtualRoute } from '../entities';

/**
 * Repository interface for Route entities (Real and Virtual)
 * 
 * Defines contract for data access operations on routes.
 * Implementation must handle PostgreSQL storage.
 * 
 * @interface
 */
export interface IRouteRepository {
  /**
   * Finds a real route by ID
   * 
   * @param id - Route identifier
   * @returns Real route if found, undefined otherwise
   */
  findRouteById(id: string): Promise<Route | undefined>;

  /**
   * Finds a virtual route by ID
   * 
   * @param id - Virtual route identifier
   * @returns Virtual route if found, undefined otherwise
   */
  findVirtualRouteById(id: string): Promise<VirtualRoute | undefined>;

  /**
   * Gets all real routes
   * 
   * @returns Array of all real routes
   */
  getAllRoutes(): Promise<Route[]>;

  /**
   * Gets all virtual routes
   * 
   * @returns Array of all virtual routes
   */
  getAllVirtualRoutes(): Promise<VirtualRoute[]>;

  /**
   * Gets routes by transport type
   * 
   * @param transportType - Transport type filter
   * @returns Array of filtered routes
   */
  getRoutesByTransportType(transportType: string): Promise<Route[]>;

  /**
   * Gets routes from a specific stop
   * 
   * @param stopId - Stop identifier
   * @returns Array of routes starting from this stop
   */
  getRoutesFromStop(stopId: string): Promise<Route[]>;

  /**
   * Gets routes to a specific stop
   * 
   * @param stopId - Stop identifier
   * @returns Array of routes ending at this stop
   */
  getRoutesToStop(stopId: string): Promise<Route[]>;

  /**
   * Gets virtual routes by type
   * 
   * @param routeType - Virtual route type
   * @returns Array of filtered virtual routes
   */
  getVirtualRoutesByType(routeType: string): Promise<VirtualRoute[]>;

  /**
   * Gets virtual routes from a specific stop
   * 
   * @param stopId - Stop identifier (real or virtual)
   * @returns Array of virtual routes starting from this stop
   */
  getVirtualRoutesFromStop(stopId: string): Promise<VirtualRoute[]>;

  /**
   * Gets virtual routes to a specific stop
   * 
   * @param stopId - Stop identifier (real or virtual)
   * @returns Array of virtual routes ending at this stop
   */
  getVirtualRoutesToStop(stopId: string): Promise<VirtualRoute[]>;

  /**
   * Saves a real route (insert or update)
   * 
   * @param route - Real route to save
   * @returns Saved real route
   */
  saveRoute(route: Route): Promise<Route>;

  /**
   * Saves a virtual route (insert or update)
   * 
   * @param route - Virtual route to save
   * @returns Saved virtual route
   */
  saveVirtualRoute(route: VirtualRoute): Promise<VirtualRoute>;

  /**
   * Saves multiple real routes in batch
   * 
   * @param routes - Array of real routes to save
   * @returns Array of saved real routes
   */
  saveRoutesBatch(routes: Route[]): Promise<Route[]>;

  /**
   * Saves multiple virtual routes in batch
   * 
   * @param routes - Array of virtual routes to save
   * @returns Array of saved virtual routes
   */
  saveVirtualRoutesBatch(routes: VirtualRoute[]): Promise<VirtualRoute[]>;

  /**
   * Deletes a real route by ID
   * 
   * @param id - Route identifier
   * @returns True if deleted, false otherwise
   */
  deleteRoute(id: string): Promise<boolean>;

  /**
   * Deletes all virtual routes (used for regeneration)
   * 
   * @returns Number of deleted routes
   */
  deleteAllVirtualRoutes(): Promise<number>;

  /**
   * Counts total real routes
   * 
   * @returns Total count of real routes
   */
  countRoutes(): Promise<number>;

  /**
   * Counts total virtual routes
   * 
   * @returns Total count of virtual routes
   */
  countVirtualRoutes(): Promise<number>;

  /**
   * Finds direct routes between two stops
   * 
   * @param fromStopId - Origin stop ID
   * @param toStopId - Destination stop ID
   * @returns Array of direct routes
   */
  findDirectRoutes(fromStopId: string, toStopId: string): Promise<Route[]>;

  /**
   * Finds virtual connections between two stops
   * 
   * @param fromStopId - Origin stop ID (real or virtual)
   * @param toStopId - Destination stop ID (real or virtual)
   * @returns Array of virtual routes
   */
  findVirtualConnections(fromStopId: string, toStopId: string): Promise<VirtualRoute[]>;
}




