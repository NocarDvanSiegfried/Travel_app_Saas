/**
 * Metrics module exports
 */

export {
  RequestMetrics,
  ErrorMetrics,
  MetricsSummary,
  getMetricsRegistry
} from './MetricsRegistry';

export {
  register,
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
  dbQueryDuration,
  dbQueryTotal,
  dbConnectionPoolSize,
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolWaiting,
  redisOperationDuration,
  redisOperationTotal,
  redisConnectionStatus,
  routeSearchDuration,
  routeSearchTotal,
  graphSize,
  graphEdges,
  graphVersion,
  initializePrometheusMetrics,
  updateDatabasePoolMetrics,
  updateRedisConnectionStatus,
  updateGraphMetrics,
} from './prometheus';







