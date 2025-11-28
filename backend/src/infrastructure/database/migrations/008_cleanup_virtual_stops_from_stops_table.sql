-- Migration 008: Cleanup virtual stops from stops table (Extension of Migration 007)
-- Purpose: Remove all virtual stops from the stops table that should only exist in virtual_stops
-- This migration extends Migration 007 by cleaning up virtual stops that were incorrectly stored in stops table
-- 
-- When to apply: After Migration 007, before running the data initialization pipeline
-- This ensures that all virtual stops are removed from stops table before workers regenerate them

-- ============================================================================
-- SECTION 1: Pre-deletion checks (for audit and verification)
-- ============================================================================

/**
 * BEFORE DELETION - Count virtual stops in stops table
 * 
 * Expected query to run manually before migration:
 * SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%';
 * 
 * Expected query to list all virtual stop IDs:
 * SELECT id, name, city_id FROM stops WHERE id LIKE 'virtual-stop-%' ORDER BY id;
 * 
 * This helps identify what will be deleted and ensures no real stops are affected
 */

-- ============================================================================
-- SECTION 2: Delete virtual stops with invalid IDs (multiple consecutive dashes)
-- ============================================================================

/**
 * Delete virtual stops with invalid IDs containing multiple consecutive dashes
 * Examples: virtual-stop----------------, virtual-stop---city---
 * 
 * These stops were created with empty or invalid city names and should not exist
 */
DELETE FROM stops
WHERE id LIKE 'virtual-stop-%'
  AND (
    -- Match IDs with 3+ consecutive dashes anywhere in the ID
    id ~ 'virtual-stop-.*-{3,}.*'
    -- Or match the specific invalid case: virtual-stop----------------
    OR id = 'virtual-stop----------------'
  );

-- ============================================================================
-- SECTION 3: Delete virtual stops with empty or invalid city_id
-- ============================================================================

/**
 * Delete virtual stops with empty or null city_id
 * 
 * Virtual stops must have a valid city_id to be properly associated with cities
 * Stops without city_id cannot be used in route building
 */
DELETE FROM stops
WHERE id LIKE 'virtual-stop-%'
  AND (city_id IS NULL OR city_id = '');

-- ============================================================================
-- SECTION 4: Delete virtual stops with empty or invalid name
-- ============================================================================

/**
 * Delete virtual stops with empty or null name
 * 
 * All stops must have a valid name for display and identification
 * Stops without names cannot be used in the UI or route search
 */
DELETE FROM stops
WHERE id LIKE 'virtual-stop-%'
  AND (name IS NULL OR name = '' OR TRIM(name) = '');

-- ============================================================================
-- SECTION 5: Delete all remaining virtual stops from stops table
-- ============================================================================

/**
 * Delete all remaining virtual stops from stops table
 * 
 * Virtual stops should only exist in virtual_stops table, not in stops table
 * This ensures clean separation between real and virtual entities
 * 
 * Note: Routes and flights referencing these stops should already be deleted
 * by Migration 007 (SECTION 8). This migration only removes the stops themselves.
 */
DELETE FROM stops
WHERE id LIKE 'virtual-stop-%';

-- ============================================================================
-- SECTION 6: Post-deletion verification (for audit)
-- ============================================================================

/**
 * AFTER DELETION - Verify all virtual stops are removed
 * 
 * Expected queries to run manually after migration:
 * 
 * 1. Verify no virtual stops remain in stops table:
 *    SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%';
 *    Expected result: 0
 * 
 * 2. Verify no virtual stops with empty city_id remain:
 *    SELECT COUNT(*) FROM stops WHERE id LIKE 'virtual-stop-%' AND (city_id IS NULL OR city_id = '');
 *    Expected result: 0
 * 
 * 3. Verify no virtual stops with invalid IDs remain:
 *    SELECT COUNT(*) FROM stops WHERE id = 'virtual-stop----------------' OR id ~ '^virtual-stop-+$';
 *    Expected result: 0
 * 
 * 4. Verify routes referencing virtual stops are already deleted (from Migration 007):
 *    SELECT COUNT(*) FROM routes WHERE from_stop_id LIKE 'virtual-stop-%' OR to_stop_id LIKE 'virtual-stop-%';
 *    Expected result: 0
 * 
 * 5. Verify flights referencing virtual stops are already deleted (from Migration 007):
 *    SELECT COUNT(*) FROM flights WHERE from_stop_id LIKE 'virtual-stop-%' OR to_stop_id LIKE 'virtual-stop-%';
 *    Expected result: 0
 * 
 * 6. Verify real stops are not affected:
 *    SELECT COUNT(*) FROM stops WHERE id NOT LIKE 'virtual-stop-%';
 *    Expected result: Should match the count before migration (only virtual stops were deleted)
 */

-- ============================================================================
-- SECTION 7: Safety checks and data protection
-- ============================================================================

/**
 * SAFETY: This migration only affects stops with id LIKE 'virtual-stop-%'
 * 
 * Real stops from mock data use IDs like:
 * - stop-001, stop-002, stop-003, etc.
 * - stop-027, stop-028 (ferry terminals)
 * 
 * These real stops are NOT affected by this migration.
 * 
 * Protection:
 * - All DELETE statements use WHERE id LIKE 'virtual-stop-%'
 * - This ensures only virtual stops are deleted
 * - Real stops with different ID patterns are preserved
 */

-- ============================================================================
-- SECTION 8: Cleanup summary
-- ============================================================================

/**
 * After this migration:
 * - All virtual stops are removed from stops table
 * - All virtual stops with invalid IDs (multiple dashes) are removed
 * - All virtual stops with empty city_id are removed
 * - All virtual stops with empty name are removed
 * - Real stops from mock data remain untouched
 * - Routes and flights referencing virtual stops should already be deleted (Migration 007)
 * 
 * Next steps:
 * 1. Run the data initialization pipeline
 * 2. ODataSyncWorker will load real stops from mock data
 * 3. VirtualEntitiesGeneratorWorker will create virtual stops in virtual_stops table (not stops table)
 * 4. GraphBuilderWorker will build graph using both real and virtual stops
 * 
 * Important:
 * - Virtual stops should ONLY exist in virtual_stops table after this migration
 * - The stops table should contain ONLY real stops from mock data
 * - This separation ensures proper data integrity and prevents confusion
 */

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON TABLE stops IS 'After Migration 008: stops table contains only real stops from mock data. Virtual stops exist only in virtual_stops table.';

COMMENT ON SCHEMA public IS 'Extended cleanup of virtual stops from stops table - Migration 008';










