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
import { ContentController } from '../controllers/ContentController';
import { createContentRoutes } from './content';
import { createTourImageRoutes, createStorageRoutes } from './tour-images-real';
import { createAuthRoutes } from './auth';
import { createB2BRoutes } from './b2b';
import financialRoutes from './financial';
import { createPassengerDataRoutes } from './passenger-data';
import { createMultimodalSearchRoutes } from './multimodal-search';
import { createRouteTemplateRoutes } from './route-templates';
import { createInstantRefundRoutes } from './instant-refunds';
import { getStartupResult } from '../..';
import { ServiceContainerSimple } from '../../infrastructure/di/ServiceContainer';

const router = Router();

// Initialize Service Container
let serviceContainer: ServiceContainerSimple | null = null;

// Initialize services on startup
const initializeServices = async () => {
  try {
    serviceContainer = ServiceContainerSimple.getInstance();
    await serviceContainer.initialize();
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    // Continue without services for development
  }
};

// Start initialization
initializeServices();

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

// Authentication endpoints
if (serviceContainer) {
  try {
    const authController = serviceContainer.authController;
    const userRepository = serviceContainer.userRepository;
    router.use('/auth', createAuthRoutes(authController, userRepository));
  } catch (error) {
    console.warn('⚠️  Auth routes not available:', error);
  }
} else {
  console.warn('⚠️  Service container not initialized - Auth routes disabled');
}

// Tour Images endpoints (with authentication)
if (serviceContainer) {
  try {
    const tourImageController = serviceContainer.tourImageController;
    const userRepository = serviceContainer.userRepository;
    router.use('/tours', createTourImageRoutes(tourImageController, userRepository));
    router.use('/storage', createStorageRoutes(tourImageController, userRepository));
  } catch (error) {
    console.warn('⚠️  Tour image routes not available:', error);

    // Fallback simple endpoints
    router.get('/tours/:tourId/images', (req: any, res: any) => {
      res.json({
        success: true,
        data: {
          images: [],
          count: 0
        },
        message: 'Tour images endpoint - service initialization failed'
      });
    });
  }
} else {
  console.warn('⚠️  Service container not initialized - Tour image routes disabled');

  // Fallback simple endpoints
  router.get('/tours/:tourId/images', (req: any, res: any) => {
    res.json({
      success: true,
      data: {
        images: [],
        count: 0
      },
      message: 'Tour images endpoint - service container not initialized'
    });
  });
}

// Content endpoints
const contentController = new ContentController();
router.use('/content', createContentRoutes(contentController));

// B2B endpoints
if (serviceContainer) {
  try {
    const b2bCompanyController = serviceContainer.b2bCompanyController;
    const b2bTicketController = serviceContainer.b2bTicketController;
    const b2bDeliveryController = serviceContainer.b2bDeliveryController;
    const b2bAuditController = serviceContainer.b2bAuditController;
    const b2bTwoFactorController = serviceContainer.b2bTwoFactorController;
    const b2bSessionSecurityController = serviceContainer.b2bSessionSecurityController;

    router.use('/api/b2b', createB2BRoutes(
      b2bCompanyController,
      b2bTicketController,
      b2bDeliveryController,
      b2bAuditController,
      b2bTwoFactorController,
      b2bSessionSecurityController
    ));
  } catch (error) {
    console.warn('⚠️  B2B routes not available:', error);
  }
} else {
  console.warn('⚠️  Service container not initialized - B2B routes disabled');
}

// Financial module endpoints
if (serviceContainer) {
  try {
    // Check if financial services are available in service container
    const corporateAccountController = serviceContainer.corporateAccountController;
    const userSpendingLimitController = serviceContainer.userSpendingLimitController;
    const costCenterController = serviceContainer.costCenterController;

    if (corporateAccountController && userSpendingLimitController && costCenterController) {
      // Initialize controllers in financial routes
      const { setFinancialControllers } = require('./financial');
      setFinancialControllers(
        corporateAccountController,
        userSpendingLimitController,
        costCenterController
      );

      router.use('/api/b2b/financial', financialRoutes);
      console.log('✅ Financial routes initialized successfully');
    } else {
      console.warn('⚠️  Financial controllers not available in service container');
    }
  } catch (error) {
    console.warn('⚠️  Financial routes not available:', error);
  }
} else {
  console.warn('⚠️  Service container not initialized - Financial routes disabled');
}

