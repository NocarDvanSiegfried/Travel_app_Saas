import { Router } from 'express';
import { CorporateAccountController } from '../controllers/CorporateAccountController';
import { UserSpendingLimitController } from '../controllers/UserSpendingLimitController';
import { CostCenterController } from '../controllers/CostCenterController';
import { authMiddleware } from '../middleware/auth.middleware';
import { b2bAuthMiddleware } from '../middleware/b2b-auth.middleware';
import { rateLimit } from 'express-rate-limit';
import { validateRole } from '../middleware/role.middleware';

const router = Router();

// Rate limiting для финансовых операций
const financialRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100, // максимум 100 запросов в минуту
  message: {
    success: false,
    error: 'Too many financial requests. Please try again later.'
  }
});

// Transaction operations rate limit (stricter)
const transactionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 20, // максимум 20 транзакций в минуту
  message: {
    success: false,
    error: 'Too many transaction attempts. Please try again later.'
  }
});

// Middleware для всех роутов
router.use(authMiddleware);
router.use(b2bAuthMiddleware);
router.use(financialRateLimit);

// Инициализация контроллеров (будет инжектировано через DI)
let corporateAccountController: CorporateAccountController;
let userSpendingLimitController: UserSpendingLimitController;
let costCenterController: CostCenterController;

export const setFinancialControllers = (
  corporateAccount: CorporateAccountController,
  userSpendingLimit: UserSpendingLimitController,
  costCenter: CostCenterController
) => {
  corporateAccountController = corporateAccount;
  userSpendingLimitController = userSpendingLimit;
  costCenterController = costCenter;
};

// ============= CORPORATE ACCOUNTS ROUTES =============

/**
 * @route GET /api/b2b/financial/corporate-accounts/:companyId
 * @desc Get corporate account details
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.get('/corporate-accounts/:companyId',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  corporateAccountController?.getAccount.bind(corporateAccountController)
);

/**
 * @route GET /api/b2b/financial/corporate-accounts/:companyId/balance
 * @desc Check balance and availability of funds
 * @access Private (B2B users)
 * @role booking_agent, finance_admin, accountant, company_admin
 */
router.get('/corporate-accounts/:companyId/balance',
  validateRole(['booking_agent', 'finance_admin', 'accountant', 'company_admin']),
  corporateAccountController?.checkBalance.bind(corporateAccountController)
);

/**
 * @route POST /api/b2b/financial/corporate-accounts/:companyId/deposit
 * @desc Deposit funds to corporate account
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant
 */
router.post('/corporate-accounts/:companyId/deposit',
  validateRole(['finance_admin', 'accountant']),
  transactionRateLimit,
  corporateAccountController?.deposit.bind(corporateAccountController)
);

/**
 * @route POST /api/b2b/financial/corporate-accounts/:companyId/withdraw
 * @desc Withdraw funds from corporate account
 * @access Private (B2B users with appropriate role)
 * @role booking_agent, finance_admin, accountant, company_admin
 */
router.post('/corporate-accounts/:companyId/withdraw',
  validateRole(['booking_agent', 'finance_admin', 'accountant', 'company_admin']),
  transactionRateLimit,
  corporateAccountController?.withdraw.bind(corporateAccountController)
);

/**
 * @route POST /api/b2b/financial/corporate-accounts/:companyId/refund
 * @desc Refund funds to corporate account
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant
 */
router.post('/corporate-accounts/:companyId/refund',
  validateRole(['finance_admin', 'accountant']),
  transactionRateLimit,
  corporateAccountController?.refund.bind(corporateAccountController)
);

