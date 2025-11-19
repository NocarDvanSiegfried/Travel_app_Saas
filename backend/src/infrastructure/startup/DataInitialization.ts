/**
 * Data Initialization Module
 * 
 * Checks if database tables are empty and triggers automatic data loading.
 * Ensures backend is ready with data after startup.
 * 
 * @module infrastructure/startup
 */

import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import {
  PostgresStopRepository,
  PostgresRouteRepository,
  PostgresFlightRepository,
  PostgresDatasetRepository,
} from '../repositories';
import { initializeWorkers } from '../workers/initializeWorkers';
import { getWorkerOrchestrator } from '../../application/workers';

/**
 * Data availability check result
 */
export type DataAvailabilityResult = {
  hasData: boolean;
  realStopsCount: number;
  virtualStopsCount: number;
  routesCount: number;
  flightsCount: number;
  datasetsCount: number;
  isEmpty: boolean;
};

/**
 * Check if database has any data
 * 
 * @param pool - PostgreSQL connection pool
 * @returns Data availability result
 */
export async function checkDataAvailability(pool: Pool): Promise<DataAvailabilityResult> {
  const stopRepository = new PostgresStopRepository(pool);
  const routeRepository = new PostgresRouteRepository(pool);
  const flightRepository = new PostgresFlightRepository(pool);
  const datasetRepository = new PostgresDatasetRepository(pool);

  const [realStopsCount, virtualStopsCount, routesCount, flightsCount, datasetsCount] = await Promise.all([
    stopRepository.countRealStops(),
    stopRepository.countVirtualStops(),
    routeRepository.countRoutes(),
    flightRepository.countFlights(true), // Include virtual flights
    datasetRepository.countDatasets(),
  ]);

  const hasData = realStopsCount > 0 || virtualStopsCount > 0 || routesCount > 0 || flightsCount > 0;
  const isEmpty = realStopsCount === 0 && virtualStopsCount === 0 && routesCount === 0 && flightsCount === 0;

  return {
    hasData,
    realStopsCount,
    virtualStopsCount,
    routesCount,
    flightsCount,
    datasetsCount,
    isEmpty,
  };
}

/**
 * Initialize workers and execute full pipeline if database is empty
 * 
 * @param pool - PostgreSQL connection pool
 * @param redis - Redis client
 * @returns True if pipeline was executed, false otherwise
 */
export async function ensureDataInitialized(
  pool: Pool,
  redis: RedisClientType
): Promise<boolean> {
  console.log('\n🔍 Checking data availability...');
  console.log('─────────────────────────────────────────────────────────────');

  const dataCheck = await checkDataAvailability(pool);

  console.log(`📊 Data Status:`);
  console.log(`   Real stops: ${dataCheck.realStopsCount}`);
  console.log(`   Virtual stops: ${dataCheck.virtualStopsCount}`);
  console.log(`   Routes: ${dataCheck.routesCount}`);
  console.log(`   Flights: ${dataCheck.flightsCount}`);
  console.log(`   Datasets: ${dataCheck.datasetsCount}`);

  if (!dataCheck.isEmpty) {
    console.log('✅ Database has data - skipping automatic initialization');
    console.log('');
    return false;
  }

  console.log('⚠️ Database is empty - starting automatic data initialization...');
  console.log('');

  try {
    // ========================================================================
    // Step 1: Initialize Workers
    // ========================================================================
    console.log('🔧 Step 1: Initializing background workers...');
    await initializeWorkers(pool, redis);
    console.log('✅ Workers initialized\n');

    // ========================================================================
    // Step 2: Execute Full Pipeline
    // ========================================================================
    console.log('🚀 Step 2: Executing full data pipeline...');
    console.log('   This may take several minutes...\n');

    const orchestrator = getWorkerOrchestrator();
    const result = await orchestrator.executeFullPipeline();

    if (result.success) {
      console.log('\n✅ Data initialization completed successfully!');
      console.log(`   Total time: ${result.totalExecutionTimeMs}ms`);
      console.log(`   Workers executed: ${result.workersExecuted}`);
      console.log('');

      // Verify data was loaded
      const finalCheck = await checkDataAvailability(pool);
      console.log('📊 Final Data Status:');
      console.log(`   Real stops: ${finalCheck.realStopsCount}`);
      console.log(`   Virtual stops: ${finalCheck.virtualStopsCount}`);
      console.log(`   Routes: ${finalCheck.routesCount}`);
      console.log(`   Flights: ${finalCheck.flightsCount}`);
      console.log('');

      if (finalCheck.hasData) {
        console.log('✅ Database populated successfully!');
        console.log('');
        return true;
      } else {
        console.warn('⚠️ Pipeline completed but database is still empty');
        console.warn('   Check worker logs for errors');
        console.log('');
        return false;
      }
    } else {
      console.error('\n❌ Data initialization failed!');
      console.error(`   Error: ${result.error}`);
      console.error(`   Workers executed: ${result.workersExecuted}`);
      console.log('');
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Data initialization error:', error?.message || String(error));
    console.error('   Stack:', error?.stack);
    console.log('');
    return false;
  }
}

