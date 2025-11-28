import { UserSpendingLimit, LimitType } from '../../domain/entities';
import { UserSpendingLimitRepository } from '../../infrastructure/database/repositories/UserSpendingLimitRepository';
import { CorporateAccountRepository } from '../../infrastructure/database/repositories/CorporateAccountRepository';
import { DatabaseConnection } from '../../infrastructure/database/DatabaseConnection';

export interface CreateLimitRequest {
  companyId: string;
  userId: string;
  limitType: LimitType;
  limitAmount: number;
  costCenterId?: string;
  requireApproval?: boolean;
  approvalThreshold?: number;
  approverId?: string;
  maxTransactionsPerPeriod?: number;
  maxSingleTransactionAmount?: number;
  allowedCategories?: string[];
  warningThresholdPercent?: number;
  blockWhenExceeded?: boolean;
  notes?: string;
  resetDayOfMonth?: number;
  createdById: string;
}

export interface UpdateLimitRequest {
  limitAmount?: number;
  requireApproval?: boolean;
  approvalThreshold?: number;
  approverId?: string;
  maxTransactionsPerPeriod?: number;
  maxSingleTransactionAmount?: number;
  allowedCategories?: string[];
  warningThresholdPercent?: number;
  blockWhenExceeded?: boolean;
  notes?: string;
  isActive?: boolean;
}

export interface LimitCheckRequest {
  userId: string;
  companyId: string;
  amount: number;
  category?: string;
  costCenterId?: string;
}

export interface LimitCheckResponse {
  allowed: boolean;
  reason?: string;
  requiresApproval: boolean;
  blockingLimits: Array<{
    limitId: string;
    limitType: LimitType;
    currentSpend: number;
    limitAmount: number;
    reason: string;
  }>;
  warningLimits: Array<{
    limitId: string;
    limitType: LimitType;
    currentSpend: number;
    limitAmount: number;
    utilizationPercentage: number;
  }>;
  totalAvailableAmount: number;
}

export interface SpendingAnalytics {
  totalSpent: number;
  totalLimit: number;
  utilizationPercentage: number;
  limits: Array<{
    id: string;
    limitType: LimitType;
    limitAmount: number;
    currentSpend: number;
    utilizationPercentage: number;
    remainingAmount: number;
    daysRemaining?: number;
    isActive: boolean;
    period?: {
      startDate: Date;
      endDate: Date;
      isActive: boolean;
    };
  }>;
  recommendations: string[];
}

export class UserSpendingLimitService {
  constructor(
    private readonly userSpendingLimitRepository: UserSpendingLimitRepository,
    private readonly corporateAccountRepository: CorporateAccountRepository,
    private readonly db: DatabaseConnection
  ) {}

  /**
   * Создает новый лимит для пользователя
   */
  async createLimit(request: CreateLimitRequest): Promise<UserSpendingLimit> {
    // Проверяем существование лимита с такими же параметрами
    const existingLimit = await this.userSpendingLimitRepository.findByUserAndType(
      request.userId,
      request.companyId,
      request.limitType,
      request.costCenterId
    );

    if (existingLimit) {
      throw new Error(`Limit already exists for user ${request.userId} with type ${request.limitType}`);
    }

    const limit = UserSpendingLimit.createNew(
      request.companyId,
      request.userId,
      request.limitType,
      request.limitAmount,
      {
        costCenterId: request.costCenterId,
        requireApproval: request.requireApproval,
        approvalThreshold: request.approvalThreshold,
        approverId: request.approverId,
        maxTransactionsPerPeriod: request.maxTransactionsPerPeriod,
        maxSingleTransactionAmount: request.maxSingleTransactionAmount,
        allowedCategories: request.allowedCategories,
        warningThresholdPercent: request.warningThresholdPercent,
        blockWhenExceeded: request.blockWhenExceeded,
        notes: request.notes,
        createdById: request.createdById
      }
    );

    return await this.userSpendingLimitRepository.save(limit);
  }

