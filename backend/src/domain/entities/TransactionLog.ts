import { BaseEntity } from './BaseEntity';

export type TransactionType = 'deposit' | 'withdrawal' | 'refund' | 'refund_pending' | 'fee' | 'credit' | 'debit';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';

export interface TransactionMetadata {
  ipAddress?: string;
  userAgent?: string;
  externalReference?: string;
  category?: string;
  tags?: Record<string, any>;
  batchId?: string;
}

export interface TransactionReferences {
  ticketId?: string;
  costCenterId?: string;
  userId?: string;
  originalTransactionId?: string;
  createdById?: string;
  approvedById?: string;
}

export class TransactionLog implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly transactionType: TransactionType,
    public readonly amount: number,
    public readonly currency: string = 'RUB',
    public readonly balanceBefore: number,
    public readonly balanceAfter: number,
    public readonly description: string,
    public readonly referenceNumber?: string,
    public readonly status: TransactionStatus = 'completed',
    public readonly failureReason?: string,
    public readonly retryCount: number = 0,
    public readonly ticketId?: string,
    public readonly costCenterId?: string,
    public readonly userId?: string,
    public readonly category?: string,
    public readonly tags: Record<string, any> = {},
    public readonly externalReference?: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly createdById?: string,
    public readonly approvedById?: string,
    public readonly approvedAt?: Date,
    public readonly transactionDate: Date = new Date(),
    public readonly processedAt?: Date,
    public readonly originalTransactionId?: string,
    public readonly refundReason?: string,
    public readonly batchId?: string,
    public readonly metadata: Record<string, any> = {},
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  // Бизнес-логика транзакций

  /**
   * Проверяет, является ли транзакция успешной
   */
  isSuccessful(): boolean {
    return this.status === 'completed';
  }

  /**
   * Проверяет, является ли транзакция失败的
   */
  isFailed(): boolean {
    return this.status === 'failed';
  }

  /**
   * Проверяет, ожидает ли транзакция обработки
   */
  isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Проверяет, является ли транзакция возвратом
   */
  isRefund(): boolean {
    return this.transactionType === 'refund' || this.transactionType === 'refund_pending';
  }

  /**
   * Проверяет, является ли транзакция пополнением
   */
  isDeposit(): boolean {
    return this.transactionType === 'deposit';
  }

  /**
   * Проверяет, является ли транзакция списанием
   */
  isWithdrawal(): boolean {
    return this.transactionType === 'withdrawal' || this.transactionType === 'fee';
  }

  /**
   * Возвращает сумму транзакции с учетом типа (положительная для пополнений, отрицательная для списаний)
   */
  getSignedAmount(): number {
    if (this.transactionType in ['deposit', 'refund', 'credit']) {
      return Math.abs(this.amount);
    } else {
      return -Math.abs(this.amount);
    }
  }

  /**
   * Проверяет, связана ли транзакция с билетом
   */
  hasTicket(): boolean {
    return !!this.ticketId;
  }

  /**
   * Проверяет, связана ли транзакция с центром затрат
   */
  hasCostCenter(): boolean {
    return !!this.costCenterId;
  }

  /**
   * Проверяет, требуется ли одобрение для транзакции
   */
  requiresApproval(): boolean {
    return this.transactionType === 'withdrawal' && this.amount > 10000; // Пример порога
  }

  /**
   * Проверяет, можно ли повторить неудачную транзакцию
   */
  canRetry(): boolean {
    return this.isFailed() && this.retryCount < 3;
  }

  /**
   * Проверяет, является ли транзакция обратной к другой
   */
  isReversal(): boolean {
    return !!this.originalTransactionId;
  }

  /**
   * Возвращает время обработки транзакции
   */
  getProcessingTime(): number | null {
    if (!this.processedAt || this.transactionDate.getTime() === this.processedAt.getTime()) {
      return null;
    }
    return this.processedAt.getTime() - this.transactionDate.getTime();
  }

  /**
   * Проверяет, является ли транзакция пакетной
   */
  isBatchTransaction(): boolean {
    return !!this.batchId;
  }

  /**
   * Возвращает метаданные транзакции
   */
  getTransactionMetadata(): TransactionMetadata {
    return {
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      externalReference: this.externalReference,
      category: this.category,
      tags: this.tags,
      batchId: this.batchId
    };
  }

  /**
   * Возвращает ссылки транзакции
   */
  getTransactionReferences(): TransactionReferences {
    return {
      ticketId: this.ticketId,
      costCenterId: this.costCenterId,
      userId: this.userId,
      originalTransactionId: this.originalTransactionId,
      createdById: this.createdById,
      approvedById: this.approvedById
    };
  }

  // Статические методы для создания экземпляров

  static create(data: Partial<TransactionLog>): TransactionLog {
    return new TransactionLog(
      data.id || '',
      data.companyId || '',
      data.transactionType || 'deposit',
      data.amount || 0,
      data.currency || 'RUB',
      data.balanceBefore || 0,
      data.balanceAfter || 0,
      data.description || '',
      data.referenceNumber,
      data.status || 'completed',
      data.failureReason,
      data.retryCount || 0,
      data.ticketId,
      data.costCenterId,
      data.userId,
      data.category,
      data.tags || {},
      data.externalReference,
      data.ipAddress,
      data.userAgent,
      data.createdById,
      data.approvedById,
      data.approvedAt,
      data.transactionDate || new Date(),
      data.processedAt,
      data.originalTransactionId,
      data.refundReason,
      data.batchId,
      data.metadata || {},
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Создает транзакцию пополнения
   */
  static createDeposit(
    companyId: string,
    amount: number,
    balanceBefore: number,
    description: string,
    options: {
      referenceNumber?: string;
      externalReference?: string;
      userId?: string;
      costCenterId?: string;
      category?: string;
      metadata?: Record<string, any>;
    } = {}
  ): TransactionLog {
    const balanceAfter = balanceBefore + amount;
    const now = new Date();

    return new TransactionLog(
      '',
      companyId,
      'deposit',
      amount,
      'RUB',
      balanceBefore,
      balanceAfter,
      description,
      options.referenceNumber,
      'completed',
      undefined,
      0,
      options.costCenterId,
      options.userId,
      options.category,
      {},
      options.externalReference,
      undefined,
      undefined,
      options.userId,
      undefined,
      undefined,
      now,
      now,
      undefined,
      undefined,
      undefined,
      options.metadata || {},
      now,
      now
    );
  }

  /**
   * Создает транзакцию списания (покупка билета)
   */
  static createWithdrawal(
    companyId: string,
    amount: number,
    balanceBefore: number,
    description: string,
    options: {
      ticketId?: string;
      userId?: string;
      costCenterId?: string;
      category?: string;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): TransactionLog {
    const balanceAfter = balanceBefore - amount;
    const now = new Date();

    return new TransactionLog(
      '',
      companyId,
      'withdrawal',
      amount,
      'RUB',
      balanceBefore,
      balanceAfter,
      description,
      undefined,
      'completed',
      undefined,
      0,
      options.ticketId,
      options.costCenterId,
      options.userId,
      options.category || 'travel',
      {},
      undefined,
      options.ipAddress,
      options.userAgent,
      options.userId,
      undefined,
      undefined,
      now,
      now,
      undefined,
      undefined,
      undefined,
      {},
      now,
      now
    );
  }

  /**
   * Создает транзакцию возврата
   */
  static createRefund(
    originalTransaction: TransactionLog,
    refundAmount: number,
    refundReason: string,
    options: {
      newBalanceAfter?: number;
    } = {}
  ): TransactionLog {
    const balanceBefore = originalTransaction.balanceAfter;
    const balanceAfter = options.newBalanceAfter ?? balanceBefore + refundAmount;
    const now = new Date();

    return new TransactionLog(
      '',
      originalTransaction.companyId,
      'refund',
      refundAmount,
      originalTransaction.currency,
      balanceBefore,
      balanceAfter,
      `Возврат: ${originalTransaction.description}`,
      undefined,
      'completed',
      undefined,
      0,
      originalTransaction.ticketId,
      originalTransaction.costCenterId,
      originalTransaction.userId,
      originalTransaction.category,
      {},
      undefined,
      undefined,
      undefined,
      originalTransaction.createdById,
      undefined,
      undefined,
      now,
      now,
      originalTransaction.id,
      refundReason,
      undefined,
      {},
      now,
      now
    );
  }

  /**
   * Создает транзакцию комиссии
   */
  static createFee(
    companyId: string,
    amount: number,
    balanceBefore: number,
    description: string,
    options: {
      ticketId?: string;
      userId?: string;
      costCenterId?: string;
    } = {}
  ): TransactionLog {
    const balanceAfter = balanceBefore - amount;
    const now = new Date();

    return new TransactionLog(
      '',
      companyId,
      'fee',
      amount,
      'RUB',
      balanceBefore,
      balanceAfter,
      description,
      undefined,
      'completed',
      undefined,
      0,
      options.ticketId,
      options.costCenterId,
      options.userId,
      'fee',
      {},
      undefined,
      undefined,
      undefined,
      options.userId,
      undefined,
      undefined,
      now,
      now,
      undefined,
      undefined,
      undefined,
      {},
      now,
      now
    );
  }

  /**
   * Создает неудачную транзакцию
   */
  static createFailedTransaction(
    companyId: string,
    transactionType: TransactionType,
    amount: number,
    description: string,
    failureReason: string,
    options: {
      userId?: string;
      costCenterId?: string;
      retryCount?: number;
      originalBalance?: number;
    } = {}
  ): TransactionLog {
    const now = new Date();
    const balance = options.originalBalance || 0;

    return new TransactionLog(
      '',
      companyId,
      transactionType,
      amount,
      'RUB',
      balance,
      balance, // Баланс не меняется при неудаче
      description,
      undefined,
      'failed',
      failureReason,
      options.retryCount || 0,
      undefined,
      options.costCenterId,
      options.userId,
      undefined,
      {},
      undefined,
      undefined,
      undefined,
      options.userId,
      undefined,
      undefined,
      now,
      undefined,
      undefined,
      undefined,
      undefined,
      {},
      now,
      now
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      transactionType: this.transactionType,
      amount: this.amount,
      currency: this.currency,
      balanceBefore: this.balanceBefore,
      balanceAfter: this.balanceAfter,
      description: this.description,
      referenceNumber: this.referenceNumber,
      status: this.status,
      failureReason: this.failureReason,
      retryCount: this.retryCount,
      ticketId: this.ticketId,
      costCenterId: this.costCenterId,
      userId: this.userId,
      category: this.category,
      tags: this.tags,
      externalReference: this.externalReference,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      createdById: this.createdById,
      approvedById: this.approvedById,
      approvedAt: this.approvedAt,
      transactionDate: this.transactionDate,
      processedAt: this.processedAt,
      originalTransactionId: this.originalTransactionId,
      refundReason: this.refundReason,
      batchId: this.batchId,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Бизнес-методы для обновления состояния

  /**
   * Помечает транзакцию как выполненную
   */
  markAsCompleted(balanceAfter: number): TransactionLog {
    return new TransactionLog(
      this.id,
      this.companyId,
      this.transactionType,
      this.amount,
      this.currency,
      this.balanceBefore,
      balanceAfter,
      this.description,
      this.referenceNumber,
      'completed',
      undefined,
      this.retryCount,
      this.ticketId,
      this.costCenterId,
      this.userId,
      this.category,
      this.tags,
      this.externalReference,
      this.ipAddress,
      this.userAgent,
      this.createdById,
      this.approvedById,
      this.approvedAt,
      this.transactionDate,
      new Date(),
      this.originalTransactionId,
      this.refundReason,
      this.batchId,
      this.metadata,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Помечает транзакцию как неудачную
   */
  markAsFailed(reason: string, retryCount: number = this.retryCount): TransactionLog {
    return new TransactionLog(
      this.id,
      this.companyId,
      this.transactionType,
      this.amount,
      this.currency,
      this.balanceBefore,
      this.balanceBefore, // Баланс возвращается к исходному
      this.description,
      this.referenceNumber,
      'failed',
      reason,
      retryCount + 1,
      this.ticketId,
      this.costCenterId,
      this.userId,
      this.category,
      this.tags,
      this.externalReference,
      this.ipAddress,
      this.userAgent,
      this.createdById,
      this.approvedById,
      this.approvedAt,
      this.transactionDate,
      new Date(),
      this.originalTransactionId,
      this.refundReason,
      this.batchId,
      this.metadata,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Одобряет транзакцию
   */
  approve(approvedById: string): TransactionLog {
    return new TransactionLog(
      this.id,
      this.companyId,
      this.transactionType,
      this.amount,
      this.currency,
      this.balanceBefore,
      this.balanceAfter,
      this.description,
      this.referenceNumber,
      this.status,
      this.failureReason,
      this.retryCount,
      this.ticketId,
      this.costCenterId,
      this.userId,
      this.category,
      this.tags,
      this.externalReference,
      this.ipAddress,
      this.userAgent,
      this.createdById,
      approvedById,
      new Date(),
      this.transactionDate,
      this.processedAt,
      this.originalTransactionId,
      this.refundReason,
      this.batchId,
      this.metadata,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Добавляет транзакцию в пакет
   */
  addToBatch(batchId: string): TransactionLog {
    return new TransactionLog(
      this.id,
      this.companyId,
      this.transactionType,
      this.amount,
      this.currency,
      this.balanceBefore,
      this.balanceAfter,
      this.description,
      this.referenceNumber,
      this.status,
      this.failureReason,
      this.retryCount,
      this.ticketId,
      this.costCenterId,
      this.userId,
      this.category,
      this.tags,
      this.externalReference,
      this.ipAddress,
      this.userAgent,
      this.createdById,
      this.approvedById,
      this.approvedAt,
      this.transactionDate,
      this.processedAt,
      this.originalTransactionId,
      this.refundReason,
      batchId,
      this.metadata,
      this.createdAt,
      new Date()
    );
  }
}