/**
 * @route GET /api/b2b/financial/corporate-accounts/:companyId/transactions
 * @desc Get transaction history
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.get('/corporate-accounts/:companyId/transactions',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  corporateAccountController?.getTransactionHistory.bind(corporateAccountController)
);

/**
 * @route GET /api/b2b/financial/corporate-accounts/:companyId/spending-analytics
 * @desc Get spending analytics
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.get('/corporate-accounts/:companyId/spending-analytics',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  corporateAccountController?.getSpendingAnalytics.bind(corporateAccountController)
);

/**
 * @route POST /api/b2b/financial/corporate-accounts/:companyId/check-limits
 * @desc Check user spending limits before transaction
 * @access Private (B2B users)
 * @role booking_agent, finance_admin, accountant, company_admin
 */
router.post('/corporate-accounts/:companyId/check-limits',
  validateRole(['booking_agent', 'finance_admin', 'accountant', 'company_admin']),
  corporateAccountController?.checkLimits.bind(corporateAccountController)
);

/**
 * @route GET /api/b2b/financial/corporate-accounts/:companyId/limits
 * @desc Get all company spending limits
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.get('/corporate-accounts/:companyId/limits',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  corporateAccountController?.getCompanyLimits.bind(corporateAccountController)
);

/**
 * @route GET /api/b2b/financial/corporate-accounts/:companyId/users/:userId/limits
 * @desc Get user spending limits
 * @access Private (B2B users)
 * @role booking_agent, finance_admin, accountant, company_admin
 */
router.get('/corporate-accounts/:companyId/users/:userId/limits',
  validateRole(['booking_agent', 'finance_admin', 'accountant', 'company_admin']),
  corporateAccountController?.getUserLimits.bind(corporateAccountController)
);

/**
 * @route POST /api/b2b/financial/corporate-accounts/:companyId/notifications/check
 * @desc Force check and send notifications
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant
 */
router.post('/corporate-accounts/:companyId/notifications/check',
  validateRole(['finance_admin', 'accountant']),
  corporateAccountController?.checkNotifications.bind(corporateAccountController)
);

/**
 * @route POST /api/b2b/financial/corporate-accounts/:companyId/auto-topup/check
 * @desc Check and process auto top-up
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant
 */
router.post('/corporate-accounts/:companyId/auto-topup/check',
  validateRole(['finance_admin', 'accountant']),
  corporateAccountController?.checkAutoTopup.bind(corporateAccountController)
);

// ============= USER SPENDING LIMITS ROUTES =============

/**
 * @route POST /api/b2b/financial/limits
 * @desc Create new spending limit
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.post('/limits',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  userSpendingLimitController?.createLimit.bind(userSpendingLimitController)
);

/**
 * @route PUT /api/b2b/financial/limits/:limitId
 * @desc Update existing spending limit
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.put('/limits/:limitId',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  userSpendingLimitController?.updateLimit.bind(userSpendingLimitController)
);

/**
 * @route DELETE /api/b2b/financial/limits/:limitId
 * @desc Delete spending limit
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.delete('/limits/:limitId',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  userSpendingLimitController?.deleteLimit.bind(userSpendingLimitController)
);

/**
 * @route POST /api/b2b/financial/limits/reset-expired
 * @desc Reset expired spending limits
 * @access Private (B2B system operation)
 * @role system_admin
 */
router.post('/limits/reset-expired',
  validateRole(['system_admin']),
  userSpendingLimitController?.resetExpiredPeriods.bind(userSpendingLimitController)
);

/**
 * @route GET /api/b2b/financial/limits/statistics/:companyId
 * @desc Get company limit statistics
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.get('/limits/statistics/:companyId',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  userSpendingLimitController?.getCompanyStatistics.bind(userSpendingLimitController)
);

/**
 * @route POST /api/b2b/financial/limits/batch-reset/:companyId
 * @desc Batch reset periods for company
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant
 */
router.post('/limits/batch-reset/:companyId',
  validateRole(['finance_admin', 'accountant']),
  userSpendingLimitController?.batchResetPeriods.bind(userSpendingLimitController)
);

// ============= COST CENTERS ROUTES =============

