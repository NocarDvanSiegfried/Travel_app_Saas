import {
  FinancialDocument,
  DocumentType,
  DocumentStatus,
  DocumentParty,
  CostCenterSummary,
  DocumentStatistics
} from '../../domain/entities/FinancialDocument';
import { TransactionLog } from '../../domain/entities/TransactionLog';
import { CostCenter } from '../../domain/entities/CostCenter';
import { B2BCompany } from '../../domain/entities/B2BCompany';
import { B2BUser } from '../../domain/entities/B2BUser';

export interface ReportFilters {
  companyId: string;
  dateStart: Date;
  dateEnd: Date;
  costCenterIds?: string[];
  userIds?: string[];
  transactionTypes?: string[];
  categories?: string[];
  includeRefunds?: boolean;
  includeDeposits?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

export interface ReportGenerationOptions {
  documentType: DocumentType;
  clientInfo: DocumentParty;
  contractInfo?: {
    number?: string;
    date?: Date;
    description?: string;
  };
  vatAmount?: number;
  serviceDescription?: string;
  includeElectronicSignature?: boolean;
}

export interface EReconciliationResult {
  documentId: string;
  expectedTotal: number;
  actualTotal: number;
  discrepancyAmount: number;
  discrepancyPercentage: number;
  transactionIds: string[];
  costCenterDiscrepancies: Array<{
    costCenterId: string;
    expectedAmount: number;
    actualAmount: number;
    discrepancyAmount: number;
  }>;
  isReconciled: boolean;
  reconciliationDate: Date;
}

export interface ConsolidatedReport {
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  totalAmount: number;
  totalRefunds: number;
  totalNetAmount: number;
  costCenterBreakdown: CostCenterSummary[];
  topUsers: Array<{
    userId: string;
    userName: string;
    transactionCount: number;
    totalAmount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    transactionCount: number;
    totalAmount: number;
  }>;
  categories: Array<{
    category: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeHeaders?: boolean;
  includeCostCenters?: boolean;
  includeUserDetails?: boolean;
  includeTransactionDetails?: boolean;
  includeCharts?: boolean;
  language?: 'ru' | 'en';
  dateFormat?: 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

export class B2BReportingService {
  // 1. Единая Электронная Сверка (E-Reconciliation)

  /**
   * Выполняет 100% сверку данных между документом и transaction_log
   */
  async performEReconciliation(documentId: string): Promise<EReconciliationResult> {
    // Загружаем документ
    const document = await this.loadDocument(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Загружаем все транзакции из transaction_log
    const transactions = await this.loadDocumentTransactions(document.transactionIds);

    // Рассчитываем фактическую сумму
    let actualTotal = 0;
    const costCenterAmounts = new Map<string, number>();

    for (const transaction of transactions) {
      if (transaction.status === 'completed') {
        const signedAmount = transaction.getSignedAmount();
        actualTotal += signedAmount;

        // Группируем по центрам затрат
        if (transaction.costCenterId) {
          const current = costCenterAmounts.get(transaction.costCenterId) || 0;
          costCenterAmounts.set(transaction.costCenterId, current + signedAmount);
        }
      }
    }

    // Анализируем расхождения по центрам затрат
    const costCenterDiscrepancies = document.costCenterSummary.map(cc => {
      const expectedAmount = cc.totalAmount;
      const actualAmount = costCenterAmounts.get(cc.costCenterId || '') || 0;
      const discrepancyAmount = expectedAmount - actualAmount;

      return {
        costCenterId: cc.costCenterId || '',
        expectedAmount,
        actualAmount,
        discrepancyAmount
      };
    });

    const expectedTotal = document.transactionTotal;
    const discrepancyAmount = expectedTotal - actualTotal;
    const discrepancyPercentage = expectedTotal !== 0 ?
      Math.abs(discrepancyAmount / expectedTotal) * 100 : 0;

    const result: EReconciliationResult = {
      documentId,
      expectedTotal,
      actualTotal,
      discrepancyAmount,
      discrepancyPercentage,
      transactionIds: document.transactionIds,
      costCenterDiscrepancies,
      isReconciled: Math.abs(discrepancyAmount) < 0.01, // Разница менее 1 копейки
      reconciliationDate: new Date()
    };

    // Обновляем документ с результатами сверки
    if (result.isReconciled) {
      await this.updateDocumentVerification(documentId, actualTotal);
    }

    return result;
  }

  /**
   * Автоматическая сверка всех неподписанных документов компании
   */
  async performBulkEReconciliation(companyId: string): Promise<EReconciliationResult[]> {
    const pendingDocuments = await this.loadPendingDocuments(companyId);
    const results: EReconciliationResult[] = [];

    for (const document of pendingDocuments) {
      try {
        const result = await this.performEReconciliation(document.id);
        results.push(result);
      } catch (error) {
        console.error(`E-Reconciliation failed for document ${document.id}:`, error);
      }
    }

    return results;
  }

  // 2. Консолидированный Отчет о Транзакциях

  /**
   * Генерирует консолидированный отчет за период
   */
  async generateConsolidatedReport(filters: ReportFilters): Promise<ConsolidatedReport> {
    const transactions = await this.loadTransactionsByFilters(filters);

    const totalTransactions = transactions.length;
    let totalAmount = 0;
    let totalRefunds = 0;

    // Группировка по центрам затрат
    const costCenterMap = new Map<string, CostCenterSummary>();

    // Группировка по пользователям
    const userMap = new Map<string, { count: number; amount: number; name?: string }>();

    // Группировка по месяцам
    const monthlyMap = new Map<string, { count: number; amount: number }>();

    // Группировка по категориям
    const categoryMap = new Map<string, { count: number; amount: number }>();

    // Загружаем дополнительную информацию
    const costCenters = await this.loadCostCenters(filters.companyId);
    const users = await this.loadUsers(filters.companyId);

    for (const transaction of transactions) {
      if (transaction.status !== 'completed') continue;

      const signedAmount = transaction.getSignedAmount();
      totalAmount += signedAmount;

      if (transaction.isRefund()) {
        totalRefunds += signedAmount;
      }

      // Группировка по центрам затрат
      if (transaction.costCenterId) {
        const cc = costCenters.find(c => c.id === transaction.costCenterId);
        const current = costCenterMap.get(transaction.costCenterId) || {
          costCenterId: transaction.costCenterId,
          costCenterName: cc?.name || 'Unknown',
          transactionCount: 0,
          totalAmount: 0
        };
        current.transactionCount++;
        current.totalAmount += signedAmount;
        costCenterMap.set(transaction.costCenterId, current);
      }

      // Группировка по пользователям
      if (transaction.userId) {
        const user = users.find(u => u.id === transaction.userId);
        const current = userMap.get(transaction.userId) || { count: 0, amount: 0, name: user?.getFullName() };
        current.count++;
        current.amount += signedAmount;
        userMap.set(transaction.userId, current);
      }

      // Группировка по месяцам
      const monthKey = transaction.transactionDate.toISOString().slice(0, 7); // YYYY-MM
      const currentMonth = monthlyMap.get(monthKey) || { count: 0, amount: 0 };
      currentMonth.count++;
      currentMonth.amount += signedAmount;
      monthlyMap.set(monthKey, currentMonth);

      // Группировка по категориям
      const category = transaction.category || 'other';
      const currentCategory = categoryMap.get(category) || { count: 0, amount: 0 };
      currentCategory.count++;
      currentCategory.amount += signedAmount;
      categoryMap.set(category, currentCategory);
    }

    const totalNetAmount = totalAmount - totalRefunds;

    // Формирование результата
    const costCenterBreakdown = Array.from(costCenterMap.values());

    const topUsers = Array.from(userMap.entries())
      .map(([userId, data]) => ({
        userId,
        userName: data.name || 'Unknown User',
        transactionCount: data.count,
        totalAmount: data.amount
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        transactionCount: data.count,
        totalAmount: data.amount
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalCategoryAmount = Array.from(categoryMap.values())
      .reduce((sum, cat) => sum + cat.amount, 0);

    const categories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        amount: data.amount,
        percentage: totalCategoryAmount !== 0 ? (data.amount / totalCategoryAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      periodStart: filters.dateStart,
      periodEnd: filters.dateEnd,
      totalTransactions,
      totalAmount,
      totalRefunds,
      totalNetAmount,
      costCenterBreakdown,
      topUsers,
      monthlyTrend,
      categories
    };
  }

  // 3. Генератор Закрывающих Документов

  /**
   * Генерирует закрывающие документы за период
   */
  async generateClosingDocuments(
    companyId: string,
    periodStart: Date,
    periodEnd: Date,
    options: ReportGenerationOptions
  ): Promise<FinancialDocument[]> {
    // Находим все транзакции за период
    const transactions = await this.loadTransactionsForPeriod(companyId, periodStart, periodEnd);

    if (transactions.length === 0) {
      throw new Error('No transactions found for the specified period');
    }

    // Группируем транзакции по центрам затрат (если требуется)
    const transactionIds = transactions.map(t => t.id);

    // Рассчитываем суммы
    let totalAmount = 0;
    const costCenterSummary = this.calculateCostCenterSummary(transactions);

    for (const transaction of transactions) {
      if (transaction.status === 'completed' && !transaction.isDeposit()) {
        totalAmount += transaction.getSignedAmount();
      }
    }

    // Создаем документы в зависимости от типа
    const documents: FinancialDocument[] = [];

    switch (options.documentType) {
      case 'act':
        documents.push(
          FinancialDocument.createAct(
            companyId,
            options.clientInfo,
            periodStart,
            periodEnd,
            transactionIds,
            {
              contract: options.contractInfo,
              serviceDescription: options.serviceDescription
            }
          )
        );
        break;

      case 'invoice':
        documents.push(
          FinancialDocument.createInvoice(
            companyId,
            options.clientInfo,
            periodStart,
            periodEnd,
            totalAmount,
            options.vatAmount || 0,
            transactionIds,
            {
              contract: options.contractInfo,
              serviceDescription: options.serviceDescription
            }
          )
        );
        break;

      case 'upd':
        documents.push(
          FinancialDocument.createUPD(
            companyId,
            options.clientInfo,
            periodStart,
            periodEnd,
            totalAmount,
            options.vatAmount || 0,
            transactionIds,
            {
              contract: options.contractInfo,
              serviceDescription: options.serviceDescription
            }
          )
        );
        break;

      default:
        throw new Error(`Unsupported document type: ${options.documentType}`);
    }

    // Сохраняем документы и выполняем автоматическую сверку
    const savedDocuments = await this.saveDocuments(documents);

    for (const document of savedDocuments) {
      await this.performEReconciliation(document.id);
    }

    return savedDocuments;
  }

  /**
   * Генерирует все закрывающие документы для месяца (Акт + Счет-фактура + УПД)
   */
  async generateMonthlyClosingPackage(
    companyId: string,
    year: number,
    month: number,
    clientInfo: DocumentParty,
    contractInfo?: { number?: string; date?: Date; description?: string }
  ): Promise<FinancialDocument[]> {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0); // Последний день месяца

    const documents: FinancialDocument[] = [];

    // 1. Акт выполненных работ
    const act = await this.generateClosingDocuments(companyId, periodStart, periodEnd, {
      documentType: 'act',
      clientInfo,
      contractInfo,
      serviceDescription: `Оказание услуг по организации деловых поездок за ${monthNames[month - 1]} ${year} года`
    });

    // 2. Счет-фактура (если нужна НДС)
    const invoice = await this.generateClosingDocuments(companyId, periodStart, periodEnd, {
      documentType: 'invoice',
      clientInfo,
      contractInfo,
      vatAmount: 0, // Установить в соответствии с налоговым режимом
      serviceDescription: `Оказание услуг по организации деловых поездок за ${monthNames[month - 1]} ${year} года`
    });

    // 3. Универсальный передаточный документ
    const upd = await this.generateClosingDocuments(companyId, periodStart, periodEnd, {
      documentType: 'upd',
      clientInfo,
      contractInfo,
      serviceDescription: `Комплекс услуг по организации деловых поездок за ${monthNames[month - 1]} ${year} года`
    });

    return [...act, ...invoice, ...upd];
  }

  // 4. Экспорт данных

  /**
   * Экспортирует консолидированный отчет в указанном формате
   */
  async exportReport(
    reportData: ConsolidatedReport,
    options: ExportOptions
  ): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
  }> {
    switch (options.format) {
      case 'csv':
        return this.exportToCSV(reportData, options);
      case 'excel':
        return this.exportToExcel(reportData, options);
      case 'pdf':
        return this.exportToPDF(reportData, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Возвращает статистику по документам компании
   */
  async getDocumentStatistics(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<DocumentStatistics> {
    const documents = await this.loadCompanyDocuments(companyId, startDate, endDate);

    const totalDocuments = documents.length;
    const totalAmount = documents.reduce((sum, doc) => sum + doc.getTotalAmountWithVat(), 0);
    const totalTransactions = documents.reduce((sum, doc) => sum + doc.transactionCount, 0);

    const statusGroups = documents.reduce((groups, doc) => {
      const status = doc.documentStatus;
      groups[status] = (groups[status] || 0) + 1;
      return groups;
    }, {} as Record<DocumentStatus, number>);

    const typeGroups = documents.reduce((groups, doc) => {
      const type = doc.documentType;
      if (!groups[type]) {
        groups[type] = { count: 0, amount: 0 };
      }
      groups[type].count++;
      groups[type].amount += doc.getTotalAmountWithVat();
      return groups;
    }, {} as Record<DocumentType, { count: number; amount: number }>);

    return {
      totalDocuments,
      totalAmount,
      totalTransactions,
      byStatus: Object.entries(statusGroups).map(([status, count]) => ({
        status: status as DocumentStatus,
        count
      })),
      byType: Object.entries(typeGroups).map(([type, data]) => ({
        type: type as DocumentType,
        count: data.count,
        amount: data.amount
      }))
    };
  }

  // Приватные вспомогательные методы

  private async loadDocument(documentId: string): Promise<FinancialDocument | null> {
    // Имитация загрузки из репозитория
    return null; // Реализация в репозитории
  }

  private async loadDocumentTransactions(transactionIds: string[]): Promise<TransactionLog[]> {
    // Имитация загрузки транзакций
    return []; // Реализация в репозитории
  }

  private async loadTransactionsByFilters(filters: ReportFilters): Promise<TransactionLog[]> {
    // Имитация загрузки по фильтрам
    return []; // Реализация в репозитории
  }

  private async loadTransactionsForPeriod(
    companyId: string,
    start: Date,
    end: Date
  ): Promise<TransactionLog[]> {
    // Имитация загрузки за период
    return []; // Реализация в репозитории
  }

  private async loadPendingDocuments(companyId: string): Promise<FinancialDocument[]> {
    // Имитация загрузки неподписанных документов
    return []; // Реализация в репозитории
  }

  private async loadCompanyDocuments(
    companyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialDocument[]> {
    // Имитация загрузки документов компании
    return []; // Реализация в репозитории
  }

  private async loadCostCenters(companyId: string): Promise<CostCenter[]> {
    // Имитация загрузки центров затрат
    return []; // Реализация в репозитории
  }

  private async loadUsers(companyId: string): Promise<B2BUser[]> {
    // Имитация загрузки пользователей
    return []; // Реализация в репозитории
  }

  private async updateDocumentVerification(documentId: string, verifiedTotal: number): Promise<void> {
    // Имитация обновления верификации
    // Реализация в репозитории
  }

  private async saveDocuments(documents: FinancialDocument[]): Promise<FinancialDocument[]> {
    // Имитация сохранения документов
    return documents; // Реализация в репозитории
  }

  private calculateCostCenterSummary(transactions: TransactionLog[]): CostCenterSummary[] {
    const costCenterMap = new Map<string, CostCenterSummary>();

    for (const transaction of transactions) {
      if (transaction.status !== 'completed' || !transaction.costCenterId) continue;

      const current = costCenterMap.get(transaction.costCenterId) || {
        costCenterId: transaction.costCenterId,
        transactionCount: 0,
        totalAmount: 0
      };

      current.transactionCount++;
      current.totalAmount += transaction.getSignedAmount();
      costCenterMap.set(transaction.costCenterId, current);
    }

    return Array.from(costCenterMap.values());
  }

  private async exportToCSV(reportData: ConsolidatedReport, options: ExportOptions): Promise<any> {
    // Реализация экспорта в CSV
    throw new Error('CSV export not implemented');
  }

  private async exportToExcel(reportData: ConsolidatedReport, options: ExportOptions): Promise<any> {
    // Реализация экспорта в Excel
    throw new Error('Excel export not implemented');
  }

  private async exportToPDF(reportData: ConsolidatedReport, options: ExportOptions): Promise<any> {
    // Реализация экспорта в PDF
    throw new Error('PDF export not implemented');
  }
}

// Вспомогательные константы
const monthNames = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];