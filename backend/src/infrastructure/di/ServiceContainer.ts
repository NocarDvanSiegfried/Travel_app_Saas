import { TourImageService } from '../../application/services/TourImageService';
import { AuthService } from '../../application/services/AuthService';
import { TourImageController } from '../../presentation/controllers/TourImageController';
import { AuthController } from '../../presentation/controllers/AuthController';
import { B2BCompanyController } from '../../presentation/controllers/B2BCompanyController';
import { B2BReportingController } from '../../presentation/controllers/B2BReportingController';
import { B2BTicketController } from '../../presentation/controllers/B2BTicketController';
import { B2BDeliveryController } from '../../presentation/controllers/B2BDeliveryController';
import { B2BAnalyticsController } from '../../presentation/controllers/B2BAnalyticsController';
import { ContentController } from '../../presentation/controllers/ContentController';
import { CorporateAccountController } from '../../presentation/controllers/CorporateAccountController';
import { UserSpendingLimitController } from '../../presentation/controllers/UserSpendingLimitController';
import { CostCenterController } from '../../presentation/controllers/CostCenterController';
import { InstantRefundController } from '../../presentation/controllers/InstantRefundController';
import { MultimodalSearchController } from '../../presentation/controllers/MultimodalSearchController';
import { PassengerDataController } from '../../presentation/controllers/PassengerDataController';
import { RouteTemplateController } from '../../presentation/controllers/RouteTemplateController';

/**
 * Simple Service Container - Minimal Dependencies
 *
 * Manages all service instances with simplified initialization
 */
export class ServiceContainerSimple {
  private static instance: ServiceContainerSimple | null = null;

  private _userRepository: any = null;
  private _tourImageService: TourImageService | null = null;
  private _authService: AuthService | null = null;
  private _tourImageController: TourImageController | null = null;
  private _authController: AuthController | null = null;

  // B2B Controllers
  private _b2bCompanyController: B2BCompanyController | null = null;
  private _b2bReportingController: B2BReportingController | null = null;
  private _b2bTicketController: B2BTicketController | null = null;
  private _b2bDeliveryController: B2BDeliveryController | null = null;
  private _b2bAnalyticsController: B2BAnalyticsController | null = null;
  private _contentController: ContentController | null = null;
  private _corporateAccountController: CorporateAccountController | null = null;
  private _userSpendingLimitController: UserSpendingLimitController | null = null;
  private _costCenterController: CostCenterController | null = null;
  private _instantRefundController: InstantRefundController | null = null;
  private _multimodalSearchController: MultimodalSearchController | null = null;
  private _passengerDataController: PassengerDataController | null = null;
  private _routeTemplateController: RouteTemplateController | null = null;

  private constructor() {}

  static getInstance(): ServiceContainerSimple {
    if (!ServiceContainerSimple.instance) {
      ServiceContainerSimple.instance = new ServiceContainerSimple();
    }
    return ServiceContainerSimple.instance;
  }

  async initialize(): Promise<void> {
    try {
      // For now, create services with minimal dependencies
      // TODO: Add proper database and storage initialization
      console.log('⚠️  Initializing services in simplified mode (no DB/storage)');

      // Initialize placeholder repository
      this._userRepository = null as any; // Placeholder

      // Initialize services with placeholder dependencies
      this._authService = new AuthService(this._userRepository); // Will need proper user repository

      // TourImageService requires dependencies - create placeholder
      this._tourImageService = new TourImageService(null as any, null as any);

      // Initialize controllers
      this._authController = new AuthController(this._authService);
      this._tourImageController = new TourImageController(this._tourImageService);

      // Initialize B2B controllers with placeholder services
      this._b2bCompanyController = new B2BCompanyController(null as any);
      this._b2bReportingController = new B2BReportingController(null as any);
      this._b2bTicketController = new B2BTicketController();
      this._b2bDeliveryController = new B2BDeliveryController();
      this._b2bAnalyticsController = new B2BAnalyticsController();
      this._contentController = new ContentController();
      this._corporateAccountController = new CorporateAccountController(null as any, null as any, null as any, null as any);
      this._userSpendingLimitController = new UserSpendingLimitController();
      this._costCenterController = new CostCenterController();
      this._instantRefundController = new InstantRefundController(null as any, null as any, null as any, null as any, null as any);
      this._multimodalSearchController = new MultimodalSearchController(null as any, null as any, null as any, null as any, null as any);
      this._passengerDataController = new PassengerDataController(null as any);
      this._routeTemplateController = new RouteTemplateController(null as any, null as any);

      console.log('✅ Service container initialized successfully (simplified mode)');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      throw error;
    }
  }

