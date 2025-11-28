import { BaseEntity } from './BaseEntity';

export type DocumentType = 'act' | 'invoice' | 'upd' | 'certificate';
export type DocumentStatus = 'generated' | 'sent' | 'signed' | 'cancelled';

export interface DocumentParty {
  name: string;
  inn?: string;
  kpp?: string;
  address?: string;
  bankAccount?: string;
  bankName?: string;
  bankBik?: string;
}

export interface DocumentContract {
  number?: string;
  date?: Date;
  description: string;
}

export interface CostCenterSummary {
  costCenterId?: string;
  costCenterName?: string;
  transactionCount: number;
  totalAmount: number;
}

export interface DocumentStatistics {
  totalDocuments: number;
  totalAmount: number;
  totalTransactions: number;
  byStatus: Array<{ status: DocumentStatus; count: number }>;
  byType: Array<{ type: DocumentType; count: number; amount: number }>;
}

export class FinancialDocument implements BaseEntity {
  constructor(
    public readonly id: string,
    public readonly companyId: string,
    public readonly documentType: DocumentType,
    public readonly documentNumber: string,
    public readonly documentDate: Date,
    public readonly documentStatus: DocumentStatus = 'generated',
    public readonly reportingPeriodStart: Date,
    public readonly reportingPeriodEnd: Date,
    public readonly totalAmount: number,
    public readonly vatAmount: number = 0,
    public readonly currency: string = 'RUB',
    public readonly exchangeRate: number = 1.0,
    public readonly transactionCount: number = 0,
    public readonly transactionTotal: number = 0,
    public readonly verifiedTotal: number = 0,
    public readonly costCenterSummary: CostCenterSummary[] = [],
    public readonly transactionIds: string[] = [],
    public readonly provider: DocumentParty = {
      name: 'Travel App SaaS',
      inn: '123456789012',
      kpp: '123456789',
      address: 'г. Москва, ул. Центральная, д. 1',
      bankAccount: '40702810000000000001',
      bankName: 'ПАО СБЕРБАНК',
      bankBik: '044525225'
    },
    public readonly client: DocumentParty,
    public readonly contract: DocumentContract,
    public readonly filePath?: string,
    public readonly fileHash?: string,
    public readonly fileSize?: number,
    public readonly version: number = 1,
    public readonly parentDocumentId?: string,
    public readonly isElectronicallySigned: boolean = false,
    public readonly signatureDate?: Date,
    public readonly signatureCertificateId?: string,
    public readonly createdById?: string,
    public readonly approvedById?: string,
    public readonly approvedAt?: Date,
    public readonly sentById?: string,
    public readonly sentAt?: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  // Бизнес-логика документов

  /**
   * Проверяет, является ли документ актом выполненных работ
   */
  isAct(): boolean {
    return this.documentType === 'act';
  }

  /**
   * Проверяет, является ли документ счетом-фактурой
   */
  isInvoice(): boolean {
    return this.documentType === 'invoice';
  }

  /**
   * Проверяет, является ли документ универсальным передаточным документом
   */
  isUPD(): boolean {
    return this.documentType === 'upd';
  }

  /**
   * Проверяет, имеет ли документ электронную подпись
   */
  hasElectronicSignature(): boolean {
    return this.isElectronicallySigned && !!this.signatureDate;
  }

  /**
   * Проверяет, отправлен ли документ клиенту
   */
  isSent(): boolean {
    return this.documentStatus === 'sent' || this.documentStatus === 'signed';
  }

  /**
   * Проверяет, подписан ли документ клиентом
   */
  isSigned(): boolean {
    return this.documentStatus === 'signed';
  }

  /**
   * Проверяет, имеет ли документ расхождения (E-Reconciliation)
   */
  hasDiscrepancies(): boolean {
    return this.transactionTotal !== this.verifiedTotal;
  }

  /**
   * Возвращает сумму расхождений
   */
  getDiscrepancyAmount(): number {
    return this.transactionTotal - this.verifiedTotal;
  }

  /**
   * Проверяет, есть ли файл документа
   */
  hasFile(): boolean {
    return !!this.filePath && !!this.fileHash;
  }

  /**
   * Возвращает общую сумму с НДС
   */
  getTotalAmountWithVat(): number {
    return this.totalAmount + this.vatAmount;
  }

  /**
   * Проверяет, требует ли документ подписания
   */
  requiresSignature(): boolean {
    return this.isSent() && !this.isSigned();
  }

  /**
   * Проверяет, можно ли редактировать документ
   */
  isEditable(): boolean {
    return this.documentStatus === 'generated';
  }

  /**
   * Проверяет, является ли документ версией другого документа
   */
  isVersion(): boolean {
    return !!this.parentDocumentId;
  }

  /**
   * Возвращает сводную информацию по центрам затрат
   */
  getCostCenterSummary(): {
    totalCostCenters: number;
    totalTransactions: number;
    totalAmount: number;
    breakdown: CostCenterSummary[];
  } {
    const totalCostCenters = this.costCenterSummary.length;
    const totalTransactions = this.costCenterSummary.reduce((sum, cc) => sum + cc.transactionCount, 0);
    const totalAmount = this.costCenterSummary.reduce((sum, cc) => sum + cc.totalAmount, 0);

    return {
      totalCostCenters,
      totalTransactions,
      totalAmount,
      breakdown: this.costCenterSummary
    };
  }

  /**
   * Возвращает информацию о периоде отчетности
   */
  getReportingPeriod(): {
    startDate: Date;
    endDate: Date;
    daysCount: number;
    isCurrentPeriod: boolean;
  } {
    const daysCount = Math.ceil(
      (this.reportingPeriodEnd.getTime() - this.reportingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const now = new Date();
    const isCurrentPeriod = now >= this.reportingPeriodStart && now <= this.reportingPeriodEnd;

    return {
      startDate: this.reportingPeriodStart,
      endDate: this.reportingPeriodEnd,
      daysCount,
      isCurrentPeriod
    };
  }

  /**
   * Проверяет целостность файла
   */
  verifyFileIntegrity(fileHash: string): boolean {
    return this.fileHash === fileHash;
  }

  /**
   * Формирует полное наименование документа
   */
  getDocumentTitle(): string {
    const titles = {
      act: 'Акт выполненных работ',
      invoice: 'Счет-фактура',
      upd: 'Универсальный передаточный документ',
      certificate: 'Сертификат оказанных услуг'
    };

    return `${titles[this.documentType]} №${this.documentNumber} от ${this.documentDate.toLocaleDateString('ru-RU')}`;
  }

  // Статические методы создания

  /**
   * Создает новый акт выполненных работ
   */
  static createAct(
    companyId: string,
    client: DocumentParty,
    periodStart: Date,
    periodEnd: Date,
    transactionIds: string[],
    options: {
      contract?: DocumentContract;
      documentNumber?: string;
      vatAmount?: number;
      serviceDescription?: string;
    } = {}
  ): FinancialDocument {
    const now = new Date();
    const serviceDescription = options.serviceDescription ||
      'Оказание услуг по бронированию и организации перевозок в период ' +
      `${periodStart.toLocaleDateString('ru-RU')} - ${periodEnd.toLocaleDateString('ru-RU')}`;

    return new FinancialDocument(
      '',
      companyId,
      'act',
      options.documentNumber || '',
      now,
      'generated',
      periodStart,
      periodEnd,
      0, // Будет рассчитан при сохранении
      options.vatAmount || 0,
      'RUB',
      1.0,
      transactionIds.length,
      0, // Будет рассчитан при сохранении
      0, // Будет рассчитан при сохранении
      [], // Будет заполнен при сохранении
      transactionIds,
      undefined, // provider по умолчанию
      client,
      options.contract || {
        description: serviceDescription
      }
    );
  }

  /**
   * Создает счет-фактуру
   */
  static createInvoice(
    companyId: string,
    client: DocumentParty,
    periodStart: Date,
    periodEnd: Date,
    totalAmount: number,
    vatAmount: number,
    transactionIds: string[],
    options: {
      contract?: DocumentContract;
      documentNumber?: string;
      serviceDescription?: string;
    } = {}
  ): FinancialDocument {
    const now = new Date();
    const serviceDescription = options.serviceDescription ||
      'Оказание услуг по организации перевозок и сопутствующих услуг';

    return new FinancialDocument(
      '',
      companyId,
      'invoice',
      options.documentNumber || '',
      now,
      'generated',
      periodStart,
      periodEnd,
      totalAmount,
      vatAmount,
      'RUB',
      1.0,
      transactionIds.length,
      totalAmount,
      totalAmount, // Изначально без расхождений
      [], // Будет заполнен при сохранении
      transactionIds,
      undefined, // provider по умолчанию
      client,
      options.contract || {
        description: serviceDescription
      }
    );
  }

  /**
   * Создает универсальный передаточный документ
   */
  static createUPD(
    companyId: string,
    client: DocumentParty,
    periodStart: Date,
    periodEnd: Date,
    totalAmount: number,
    vatAmount: number,
    transactionIds: string[],
    options: {
      contract?: DocumentContract;
      documentNumber?: string;
      serviceDescription?: string;
    } = {}
  ): FinancialDocument {
    const now = new Date();
    const serviceDescription = options.serviceDescription ||
      'Комплекс услуг по организации поездок и перевозок';

    return new FinancialDocument(
      '',
      companyId,
      'upd',
      options.documentNumber || '',
      now,
      'generated',
      periodStart,
      periodEnd,
      totalAmount,
      vatAmount,
      'RUB',
      1.0,
      transactionIds.length,
      totalAmount,
      totalAmount, // Изначально без расхождений
      [], // Будет заполнен при сохранении
      transactionIds,
      undefined, // provider по умолчанию
      client,
      options.contract || {
        description: serviceDescription
      }
    );
  }

  /**
   * Создает версию существующего документа
   */
  static createVersion(
    originalDocument: FinancialDocument,
    changes: {
      totalAmount?: number;
      vatAmount?: number;
      client?: DocumentParty;
      contract?: DocumentContract;
      transactionIds?: string[];
    }
  ): FinancialDocument {
    return new FinancialDocument(
      '',
      originalDocument.companyId,
      originalDocument.documentType,
      '', // Будет сгенерирован автоматически
      new Date(),
      'generated',
      originalDocument.reportingPeriodStart,
      originalDocument.reportingPeriodEnd,
      changes.totalAmount ?? originalDocument.totalAmount,
      changes.vatAmount ?? originalDocument.vatAmount,
      originalDocument.currency,
      originalDocument.exchangeRate,
      changes.transactionIds?.length ?? originalDocument.transactionCount,
      changes.totalAmount ?? originalDocument.transactionTotal,
      changes.totalAmount ?? originalDocument.verifiedTotal,
      [], // Будет перерассчитано при сохранении
      changes.transactionIds ?? originalDocument.transactionIds,
      originalDocument.provider,
      changes.client ?? originalDocument.client,
      changes.contract ?? originalDocument.contract,
      undefined, // Файл будет создан для новой версии
      undefined,
      undefined,
      originalDocument.version + 1,
      originalDocument.id,
      false,
      undefined,
      undefined,
      originalDocument.createdById
    );
  }

  // Бизнес-методы для обновления состояния

  /**
   * Отправляет документ клиенту
   */
  markAsSent(sentById: string): FinancialDocument {
    return new FinancialDocument(
      this.id,
      this.companyId,
      this.documentType,
      this.documentNumber,
      this.documentDate,
      'sent',
      this.reportingPeriodStart,
      this.reportingPeriodEnd,
      this.totalAmount,
      this.vatAmount,
      this.currency,
      this.exchangeRate,
      this.transactionCount,
      this.transactionTotal,
      this.verifiedTotal,
      this.costCenterSummary,
      this.transactionIds,
      this.provider,
      this.client,
      this.contract,
      this.filePath,
      this.fileHash,
      this.fileSize,
      this.version,
      this.parentDocumentId,
      this.isElectronicallySigned,
      this.signatureDate,
      this.signatureCertificateId,
      this.createdById,
      this.approvedById,
      this.approvedAt,
      sentById,
      new Date(),
      this.createdAt,
      new Date()
    );
  }

  /**
   * Подписывает документ
   */
  markAsSigned(approvedById: string, signatureCertificateId?: string): FinancialDocument {
    return new FinancialDocument(
      this.id,
      this.companyId,
      this.documentType,
      this.documentNumber,
      this.documentDate,
      'signed',
      this.reportingPeriodStart,
      this.reportingPeriodEnd,
      this.totalAmount,
      this.vatAmount,
      this.currency,
      this.exchangeRate,
      this.transactionCount,
      this.transactionTotal,
      this.verifiedTotal,
      this.costCenterSummary,
      this.transactionIds,
      this.provider,
      this.client,
      this.contract,
      this.filePath,
      this.fileHash,
      this.fileSize,
      this.version,
      this.parentDocumentId,
      true,
      new Date(),
      signatureCertificateId,
      this.createdById,
      approvedById,
      new Date(),
      this.sentById,
      this.sentAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Отменяет документ
   */
  markAsCancelled(): FinancialDocument {
    return new FinancialDocument(
      this.id,
      this.companyId,
      this.documentType,
      this.documentNumber,
      this.documentDate,
      'cancelled',
      this.reportingPeriodStart,
      this.reportingPeriodEnd,
      this.totalAmount,
      this.vatAmount,
      this.currency,
      this.exchangeRate,
      this.transactionCount,
      this.transactionTotal,
      this.verifiedTotal,
      this.costCenterSummary,
      this.transactionIds,
      this.provider,
      this.client,
      this.contract,
      this.filePath,
      this.fileHash,
      this.fileSize,
      this.version,
      this.parentDocumentId,
      this.isElectronicallySigned,
      this.signatureDate,
      this.signatureCertificateId,
      this.createdById,
      this.approvedById,
      this.approvedAt,
      this.sentById,
      this.sentAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Обновляет результаты E-Reconciliation
   */
  updateVerificationResults(verifiedTotal: number): FinancialDocument {
    return new FinancialDocument(
      this.id,
      this.companyId,
      this.documentType,
      this.documentNumber,
      this.documentDate,
      this.documentStatus,
      this.reportingPeriodStart,
      this.reportingPeriodEnd,
      this.totalAmount,
      this.vatAmount,
      this.currency,
      this.exchangeRate,
      this.transactionCount,
      this.transactionTotal,
      verifiedTotal,
      this.costCenterSummary,
      this.transactionIds,
      this.provider,
      this.client,
      this.contract,
      this.filePath,
      this.fileHash,
      this.fileSize,
      this.version,
      this.parentDocumentId,
      this.isElectronicallySigned,
      this.signatureDate,
      this.signatureCertificateId,
      this.createdById,
      this.approvedById,
      this.approvedAt,
      this.sentById,
      this.sentAt,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Добавляет информацию о файле
   */
  attachFile(filePath: string, fileHash: string, fileSize: number): FinancialDocument {
    return new FinancialDocument(
      this.id,
      this.companyId,
      this.documentType,
      this.documentNumber,
      this.documentDate,
      this.documentStatus,
      this.reportingPeriodStart,
      this.reportingPeriodEnd,
      this.totalAmount,
      this.vatAmount,
      this.currency,
      this.exchangeRate,
      this.transactionCount,
      this.transactionTotal,
      this.verifiedTotal,
      this.costCenterSummary,
      this.transactionIds,
      this.provider,
      this.client,
      this.contract,
      filePath,
      fileHash,
      fileSize,
      this.version,
      this.parentDocumentId,
      this.isElectronicallySigned,
      this.signatureDate,
      this.signatureCertificateId,
      this.createdById,
      this.approvedById,
      this.approvedAt,
      this.sentById,
      this.sentAt,
      this.createdAt,
      new Date()
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      companyId: this.companyId,
      documentType: this.documentType,
      documentNumber: this.documentNumber,
      documentDate: this.documentDate,
      documentStatus: this.documentStatus,
      reportingPeriodStart: this.reportingPeriodStart,
      reportingPeriodEnd: this.reportingPeriodEnd,
      totalAmount: this.totalAmount,
      vatAmount: this.vatAmount,
      totalAmountWithVat: this.getTotalAmountWithVat(),
      currency: this.currency,
      exchangeRate: this.exchangeRate,
      transactionCount: this.transactionCount,
      transactionTotal: this.transactionTotal,
      verifiedTotal: this.verifiedTotal,
      discrepancyAmount: this.getDiscrepancyAmount(),
      hasDiscrepancies: this.hasDiscrepancies(),
      costCenterSummary: this.costCenterSummary,
      transactionIds: this.transactionIds,
      provider: this.provider,
      client: this.client,
      contract: this.contract,
      filePath: this.filePath,
      fileHash: this.fileHash,
      fileSize: this.fileSize,
      version: this.version,
      parentDocumentId: this.parentDocumentId,
      isElectronicallySigned: this.isElectronicallySigned,
      signatureDate: this.signatureDate,
      signatureCertificateId: this.signatureCertificateId,
      createdById: this.createdById,
      approvedById: this.approvedById,
      approvedAt: this.approvedAt,
      sentById: this.sentById,
      sentAt: this.sentAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      documentTitle: this.getDocumentTitle(),
      hasFile: this.hasFile(),
      isSent: this.isSent(),
      isSigned: this.isSigned(),
      isEditable: this.isEditable(),
      isVersion: this.isVersion()
    };
  }
}