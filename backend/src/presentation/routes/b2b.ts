import { Router } from 'express';
import { B2BCompanyController } from '../controllers/B2BCompanyController';
import { B2BTicketController } from '../controllers/B2BTicketController';
import { B2BDeliveryController } from '../controllers/B2BDeliveryController';
import { B2BAnalyticsController } from '../controllers/B2BAnalyticsController';
import { B2BAuthMiddleware } from '../middleware/b2b-auth.middleware';
import { B2BUserRole } from '../../domain/entities/B2BUser';
import { IB2BCompanyService } from '../../application/services/B2BCompanyService';
import { IB2BTicketService } from '../../application/services/B2BTicketService';
import { IB2BDeliveryService } from '../../application/services/B2BDeliveryService';
import { IB2BAnalyticsService } from '../../application/services/B2BAnalyticsService';

export function createB2BRoutes(
  companyService: IB2BCompanyService,
  ticketService: IB2BTicketService,
  deliveryService: IB2BDeliveryService,
  analyticsService: IB2BAnalyticsService
): Router {
  const router = Router();

  const authMiddleware = new B2BAuthMiddleware(companyService);
  const companyController = new B2BCompanyController(companyService);
  const ticketController = new B2BTicketController(ticketService);
  const deliveryController = new B2BDeliveryController(deliveryService);
  const analyticsController = new B2BAnalyticsController(analyticsService);

  // Public endpoints (для регистрации компаний)
  router.post('/companies', companyController.createCompany.bind(companyController));

  // Protected endpoints (требуют аутентификации)
  router.use(authMiddleware.authenticate());

  // Company routes
  router.get('/companies/:companyId', authMiddleware.requireCompanyAccess(), companyController.getCompany.bind(companyController));
  router.put('/companies/:companyId',
    authMiddleware.authorize(['super_admin', 'company_admin']),
    authMiddleware.requireCompanyAccess(),
    companyController.updateCompany.bind(companyController)
  );
  router.get('/companies/:companyId/employees',
    authMiddleware.canManageEmployees(),
    authMiddleware.requireCompanyAccess(),
    companyController.getCompanyEmployees.bind(companyController)
  );
  router.post('/companies/:companyId/employees',
    authMiddleware.canManageEmployees(),
    authMiddleware.requireCompanyAccess(),
    companyController.addEmployee.bind(companyController)
  );
  router.delete('/companies/:companyId/employees/:employeeId',
    authMiddleware.canManageEmployees(),
    authMiddleware.requireCompanyAccess(),
    companyController.removeEmployee.bind(companyController)
  );
  router.put('/companies/:companyId/employees/:employeeId/role',
    authMiddleware.canManageEmployees(),
    authMiddleware.requireCompanyAccess(),
    companyController.updateEmployeeRole.bind(companyController)
  );

  // Tickets routes
  router.get('/companies/:companyId/tickets',
    authMiddleware.requireCompanyAccess(),
    ticketController.getTickets.bind(ticketController)
  );
  router.post('/companies/:companyId/tickets',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    authMiddleware.requireCompanyAccess(),
    ticketController.createTicket.bind(ticketController)
  );
  router.get('/tickets/:ticketId',
    authMiddleware.requireCompanyAccess(),
    ticketController.getTicketById.bind(ticketController)
  );
  router.put('/tickets/:ticketId',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    ticketController.updateTicket.bind(ticketController)
  );
  router.post('/tickets/:ticketId/cancel',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    ticketController.cancelTicket.bind(ticketController)
  );
  router.post('/tickets/:ticketId/confirm',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    ticketController.confirmTicket.bind(ticketController)
  );
  router.post('/tickets/:ticketId/assign',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    ticketController.assignTicketToEmployee.bind(ticketController)
  );
  router.post('/tickets/bulk',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    ticketController.bulkCreateTickets.bind(ticketController)
  );
  router.get('/companies/:companyId/tickets/analytics',
    authMiddleware.requireCompanyAccess(),
    ticketController.getTicketAnalytics.bind(ticketController)
  );

  // Deliveries routes
  router.get('/companies/:companyId/deliveries',
    authMiddleware.requireCompanyAccess(),
    deliveryController.getDeliveries.bind(deliveryController)
  );
  router.post('/companies/:companyId/deliveries',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager', 'employee']),
    authMiddleware.requireCompanyAccess(),
    deliveryController.createDelivery.bind(deliveryController)
  );
  router.get('/deliveries/:deliveryId',
    authMiddleware.requireCompanyAccess(),
    deliveryController.getDeliveryById.bind(deliveryController)
  );
  router.put('/deliveries/:deliveryId',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    deliveryController.updateDelivery.bind(deliveryController)
  );
  router.post('/deliveries/:deliveryId/cancel',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager']),
    deliveryController.cancelDelivery.bind(deliveryController)
  );
  router.post('/deliveries/:deliveryId/confirm',
    authMiddleware.authorize(['super_admin', 'company_admin', 'department_manager', 'employee']),
    deliveryController.confirmDelivery.bind(deliveryController)
  );
  router.post('/deliveries/:deliveryId/assign-captain',
    authMiddleware.authorize(['super_admin', 'company_admin', 'captain']),
    deliveryController.assignCaptain.bind(deliveryController)
  );
  router.put('/deliveries/:deliveryId/status',
    authMiddleware.authorize(['super_admin', 'company_admin', 'captain']),
    deliveryController.updateDeliveryStatus.bind(deliveryController)
  );
  router.get('/deliveries/:deliveryId/available-captains',
    authMiddleware.requireCompanyAccess(),
    deliveryController.getAvailableCaptains.bind(deliveryController)
  );
  router.post('/deliveries/calculate-price',
    authMiddleware.requireCompanyAccess(),
    deliveryController.calculateDeliveryPrice.bind(deliveryController)
  );
  router.get('/companies/:companyId/deliveries/analytics',
    authMiddleware.requireCompanyAccess(),
    deliveryController.getDeliveryAnalytics.bind(deliveryController)
  );

  // Analytics routes
  router.get('/companies/:companyId/analytics',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('advanced_analytics'),
    analyticsController.generateCompanyAnalytics.bind(analyticsController)
  );
  router.get('/companies/:companyId/analytics/ai-insights',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('ai_insights'),
    analyticsController.getAICostOptimizationInsights.bind(analyticsController)
  );
  router.get('/companies/:companyId/analytics/predict-expenses',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('ai_insights'),
    analyticsController.predictExpenses.bind(analyticsController)
  );
  router.get('/companies/:companyId/analytics/detect-anomalies',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('ai_insights'),
    analyticsController.detectAnomalies.bind(analyticsController)
  );
  router.get('/companies/:companyId/analytics/budget-recommendations',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('ai_insights'),
    analyticsController.generateBudgetRecommendations.bind(analyticsController)
  );
  router.get('/companies/:companyId/analytics/department-efficiency',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('advanced_analytics'),
    analyticsController.getDepartmentEfficiency.bind(analyticsController)
  );
  router.get('/companies/:companyId/analytics/usage-patterns',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('advanced_analytics'),
    analyticsController.getUsagePatterns.bind(analyticsController)
  );
  router.get('/companies/:companyId/analytics/roi-metrics',
    authMiddleware.requireCompanyAccess(),
    authMiddleware.requireSubscription('custom_reports'),
    analyticsController.getROIMetrics.bind(analyticsController)
  );

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'b2b-api',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  return router;
}