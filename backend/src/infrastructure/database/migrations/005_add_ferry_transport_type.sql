-- Migration 005: Add FERRY to transport_type constraint
-- Purpose: Allow FERRY transport type in routes table
-- This migration extends the CHECK constraint to include FERRY for ferry routes

-- ============================================================================
-- SECTION 1: Drop and Recreate CHECK Constraint for routes.transport_type
-- ============================================================================

/**
 * Drop existing CHECK constraint on routes.transport_type
 * The constraint name may vary, so we drop it by finding the constraint name
 */
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for transport_type CHECK
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'routes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%transport_type%IN%';
    
    -- Drop the constraint if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE routes DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No transport_type CHECK constraint found';
    END IF;
END $$;

/**
 * Add new CHECK constraint with FERRY included
 * This allows: BUS, TRAIN, PLANE, WATER, FERRY
 */
ALTER TABLE routes
ADD CONSTRAINT routes_transport_type_check
CHECK (transport_type IN ('BUS', 'TRAIN', 'PLANE', 'WATER', 'FERRY'));

-- ============================================================================
-- SECTION 2: Comments and Documentation
-- ============================================================================

COMMENT ON CONSTRAINT routes_transport_type_check ON routes IS 
'Validates transport_type: BUS, TRAIN, PLANE, WATER, FERRY. FERRY added in migration 005 for ferry crossing routes.';

-- ============================================================================
-- Migration Complete
-- ============================================================================




