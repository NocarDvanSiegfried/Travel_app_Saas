import type { RealStop, VirtualStop } from '../entities';

/**
 * Repository interface for Stop entities (Real and Virtual)
 * 
 * Defines contract for data access operations on stops.
 * Implementation must handle PostgreSQL storage.
 * 
 * @interface
 */
export interface IStopRepository {
  /**
   * Finds a real stop by ID
   * 
   * @param id - Stop identifier
   * @returns Real stop if found, undefined otherwise
   */
  findRealStopById(id: string): Promise<RealStop | undefined>;

  /**
   * Finds a virtual stop by ID
   * 
   * @param id - Stop identifier
   * @returns Virtual stop if found, undefined otherwise
   */
  findVirtualStopById(id: string): Promise<VirtualStop | undefined>;

  /**
   * Gets all real stops
   * 
   * @returns Array of all real stops
   */
  getAllRealStops(): Promise<RealStop[]>;

  /**
   * Gets all virtual stops
   * 
   * @returns Array of all virtual stops
   */
  getAllVirtualStops(): Promise<VirtualStop[]>;

  /**
   * Gets real stops by city
   * 
   * @param cityId - City identifier
   * @returns Array of real stops in the city
   */
  getRealStopsByCity(cityId: string): Promise<RealStop[]>;

  /**
   * Gets real stops by city name using full-text search at database level
   * 
   * @param cityName - City name to search for
   * @returns Array of real stops matching the city name
   */
  getRealStopsByCityName(cityName: string): Promise<RealStop[]>;

  /**
   * Gets virtual stops by city
   * 
   * @param cityId - City identifier
   * @returns Array of virtual stops in the city
   */
  getVirtualStopsByCity(cityId: string): Promise<VirtualStop[]>;

  /**
   * Gets virtual stops by city name using full-text search at database level
   * 
   * @param cityName - City name to search for
   * @returns Array of virtual stops matching the city name
   */
  getVirtualStopsByCityName(cityName: string): Promise<VirtualStop[]>;

  /**
   * Gets real stops by type (airport, railway station, etc.)
   * 
   * @param isAirport - Filter by airport
   * @param isRailwayStation - Filter by railway station
   * @returns Array of filtered real stops
   */
  getRealStopsByType(isAirport?: boolean, isRailwayStation?: boolean): Promise<RealStop[]>;

  /**
   * Saves a real stop (insert or update)
   * 
   * @param stop - Real stop to save
   * @returns Saved real stop
   */
  saveRealStop(stop: RealStop): Promise<RealStop>;

  /**
   * Saves a virtual stop (insert or update)
   * 
   * @param stop - Virtual stop to save
   * @returns Saved virtual stop
   */
  saveVirtualStop(stop: VirtualStop): Promise<VirtualStop>;

  /**
   * Saves multiple real stops in batch
   * 
   * @param stops - Array of real stops to save
   * @returns Array of saved real stops
   */
  saveRealStopsBatch(stops: RealStop[]): Promise<RealStop[]>;

  /**
   * Saves multiple virtual stops in batch
   * 
   * @param stops - Array of virtual stops to save
   * @returns Array of saved virtual stops
   */
  saveVirtualStopsBatch(stops: VirtualStop[]): Promise<VirtualStop[]>;

  /**
   * Deletes a real stop by ID
   * 
   * @param id - Stop identifier
   * @returns True if deleted, false otherwise
   */
  deleteRealStop(id: string): Promise<boolean>;

  /**
   * Deletes all virtual stops (used for regeneration)
   * 
   * @returns Number of deleted stops
   */
  deleteAllVirtualStops(): Promise<number>;

  /**
   * Counts total real stops
   * 
   * @returns Total count of real stops
   */
  countRealStops(): Promise<number>;

  /**
   * Counts total virtual stops
   * 
   * @returns Total count of virtual stops
   */
  countVirtualStops(): Promise<number>;

  /**
   * Finds real stops within radius of a point
   * 
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radiusKm - Radius in kilometers
   * @returns Array of real stops within radius
   */
  findRealStopsNearby(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<RealStop[]>;

  /**
   * Finds virtual stops within radius of a point
   * 
   * @param latitude - Center latitude
   * @param longitude - Center longitude
   * @param radiusKm - Radius in kilometers
   * @returns Array of virtual stops within radius
   */
  findVirtualStopsNearby(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<VirtualStop[]>;
}




