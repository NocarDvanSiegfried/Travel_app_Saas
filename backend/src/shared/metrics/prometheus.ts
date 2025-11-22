/**
 * Prometheus Metrics Exporter
 * 
 * Provides Prometheus-compatible metrics for monitoring:
 * - HTTP request metrics (count, duration, status codes)
 * - Database metrics (query count, duration, errors)
 * - Redis metrics (operation count, duration, errors)
 * - System resource metrics (CPU, memory)
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { getLogger } from '../logger/Logger';

const logger = getLogger('PrometheusMetrics');

/**
 * Prometheus metrics registry
 */
export const register = new Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

/**
 * HTTP Request Metrics
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

/**
 * Database Metrics
 */
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const dbQueryTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['state'],
  registers: [register],
});

export const dbConnectionPoolActive = new Gauge({
  name: 'db_connection_pool_active',
  help: 'Active database connections in pool',
  registers: [register],
});

export const dbConnectionPoolIdle = new Gauge({
  name: 'db_connection_pool_idle',
  help: 'Idle database connections in pool',
  registers: [register],
});

export const dbConnectionPoolWaiting = new Gauge({
  name: 'db_connection_pool_waiting',
  help: 'Waiting database connection requests',
  registers: [register],
});

/**
 * Redis Metrics
 */
export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const redisOperationTotal = new Counter({
  name: 'redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const redisConnectionStatus = new Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

/**
 * Route Search Metrics
 */
export const routeSearchDuration = new Histogram({
  name: 'route_search_duration_seconds',
  help: 'Duration of route search operations in seconds',
  labelNames: ['status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const routeSearchTotal = new Counter({
  name: 'route_searches_total',
  help: 'Total number of route searches',
  labelNames: ['status'],
  registers: [register],
});

/**
 * Graph Metrics
 */
export const graphSize = new Gauge({
  name: 'route_graph_size',
  help: 'Number of nodes in the route graph',
  registers: [register],
});

export const graphEdges = new Gauge({
  name: 'route_graph_edges',
  help: 'Number of edges in the route graph',
  registers: [register],
});

export const graphVersion = new Gauge({
  name: 'route_graph_version',
  help: 'Current version of the route graph',
  registers: [register],
});

/**
 * Initialize Prometheus metrics
 */
export function initializePrometheusMetrics(): void {
  logger.info('Prometheus metrics initialized', {
    module: 'PrometheusMetrics',
  });
}

/**
 * Update database connection pool metrics
 */
export function updateDatabasePoolMetrics(stats: {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}): void {
  dbConnectionPoolSize.set({ state: 'total' }, stats.totalCount);
  dbConnectionPoolActive.set(stats.totalCount - stats.idleCount);
  dbConnectionPoolIdle.set(stats.idleCount);
  dbConnectionPoolWaiting.set(stats.waitingCount);
}

/**
 * Update Redis connection status
 */
export function updateRedisConnectionStatus(connected: boolean): void {
  redisConnectionStatus.set(connected ? 1 : 0);
}

/**
 * Update graph metrics
 */
export function updateGraphMetrics(metadata: {
  nodeCount: number;
  edgeCount: number;
  version?: string;
}): void {
  graphSize.set(metadata.nodeCount);
  graphEdges.set(metadata.edgeCount);
  if (metadata.version) {
    graphVersion.set(parseFloat(metadata.version) || 0);
  }
}