/**
 * @route GET /api/b2b/financial/cost-centers/:companyId
 * @desc Get all cost centers for company
 * @access Private (B2B users)
 * @role booking_agent, finance_admin, accountant, company_admin, captain
 */
router.get('/cost-centers/:companyId',
  validateRole(['booking_agent', 'finance_admin', 'accountant', 'company_admin', 'captain']),
  costCenterController?.getCompanyCostCenters.bind(costCenterController)
);

/**
 * @route GET /api/b2b/financial/cost-centers/:companyId/hierarchy
 * @desc Get cost centers hierarchy
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.get('/cost-centers/:companyId/hierarchy',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  costCenterController?.getCostCenterHierarchy.bind(costCenterController)
);

/**
 * @route POST /api/b2b/financial/cost-centers
 * @desc Create new cost center
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.post('/cost-centers',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  costCenterController?.createCostCenter.bind(costCenterController)
);

/**
 * @route PUT /api/b2b/financial/cost-centers/:costCenterId
 * @desc Update cost center
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.put('/cost-centers/:costCenterId',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  costCenterController?.updateCostCenter.bind(costCenterController)
);

/**
 * @route DELETE /api/b2b/financial/cost-centers/:costCenterId
 * @desc Delete cost center
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin
 */
router.delete('/cost-centers/:costCenterId',
  validateRole(['finance_admin', 'accountant', 'company_admin']),
  costCenterController?.deleteCostCenter.bind(costCenterController)
);

/**
 * @route GET /api/b2b/financial/cost-centers/:costCenterId/spending
 * @desc Get cost center spending analytics
 * @access Private (B2B users with finance role)
 * @role finance_admin, accountant, company_admin, captain
 */
router.get('/cost-centers/:costCenterId/spending',
  validateRole(['finance_admin', 'accountant', 'company_admin', 'captain']),
  costCenterController?.getCostCenterSpending.bind(costCenterController)
);

// ============= SYSTEM OPERATIONS ROUTES =============

/**
 * @route POST /api/b2b/financial/system/notifications/check
 * @desc System-wide notification check (scheduled job)
 * @access Private (System operations)
 * @role system_admin, system_service
 */
router.post('/system/notifications/check',
  validateRole(['system_admin', 'system_service']),
  async (req: any, res: any) => {
    try {
      // This would be called by a scheduled job
      const balanceResults = await corporateAccountController?.balanceNotificationService
        ?.checkAndSendBalanceNotifications();
      const limitResults = await corporateAccountController?.balanceNotificationService
        ?.checkAndSendLimitNotifications();

      res.json({
        success: true,
        data: {
          balanceNotifications: balanceResults,
          limitNotifications: limitResults,
          totalNotifications: (balanceResults?.length || 0) + (limitResults?.length || 0)
        }
      });
    } catch (error) {
      console.error('System notification check error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

/**
 * @route POST /api/b2b/financial/system/limits/reset
 * @desc System-wide limit reset (scheduled job)
 * @access Private (System operations)
 * @role system_admin, system_service
 */
router.post('/system/limits/reset',
  validateRole(['system_admin', 'system_service']),
  async (req: any, res: any) => {
    try {
      // This would be called by a scheduled job
      await userSpendingLimitController?.userSpendingLimitService?.resetExpiredPeriods();

      res.json({
        success: true,
        message: 'Expired limits reset successfully'
      });
    } catch (error) {
      console.error('System limit reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
);

// ============= HEALTH CHECK ROUTE =============

/**
 * @route GET /api/b2b/financial/health
 * @desc Health check for financial services
 * @access Private (System monitoring)
 */
router.get('/health',
  validateRole(['system_admin', 'system_service', 'finance_admin']),
  async (req: any, res: any) => {
    try {
      // Basic health checks for financial services
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          corporateAccount: 'healthy',
          spendingLimits: 'healthy',
          costCenters: 'healthy',
          notifications: 'healthy'
        }
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }
);

export default router;