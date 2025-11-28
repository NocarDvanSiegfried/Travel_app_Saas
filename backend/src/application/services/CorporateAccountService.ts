import { CorporateAccount, TransactionLog, UserSpendingLimit, CostCenter } from '../../domain/entities';
import { CorporateAccountRepository } from '../../infrastructure/database/repositories/CorporateAccountRepository';
import { TransactionLogRepository } from '../../infrastructure/database/repositories/TransactionLogRepository';
import { UserSpendingLimitRepository } from '../../infrastructure/database/repositories/UserSpendingLimitRepository';
import { CostCenterRepository } from '../../infrastructure/database/repositories/CostCenterRepository';
import { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

export interface TransactionRequest {
  companyId: string;
  amount: number;
  description: string;
  userId?: string;
  costCenterId?: string;
  ticketId?: string;
  category?: string;
  ipAddress?: string;
  userAgent?: string;
  externalReference?: string;
  tags?: Record<string, any>;
}

export interface TransactionResult {
  success: boolean;
  transaction?: TransactionLog;
  updatedAccount?: CorporateAccount;
  updatedLimits?: UserSpendingLimit[];
  updatedCostCenter?: CostCenter;
  error?: string;
  requiresApproval?: boolean;
  approvalReason?: string;
}

export interface BalanceCheckResult {
  sufficient: boolean;
  availableBalance: number;
  requestedAmount: number;
  shortfall?: number;
  accountStatus: string;
  blockedReasons?: string[];
}

export interface DepositOptions {
  autoTopup?: boolean;
  externalReference?: string;
  description?: string;
}

export class CorporateAccountService {
  constructor(
    private readonly corporateAccountRepository: CorporateAccountRepository,
    private readonly transactionLogRepository: TransactionLogRepository,
    private readonly userSpendingLimitRepository: UserSpendingLimitRepository,
    private readonly costCenterRepository: CostCenterRepository,
    private readonly db: DatabaseConnection
  ) {}

  /**
   * Проверяет баланс корпоративного счета
   */
  async checkBalance(companyId: string, amount: number): Promise<BalanceCheckResult> {
    const account = await this.corporateAccountRepository.findByCompanyId(companyId);
    if (!account) {
      throw new Error(`Corporate account not found for company: ${companyId}`);
    }

    const blockedReasons: string[] = [];

    if (!account.isActive()) {
      blockedReasons.push('Account is not active');
    }

    const sufficient = account.hasSufficientFunds(amount);
    const availableBalance = account.getAvailableBalance();

    if (!sufficient) {
      blockedReasons.push(`Insufficient funds. Available: ${availableBalance}, Required: ${amount}`);
    }

    return {
      sufficient: sufficient && blockedReasons.length === 0,
      availableBalance,
      requestedAmount: amount,
      shortfall: sufficient ? undefined : amount - availableBalance,
      accountStatus: account.accountStatus,
      blockedReasons: blockedReasons.length > 0 ? blockedReasons : undefined
    };
  }

  /**
   * Выполняет атомарную транзакцию списания
   */
  async processWithdrawal(request: TransactionRequest): Promise<TransactionResult> {
    return await this.db.transaction(async (client) => {
      try {
        // Получаем и блокируем счет
        const account = await this.corporateAccountRepository.findByCompanyIdForUpdate(
          request.companyId,
          client
        );
        if (!account) {
          return {
            success: false,
            error: `Corporate account not found for company: ${request.companyId}`
          };
        }

        // Проверяем возможность списания
        const withdrawalCheck = account.canWithdraw(request.amount);
        if (!withdrawalCheck.allowed) {
          return {
            success: false,
            error: withdrawalCheck.reason
          };
        }

        // Проверяем пользовательские лимиты
        if (request.userId) {
          const limitCheckResult = await this.checkUserSpendingLimits(
            request.userId,
            request.amount,
            request.costCenterId,
            request.category
          );

          if (!limitCheckResult.allowed) {
            if (limitCheckResult.requiresApproval) {
              return {
                success: false,
                error: limitCheckResult.reason,
                requiresApproval: true,
                approvalReason: limitCheckResult.reason
              };
            }
            return {
              success: false,
              error: limitCheckResult.reason
            };
          }
        }

        // Проверяем лимиты центра затрат
        let updatedCostCenter: CostCenter | undefined;
        if (request.costCenterId) {
          const costCenter = await this.costCenterRepository.findByIdForUpdate(
            request.costCenterId,
            client
          );
          if (costCenter && !costCenter.canSpend(request.amount)) {
            return {
              success: false,
              error: `Cost center budget exceeded. Current: ${costCenter.currentSpend}, Limit: ${costCenter.budgetLimit}`
            };
          }
          if (costCenter) {
            updatedCostCenter = costCenter.addSpend(request.amount);
          }
        }

        // Создаем транзакцию
        const transaction = TransactionLog.createWithdrawal(
          request.companyId,
          request.amount,
          account.currentDepositBalance,
          request.description,
          {
            ticketId: request.ticketId,
            userId: request.userId,
            costCenterId: request.costCenterId,
            category: request.category,
            ipAddress: request.ipAddress,
            userAgent: request.userAgent
          }
        );

        // Обновляем баланс счета
        const updatedAccount = account.afterWithdrawal(request.amount);

        // Обновляем пользовательские лимиты
        const updatedLimits: UserSpendingLimit[] = [];
        if (request.userId) {
          const limits = await this.userSpendingLimitRepository.findActiveLimitsForUser(
            request.userId,
            request.companyId,
            client
          );
          for (const limit of limits) {
            if (limit.isInActivePeriod() || limit.limitType === 'per_transaction') {
              const updatedLimit = limit.addSpend(request.amount);
              updatedLimits.push(updatedLimit);
            }
          }
        }

        // Сохраняем все изменения в рамках одной транзакции
        const savedTransaction = await this.transactionLogRepository.save(
          transaction,
          client
        );
        const savedAccount = await this.corporateAccountRepository.save(
          updatedAccount,
          client
        );

        if (updatedCostCenter) {
          await this.costCenterRepository.save(updatedCostCenter, client);
        }

        for (const limit of updatedLimits) {
          await this.userSpendingLimitRepository.save(limit, client);
        }

        return {
          success: true,
          transaction: savedTransaction,
          updatedAccount: savedAccount,
          updatedLimits,
          updatedCostCenter
        };

      } catch (error) {
        console.error('Withdrawal processing error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Выполняет пополнение счета
   */
  async processDeposit(
    companyId: string,
    amount: number,
    description: string,
    options: DepositOptions = {}
  ): Promise<TransactionResult> {
    return await this.db.transaction(async (client) => {
      try {
        const account = await this.corporateAccountRepository.findByCompanyIdForUpdate(
          companyId,
          client
        );
        if (!account) {
          return {
            success: false,
            error: `Corporate account not found for company: ${companyId}`
          };
        }

        const transaction = TransactionLog.createDeposit(
          companyId,
          amount,
          account.currentDepositBalance,
          description,
          {
            externalReference: options.externalReference,
            userId: undefined, // Пополнения обычно делают системные пользователи
            costCenterId: undefined,
            category: 'deposit',
            metadata: { autoTopup: options.autoTopup }
          }
        );

        const updatedAccount = account.afterDeposit(amount);

        const savedTransaction = await this.transactionLogRepository.save(transaction, client);
        const savedAccount = await this.corporateAccountRepository.save(updatedAccount, client);

        return {
          success: true,
          transaction: savedTransaction,
          updatedAccount: savedAccount
        };

      } catch (error) {
        console.error('Deposit processing error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Выполняет возврат средств
   */
  async processRefund(
    originalTransactionId: string,
    refundAmount: number,
    refundReason: string
  ): Promise<TransactionResult> {
    return await this.db.transaction(async (client) => {
      try {
        const originalTransaction = await this.transactionLogRepository.findById(
          originalTransactionId,
          client
        );
        if (!originalTransaction) {
          return {
            success: false,
            error: `Original transaction not found: ${originalTransactionId}`
          };
        }

        if (!originalTransaction.isWithdrawal()) {
          return {
            success: false,
            error: 'Refunds are only allowed for withdrawal transactions'
          };
        }

        // Проверяем, что сумма возврата не превышает оригинальную
        if (refundAmount > originalTransaction.amount) {
          return {
            success: false,
            error: `Refund amount ${refundAmount} exceeds original transaction amount ${originalTransaction.amount}`
          };
        }

        const account = await this.corporateAccountRepository.findByCompanyIdForUpdate(
          originalTransaction.companyId,
          client
        );
        if (!account) {
          return {
            success: false,
            error: `Corporate account not found for company: ${originalTransaction.companyId}`
          };
        }

        // Создаем транзакцию возврата
        const refundTransaction = TransactionLog.createRefund(
          originalTransaction,
          refundAmount,
          refundReason
        );

        // Обновляем баланс
        const updatedAccount = new CorporateAccount(
          account.id,
          account.companyId,
          account.currentDepositBalance + refundAmount,
          account.totalDeposited,
          account.totalWithdrawn - refundAmount,
          account.currency,
          account.accountStatus,
          account.creditLimit,
          account.minimumBalanceThreshold,
          false, // Сбрасываем флаг уведомления о низком балансе
          account.autoTopupEnabled,
          account.autoTopupAmount,
          account.autoTopupThreshold,
          account.lastDepositDate,
          account.lastWithdrawalDate,
          account.createdAt,
          new Date()
        );

        // Возвращаем траты в центр затрат
        let updatedCostCenter: CostCenter | undefined;
        if (originalTransaction.costCenterId) {
          const costCenter = await this.costCenterRepository.findByIdForUpdate(
            originalTransaction.costCenterId,
            client
          );
          if (costCenter) {
            updatedCostCenter = costCenter.refundSpend(refundAmount);
          }
        }

        // Возвращаем траты в пользовательские лимиты
        const updatedLimits: UserSpendingLimit[] = [];
        if (originalTransaction.userId) {
          const limits = await this.userSpendingLimitRepository.findActiveLimitsForUser(
            originalTransaction.userId,
            originalTransaction.companyId,
            client
          );
          for (const limit of limits) {
            if (limit.isInActivePeriod() || limit.limitType === 'per_transaction') {
              const updatedLimit = limit.refundSpend(refundAmount);
              updatedLimits.push(updatedLimit);
            }
          }
        }

        // Сохраняем все изменения
        const savedRefundTransaction = await this.transactionLogRepository.save(
          refundTransaction,
          client
        );
        const savedAccount = await this.corporateAccountRepository.save(updatedAccount, client);

        if (updatedCostCenter) {
          await this.costCenterRepository.save(updatedCostCenter, client);
        }

        for (const limit of updatedLimits) {
          await this.userSpendingLimitRepository.save(limit, client);
        }

        return {
          success: true,
          transaction: savedRefundTransaction,
          updatedAccount: savedAccount,
          updatedLimits,
          updatedCostCenter
        };

      } catch (error) {
        console.error('Refund processing error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
  }

  /**
   * Проверяет пользовательские лимиты
   */
  private async checkUserSpendingLimits(
    userId: string,
    amount: number,
    costCenterId?: string,
    category?: string
  ): Promise<{ allowed: boolean; reason?: string; requiresApproval?: boolean }> {
    const limits = await this.userSpendingLimitRepository.findActiveLimitsForUser(
      userId,
      '', // companyId не нужен для проверки лимитов
    );

    // Проверяем общие лимиты (не привязанные к центру затрат)
    const generalLimits = limits.filter(limit => !limit.isCostCenterSpecific());
    for (const limit of generalLimits) {
      const check = limit.canSpend(amount, category);
      if (!check.allowed) {
        return {
          allowed: false,
          reason: check.reason,
          requiresApproval: check.requiresApproval
        };
      }
    }

    // Проверяем лимиты для конкретного центра затрат
    if (costCenterId) {
      const costCenterLimits = limits.filter(
        limit => limit.costCenterId === costCenterId || limit.limitType === 'cost_center_monthly'
      );
      for (const limit of costCenterLimits) {
        const check = limit.canSpend(amount, category);
        if (!check.allowed) {
          return {
            allowed: false,
            reason: check.reason,
            requiresApproval: check.requiresApproval
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Получает детализированную информацию о счете
   */
  async getAccountDetails(companyId: string): Promise<CorporateAccount | null> {
    return await this.corporateAccountRepository.findByCompanyId(companyId);
  }

  /**
   * Получает историю транзакций компании
   */
  async getTransactionHistory(
    companyId: string,
    options: {
      limit?: number;
      offset?: number;
      transactionType?: string;
      startDate?: Date;
      endDate?: Date;
      userId?: string;
      costCenterId?: string;
    } = {}
  ): Promise<TransactionLog[]> {
    return await this.transactionLogRepository.findByCompanyWithFilters(
      companyId,
      options
    );
  }

  /**
   * Проверяет необходимость автопополнения и выполняет его
   */
  async checkAndProcessAutoTopup(companyId: string): Promise<TransactionResult | null> {
    const account = await this.corporateAccountRepository.findByCompanyId(companyId);
    if (!account || !account.shouldAutoTopup()) {
      return null;
    }

    return await this.processDeposit(
      companyId,
      account.autoTopupAmount!,
      'Автоматическое пополнение счета',
      { autoTopup: true }
    );
  }

  /**
   * Проверяет и возвращает счета, требующие уведомления о низком балансе
   */
  async getAccountsRequiringLowBalanceAlert(): Promise<CorporateAccount[]> {
    return await this.corporateAccountRepository.findAccountsRequiringLowBalanceAlert();
  }

  /**
   * Помечает уведомление о низком балансе как отправленное
   */
  async markLowBalanceAlertSent(accountId: string): Promise<void> {
    const account = await this.corporateAccountRepository.findById(accountId);
    if (account) {
      const updatedAccount = account.markLowBalanceAlertSent();
      await this.corporateAccountRepository.save(updatedAccount);
    }
  }
}