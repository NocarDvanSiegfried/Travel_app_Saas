import { Request, Response } from 'express';
import { CorporateAccountService } from '../../application/services/CorporateAccountService';
import { UserSpendingLimitService } from '../../application/services/UserSpendingLimitService';
import { BalanceNotificationService } from '../../application/services/BalanceNotificationService';
import { validateUUID, validatePositiveNumber } from '../validators/common.validator';

export class CorporateAccountController {
  constructor(
    private readonly corporateAccountService: CorporateAccountService,
    private readonly userSpendingLimitService: UserSpendingLimitService,
    private readonly balanceNotificationService: BalanceNotificationService
  ) {}

  /**
   * GET /api/b2b/corporate-accounts/:companyId
   * Получить информацию о корпоративном счете
   */
  async getAccount(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      const account = await this.corporateAccountService.getAccountDetails(companyId);

      if (!account) {
        res.status(404).json({
          success: false,
          error: 'Corporate account not found'
        });
        return;
      }

      res.json({
        success: true,
        data: account.toJSON()
      });

    } catch (error) {
      console.error('Get account error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/b2b/corporate-accounts/:companyId/balance
   * Проверить баланс и доступность средств
   */
  async checkBalance(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const { amount } = req.query;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount parameter'
        });
        return;
      }

      const checkResult = await this.corporateAccountService.checkBalance(
        companyId,
        Number(amount)
      );

