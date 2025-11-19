/**
 * Infrastructure Repositories - PostgreSQL & Redis implementations
 * 
 * This module exports all repository implementations for data access.
 * Each repository implements its corresponding Domain repository interface.
 * 
 * @module infrastructure/repositories
 */

// PostgreSQL Repositories
export { PostgresStopRepository } from './PostgresStopRepository';
export { PostgresRouteRepository } from './PostgresRouteRepository';
export { PostgresFlightRepository } from './PostgresFlightRepository';
export { PostgresDatasetRepository } from './PostgresDatasetRepository';
export { PostgresGraphRepository } from './PostgresGraphRepository';

// Re-export types from domain for convenience
export type { IStopRepository } from '../../domain/repositories/IStopRepository';
export type { IRouteRepository } from '../../domain/repositories/IRouteRepository';
export type { IFlightRepository } from '../../domain/repositories/IFlightRepository';
export type { IDatasetRepository } from '../../domain/repositories/IDatasetRepository';
export type { IGraphRepository, GraphNeighbor, GraphMetadata } from '../../domain/repositories/IGraphRepository';

