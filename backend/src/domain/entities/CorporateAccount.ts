import { BaseEntity } from './BaseEntity';

export type AccountStatus = 'active' | 'suspended' | 'blocked' | 'closed';

export interface AutoTopupSettings {
  enabled: boolean;
  amount?: number;
  threshold?: number;
}

export interface BalanceSnapshot {
  currentBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  lastDepositDate?: Date;
  lastWithdrawalDate?: Date;
}

export class CorporateAccount implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly currentDepositBalance: number,
    public readonly totalDeposited: number,
    public readonly totalWithdrawn: number,
    public readonly currency: string = 'RUB',
    public readonly accountStatus: AccountStatus = 'active',
    public readonly creditLimit: number = 0,
    public readonly minimumBalanceThreshold: number = 10000,
    public readonly lowBalanceAlertSent: boolean = false,
    public readonly autoTopupEnabled: boolean = false,
    public readonly autoTopupAmount?: number,
    public readonly autoTopupThreshold?: number,
    public readonly lastDepositDate?: Date,
    public readonly lastWithdrawalDate?: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  // Бизнес-логика счета

  /**
   * Возвращает доступный баланс с учетом кредитного лимита
   */
  getAvailableBalance(): number {
    return this.currentDepositBalance + this.creditLimit;
  }

  /**
   * Проверяет, достаточно ли средств для транзакции
   */
  hasSufficientFunds(amount: number): boolean {
    return this.getAvailableBalance() >= amount;
  }

  /**
   * Проверяет, является ли счет активным для операций
   */
  isActive(): boolean {
    return this.accountStatus === 'active';
  }

  /**
   * Проверяет, нужно ли отправить уведомление о низком балансе
   */
  shouldSendLowBalanceAlert(): boolean {
    return !this.lowBalanceAlertSent &&
           this.currentDepositBalance <= this.minimumBalanceThreshold;
  }

  /**
   * Проверяет, нужно ли автоматическое пополнение
   */
  shouldAutoTopup(): boolean {
    return this.autoTopupEnabled &&
           this.autoTopupAmount &&
           this.autoTopupThreshold &&
           this.currentDepositBalance <= this.autoTopupThreshold;
  }

  /**
   * Возвращает процент использования от общей суммы пополнений
   */
  getUtilizationPercentage(): number {
    if (this.totalDeposited === 0) return 0;
    return (this.totalWithdrawn / this.totalDeposited) * 100;
  }

  /**
   * Проверяет, находится ли счет в овердрафте
   */
  isOverdrawn(): boolean {
    return this.currentDepositBalance < 0;
  }

  /**
   * Возвращает сумму овердрафта
   */
  getOverdraftAmount(): number {
    return Math.abs(Math.min(0, this.currentDepositBalance));
  }

  /**
   * Проверяет, превышен ли кредитный лимит
   */
  isCreditLimitExceeded(): boolean {
    return this.currentDepositBalance < -this.creditLimit;
  }

  /**
   * Возвращает свободный кредитный лимит
   */
  getAvailableCreditLimit(): number {
    return this.creditLimit + this.currentDepositBalance;
  }

  /**
   * Создает снимок баланса для отчетности
   */
  getBalanceSnapshot(): BalanceSnapshot {
    return {
      currentBalance: this.currentDepositBalance,
      totalDeposited: this.totalDeposited,
      totalWithdrawn: this.totalWithdrawn,
      lastDepositDate: this.lastDepositDate,
      lastWithdrawalDate: this.lastWithdrawalDate
    };
  }

  /**
   * Возвращает настройки автопополнения
   */
  getAutoTopupSettings(): AutoTopupSettings {
    return {
      enabled: this.autoTopupEnabled,
      amount: this.autoTopupAmount,
      threshold: this.autoTopupThreshold
    };
  }

  /**
   * Проверяет возможность списания с учетом всех ограничений
   */
  canWithdraw(amount: number): { allowed: boolean; reason?: string } {
    if (!this.isActive()) {
      return { allowed: false, reason: 'Account is not active' };
    }

    if (!this.hasSufficientFunds(amount)) {
      const available = this.getAvailableBalance();
      return {
        allowed: false,
        reason: `Insufficient funds. Available: ${available}, required: ${amount}`
      };
    }

    return { allowed: true };
  }

  // Статические методы для создания экземпляров

  static create(data: Partial<CorporateAccount>): CorporateAccount {
    return new CorporateAccount(
      data.id || '',
      data.companyId || '',
      data.currentDepositBalance || 0,
      data.totalDeposited || 0,
      data.totalWithdrawn || 0,
      data.currency || 'RUB',
      data.accountStatus || 'active',
      data.creditLimit || 0,
      data.minimumBalanceThreshold || 10000,
      data.lowBalanceAlertSent || false,
      data.autoTopupEnabled || false,
      data.autoTopupAmount,
      data.autoTopupThreshold,
      data.lastDepositDate,
      data.lastWithdrawalDate,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Создает новый корпоративный счет
   */
  static createNew(
    companyId: string,
    initialDeposit: number = 0,
    currency: string = 'RUB'
  ): CorporateAccount {
    const now = new Date();
    return new CorporateAccount(
      '',
      companyId,
      initialDeposit,
      initialDeposit,
      0,
      currency,
      'active',
      0,
      10000,
      false,
      false,
      undefined,
      undefined,
      initialDeposit > 0 ? now : undefined,
      undefined,
      now,
      now
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      currentDepositBalance: this.currentDepositBalance,
      totalDeposited: this.totalDeposited,
      totalWithdrawn: this.totalWithdrawn,
      currency: this.currency,
      accountStatus: this.accountStatus,
      creditLimit: this.creditLimit,
      minimumBalanceThreshold: this.minimumBalanceThreshold,
      lowBalanceAlertSent: this.lowBalanceAlertSent,
      autoTopupEnabled: this.autoTopupEnabled,
      autoTopupAmount: this.autoTopupAmount,
      autoTopupThreshold: this.autoTopupThreshold,
      lastDepositDate: this.lastDepositDate,
      lastWithdrawalDate: this.lastWithdrawalDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Бизнес-методы для обновления состояния

  /**
   * Создает новое состояние после пополнения счета
   */
  afterDeposit(amount: number): CorporateAccount {
    const now = new Date();
    return new CorporateAccount(
      this.id,
      this.companyId,
      this.currentDepositBalance + amount,
      this.totalDeposited + amount,
      this.totalWithdrawn,
      this.currency,
      this.accountStatus,
      this.creditLimit,
      this.minimumBalanceThreshold,
      false, // Сбрасываем флаг уведомления
      this.autoTopupEnabled,
      this.autoTopupAmount,
      this.autoTopupThreshold,
      now,
      this.lastWithdrawalDate,
      this.createdAt,
      now
    );
  }

  /**
   * Создает новое состояние после списания со счета
   */
  afterWithdrawal(amount: number): CorporateAccount {
    const now = new Date();
    return new CorporateAccount(
      this.id,
      this.companyId,
      this.currentDepositBalance - amount,
      this.totalDeposited,
      this.totalWithdrawn + amount,
      this.currency,
      this.accountStatus,
      this.creditLimit,
      this.minimumBalanceThreshold,
      this.lowBalanceAlertSent,
      this.autoTopupEnabled,
      this.autoTopupAmount,
      this.autoTopupThreshold,
      this.lastDepositDate,
      now,
      this.createdAt,
      now
    );
  }

  /**
   * Обновляет настройки автопополнения
   */
  updateAutoTopupSettings(settings: AutoTopupSettings): CorporateAccount {
    return new CorporateAccount(
      this.id,
      this.companyId,
      this.currentDepositBalance,
      this.totalDeposited,
      this.totalWithdrawn,
      this.currency,
      this.accountStatus,
      this.creditLimit,
      this.minimumBalanceThreshold,
      this.lowBalanceAlertSent,
      settings.enabled,
      settings.amount,
      settings.threshold,
      this.lastDepositDate,
      this.lastWithdrawalDate,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Отмечает, что уведомление о низком балансе отправлено
   */
  markLowBalanceAlertSent(): CorporateAccount {
    return new CorporateAccount(
      this.id,
      this.companyId,
      this.currentDepositBalance,
      this.totalDeposited,
      this.totalWithdrawn,
      this.currency,
      this.accountStatus,
      this.creditLimit,
      this.minimumBalanceThreshold,
      true,
      this.autoTopupEnabled,
      this.autoTopupAmount,
      this.autoTopupThreshold,
      this.lastDepositDate,
      this.lastWithdrawalDate,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Изменяет статус счета
   */
  changeStatus(newStatus: AccountStatus): CorporateAccount {
    return new CorporateAccount(
      this.id,
      this.companyId,
      this.currentDepositBalance,
      this.totalDeposited,
      this.totalWithdrawn,
      this.currency,
      newStatus,
      this.creditLimit,
      this.minimumBalanceThreshold,
      this.lowBalanceAlertSent,
      this.autoTopupEnabled,
      this.autoTopupAmount,
      this.autoTopupThreshold,
      this.lastDepositDate,
      this.lastWithdrawalDate,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Обновляет кредитный лимит
   */
  updateCreditLimit(newLimit: number): CorporateAccount {
    return new CorporateAccount(
      this.id,
      this.companyId,
      this.currentDepositBalance,
      this.totalDeposited,
      this.totalWithdrawn,
      this.currency,
      this.accountStatus,
      newLimit,
      this.minimumBalanceThreshold,
      this.lowBalanceAlertSent,
      this.autoTopupEnabled,
      this.autoTopupAmount,
      this.autoTopupThreshold,
      this.lastDepositDate,
      this.lastWithdrawalDate,
      this.createdAt,
      new Date()
    );
  }
}