  /**
   * Обновляет существующий лимит
   */
  async updateLimit(
    limitId: string,
    updates: UpdateLimitRequest
  ): Promise<UserSpendingLimit> {
    const existingLimit = await this.userSpendingLimitRepository.findById(limitId);
    if (!existingLimit) {
      throw new Error(`Limit not found: ${limitId}`);
    }

    let updatedLimit = existingLimit;

    if (updates.limitAmount !== undefined) {
      updatedLimit = updatedLimit.updateLimitAmount(updates.limitAmount);
    }

    if (updates.isActive !== undefined) {
      updatedLimit = updatedLimit.setActive(updates.isActive);
    }

    // Для обновления других полей нужно создать новый экземпляр
    if (updates.requireApproval !== undefined ||
        updates.approvalThreshold !== undefined ||
        updates.approverId !== undefined ||
        updates.maxTransactionsPerPeriod !== undefined ||
        updates.maxSingleTransactionAmount !== undefined ||
        updates.allowedCategories !== undefined ||
        updates.warningThresholdPercent !== undefined ||
        updates.blockWhenExceeded !== undefined ||
        updates.notes !== undefined) {

      updatedLimit = UserSpendingLimit.create({
        ...updatedLimit,
        requireApproval: updates.requireApproval ?? updatedLimit.requireApproval,
        approvalThreshold: updates.approvalThreshold ?? updatedLimit.approvalThreshold,
        approverId: updates.approverId ?? updatedLimit.approverId,
        maxTransactionsPerPeriod: updates.maxTransactionsPerPeriod ?? updatedLimit.maxTransactionsPerPeriod,
        maxSingleTransactionAmount: updates.maxSingleTransactionAmount ?? updatedLimit.maxSingleTransactionAmount,
        allowedCategories: updates.allowedCategories ?? updatedLimit.allowedCategories,
        warningThresholdPercent: updates.warningThresholdPercent ?? updatedLimit.warningThresholdPercent,
        blockWhenExceeded: updates.blockWhenExceeded ?? updatedLimit.blockWhenExceeded,
        notes: updates.notes ?? updatedLimit.notes
      });
    }

    return await this.userSpendingLimitRepository.save(updatedLimit);
  }

  /**
   * Проверяет лимиты пользователя перед транзакцией
   */
  async checkLimits(request: LimitCheckRequest): Promise<LimitCheckResponse> {
    const limits = await this.userSpendingLimitRepository.findActiveLimitsForUser(
      request.userId,
      request.companyId
    );

    const blockingLimits: Array<{
      limitId: string;
      limitType: LimitType;
      currentSpend: number;
      limitAmount: number;
      reason: string;
    }> = [];

    const warningLimits: Array<{
      limitId: string;
      limitType: LimitType;
      currentSpend: number;
      limitAmount: number;
      utilizationPercentage: number;
    }> = [];

    let requiresApproval = false;
    let totalAvailableAmount = Infinity;

    // Проверяем общие лимиты (не привязанные к центру затрат)
    const generalLimits = limits.filter(limit => !limit.isCostCenterSpecific());
    for (const limit of generalLimits) {
      const check = limit.canSpend(request.amount, request.category);

      if (!check.allowed) {
        if (check.requiresApproval) {
          requiresApproval = true;
        } else {
          blockingLimits.push({
            limitId: limit.id,
            limitType: limit.limitType,
            currentSpend: limit.currentSpend,
            limitAmount: limit.limitAmount,
            reason: check.reason || 'Limit exceeded'
          });
        }
      }

      if (limit.isWarningThresholdReached() && !limit.warningSent) {
        warningLimits.push({
          limitId: limit.id,
          limitType: limit.limitType,
          currentSpend: limit.currentSpend,
          limitAmount: limit.limitAmount,
          utilizationPercentage: limit.getUtilizationPercentage()
        });
      }

      if (limit.limitType !== 'per_transaction') {
        totalAvailableAmount = Math.min(totalAvailableAmount, limit.getRemainingAmount());
      }
    }

    // Проверяем лимиты для конкретного центра затрат
    if (request.costCenterId) {
      const costCenterLimits = limits.filter(
        limit => limit.costCenterId === request.costCenterId ||
                (limit.limitType === 'cost_center_monthly' && limit.isCostCenterSpecific())
      );

      for (const limit of costCenterLimits) {
        const check = limit.canSpend(request.amount, request.category);

        if (!check.allowed) {
          if (check.requiresApproval) {
            requiresApproval = true;
          } else {
            blockingLimits.push({
              limitId: limit.id,
              limitType: limit.limitType,
              currentSpend: limit.currentSpend,
              limitAmount: limit.limitAmount,
              reason: check.reason || 'Cost center limit exceeded'
            });
          }
        }

        if (limit.isWarningThresholdReached() && !limit.warningSent) {
          warningLimits.push({
            limitId: limit.id,
            limitType: limit.limitType,
            currentSpend: limit.currentSpend,
            limitAmount: limit.limitAmount,
            utilizationPercentage: limit.getUtilizationPercentage()
          });
        }

        if (limit.limitType !== 'per_transaction') {
          totalAvailableAmount = Math.min(totalAvailableAmount, limit.getRemainingAmount());
        }
      }
    }

    // Проверяем общий баланс компании
    const account = await this.corporateAccountRepository.findByCompanyId(request.companyId);
    if (account) {
      totalAvailableAmount = Math.min(totalAvailableAmount, account.getAvailableBalance());
    }

    return {
      allowed: blockingLimits.length === 0,
      reason: blockingLimits.length > 0 ? blockingLimits[0].reason : undefined,
      requiresApproval,
      blockingLimits,
      warningLimits,
      totalAvailableAmount
    };
  }

