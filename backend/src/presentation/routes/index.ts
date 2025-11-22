import { Router } from 'express';
import { check, live, ready } from '../controllers/HealthController';
import * as RouteBuilderController from '../controllers/RouteBuilderController';
import * as RiskController from '../controllers/RiskController';
import * as DiagnosticsController from '../controllers/DiagnosticsController';
import * as CitiesController from '../controllers/CitiesController';
import * as GraphRebuildController from '../controllers/GraphRebuildController';
import * as DataReinitController from '../controllers/DataReinitController';
import { getMetrics } from '../controllers/MetricsController';
import { routeSearchLimiter, routeRiskLimiter } from '../middleware/rate-limiter';
import { validateRequest } from '../middleware/validation.middleware';
import { routeSearchSchema, routeDetailsSchema, routeBuildSchema } from '../validators';
import { riskAssessmentSchema } from '../validators';
import { paginationSchema } from '../validators';

const router = Router();

// Health check endpoints
router.get('/health', check);
router.get('/health/live', live);
router.get('/health/ready', ready);

// Metrics endpoint (Prometheus format)
router.get('/metrics', getMetrics);

// Cities endpoint
router.get(
  '/cities',
  validateRequest({ query: paginationSchema }),
  CitiesController.getCities
);

// Routes endpoints
router.get(
  '/routes/search',
  routeSearchLimiter,
  validateRequest({ query: routeSearchSchema }),
  RouteBuilderController.searchRoute
);
router.get(
  '/routes/details',
  validateRequest({ query: routeDetailsSchema }),
  RouteBuilderController.getRouteDetails
);
router.get(
  '/routes/build',
  validateRequest({ query: routeBuildSchema }),
  RouteBuilderController.buildRoute
);
router.get('/routes/graph/diagnostics', RouteBuilderController.getRouteGraphDiagnostics);

// Risk assessment
router.post(
  '/routes/risk/assess',
  routeRiskLimiter,
  validateRequest({ body: riskAssessmentSchema }),
  RiskController.assessRouteRisk
);

// Diagnostics endpoints
router.get('/diagnostics/database', DiagnosticsController.checkDatabase);
router.get('/diagnostics/redis', DiagnosticsController.checkRedis);
router.get('/diagnostics/odata', DiagnosticsController.checkOData);
router.get('/diagnostics/adaptive-data', DiagnosticsController.checkAdaptiveDataLoading);
router.get('/diagnostics', DiagnosticsController.fullDiagnostics);

// Admin endpoints (dev-only)
router.post('/admin/rebuild-graph', GraphRebuildController.rebuildGraph);
router.post('/admin/reinit-data', DataReinitController.reinitData);

export default router;

