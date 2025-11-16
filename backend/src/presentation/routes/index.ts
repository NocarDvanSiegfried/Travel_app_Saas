import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';
import * as RouteController from '../controllers/RouteController';
import * as RouteBuilderController from '../controllers/RouteBuilderController';
import * as RiskController from '../controllers/RiskController';
import * as DiagnosticsController from '../controllers/DiagnosticsController';

const router = Router();

// Health check
router.get('/health', HealthController.check);

// Routes endpoints
router.get('/routes/search', RouteController.searchRoute);
router.get('/routes/details', RouteController.getRouteDetails);
router.get('/routes/build', RouteBuilderController.buildRoute);
router.get('/routes/graph/diagnostics', RouteController.getRouteGraphDiagnostics);

// Risk assessment
router.post('/routes/risk/assess', RiskController.assessRouteRisk);

// Diagnostics endpoints
router.get('/diagnostics/database', DiagnosticsController.checkDatabase);
router.get('/diagnostics/redis', DiagnosticsController.checkRedis);
router.get('/diagnostics/odata', DiagnosticsController.checkOData);
router.get('/diagnostics', DiagnosticsController.fullDiagnostics);

export default router;