  /**
   * Получает все лимиты пользователя
   */
  async getUserLimits(
    userId: string,
    companyId: string,
    costCenterId?: string
  ): Promise<UserSpendingLimit[]> {
    return await this.userSpendingLimitRepository.findByUserAndCompany(
      userId,
      companyId,
      costCenterId
    );
  }

  /**
   * Получает аналитику по тратам пользователя
   */
  async getUserSpendingAnalytics(
    userId: string,
    companyId: string
  ): Promise<SpendingAnalytics> {
    const limits = await this.userSpendingLimitRepository.findByUserAndCompany(
      userId,
      companyId
    );

    const activeLimits = limits.filter(limit => limit.isActiveLimit());
    const totalLimit = activeLimits
      .filter(limit => limit.limitType !== 'per_transaction')
      .reduce((sum, limit) => sum + limit.limitAmount, 0);

    const totalSpent = activeLimits
      .filter(limit => limit.limitType !== 'per_transaction')
      .reduce((sum, limit) => sum + limit.currentSpend, 0);

    const utilizationPercentage = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;

    const limitAnalytics = activeLimits.map(limit => ({
      id: limit.id,
      limitType: limit.limitType,
      limitAmount: limit.limitAmount,
      currentSpend: limit.currentSpend,
      utilizationPercentage: limit.getUtilizationPercentage(),
      remainingAmount: limit.getRemainingAmount(),
      daysRemaining: limit.getCurrentPeriod()?.daysRemaining,
      isActive: limit.isActiveLimit(),
      period: limit.getCurrentPeriod() ? {
        startDate: limit.getCurrentPeriod()!.startDate,
        endDate: limit.getCurrentPeriod()!.endDate,
        isActive: limit.getCurrentPeriod()!.isActive
      } : undefined
    }));

    const recommendations = this.generateRecommendations(activeLimits, utilizationPercentage);

    return {
      totalSpent,
      totalLimit,
      utilizationPercentage,
      limits: limitAnalytics,
      recommendations
    };
  }

  /**
   * Генерирует рекомендации по управлению лимитами
   */
  private generateRecommendations(limits: UserSpendingLimit[], overallUtilization: number): string[] {
    const recommendations: string[] = [];

    if (overallUtilization > 90) {
      recommendations.push('Рассмотрите увеличение лимитов или сокращение расходов');
    }

    const nearLimitLimits = limits.filter(limit => limit.getUtilizationPercentage() > 80);
    if (nearLimitLimits.length > 0) {
      recommendations.push('Несколько лимитов близки к превышению. Мониторьте траты внимательно.');
    }

    const unusedLimits = limits.filter(limit =>
      limit.isActiveLimit() && limit.getUtilizationPercentage() < 20 && limit.limitAmount > 0
    );
    if (unusedLimits.length > 0) {
      recommendations.push('Некоторые лимиты используются недостаточно. Возможно, стоит пересмотреть их размер.');
    }

    const expiredLimits = limits.filter(limit => !limit.isInActivePeriod() && limit.limitType !== 'per_transaction');
    if (expiredLimits.length > 0) {
      recommendations.push('Обнаружены просроченные лимиты. Рекомендуется обновить периоды.');
    }

    return recommendations;
  }