// Self-Service and Multimodal endpoints
if (serviceContainer) {
  try {
    // Initialize Passenger Data Service
    const PassengerDataController = require('../controllers/PassengerDataController').PassengerDataController;
    const PassengerDataService = require('../../application/services/PassengerDataService').PassengerDataService;
    const EncryptionService = require('../../infrastructure/security/EncryptionService').EncryptionService;

    const encryptionService = new EncryptionService();
    const passengerDataService = new PassengerDataService(
      serviceContainer.passengerDataRepository,
      serviceContainer.companyRepository,
      encryptionService
    );
    const passengerDataController = new PassengerDataController(passengerDataService);

    router.use('/api/b2b/passenger-data', createPassengerDataRoutes(passengerDataController));
    console.log('✅ Passenger data routes initialized successfully');

    // Initialize Multimodal Search Service
    const MultimodalSearchController = require('../controllers/MultimodalSearchController').MultimodalSearchController;
    const MultimodalSearchService = require('../../application/services/MultimodalSearchService').MultimodalSearchService;

    const multimodalSearchService = new MultimodalSearchService(
      serviceContainer.routeTemplateRepository,
      serviceContainer.multimodalConnectionRepository,
      serviceContainer.externalProviderService,
      serviceContainer.riskAnalysisService,
      serviceContainer.weatherService
    );
    const multimodalSearchController = new MultimodalSearchController(multimodalSearchService);

    router.use('/api/b2b/multimodal-search', createMultimodalSearchRoutes(multimodalSearchController));
    console.log('✅ Multimodal search routes initialized successfully');

    // Initialize Route Template Service
    const RouteTemplateController = require('../controllers/RouteTemplateController').RouteTemplateController;
    const RouteTemplateService = require('../../application/services/RouteTemplateService').RouteTemplateService;

    const routeTemplateService = new RouteTemplateService(
      serviceContainer.routeTemplateRepository,
      serviceContainer.templateBookingRepository,
      serviceContainer.companyRepository,
      serviceContainer.passengerDataRepository,
      serviceContainer.financialService
    );
    const routeTemplateController = new RouteTemplateController(routeTemplateService);

    router.use('/api/b2b/route-templates', createRouteTemplateRoutes(routeTemplateController));
    console.log('✅ Route template routes initialized successfully');

    // Initialize Instant Refund Service
    const InstantRefundController = require('../controllers/InstantRefundController').InstantRefundController;
    const InstantRefundService = require('../../application/services/InstantRefundService').InstantRefundService;

    const instantRefundService = new InstantRefundService(
      serviceContainer.transactionLogRepository,
      serviceContainer.corporateAccountRepository,
      serviceContainer.b2bTicketRepository,
      serviceContainer.templateBookingRepository,
      serviceContainer.refundPolicyRepository,
      serviceContainer.auditService,
      serviceContainer.notificationService
    );
    const instantRefundController = new InstantRefundController(instantRefundService);

    router.use('/api/b2b/refunds', createInstantRefundRoutes(instantRefundController));
    console.log('✅ Instant refund routes initialized successfully');

  } catch (error) {
    console.warn('⚠️  Self-Service/Multimodal routes not available:', error);

    // Fallback endpoints
    router.get('/api/b2b/passenger-data', (req: any, res: any) => {
      res.json({
        success: false,
        error: 'Passenger data service not initialized'
      });
    });

    router.get('/api/b2b/multimodal-search', (req: any, res: any) => {
      res.json({
        success: false,
        error: 'Multimodal search service not initialized'
      });
    });

    router.get('/api/b2b/route-templates', (req: any, res: any) => {
      res.json({
        success: false,
        error: 'Route template service not initialized'
      });
    });

    router.get('/api/b2b/refunds', (req: any, res: any) => {
      res.json({
        success: false,
        error: 'Instant refund service not initialized'
      });
    });
  }
} else {
  console.warn('⚠️  Service container not initialized - Self-Service/Multimodal routes disabled');

  // Fallback endpoints
  router.get('/api/b2b/passenger-data', (req: any, res: any) => {
    res.json({
      success: false,
      error: 'Service container not initialized'
    });
  });

  router.get('/api/b2b/multimodal-search', (req: any, res: any) => {
    res.json({
      success: false,
      error: 'Service container not initialized'
    });
  });

  router.get('/api/b2b/route-templates', (req: any, res: any) => {
    res.json({
      success: false,
      error: 'Service container not initialized'
    });
  });

  router.get('/api/b2b/refunds', (req: any, res: any) => {
    res.json({
      success: false,
      error: 'Service container not initialized'
    });
  });
}

// Admin endpoints (dev-only)
router.post('/admin/rebuild-graph', GraphRebuildController.rebuildGraph);
router.post('/admin/reinit-data', DataReinitController.reinitData);

export default router;

