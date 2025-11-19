import type { Flight } from '../entities';

/**
 * Repository interface for Flight entities
 * 
 * Defines contract for data access operations on flights (real and virtual).
 * Implementation must handle PostgreSQL storage.
 * 
 * @interface
 */
export interface IFlightRepository {
  /**
   * Finds a flight by ID
   * 
   * @param id - Flight identifier
   * @returns Flight if found, undefined otherwise
   */
  findById(id: string): Promise<Flight | undefined>;

  /**
   * Gets all flights
   * 
   * @param includeVirtual - Whether to include virtual flights
   * @returns Array of all flights
   */
  getAllFlights(includeVirtual?: boolean): Promise<Flight[]>;

  /**
   * Gets flights by route ID
   * 
   * @param routeId - Route identifier
   * @returns Array of flights for this route
   */
  getFlightsByRoute(routeId: string): Promise<Flight[]>;

  /**
   * Gets flights from a specific stop
   * 
   * @param stopId - Stop identifier
   * @param date - Optional date to filter by day of week
   * @returns Array of flights departing from this stop
   */
  getFlightsFromStop(stopId: string, date?: Date): Promise<Flight[]>;

  /**
   * Gets flights to a specific stop
   * 
   * @param stopId - Stop identifier
   * @param date - Optional date to filter by day of week
   * @returns Array of flights arriving at this stop
   */
  getFlightsToStop(stopId: string, date?: Date): Promise<Flight[]>;

  /**
   * Gets flights between two stops
   * 
   * @param fromStopId - Origin stop ID
   * @param toStopId - Destination stop ID
   * @param date - Optional date to filter by day of week
   * @returns Array of flights between these stops
   */
  getFlightsBetweenStops(
    fromStopId: string,
    toStopId: string,
    date?: Date
  ): Promise<Flight[]>;

  /**
   * Gets flights by transport type
   * 
   * @param transportType - Transport type filter
   * @returns Array of filtered flights
   */
  getFlightsByTransportType(transportType: string): Promise<Flight[]>;

  /**
   * Gets flights operating on a specific day of week
   * 
   * @param dayOfWeek - Day of week (1-7, Monday-Sunday)
   * @returns Array of flights operating on this day
   */
  getFlightsByDayOfWeek(dayOfWeek: number): Promise<Flight[]>;

  /**
   * Gets flights operating on a specific date
   * 
   * @param date - Date to check
   * @returns Array of flights operating on this date
   */
  getFlightsByDate(date: Date): Promise<Flight[]>;

  /**
   * Gets virtual flights only
   * 
   * @returns Array of virtual flights
   */
  getVirtualFlights(): Promise<Flight[]>;

  /**
   * Gets real flights only
   * 
   * @returns Array of real flights
   */
  getRealFlights(): Promise<Flight[]>;

  /**
   * Saves a flight (insert or update)
   * 
   * @param flight - Flight to save
   * @returns Saved flight
   */
  saveFlight(flight: Flight): Promise<Flight>;

  /**
   * Saves multiple flights in batch
   * 
   * @param flights - Array of flights to save
   * @returns Array of saved flights
   */
  saveFlightsBatch(flights: Flight[]): Promise<Flight[]>;

  /**
   * Deletes a flight by ID
   * 
   * @param id - Flight identifier
   * @returns True if deleted, false otherwise
   */
  deleteFlight(id: string): Promise<boolean>;

  /**
   * Deletes all virtual flights (used for regeneration)
   * 
   * @returns Number of deleted flights
   */
  deleteAllVirtualFlights(): Promise<number>;

  /**
   * Deletes flights by route ID
   * 
   * @param routeId - Route identifier
   * @returns Number of deleted flights
   */
  deleteFlightsByRoute(routeId: string): Promise<number>;

  /**
   * Counts total flights
   * 
   * @param includeVirtual - Whether to include virtual flights
   * @returns Total count of flights
   */
  countFlights(includeVirtual?: boolean): Promise<number>;

  /**
   * Counts virtual flights
   * 
   * @returns Total count of virtual flights
   */
  countVirtualFlights(): Promise<number>;

  /**
   * Counts real flights
   * 
   * @returns Total count of real flights
   */
  countRealFlights(): Promise<number>;
}

