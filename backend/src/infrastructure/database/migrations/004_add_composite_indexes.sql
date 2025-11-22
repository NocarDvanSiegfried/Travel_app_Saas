-- Migration 004: Composite Indexes for Frequent Queries
-- Purpose: Add composite indexes to optimize frequent query patterns
-- This migration improves query performance for common access patterns

-- ============================================================================
-- SECTION 1: Routes Table Composite Indexes
-- ============================================================================

/**
 * Composite index for finding routes by from_stop_id and to_stop_id
 * Used in: findDirectRoutes(fromStopId, toStopId) ORDER BY duration_minutes
 */
CREATE INDEX IF NOT EXISTS idx_routes_from_to_duration 
ON routes(from_stop_id, to_stop_id, duration_minutes);

/**
 * Composite index for finding routes by transport_type and route_number
 * Used in: getRoutesByTransportType(transportType) ORDER BY route_number
 */
CREATE INDEX IF NOT EXISTS idx_routes_transport_route_number 
ON routes(transport_type, route_number);

/**
 * Composite index for finding routes by from_stop_id and route_number
 * Used in: getRoutesFromStop(stopId) ORDER BY route_number
 */
CREATE INDEX IF NOT EXISTS idx_routes_from_route_number 
ON routes(from_stop_id, route_number);

/**
 * Composite index for finding routes by to_stop_id and route_number
 * Used in: getRoutesToStop(stopId) ORDER BY route_number
 */
CREATE INDEX IF NOT EXISTS idx_routes_to_route_number 
ON routes(to_stop_id, route_number);

-- ============================================================================
-- SECTION 2: Virtual Routes Table Composite Indexes
-- ============================================================================

/**
 * Composite index for finding virtual routes by from_stop_id and to_stop_id
 * Used in: findDirectVirtualRoutes(fromStopId, toStopId) ORDER BY duration_minutes
 */
CREATE INDEX IF NOT EXISTS idx_virtual_routes_from_to_duration 
ON virtual_routes(from_stop_id, to_stop_id, duration_minutes);

/**
 * Composite index for finding virtual routes by route_type and from_stop_id
 * Used in: getVirtualRoutesByType(routeType) ORDER BY from_stop_id
 */
CREATE INDEX IF NOT EXISTS idx_virtual_routes_type_from 
ON virtual_routes(route_type, from_stop_id);

/**
 * Composite index for finding virtual routes by from_stop_id and distance
 * Used in: getVirtualRoutesFromStop(stopId) ORDER BY distance_km
 */
CREATE INDEX IF NOT EXISTS idx_virtual_routes_from_distance 
ON virtual_routes(from_stop_id, distance_km);

/**
 * Composite index for finding virtual routes by to_stop_id and distance
 * Used in: getVirtualRoutesToStop(stopId) ORDER BY distance_km
 */
CREATE INDEX IF NOT EXISTS idx_virtual_routes_to_distance 
ON virtual_routes(to_stop_id, distance_km);

-- ============================================================================
-- SECTION 3: Flights Table Composite Indexes
-- ============================================================================

/**
 * Composite index for finding flights by from_stop_id, to_stop_id, and departure_time
 * Used in: getFlightsBetweenStops(fromStopId, toStopId, date) ORDER BY departure_time
 * Note: days_of_week uses GIN index which is already created
 */
CREATE INDEX IF NOT EXISTS idx_flights_from_to_departure 
ON flights(from_stop_id, to_stop_id, departure_time);

/**
 * Composite index for finding flights by from_stop_id and departure_time
 * Used in: getFlightsFromStop(stopId, dayOfWeek) ORDER BY departure_time
 */
CREATE INDEX IF NOT EXISTS idx_flights_from_departure 
ON flights(from_stop_id, departure_time);

/**
 * Composite index for finding flights by to_stop_id and arrival_time
 * Used in: getFlightsToStop(stopId, dayOfWeek) ORDER BY arrival_time
 */
CREATE INDEX IF NOT EXISTS idx_flights_to_arrival 
ON flights(to_stop_id, arrival_time);

/**
 * Composite index for finding flights by transport_type and departure_time
 * Used in: getFlightsByTransportType(transportType) ORDER BY departure_time
 */
CREATE INDEX IF NOT EXISTS idx_flights_transport_departure 
ON flights(transport_type, departure_time);

-- ============================================================================
-- SECTION 4: Stops Table Composite Indexes
-- ============================================================================

/**
 * Composite index for finding stops by city_id and name
 * Used in: getRealStopsByCity(cityId) ORDER BY name
 */
CREATE INDEX IF NOT EXISTS idx_stops_city_name 
ON stops(city_id, name);

/**
 * Composite index for finding stops by city_id, is_airport, and is_railway_station
 * Used in: getRealStopsByType(isAirport, isRailwayStation) with city filtering
 */
CREATE INDEX IF NOT EXISTS idx_stops_city_type 
ON stops(city_id, is_airport, is_railway_station);

-- ============================================================================
-- SECTION 5: Virtual Stops Table Composite Indexes
-- ============================================================================

/**
 * Composite index for finding virtual stops by city_id and name
 * Used in: getVirtualStopsByCity(cityId) ORDER BY name
 */
CREATE INDEX IF NOT EXISTS idx_virtual_stops_city_name 
ON virtual_stops(city_id, name);

/**
 * Composite index for finding virtual stops by city_id and grid_type
 * Used in: filtering virtual stops by city and grid type
 */
CREATE INDEX IF NOT EXISTS idx_virtual_stops_city_grid_type 
ON virtual_stops(city_id, grid_type);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_routes_from_to_duration IS 'Optimizes direct route search by from/to stops with duration sorting';
COMMENT ON INDEX idx_routes_transport_route_number IS 'Optimizes route search by transport type with route number sorting';
COMMENT ON INDEX idx_virtual_routes_from_to_duration IS 'Optimizes virtual route search by from/to stops with duration sorting';
COMMENT ON INDEX idx_flights_from_to_departure IS 'Optimizes flight search between stops with departure time sorting';
COMMENT ON INDEX idx_stops_city_name IS 'Optimizes stop search by city with name sorting';

