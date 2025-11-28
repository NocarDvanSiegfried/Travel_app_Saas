import { Router } from 'express';
import { MultimodalSearchController } from '../controllers/MultimodalSearchController';
import { validateB2BAuth, validateB2BRole } from '../middleware/b2b-auth.middleware';
import { searchValidator } from '../validators/multimodal-search.validator';

export function createMultimodalSearchRoutes(controller: MultimodalSearchController): Router {
  const router = Router();

  // Apply B2B authentication to all routes
  router.use(validateB2BAuth);

  // Main search routes
  router.post(
    '/search',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    searchValidator.searchRoutes,
    controller.searchRoutes.bind(controller)
  );

  router.get(
    '/search',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    searchValidator.searchRoutesQuery,
    controller.searchRoutes.bind(controller)
  );

  // Smart connection planning
  router.post(
    '/connections/plan',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    searchValidator.planSmartConnection,
    controller.planSmartConnection.bind(controller)
  );

  // Connection status monitoring
  router.get(
    '/connections/:connectionId/status',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.getConnectionStatus.bind(controller)
  );

  // Route risk analysis
  router.get(
    '/risk-analysis',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    searchValidator.getRouteRiskAnalysis,
    controller.getRouteRiskAnalysis.bind(controller)
  );

  // Quick search and suggestions
  router.get(
    '/quick-search',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.quickSearch.bind(controller)
  );

  // Popular routes
  router.get(
    '/popular',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.getPopularRoutes.bind(controller)
  );

  // Search history
  router.post(
    '/history',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.saveSearchHistory.bind(controller)
  );

  router.get(
    '/history',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.getSearchHistory.bind(controller)
  );

  // Route recommendations
  router.get(
    '/recommendations',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.getRouteRecommendations.bind(controller)
  );

  // Route comparison
  router.post(
    '/compare',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.compareRoutes.bind(controller)
  );

  return router;
}