  // Getters
  get userRepository(): any {
    return this._userRepository;
  }

  get tourImageService(): TourImageService {
    if (!this._tourImageService) {
      throw new Error('Service container not initialized');
    }
    return this._tourImageService;
  }

  get authService(): AuthService {
    if (!this._authService) {
      throw new Error('Service container not initialized');
    }
    return this._authService;
  }

  get tourImageController(): TourImageController {
    if (!this._tourImageController) {
      throw new Error('Service container not initialized');
    }
    return this._tourImageController;
  }

  get authController(): AuthController {
    if (!this._authController) {
      throw new Error('Service container not initialized');
    }
    return this._authController;
  }

  // B2B Controller getters
  get b2bCompanyController(): B2BCompanyController {
    if (!this._b2bCompanyController) {
      throw new Error('Service container not initialized');
    }
    return this._b2bCompanyController;
  }

  get b2bReportingController(): B2BReportingController {
    if (!this._b2bReportingController) {
      throw new Error('Service container not initialized');
    }
    return this._b2bReportingController;
  }

  get b2bTicketController(): B2BTicketController {
    if (!this._b2bTicketController) {
      throw new Error('Service container not initialized');
    }
    return this._b2bTicketController;
  }

  get b2bDeliveryController(): B2BDeliveryController {
    if (!this._b2bDeliveryController) {
      throw new Error('Service container not initialized');
    }
    return this._b2bDeliveryController;
  }

  get b2bAnalyticsController(): B2BAnalyticsController {
    if (!this._b2bAnalyticsController) {
      throw new Error('Service container not initialized');
    }
    return this._b2bAnalyticsController;
  }

  get contentController(): ContentController {
    if (!this._contentController) {
      throw new Error('Service container not initialized');
    }
    return this._contentController;
  }

  get corporateAccountController(): CorporateAccountController {
    if (!this._corporateAccountController) {
      throw new Error('Service container not initialized');
    }
    return this._corporateAccountController;
  }

  get instantRefundController(): InstantRefundController {
    if (!this._instantRefundController) {
      throw new Error('Service container not initialized');
    }
    return this._instantRefundController;
  }

  get multimodalSearchController(): MultimodalSearchController {
    if (!this._multimodalSearchController) {
      throw new Error('Service container not initialized');
    }
    return this._multimodalSearchController;
  }

  get passengerDataController(): PassengerDataController {
    if (!this._passengerDataController) {
      throw new Error('Service container not initialized');
    }
    return this._passengerDataController;
  }

  get routeTemplateController(): RouteTemplateController {
    if (!this._routeTemplateController) {
      throw new Error('Service container not initialized');
    }
    return this._routeTemplateController;
  }

  // Placeholder repositories and services for B2B functionality
  get passengerDataRepository(): any { return null; }
  get companyRepository(): any { return null; }
  get routeTemplateRepository(): any { return null; }
  get multimodalConnectionRepository(): any { return null; }
  get externalProviderService(): any { return null; }
  get riskAnalysisService(): any { return null; }
  get weatherService(): any { return null; }
  get templateBookingRepository(): any { return null; }
  get financialService(): any { return null; }
  get transactionLogRepository(): any { return null; }
  get corporateAccountRepository(): any { return null; }
  get b2bTicketRepository(): any { return null; }
  get refundPolicyRepository(): any { return null; }
  get auditService(): any { return null; }
  get notificationService(): any { return null; }
  get userSpendingLimitController(): UserSpendingLimitController {
    if (!this._userSpendingLimitController) {
      throw new Error('Service container not initialized');
    }
    return this._userSpendingLimitController;
  }

  get costCenterController(): CostCenterController {
    if (!this._costCenterController) {
      throw new Error('Service container not initialized');
    }
    return this._costCenterController;
  }
  get b2bAuditController(): any { return null; }
  get b2bTwoFactorController(): any { return null; }
  get b2bSessionSecurityController(): any { return null; }

  async shutdown(): Promise<void> {
    console.log('✅ Service container shut down successfully');
  }
}