      res.json({
        success: true,
        data: checkResult
      });

    } catch (error) {
      console.error('Check balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/b2b/corporate-accounts/:companyId/deposit
   * Пополнить корпоративный счет
   */
  async deposit(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const { amount, description, externalReference } = req.body;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      if (!validatePositiveNumber(amount)) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number'
        });
        return;
      }

      if (!description || typeof description !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Description is required'
        });
        return;
      }

      const result = await this.corporateAccountService.processDeposit(
        companyId,
        amount,
        description,
        { externalReference }
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      // Проверяем необходимость уведомлений
      setTimeout(async () => {
        try {
          await this.corporateAccountService.checkAndProcessAutoTopup(companyId);
        } catch (error) {
          console.error('Auto topup check error:', error);
        }
      }, 0);

      res.status(201).json({
        success: true,
        data: {
          transaction: result.transaction?.toJSON(),
          account: result.updatedAccount?.toJSON()
        }
      });

    } catch (error) {
      console.error('Deposit error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/b2b/corporate-accounts/:companyId/withdraw
   * Списать средства со счета
   */
  async withdraw(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const {
        amount,
        description,
        userId,
        costCenterId,
        ticketId,
        category,
        tags
      } = req.body;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      if (!validatePositiveNumber(amount)) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number'
        });
        return;
      }

      if (!description || typeof description !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Description is required'
        });
        return;
      }

      const transactionRequest = {
        companyId,
        amount,
        description,
        userId: userId ? validateUUID(userId) ? userId : undefined : undefined,
        costCenterId: costCenterId ? validateUUID(costCenterId) ? costCenterId : undefined : undefined,
        ticketId: ticketId ? validateUUID(ticketId) ? ticketId : undefined : undefined,
        category: typeof category === 'string' ? category : undefined,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        tags: tags && typeof tags === 'object' ? tags : undefined
      };

      const result = await this.corporateAccountService.processWithdrawal(transactionRequest);

      if (!result.success) {
        if (result.requiresApproval) {
          res.status(202).json({
            success: false,
            requiresApproval: true,
            approvalReason: result.approvalReason,
            error: result.error
          });
          return;
        }

        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      // Проверяем необходимость уведомлений
      setTimeout(async () => {
        try {
          await this.balanceNotificationService.checkAndSendBalanceNotifications();
          await this.balanceNotificationService.checkAndSendLimitNotifications();
        } catch (error) {
          console.error('Notification check error:', error);
        }
      }, 0);

      res.status(201).json({
        success: true,
        data: {
          transaction: result.transaction?.toJSON(),
          account: result.updatedAccount?.toJSON(),
          limits: result.updatedLimits?.map(limit => limit.toJSON()),
          costCenter: result.updatedCostCenter?.toJSON()
        }
      });

    } catch (error) {
      console.error('Withdrawal error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/b2b/corporate-accounts/:companyId/refund
   * Выполнить возврат средств
   */
  async refund(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const { originalTransactionId, refundAmount, refundReason } = req.body;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      if (!validateUUID(originalTransactionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid original transaction ID format'
        });
        return;
      }

      if (!validatePositiveNumber(refundAmount)) {
        res.status(400).json({
          success: false,
          error: 'Invalid refund amount. Must be a positive number'
        });
        return;
      }

      if (!refundReason || typeof refundReason !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Refund reason is required'
        });
        return;
      }

      const result = await this.corporateAccountService.processRefund(
        originalTransactionId,
        refundAmount,
        refundReason
      );

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          transaction: result.transaction?.toJSON(),
          account: result.updatedAccount?.toJSON(),
          limits: result.updatedLimits?.map(limit => limit.toJSON()),
          costCenter: result.updatedCostCenter?.toJSON()
        }
      });

    } catch (error) {
      console.error('Refund error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/b2b/corporate-accounts/:companyId/transactions
   * Получить историю транзакций
   */
  async getTransactionHistory(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const {
        limit,
        offset,
        transactionType,
        startDate,
        endDate,
        userId,
        costCenterId
      } = req.query;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      const options: any = {};

      if (limit && !isNaN(Number(limit))) {
        options.limit = Math.min(Number(limit), 100); // Ограничиваем максимум 100
      }

      if (offset && !isNaN(Number(offset))) {
        options.offset = Number(offset);
      }

      if (transactionType && typeof transactionType === 'string') {
        options.transactionType = transactionType;
      }

      if (startDate && !isNaN(Date.parse(startDate as string))) {
        options.startDate = new Date(startDate as string);
      }

      if (endDate && !isNaN(Date.parse(endDate as string))) {
        options.endDate = new Date(endDate as string);
      }

      if (userId && validateUUID(userId as string)) {
        options.userId = userId;
      }

      if (costCenterId && validateUUID(costCenterId as string)) {
        options.costCenterId = costCenterId;
      }

      const transactions = await this.corporateAccountService.getTransactionHistory(
        companyId,
        options
      );

      res.json({
        success: true,
        data: {
          transactions: transactions.map(txn => txn.toJSON()),
          total: transactions.length
        }
      });

    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/b2b/corporate-accounts/:companyId/spending-analytics
   * Получить аналитику по тратам
   */
  async getSpendingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const { userId } = req.query;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      if (userId && !validateUUID(userId as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format'
        });
        return;
      }

      let analytics;
      if (userId) {
        analytics = await this.userSpendingLimitService.getUserSpendingAnalytics(
          userId as string,
          companyId
        );
      } else {
        // Аналитика по всей компании
        const stats = await this.userSpendingLimitService.getCompanyLimitStatistics(companyId);
        analytics = stats;
      }

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      console.error('Get spending analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/b2b/corporate-accounts/:companyId/check-limits
   * Проверить лимиты пользователя перед транзакцией
   */
  async checkLimits(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const { amount, userId, costCenterId, category } = req.body;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      if (!validateUUID(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID format'
        });
        return;
      }

      if (!validatePositiveNumber(amount)) {
        res.status(400).json({
          success: false,
          error: 'Invalid amount. Must be a positive number'
        });
        return;
      }

      const limitCheck = await this.userSpendingLimitService.checkLimits({
        userId,
        companyId,
        amount,
        category: typeof category === 'string' ? category : undefined,
        costCenterId: costCenterId && validateUUID(costCenterId) ? costCenterId : undefined
      });

      res.json({
        success: true,
        data: limitCheck
      });

    } catch (error) {
      console.error('Check limits error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/b2b/corporate-accounts/:companyId/limits
   * Получить все лимиты компании
   */
  async getCompanyLimits(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      const limits = await this.userSpendingLimitService.getCompanyLimits(companyId);

      res.json({
        success: true,
        data: {
          limits: limits.map(limit => limit.toJSON()),
          total: limits.length
        }
      });

    } catch (error) {
      console.error('Get company limits error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/b2b/corporate-accounts/:companyId/users/:userId/limits
   * Получить лимиты конкретного пользователя
   */
  async getUserLimits(req: Request, res: Response): Promise<void> {
    try {
      const { companyId, userId } = req.params;
      const { costCenterId } = req.query;

      if (!validateUUID(companyId) || !validateUUID(userId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid ID format'
        });
        return;
      }

      if (costCenterId && !validateUUID(costCenterId as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid cost center ID format'
        });
        return;
      }

      const limits = await this.userSpendingLimitService.getUserLimits(
        userId,
        companyId,
        costCenterId as string
      );

      res.json({
        success: true,
        data: {
          limits: limits.map(limit => limit.toJSON()),
          total: limits.length
        }
      });

    } catch (error) {
      console.error('Get user limits error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/b2b/corporate-accounts/:companyId/notifications/check
   * Принудительно проверить и отправить уведомления
   */
  async checkNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      const balanceResults = await this.balanceNotificationService.checkAndSendBalanceNotifications();
      const limitResults = await this.balanceNotificationService.checkAndSendLimitNotifications();

      res.json({
        success: true,
        data: {
          balanceNotifications: balanceResults,
          limitNotifications: limitResults,
          totalNotifications: balanceResults.length + limitResults.length
        }
      });

    } catch (error) {
      console.error('Check notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/b2b/corporate-accounts/:companyId/auto-topup/check
   * Проверить и выполнить автопополнение
   */
  async checkAutoTopup(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;

      if (!validateUUID(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid company ID format'
        });
        return;
      }

      const result = await this.corporateAccountService.checkAndProcessAutoTopup(companyId);

      res.json({
        success: true,
        data: {
          autoTopupExecuted: !!result,
          result: result ? {
            transaction: result.transaction?.toJSON(),
            account: result.updatedAccount?.toJSON()
          } : null
        }
      });

    } catch (error) {
      console.error('Check auto topup error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}