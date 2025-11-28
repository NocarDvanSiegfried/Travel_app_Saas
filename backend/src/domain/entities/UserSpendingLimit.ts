import { BaseEntity } from './BaseEntity';

export type LimitType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'per_transaction' | 'cost_center_monthly';

export interface LimitPeriod {
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  daysRemaining?: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentSpend: number;
  limitAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  requiresApproval: boolean;
  warningThresholdReached: boolean;
}

export interface LimitSummary {
  limitId: string;
  limitType: LimitType;
  limitAmount: number;
  currentSpend: number;
  transactionCount: number;
  utilizationPercentage: number;
  remainingAmount: number;
  isOverLimit: boolean;
  isActive: boolean;
  period?: LimitPeriod;
}

export class UserSpendingLimit implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly userId: string,
    public readonly limitType: LimitType,
    public readonly limitAmount: number,
    public readonly currentSpend: number = 0,
    public readonly currentTransactionCount: number = 0,
    public readonly costCenterId?: string,
    public readonly periodStartDate?: Date,
    public readonly periodEndDate?: Date,
    public readonly resetDayOfMonth?: number,
    public readonly isActive: boolean = true,
    public readonly requireApproval: boolean = false,
    public readonly approvalThreshold?: number,
    public readonly approverId?: string,
    public readonly maxTransactionsPerPeriod?: number,
    public readonly maxSingleTransactionAmount?: number,
    public readonly allowedCategories?: string[],
    public readonly warningThresholdPercent: number = 80.0,
    public readonly warningSent: boolean = false,
    public readonly blockWhenExceeded: boolean = true,
    public readonly notes?: string,
    public readonly createdById?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  // Бизнес-логика лимитов

  /**
   * Проверяет, активен ли лимит
   */
  isActiveLimit(): boolean {
    return this.isActive;
  }

  /**
   * Проверяет, находимся ли мы в активном периоде лимита
   */
  isInActivePeriod(): boolean {
    if (this.limitType === 'per_transaction') {
      return true; // Транзакционные лимиты всегда активны
    }

    const now = new Date();
    return this.periodStartDate !== undefined &&
           this.periodEndDate !== undefined &&
           now >= this.periodStartDate &&
           now <= this.periodEndDate;
  }

  /**
   * Возвращает текущий период лимита
   */
  getCurrentPeriod(): LimitPeriod | null {
    if (this.limitType === 'per_transaction' || !this.periodStartDate || !this.periodEndDate) {
      return null;
    }

    const now = new Date();
    const isActive = now >= this.periodStartDate && now <= this.periodEndDate;
    const daysRemaining = isActive
      ? Math.ceil((this.periodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      startDate: this.periodStartDate,
      endDate: this.periodEndDate,
      isActive,
      daysRemaining
    };
  }

  /**
   * Проверяет, превышен ли лимит
   */
  isOverLimit(): boolean {
    return this.currentSpend > this.limitAmount;
  }

  /**
   * Возвращает процент использования лимита
   */
  getUtilizationPercentage(): number {
    if (this.limitAmount === 0) return 0;
    return (this.currentSpend / this.limitAmount) * 100;
  }

  /**
   * Возвращает оставшуюся сумму лимита
   */
  getRemainingAmount(): number {
    return Math.max(0, this.limitAmount - this.currentSpend);
  }

  /**
   * Проверяет, достигнут ли порог предупреждения
   */
  isWarningThresholdReached(): boolean {
    return this.getUtilizationPercentage() >= this.warningThresholdPercent;
  }

  /**
   * Проверяет, нужно ли отправить предупреждение
   */
  shouldSendWarning(): boolean {
    return !this.warningSent && this.isWarningThresholdReached();
  }

  /**
   * Проверяет, можно ли выполнить транзакцию на указанную сумму
   */
  canSpend(amount: number, category?: string): LimitCheckResult {
    const result: LimitCheckResult = {
      allowed: false,
      currentSpend: this.currentSpend,
      limitAmount: this.limitAmount,
      remainingAmount: this.getRemainingAmount(),
      utilizationPercentage: this.getUtilizationPercentage(),
      requiresApproval: false,
      warningThresholdReached: this.isWarningThresholdReached()
    };

    // Проверяем, активен ли лимит
    if (!this.isActiveLimit()) {
      result.allowed = true; // Неактивные лимиты не ограничивают
      result.reason = 'Limit is not active';
      return result;
    }

    // Проверяем, находимся ли мы в периоде
    if (!this.isInActivePeriod() && this.limitType !== 'per_transaction') {
      result.allowed = true;
      result.reason = 'Limit period is not active';
      return result;
    }

    // Проверяем категории (если указаны)
    if (this.allowedCategories && this.allowedCategories.length > 0 && category) {
      if (!this.allowedCategories.includes(category)) {
        result.allowed = false;
        result.reason = `Category '${category}' is not allowed. Allowed categories: ${this.allowedCategories.join(', ')}`;
        return result;
      }
    }

    // Проверяем максимальную сумму одной транзакции
    if (this.maxSingleTransactionAmount && amount > this.maxSingleTransactionAmount) {
      result.allowed = false;
      result.reason = `Transaction amount ${amount} exceeds maximum single transaction limit ${this.maxSingleTransactionAmount}`;
      return result;
    }

    // Проверяем лимит на одну транзакцию
    if (this.limitType === 'per_transaction') {
      if (amount > this.limitAmount) {
        result.requiresApproval = this.requireApproval;
        result.allowed = !this.blockWhenExceeded || !this.requiresApproval;
        result.reason = `Transaction amount ${amount} exceeds per-transaction limit ${this.limitAmount}`;
        return result;
      }
      result.allowed = true;
      return result;
    }

    // Проверяем количество транзакций
    if (this.maxTransactionsPerPeriod && this.currentTransactionCount >= this.maxTransactionsPerPeriod) {
      result.allowed = false;
      result.reason = `Transaction count limit exceeded. Current: ${this.currentTransactionCount}, Max: ${this.maxTransactionsPerPeriod}`;
      return result;
    }

    // Проверяем лимит суммы
    const newSpend = this.currentSpend + amount;
    if (newSpend > this.limitAmount) {
      result.requiresApproval = this.requireApproval;
      result.allowed = !this.blockWhenExceeded || !this.requiresApproval;
      result.reason = `Spend limit exceeded. Current: ${this.currentSpend}, New: ${newSpend}, Limit: ${this.limitAmount}`;
      return result;
    }

    // Проверяем порог одобрения
    if (this.approvalThreshold && amount >= this.approvalThreshold) {
      result.requiresApproval = true;
      result.allowed = !this.blockWhenExceeded || !this.requireApproval;
      result.reason = `Transaction amount ${amount} requires approval (threshold: ${this.approvalThreshold})`;
      return result;
    }

    result.allowed = true;
    return result;
  }

  /**
   * Проверяет, нужно ли сбросить период
   */
  shouldResetPeriod(): boolean {
    if (this.limitType === 'per_transaction') return false;

    return !this.periodEndDate || this.periodEndDate <= new Date();
  }

  /**
   * Возвращает сводную информацию о лимите
   */
  getLimitSummary(): LimitSummary {
    const period = this.getCurrentPeriod();

    return {
      limitId: this.id,
      limitType: this.limitType,
      limitAmount: this.limitAmount,
      currentSpend: this.currentSpend,
      transactionCount: this.currentTransactionCount,
      utilizationPercentage: this.getUtilizationPercentage(),
      remainingAmount: this.getRemainingAmount(),
      isOverLimit: this.isOverLimit(),
      isActive: this.isActive,
      period
    };
  }

  /**
   * Проверяет, является ли лимит привязанным к центру затрат
   */
  isCostCenterSpecific(): boolean {
    return this.limitType === 'cost_center_monthly' || !!this.costCenterId;
  }

  /**
   * Проверяет, есть ли назначенный утверждающий
   */
  hasApprover(): boolean {
    return !!this.approverId;
  }

  /**
   * Предсказывает превышение лимита на основе текущих трат
   */
  predictOverBudget(remainingDays: number, dailyAverageSpend?: number): boolean {
    if (this.limitType === 'per_transaction') return false;

    const estimatedAdditionalSpend = dailyAverageSpend
      ? dailyAverageSpend * remainingDays
      : (this.currentSpend / Math.max(1, this.getDaysInPeriod() - remainingDays)) * remainingDays;

    return (this.currentSpend + estimatedAdditionalSpend) > this.limitAmount;
  }

  /**
   * Возвращает количество дней в текущем периоде
   */
  private getDaysInPeriod(): number {
    if (!this.periodStartDate || !this.periodEndDate) return 30;

    const diffTime = this.periodEndDate.getTime() - this.periodStartDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Статические методы для создания экземпляров

  static create(data: Partial<UserSpendingLimit>): UserSpendingLimit {
    return new UserSpendingLimit(
      data.id || '',
      data.companyId || '',
      data.userId || '',
      data.limitType || 'monthly',
      data.limitAmount || 0,
      data.currentSpend || 0,
      data.currentTransactionCount || 0,
      data.costCenterId,
      data.periodStartDate,
      data.periodEndDate,
      data.resetDayOfMonth,
      data.isActive ?? true,
      data.requireApproval || false,
      data.approvalThreshold,
      data.approverId,
      data.maxTransactionsPerPeriod,
      data.maxSingleTransactionAmount,
      data.allowedCategories,
      data.warningThresholdPercent || 80.0,
      data.warningSent || false,
      data.blockWhenExceeded ?? true,
      data.notes,
      data.createdById,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Создает новый лимит
   */
  static createNew(
    companyId: string,
    userId: string,
    limitType: LimitType,
    limitAmount: number,
    options: {
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
      createdById?: string;
    } = {}
  ): UserSpendingLimit {
    const now = new Date();
    const period = UserSpendingLimit.calculatePeriodDates(limitType, now, options);

    return new UserSpendingLimit(
      '',
      companyId,
      userId,
      limitType,
      limitAmount,
      0,
      0,
      options.costCenterId,
      period.startDate,
      period.endDate,
      period.resetDayOfMonth,
      true,
      options.requireApproval || false,
      options.approvalThreshold,
      options.approverId,
      options.maxTransactionsPerPeriod,
      options.maxSingleTransactionAmount,
      options.allowedCategories,
      options.warningThresholdPercent || 80.0,
      false,
      options.blockWhenExceeded ?? true,
      options.notes,
      options.createdById,
      now,
      now
    );
  }

  /**
   * Вычисляет даты периода на основе типа лимита
   */
  private static calculatePeriodDates(
    limitType: LimitType,
    referenceDate: Date,
    options: { resetDayOfMonth?: number } = {}
  ): { startDate: Date; endDate: Date; resetDayOfMonth?: number } {
    const startDate = new Date(referenceDate);

    switch (limitType) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        return {
          startDate,
          endDate: new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1)
        };

      case 'weekly':
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        return {
          startDate,
          endDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        };

      case 'monthly':
      case 'cost_center_monthly':
        const resetDay = options.resetDayOfMonth || 1;
        startDate.setDate(resetDay);
        startDate.setHours(0, 0, 0, 0);

        // Если текущий день раньше дня сброса, используем предыдущий месяц
        if (referenceDate.getDate() < resetDay) {
          startDate.setMonth(startDate.getMonth() - 1);
        }

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(resetDay - 1);
        endDate.setHours(23, 59, 59, 999);

        return {
          startDate,
          endDate,
          resetDayOfMonth: resetDay
        };

      case 'quarterly':
        const month = startDate.getMonth();
        const quarterStart = Math.floor(month / 3) * 3;
        startDate.setMonth(quarterStart, 1);
        startDate.setHours(0, 0, 0, 0);
        const quarterEnd = new Date(startDate);
        quarterEnd.setMonth(quarterStart + 3);
        quarterEnd.setDate(0);
        quarterEnd.setHours(23, 59, 59, 999);
        return {
          startDate,
          endDate: quarterEnd
        };

      case 'yearly':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        const yearEnd = new Date(startDate);
        yearEnd.setMonth(11, 31);
        yearEnd.setHours(23, 59, 59, 999);
        return {
          startDate,
          endDate: yearEnd
        };

      case 'per_transaction':
        return {
          startDate: new Date(),
          endDate: new Date()
        };

      default:
        return {
          startDate,
          endDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        };
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      userId: this.userId,
      limitType: this.limitType,
      limitAmount: this.limitAmount,
      currentSpend: this.currentSpend,
      currentTransactionCount: this.currentTransactionCount,
      costCenterId: this.costCenterId,
      periodStartDate: this.periodStartDate,
      periodEndDate: this.periodEndDate,
      resetDayOfMonth: this.resetDayOfMonth,
      isActive: this.isActive,
      requireApproval: this.requireApproval,
      approvalThreshold: this.approvalThreshold,
      approverId: this.approverId,
      maxTransactionsPerPeriod: this.maxTransactionsPerPeriod,
      maxSingleTransactionAmount: this.maxSingleTransactionAmount,
      allowedCategories: this.allowedCategories,
      warningThresholdPercent: this.warningThresholdPercent,
      warningSent: this.warningSent,
      blockWhenExceeded: this.blockWhenExceeded,
      notes: this.notes,
      createdById: this.createdById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Бизнес-методы для обновления состояния

  /**
   * Добавляет трату к лимиту
   */
  addSpend(amount: number): UserSpendingLimit {
    return new UserSpendingLimit(
      this.id,
      this.companyId,
      this.userId,
      this.limitType,
      this.limitAmount,
      this.currentSpend + amount,
      this.currentTransactionCount + 1,
      this.costCenterId,
      this.periodStartDate,
      this.periodEndDate,
      this.resetDayOfMonth,
      this.isActive,
      this.requireApproval,
      this.approvalThreshold,
      this.approverId,
      this.maxTransactionsPerPeriod,
      this.maxSingleTransactionAmount,
      this.allowedCategories,
      this.warningThresholdPercent,
      this.warningSent,
      this.blockWhenExceeded,
      this.notes,
      this.createdById,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Возвращает трату (например, при отмене)
   */
  refundSpend(amount: number): UserSpendingLimit {
    return new UserSpendingLimit(
      this.id,
      this.companyId,
      this.userId,
      this.limitType,
      this.limitAmount,
      Math.max(0, this.currentSpend - amount),
      Math.max(0, this.currentTransactionCount - 1),
      this.costCenterId,
      this.periodStartDate,
      this.periodEndDate,
      this.resetDayOfMonth,
      this.isActive,
      this.requireApproval,
      this.approvalThreshold,
      this.approverId,
      this.maxTransactionsPerPeriod,
      this.maxSingleTransactionAmount,
      this.allowedCategories,
      this.warningThresholdPercent,
      this.warningSent,
      this.blockWhenExceeded,
      this.notes,
      this.createdById,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Сбрасывает лимит на новый период
   */
  resetPeriod(): UserSpendingLimit {
    const now = new Date();
    const period = UserSpendingLimit.calculatePeriodDates(
      this.limitType,
      now,
      { resetDayOfMonth: this.resetDayOfMonth }
    );

    return new UserSpendingLimit(
      this.id,
      this.companyId,
      this.userId,
      this.limitType,
      this.limitAmount,
      0, // Сбрасываем траты
      0, // Сбрасываем количество транзакций
      this.costCenterId,
      period.startDate,
      period.endDate,
      period.resetDayOfMonth,
      this.isActive,
      this.requireApproval,
      this.approvalThreshold,
      this.approverId,
      this.maxTransactionsPerPeriod,
      this.maxSingleTransactionAmount,
      this.allowedCategories,
      this.warningThresholdPercent,
      false, // Сбрасываем флаг предупреждения
      this.blockWhenExceeded,
      this.notes,
      this.createdById,
      this.createdAt,
      now
    );
  }

  /**
   * Обновляет сумму лимита
   */
  updateLimitAmount(newAmount: number): UserSpendingLimit {
    return new UserSpendingLimit(
      this.id,
      this.companyId,
      this.userId,
      this.limitType,
      newAmount,
      this.currentSpend,
      this.currentTransactionCount,
      this.costCenterId,
      this.periodStartDate,
      this.periodEndDate,
      this.resetDayOfMonth,
      this.isActive,
      this.requireApproval,
      this.approvalThreshold,
      this.approverId,
      this.maxTransactionsPerPeriod,
      this.maxSingleTransactionAmount,
      this.allowedCategories,
      this.warningThresholdPercent,
      this.warningSent,
      this.blockWhenExceeded,
      this.notes,
      this.createdById,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Отмечает, что предупреждение отправлено
   */
  markWarningSent(): UserSpendingLimit {
    return new UserSpendingLimit(
      this.id,
      this.companyId,
      this.userId,
      this.limitType,
      this.limitAmount,
      this.currentSpend,
      this.currentTransactionCount,
      this.costCenterId,
      this.periodStartDate,
      this.periodEndDate,
      this.resetDayOfMonth,
      this.isActive,
      this.requireApproval,
      this.approvalThreshold,
      this.approverId,
      this.maxTransactionsPerPeriod,
      this.maxSingleTransactionAmount,
      this.allowedCategories,
      this.warningThresholdPercent,
      true, // Отмечаем, что предупреждение отправлено
      this.blockWhenExceeded,
      this.notes,
      this.createdById,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Активирует или деактивирует лимит
   */
  setActive(isActive: boolean): UserSpendingLimit {
    return new UserSpendingLimit(
      this.id,
      this.companyId,
      this.userId,
      this.limitType,
      this.limitAmount,
      this.currentSpend,
      this.currentTransactionCount,
      this.costCenterId,
      this.periodStartDate,
      this.periodEndDate,
      this.resetDayOfMonth,
      isActive,
      this.requireApproval,
      this.approvalThreshold,
      this.approverId,
      this.maxTransactionsPerPeriod,
      this.maxSingleTransactionAmount,
      this.allowedCategories,
      this.warningThresholdPercent,
      this.warningSent,
      this.blockWhenExceeded,
      this.notes,
      this.createdById,
      this.createdAt,
      new Date()
    );
  }
}