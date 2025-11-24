-- Migration 006: Extend ID fields to VARCHAR(100)
-- Purpose: Allow longer identifiers for routes, flights, and virtual_routes
-- This migration extends VARCHAR(50) to VARCHAR(100) for fields that exceed the limit

-- ============================================================================
-- SECTION 1: Extend routes.id to VARCHAR(100)
-- ============================================================================

/**
 * Extend routes.id from VARCHAR(50) to VARCHAR(100)
 * Required for: air-route-{city1}-{city2}-{direction} (up to 48 chars)
 *               virtual-route-connectivity-{city1}-{city2} (up to 50 chars)
 */
ALTER TABLE routes
ALTER COLUMN id TYPE VARCHAR(100);

COMMENT ON COLUMN routes.id IS 'Route identifier - extended to VARCHAR(100) in migration 006 to support longer route IDs';

-- ============================================================================
-- SECTION 2: Extend flights.id to VARCHAR(100)
-- ============================================================================

/**
 * Extend flights.id from VARCHAR(50) to VARCHAR(100)
 * Required for: flight-{routeId}-{day}-{time} (up to 65 chars)
 *               virtual-flight-{routeId}-{day}-{index} (up to 65 chars)
 */
ALTER TABLE flights
ALTER COLUMN id TYPE VARCHAR(100);

COMMENT ON COLUMN flights.id IS 'Flight identifier - extended to VARCHAR(100) in migration 006 to support longer flight IDs';

-- ============================================================================
-- SECTION 3: Extend flights.route_id to VARCHAR(100)
-- ============================================================================

/**
 * Extend flights.route_id from VARCHAR(50) to VARCHAR(100)
 * Required because flights.route_id references routes.id (now VARCHAR(100))
 * Ensures referential integrity and allows longer route IDs in flight records
 */
ALTER TABLE flights
ALTER COLUMN route_id TYPE VARCHAR(100);

COMMENT ON COLUMN flights.route_id IS 'Reference to routes.id - extended to VARCHAR(100) in migration 006 to match routes.id';

-- ============================================================================
-- SECTION 4: Extend virtual_routes.id to VARCHAR(100)
-- ============================================================================

/**
 * Extend virtual_routes.id from VARCHAR(50) to VARCHAR(100)
 * Required for: virtual-route-{fromStopId}-{toStopId} (up to 58 chars)
 *               virtual-route-connectivity-{city1}-{city2} (up to 50 chars)
 */
ALTER TABLE virtual_routes
ALTER COLUMN id TYPE VARCHAR(100);

COMMENT ON COLUMN virtual_routes.id IS 'Virtual route identifier - extended to VARCHAR(100) in migration 006 to support longer virtual route IDs';

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Extended ID fields to VARCHAR(100) - Migration 006';




