import { Router } from 'express';
import { check, live, ready } from '../controllers/HealthController';
import * as RouteBuilderController from '../controllers/RouteBuilderController';
import * as RouteMapController from '../controllers/RouteMapController';
import * as RiskController from '../controllers/RiskController';
import * as DiagnosticsController from '../controllers/DiagnosticsController';
import * as CitiesController from '../controllers/CitiesController';
import * as GraphRebuildController from '../controllers/GraphRebuildController';
import * as DataReinitController from '../controllers/DataReinitController';
import { getMetrics } from '../controllers/MetricsController';
import { routeSearchLimiter, routeRiskLimiter } from '../middleware/rate-limiter';
import { validateRequest } from '../middleware/validation.middleware';
import { routeSearchSchema, routeDetailsSchema, routeBuildSchema, routeMapDataQuerySchema, routeMapDataBodySchema } from '../validators';
import { riskAssessmentSchema } from '../validators';
import { paginationSchema } from '../validators';
// Временное логирование для проверки резолва SmartRouteController
// Будет удалено после подтверждения правильного резолва
if (process.env.NODE_ENV === 'development') {
  try {
    const path = require('path');
    const fs = require('fs');
    const resolvedPath = require.resolve('../controllers/SmartRouteController');
    console.log('[DEBUG] SmartRouteController resolved to:', resolvedPath);
    console.log('[DEBUG] File exists:', fs.existsSync(resolvedPath));
    if (fs.existsSync(resolvedPath)) {
      const stats = fs.statSync(resolvedPath);
      console.log('[DEBUG] File size:', stats.size, 'bytes');
      const content = fs.readFileSync(resolvedPath, 'utf8');
      const hasBuildSmartRoute = content.includes('export async function buildSmartRoute');
      const hasCheckConnectivity = content.includes('export async function checkConnectivity');
      const hasAutocomplete = content.includes('export async function autocomplete');
      const hasCheckReality = content.includes('export async function checkReality');
      console.log('[DEBUG] Methods found:', {
        buildSmartRoute: hasBuildSmartRoute,
        checkConnectivity: hasCheckConnectivity,
        autocomplete: hasAutocomplete,
        checkReality: hasCheckReality,
      });
    }
  } catch (error) {
    console.error('[DEBUG] Error resolving SmartRouteController:', error);
  }
}
import * as SmartRouteController from '../controllers/SmartRouteController';
import { buildSmartRouteSchema, autocompleteSchema, realityCheckSchema } from '../validators/smart-route.validator';

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

// Smart Routes endpoints (новый API)
router.post(
  '/smart-route/build',
  routeSearchLimiter,
  validateRequest(buildSmartRouteSchema),
  SmartRouteController.buildSmartRoute
);
router.get(
  '/smart-route/autocomplete',
  routeSearchLimiter,
  validateRequest(autocompleteSchema),
  SmartRouteController.autocomplete
);
router.get(
  '/smart-route/connectivity',
  routeSearchLimiter,
  SmartRouteController.checkConnectivity
);
router.post(
  '/smart-route/check-reality',
  routeSearchLimiter,
  validateRequest(realityCheckSchema),
  SmartRouteController.checkReality
);

// Старые endpoints для обратной совместимости (deprecated, будут удалены)
router.post(
  '/smart-routes/build',
  routeSearchLimiter,
  validateRequest(buildSmartRouteSchema),
  SmartRouteController.buildSmartRoute
);
router.get(
  '/smart-routes/autocomplete',
  routeSearchLimiter,
  validateRequest(autocompleteSchema),
  SmartRouteController.autocomplete
);
router.get(
  '/smart-routes/connectivity',
  routeSearchLimiter,
  SmartRouteController.checkConnectivity
);
router.post(
  '/smart-routes/reality-check',
  routeSearchLimiter,
  validateRequest(realityCheckSchema),
  SmartRouteController.checkReality
);

// Route map endpoints
router.get(
  '/routes/map',
  validateRequest({ query: routeMapDataQuerySchema }),
  RouteMapController.getRouteMapData
);
router.post(
  '/routes/map',
  validateRequest({ body: routeMapDataBodySchema }),
  RouteMapController.postRouteMapData
);

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

