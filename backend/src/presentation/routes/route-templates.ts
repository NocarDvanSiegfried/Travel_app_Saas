import { Router } from 'express';
import { RouteTemplateController } from '../controllers/RouteTemplateController';
import { validateB2BAuth, validateB2BRole } from '../middleware/b2b-auth.middleware';
import { routeTemplateValidator } from '../validators/route-template.validator';

export function createRouteTemplateRoutes(controller: RouteTemplateController): Router {
  const router = Router();

  // Apply B2B authentication middleware to all routes
  router.use(validateB2BAuth);

  // Basic CRUD operations
  router.post(
    '/',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    routeTemplateValidator.createTemplate,
    controller.createTemplate.bind(controller)
  );

  router.get(
    '/:id',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.getTemplate.bind(controller)
  );

  router.put(
    '/:id',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    routeTemplateValidator.updateTemplate,
    controller.updateTemplate.bind(controller)
  );

  router.delete(
    '/:id',
    validateB2BRole(['admin', 'manager']),
    controller.deleteTemplate.bind(controller)
  );

  // Search and listing
  router.get(
    '/',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.searchTemplates.bind(controller)
  );

  router.get(
    '/public/list',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.getPublicTemplates.bind(controller)
  );

  // Template booking operations
  router.post(
    '/booking',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    routeTemplateValidator.bookTemplate,
    controller.bookTemplate.bind(controller)
  );

  router.post(
    '/booking/:bookingId/confirm',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    controller.confirmBooking.bind(controller)
  );

  // Bulk operations
  router.post(
    '/bulk',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    routeTemplateValidator.bulkCreate,
    controller.bulkCreateTemplates.bind(controller)
  );

  router.put(
    '/bulk',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    routeTemplateValidator.bulkUpdate,
    controller.bulkUpdateTemplates.bind(controller)
  );

  router.delete(
    '/bulk',
    validateB2BRole(['admin', 'manager']),
    routeTemplateValidator.bulkDelete,
    controller.bulkDeleteTemplates.bind(controller)
  );

  // Verification and status management
  router.post(
    '/:id/verify',
    validateB2BRole(['admin', 'manager']),
    controller.verifyTemplate.bind(controller)
  );

  router.put(
    '/:id/status',
    validateB2BRole(['admin', 'manager']),
    routeTemplateValidator.toggleStatus,
    controller.toggleTemplateStatus.bind(controller)
  );

  // Analytics and statistics
  router.get(
    '/statistics/company',
    validateB2BRole(['admin', 'manager', 'accountant', 'booking_agent']),
    controller.getTemplateUsageStatistics.bind(controller)
  );

  // Template cloning and sharing
  router.post(
    '/:id/clone',
    validateB2BRole(['admin', 'booking_agent', 'manager']),
    routeTemplateValidator.cloneTemplate,
    controller.cloneTemplate.bind(controller)
  );

  router.post(
    '/:id/make-public',
    validateB2BRole(['admin', 'manager']),
    controller.makeTemplatePublic.bind(controller)
  );

  // Template recommendations
  router.get(
    '/recommendations',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'employee']),
    controller.getTemplateRecommendations.bind(controller)
  );

  // Export operations
  router.get(
    '/export/csv',
    validateB2BRole(['admin', 'booking_agent', 'manager', 'accountant']),
    controller.exportTemplatesToCSV.bind(controller)
  );

  // Performance analysis
  router.get(
    '/:id/performance',
    validateB2BRole(['admin', 'manager', 'accountant']),
    controller.analyzeTemplatePerformance.bind(controller)
  );

  return router;
}