  /**
   * Сбрасывает просроченные периоды лимитов
   */
  async resetExpiredPeriods(): Promise<void> {
    return await this.db.transaction(async (client) => {
      const expiredLimits = await this.userSpendingLimitRepository.findExpiredLimits(client);

      for (const limit of expiredLimits) {
        const resetLimit = limit.resetPeriod();
        await this.userSpendingLimitRepository.save(resetLimit, client);
      }
    });
  }

  /**
   * Получает лимиты, требующие предупреждений
   */
  async getLimitsRequiringWarnings(): Promise<UserSpendingLimit[]> {
    return await this.userSpendingLimitRepository.findLimitsRequiringWarnings();
  }

  /**
   * Помечает предупреждение как отправленное
   */
  async markWarningSent(limitId: string): Promise<void> {
    const limit = await this.userSpendingLimitRepository.findById(limitId);
    if (limit) {
      const updatedLimit = limit.markWarningSent();
      await this.userSpendingLimitRepository.save(updatedLimit);
    }
  }

  /**
   * Удаляет лимит
   */
  async deleteLimit(limitId: string): Promise<void> {
    const limit = await this.userSpendingLimitRepository.findById(limitId);
    if (!limit) {
      throw new Error(`Limit not found: ${limitId}`);
    }

    await this.userSpendingLimitRepository.delete(limitId);
  }

  /**
   * Получает лимиты для всех пользователей компании
   */
  async getCompanyLimits(companyId: string): Promise<UserSpendingLimit[]> {
    return await this.userSpendingLimitRepository.findByCompany(companyId);
  }

  /**
   * Массово обновляет лимиты при смене периода
   */
  async batchResetPeriodsForCompany(companyId: string): Promise<void> {
    return await this.db.transaction(async (client) => {
      const companyLimits = await this.userSpendingLimitRepository.findByCompany(companyId);
      const expiredLimits = companyLimits.filter(limit => limit.shouldResetPeriod());

      for (const limit of expiredLimits) {
        const resetLimit = limit.resetPeriod();
        await this.userSpendingLimitRepository.save(resetLimit, client);
      }
    });
  }

  /**
   * Получает статистику по лимитам компании
   */
  async getCompanyLimitStatistics(companyId: string): Promise<{
    totalLimits: number;
    activeLimits: number;
    totalLimitAmount: number;
    totalSpent: number;
    averageUtilization: number;
    usersWithLimits: number;
    overLimitUsers: number;
  }> {
    const limits = await this.userSpendingLimitRepository.findByCompany(companyId);

    const activeLimits = limits.filter(limit => limit.isActiveLimit());
    const totalLimitAmount = activeLimits
      .filter(limit => limit.limitType !== 'per_transaction')
      .reduce((sum, limit) => sum + limit.limitAmount, 0);

    const totalSpent = activeLimits
      .filter(limit => limit.limitType !== 'per_transaction')
      .reduce((sum, limit) => sum + limit.currentSpend, 0);

    const utilizationPercentages = activeLimits.map(limit => limit.getUtilizationPercentage());
    const averageUtilization = utilizationPercentages.length > 0
      ? utilizationPercentages.reduce((sum, pct) => sum + pct, 0) / utilizationPercentages.length
      : 0;

    const uniqueUsers = new Set(limits.map(limit => limit.userId));
    const overLimitUsers = new Set(
      limits.filter(limit => limit.isOverLimit()).map(limit => limit.userId)
    );

    return {
      totalLimits: limits.length,
      activeLimits: activeLimits.length,
      totalLimitAmount,
      totalSpent,
      averageUtilization,
      usersWithLimits: uniqueUsers.size,
      overLimitUsers: overLimitUsers.size
    };
  }
}