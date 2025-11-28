import { BaseEntity } from './BaseEntity';

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface BudgetPeriod {
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
}

export interface CostCenterHierarchy {
  id: string;
  name: string;
  code: string;
  level: number;
  children: CostCenterHierarchy[];
}

export interface SpendingSummary {
  currentSpend: number;
  budgetLimit: number;
  utilizationPercentage: number;
  remainingBudget: number;
  isOverBudget: boolean;
  daysRemaining: number;
}

export class CostCenter implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly description?: string,
    public readonly parentCenterId?: string,
    public readonly managerId?: string,
    public readonly budgetLimit: number = 0,
    public readonly currentSpend: number = 0,
    public readonly periodType: PeriodType = 'monthly',
    public readonly periodStartDate?: Date,
    public readonly periodEndDate?: Date,
    public readonly isActive: boolean = true,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  // Бизнес-логика центра затрат

  /**
   * Проверяет, активен ли центр затрат
   */
  isActiveCenter(): boolean {
    return this.isActive;
  }

  /**
   * Проверяет, есть ли бюджетный лимит
   */
  hasBudgetLimit(): boolean {
    return this.budgetLimit > 0;
  }

  /**
   * Проверяет, превышен ли бюджет
   */
  isOverBudget(): boolean {
    return this.hasBudgetLimit() && this.currentSpend > this.budgetLimit;
  }

  /**
   * Возвращает процент использования бюджета
   */
  getBudgetUtilizationPercentage(): number {
    if (!this.hasBudgetLimit()) return 0;
    return (this.currentSpend / this.budgetLimit) * 100;
  }

  /**
   * Возвращает оставшийся бюджет
   */
  getRemainingBudget(): number {
    if (!this.hasBudgetLimit()) return Infinity;
    return Math.max(0, this.budgetLimit - this.currentSpend);
  }

  /**
   * Проверяет, можно ли списать указанную сумму
   */
  canSpend(amount: number): boolean {
    return this.isActiveCenter() &&
           (!this.hasBudgetLimit() || this.currentSpend + amount <= this.budgetLimit);
  }

  /**
   * Возвращает текущий бюджетный период
   */
  getCurrentPeriod(): BudgetPeriod | null {
    if (!this.periodStartDate || !this.periodEndDate) {
      return null;
    }

    return {
      periodType: this.periodType,
      startDate: this.periodStartDate,
      endDate: this.periodEndDate
    };
  }

  /**
   * Проверяет, активен ли текущий бюджетный период
   */
  isCurrentPeriodActive(): boolean {
    const now = new Date();
    return this.periodStartDate !== undefined &&
           this.periodEndDate !== undefined &&
           now >= this.periodStartDate &&
           now <= this.periodEndDate;
  }

  /**
   * Возвращает количество дней до конца периода
   */
  getDaysUntilPeriodEnd(): number {
    if (!this.periodEndDate) return Infinity;

    const now = new Date();
    const endTime = this.periodEndDate.getTime();
    const currentTime = now.getTime();
    const diffTime = endTime - currentTime;

    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Возвращает сводную информацию о тратах
   */
  getSpendingSummary(): SpendingSummary {
    const utilizationPercentage = this.getBudgetUtilizationPercentage();
    const remainingBudget = this.getRemainingBudget();
    const daysRemaining = this.getDaysUntilPeriodEnd();

    return {
      currentSpend: this.currentSpend,
      budgetLimit: this.budgetLimit,
      utilizationPercentage,
      remainingBudget,
      isOverBudget: this.isOverBudget(),
      daysRemaining
    };
  }

  /**
   * Проверяет, является ли центр затрат корневым (без родителя)
   */
  isRoot(): boolean {
    return !this.parentCenterId;
  }

  /**
   * Проверяет, имеет ли центр назначенного менеджера
   */
  hasManager(): boolean {
    return !!this.managerId;
  }

  /**
   * Предсказывает превышение бюджета на основе текущих трат
   */
  predictOverBudget(dailyAverageSpend?: number): boolean {
    if (!this.hasBudgetLimit() || !this.isCurrentPeriodActive()) {
      return false;
    }

    const daysRemaining = this.getDaysUntilPeriodEnd();
    if (daysRemaining <= 0) return this.isOverBudget();

    const estimatedAdditionalSpend = dailyAverageSpend
      ? dailyAverageSpend * daysRemaining
      : (this.currentSpend / Math.max(1, this.getDaysInPeriod() - daysRemaining)) * daysRemaining;

    return (this.currentSpend + estimatedAdditionalSpend) > this.budgetLimit;
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

  static create(data: Partial<CostCenter>): CostCenter {
    return new CostCenter(
      data.id || '',
      data.companyId || '',
      data.name || '',
      data.code || '',
      data.description,
      data.parentCenterId,
      data.managerId,
      data.budgetLimit || 0,
      data.currentSpend || 0,
      data.periodType || 'monthly',
      data.periodStartDate,
      data.periodEndDate,
      data.isActive ?? true,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Создает новый центр затрат
   */
  static createNew(
    companyId: string,
    name: string,
    code: string,
    periodType: PeriodType = 'monthly',
    budgetLimit: number = 0
  ): CostCenter {
    const now = new Date();
    const period = CostCenter.calculatePeriodDates(periodType, now);

    return new CostCenter(
      '',
      companyId,
      name,
      code,
      undefined,
      undefined,
      undefined,
      budgetLimit,
      0,
      periodType,
      period.startDate,
      period.endDate,
      true,
      now,
      now
    );
  }

  /**
   * Вычисляет даты начала и конца периода
   */
  private static calculatePeriodDates(periodType: PeriodType, referenceDate: Date): BudgetPeriod {
    const startDate = new Date(referenceDate);

    switch (periodType) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        return {
          periodType,
          startDate,
          endDate: new Date(startDate.getTime() + 24 * 60 * 60 * 1000 - 1)
        };

      case 'weekly':
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        return {
          periodType,
          startDate,
          endDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        };

      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0); // Последний день месяца
        endDate.setHours(23, 59, 59, 999);
        return {
          periodType,
          startDate,
          endDate
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
          periodType,
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
          periodType,
          startDate,
          endDate: yearEnd
        };

      default:
        return {
          periodType: 'monthly',
          startDate,
          endDate: new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        };
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      name: this.name,
      code: this.code,
      description: this.description,
      parentCenterId: this.parentCenterId,
      managerId: this.managerId,
      budgetLimit: this.budgetLimit,
      currentSpend: this.currentSpend,
      periodType: this.periodType,
      periodStartDate: this.periodStartDate,
      periodEndDate: this.periodEndDate,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Бизнес-методы для обновления состояния

  /**
   * Добавляет трату к центру затрат
   */
  addSpend(amount: number): CostCenter {
    return new CostCenter(
      this.id,
      this.companyId,
      this.name,
      this.code,
      this.description,
      this.parentCenterId,
      this.managerId,
      this.budgetLimit,
      this.currentSpend + amount,
      this.periodType,
      this.periodStartDate,
      this.periodEndDate,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Возвращает трату (например, при отмене билета)
   */
  refundSpend(amount: number): CostCenter {
    const newSpend = Math.max(0, this.currentSpend - amount);
    return new CostCenter(
      this.id,
      this.companyId,
      this.name,
      this.code,
      this.description,
      this.parentCenterId,
      this.managerId,
      this.budgetLimit,
      newSpend,
      this.periodType,
      this.periodStartDate,
      this.periodEndDate,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Обновляет бюджетный лимит
   */
  updateBudgetLimit(newLimit: number): CostCenter {
    return new CostCenter(
      this.id,
      this.companyId,
      this.name,
      this.code,
      this.description,
      this.parentCenterId,
      this.managerId,
      newLimit,
      this.currentSpend,
      this.periodType,
      this.periodStartDate,
      this.periodEndDate,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Обновляет период
   */
  updatePeriod(newPeriodType: PeriodType): CostCenter {
    const now = new Date();
    const period = CostCenter.calculatePeriodDates(newPeriodType, now);

    return new CostCenter(
      this.id,
      this.companyId,
      this.name,
      this.code,
      this.description,
      this.parentCenterId,
      this.managerId,
      this.budgetLimit,
      0, // Сбрасываем расходы при смене периода
      newPeriodType,
      period.startDate,
      period.endDate,
      this.isActive,
      this.createdAt,
      now
    );
  }

  /**
   * Сбрасывает расходы на начало нового периода
   */
  resetPeriod(newPeriod?: BudgetPeriod): CostCenter {
    const period = newPeriod || this.getCurrentPeriod();

    return new CostCenter(
      this.id,
      this.companyId,
      this.name,
      this.code,
      this.description,
      this.parentCenterId,
      this.managerId,
      this.budgetLimit,
      0, // Сбрасываем расходы
      this.periodType,
      period?.startDate,
      period?.endDate,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Изменяет статус активности
   */
  changeActiveStatus(isActive: boolean): CostCenter {
    return new CostCenter(
      this.id,
      this.companyId,
      this.name,
      this.code,
      this.description,
      this.parentCenterId,
      this.managerId,
      this.budgetLimit,
      this.currentSpend,
      this.periodType,
      this.periodStartDate,
      this.periodEndDate,
      isActive,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Обновляет менеджера центра затрат
   */
  updateManager(newManagerId: string | undefined): CostCenter {
    return new CostCenter(
      this.id,
      this.companyId,
      this.name,
      this.code,
      this.description,
      this.parentCenterId,
      newManagerId,
      this.budgetLimit,
      this.currentSpend,
      this.periodType,
      this.periodStartDate,
      this.periodEndDate,
      this.isActive,
      this.createdAt,
      new Date()
    );
  }
}