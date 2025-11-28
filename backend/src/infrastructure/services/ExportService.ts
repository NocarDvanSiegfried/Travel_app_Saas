import { ConsolidatedReport, CostCenterSummary } from '../../application/services/B2BReportingService';
import { FinancialDocument } from '../../domain/entities/FinancialDocument';
import { TransactionLog } from '../../domain/entities/TransactionLog';
import { StorageManager } from '../storage/StorageManager';
import { createHash } from 'crypto';
import * as XLSX from 'xlsx';
import { Parser } from 'json2csv';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  language?: 'ru' | 'en';
  includeHeaders?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  costCenterIds?: string[];
  userIds?: string[];
}

export class ExportService {
  constructor(
    private storageManager: StorageManager
  ) {}

  async exportTransactions(
    transactions: TransactionLog[],
    options: ExportOptions
  ): Promise<string> {
    const filteredTransactions = this.filterTransactions(transactions, options);

    switch (options.format) {
      case 'csv':
        return this.exportToCSV(filteredTransactions, options);
      case 'excel':
        return this.exportToExcel(filteredTransactions, options);
      case 'pdf':
        return this.exportToPDF(filteredTransactions, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  async exportFinancialDocuments(
    documents: FinancialDocument[],
    options: ExportOptions
  ): Promise<string> {
    const filteredDocuments = this.filterDocuments(documents, options);

    switch (options.format) {
      case 'csv':
        return this.exportDocumentsToCSV(filteredDocuments, options);
      case 'excel':
        return this.exportDocumentsToExcel(filteredDocuments, options);
      case 'pdf':
        return this.exportDocumentsToPDF(filteredDocuments, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  async exportConsolidatedReport(
    report: ConsolidatedReport,
    options: ExportOptions
  ): Promise<string> {
    switch (options.format) {
      case 'excel':
        return this.exportReportToExcel(report, options);
      case 'csv':
        return this.exportReportToCSV(report, options);
      default:
        throw new Error(`Unsupported format for consolidated report: ${options.format}`);
    }
  }

  private filterTransactions(
    transactions: TransactionLog[],
    options: ExportOptions
  ): TransactionLog[] {
    let filtered = [...transactions];

    if (options.dateRange) {
      filtered = filtered.filter(t =>
        t.createdAt >= options.dateRange!.start &&
        t.createdAt <= options.dateRange!.end
      );
    }

    if (options.costCenterIds?.length) {
      filtered = filtered.filter(t =>
        t.costCenterId && options.costCenterIds!.includes(t.costCenterId)
      );
    }

    if (options.userIds?.length) {
      filtered = filtered.filter(t =>
        t.userId && options.userIds!.includes(t.userId)
      );
    }

    return filtered;
  }

  private filterDocuments(
    documents: FinancialDocument[],
    options: ExportOptions
  ): FinancialDocument[] {
    let filtered = [...documents];

    if (options.dateRange) {
      filtered = filtered.filter(d =>
        d.createdAt >= options.dateRange!.start &&
        d.createdAt <= options.dateRange!.end
      );
    }

    return filtered;
  }

  private async exportToCSV(
    transactions: TransactionLog[],
    options: ExportOptions
  ): Promise<string> {
    const language = options.language || 'ru';
    const headers = options.includeHeaders !== false ? this.getCSVHeaders(language) : undefined;

    const data = transactions.map(t => ({
      transactionDate: t.createdAt.toISOString().split('T')[0],
      documentNumber: t.documentNumber || '',
      type: t.type,
      description: t.description || '',
      amount: Math.abs(t.amount),
      status: t.status,
      costCenterId: t.costCenterId || '',
      userId: t.userId || '',
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    }));

    const parser = new Parser({
      fields: headers,
      delimiter: ';'
    });

    return parser.parse(data);
  }

  private async exportToExcel(
    transactions: TransactionLog[],
    options: ExportOptions
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Transactions sheet
    const transactionsData = transactions.map(t => ({
      'Дата транзакции': t.createdAt.toLocaleDateString('ru-RU'),
      'Номер документа': t.documentNumber || '',
      'Тип': t.type,
      'Описание': t.description || '',
      'Сумма': Math.abs(t.amount),
      'Статус': t.status,
      'Центр затрат': t.costCenterId || '',
      'Пользователь': t.userId || ''
    }));

    const transactionsSheet = XLSX.utils.json_to_sheet(transactionsData);
    XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Транзакции');

    // Statistics sheet
    const statsSheet = this.createStatisticsSheet(transactions, options.language || 'ru');
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Статистика');

    // Users summary sheet
    const usersSheet = this.createUsersSummarySheet(transactions);
    XLSX.utils.book_append_sheet(workbook, usersSheet, 'Пользователи');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }).toString('base64');
  }

  private async exportToPDF(
    transactions: TransactionLog[],
    options: ExportOptions
  ): Promise<string> {
    // Simplified PDF export - in production, use a proper PDF library
    const headers = this.getPDFHeaders(options.language || 'ru');
    const data = transactions.map(t => [
      t.createdAt.toLocaleDateString('ru-RU'),
      t.documentNumber || '',
      t.type,
      t.description || '',
      Math.abs(t.amount).toFixed(2),
      t.status,
      t.costCenterId || ''
    ]);

    // This is a placeholder - implement proper PDF generation
    return JSON.stringify({ headers, data });
  }

  private async exportDocumentsToCSV(
    documents: FinancialDocument[],
    options: ExportOptions
  ): Promise<string> {
    const language = options.language || 'ru';

    const data = documents.map(d => ({
      documentNumber: d.documentNumber,
      documentType: d.documentType,
      documentStatus: d.documentStatus,
      clientId: d.clientId,
      contractNumber: d.contractNumber,
      totalAmount: d.getTotalAmountWithVat(),
      totalAmountWithoutVat: d.getTotalAmountWithoutVat(),
      vatAmount: d.getVatAmount(),
      currency: d.currency,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString()
    }));

    const parser = new Parser({
      delimiter: ';'
    });

    return parser.parse(data);
  }

  private async exportDocumentsToExcel(
    documents: FinancialDocument[],
    options: ExportOptions
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Documents sheet
    const documentsData = documents.map(d => ({
      'Номер документа': d.documentNumber,
      'Тип документа': d.documentType,
      'Статус': d.documentStatus,
      'Клиент': d.clientId,
      'Номер договора': d.contractNumber,
      'Сумма с НДС': d.getTotalAmountWithVat(),
      'Сумма без НДС': d.getTotalAmountWithoutVat(),
      'Сумма НДС': d.getVatAmount(),
      'Валюта': d.currency,
      'Дата создания': d.createdAt.toLocaleDateString('ru-RU')
    }));

    const documentsSheet = XLSX.utils.json_to_sheet(documentsData);
    XLSX.utils.book_append_sheet(workbook, documentsSheet, 'Документы');

    // Statistics sheet
    const statsSheet = this.createDocumentStatistics(documents);
    XLSX.utils.book_append_sheet(workbook, statsSheet, 'Статистика');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }).toString('base64');
  }

  private async exportDocumentsToPDF(
    documents: FinancialDocument[],
    options: ExportOptions
  ): Promise<string> {
    // Placeholder for PDF export
    return JSON.stringify({ documents: documents.length });
  }

  private async exportReportToExcel(
    report: ConsolidatedReport,
    options: ExportOptions
  ): Promise<string> {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      { 'Показатель': 'Период', 'Значение': `${report.startDate.toLocaleDateString('ru-RU')} - ${report.endDate.toLocaleDateString('ru-RU')}` },
      { 'Показатель': 'Всего транзакций', 'Значение': report.summary.totalTransactions },
      { 'Показатель': 'Общая сумма', 'Значение': report.summary.totalAmount },
      { 'Показатель': 'Уникальные пользователи', 'Значение': report.summary.uniqueUsers },
      { 'Показатель': 'Центры затрат', 'Значение': report.summary.uniqueCostCenters }
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Сводка');

    // Cost centers sheet
    if (report.costCenters.length > 0) {
      const costCentersData = report.costCenters.map(cc => ({
        'Центр затрат': cc.costCenterId,
        'Название': cc.name,
        'Транзакции': cc.transactionCount,
        'Сумма': cc.totalAmount,
        'Бюджет': cc.budget,
        'Выполнение бюджета': `${((cc.totalAmount / cc.budget) * 100).toFixed(1)}%`
      }));

      const costCentersSheet = XLSX.utils.json_to_sheet(costCentersData);
      XLSX.utils.book_append_sheet(workbook, costCentersSheet, 'Центры затрат');
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }).toString('base64');
  }

  private async exportReportToCSV(
    report: ConsolidatedReport,
    options: ExportOptions
  ): Promise<string> {
    const data = [
      ['Период', `${report.startDate.toLocaleDateString('ru-RU')} - ${report.endDate.toLocaleDateString('ru-RU')}`],
      ['Всего транзакций', report.summary.totalTransactions],
      ['Общая сумма', report.summary.totalAmount],
      ['Уникальные пользователи', report.summary.uniqueUsers],
      ['Центры затрат', report.summary.uniqueCostCenters]
    ];

    return data.map(row => row.join(';')).join('\n');
  }

  private getCSVHeaders(language: 'ru' | 'en'): any[] {
    return language === 'ru' ? [
      { label: 'Дата транзакции', value: 'transactionDate' },
      { label: 'Номер документа', value: 'documentNumber' },
      { label: 'Тип', value: 'type' },
      { label: 'Описание', value: 'description' },
      { label: 'Сумма', value: 'amount' },
      { label: 'Статус', value: 'status' },
      { label: 'Центр затрат', value: 'costCenterId' },
      { label: 'Пользователь', value: 'userId' },
      { label: 'Дата создания', value: 'createdAt' },
      { label: 'Дата обновления', value: 'updatedAt' }
    ] : [
      { label: 'Transaction Date', value: 'transactionDate' },
      { label: 'Document Number', value: 'documentNumber' },
      { label: 'Type', value: 'type' },
      { label: 'Description', value: 'description' },
      { label: 'Amount', value: 'amount' },
      { label: 'Status', value: 'status' },
      { label: 'Cost Center', value: 'costCenterId' },
      { label: 'User', value: 'userId' },
      { label: 'Created At', value: 'createdAt' },
      { label: 'Updated At', value: 'updatedAt' }
    ];
  }

  private getPDFHeaders(language: 'ru' | 'en'): string[] {
    return language === 'ru' ? [
      'Дата транзакции',
      'Номер документа',
      'Тип',
      'Описание',
      'Сумма',
      'Статус',
      'Центр затрат'
    ] : [
      'Transaction Date',
      'Document Number',
      'Type',
      'Description',
      'Amount',
      'Status',
      'Cost Center'
    ];
  }

  private createStatisticsSheet(transactions: TransactionLog[], language: 'ru' | 'en'): XLSX.WorkSheet {
    const stats = {
      totalTransactions: transactions.filter(t => t.status === 'completed').length,
      totalAmount: transactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      uniqueUsers: new Set(transactions.filter(t => t.userId).map(t => t.userId)).size,
      uniqueCostCenters: new Set(transactions.filter(t => t.costCenterId).map(t => t.costCenterId)).size,
      averageTransactionAmount: 0
    };

    stats.averageTransactionAmount = stats.totalTransactions > 0 ? stats.totalAmount / stats.totalTransactions : 0;

    const statsData = language === 'ru' ? [
      { 'Показатель': 'Всего транзакций', 'Значение': stats.totalTransactions },
      { 'Показатель': 'Общая сумма', 'Значение': stats.totalAmount },
      { 'Показатель': 'Уникальные пользователи', 'Значение': stats.uniqueUsers },
      { 'Показатель': 'Центры затрат', 'Значение': stats.uniqueCostCenters },
      { 'Показатель': 'Средний чек', 'Значение': stats.averageTransactionAmount }
    ] : [
      { 'Metric': 'Total Transactions', 'Value': stats.totalTransactions },
      { 'Metric': 'Total Amount', 'Value': stats.totalAmount },
      { 'Metric': 'Unique Users', 'Value': stats.uniqueUsers },
      { 'Metric': 'Cost Centers', 'Value': stats.uniqueCostCenters },
      { 'Metric': 'Average Transaction', 'Value': stats.averageTransactionAmount }
    ];

    return XLSX.utils.json_to_sheet(statsData);
  }

  private createUsersSummarySheet(transactions: TransactionLog[]): XLSX.WorkSheet {
    const userMap = new Map<string, {
      transactionCount: number;
      totalAmount: number;
      lastDate: Date;
    }>();

    transactions.forEach(t => {
      if (!t.userId) return;

      if (!userMap.has(t.userId)) {
        userMap.set(t.userId, {
          transactionCount: 0,
          totalAmount: 0,
          lastDate: t.createdAt
        });
      }

      const userData = userMap.get(t.userId)!;
      userData.transactionCount++;
      userData.totalAmount += Math.abs(t.amount);
      if (t.createdAt > userData.lastDate) {
        userData.lastDate = t.createdAt;
      }
    });

    return Array.from(userMap.entries()).map(([userId, data]) => ({
      userName: `User ${userId}`, // В реальном приложении здесь будет имя пользователя
      transactionCount: data.transactionCount,
      totalAmount: data.totalAmount,
      lastTransactionDate: data.lastDate.toLocaleDateString('ru-RU')
    }));
  }

  private calculateDocumentStatistics(documents: FinancialDocument[]): Array<{ [key: string]: any }> {
    const totalDocuments = documents.length;
    const generatedCount = documents.filter(d => d.documentStatus === 'generated').length;
    const sentCount = documents.filter(d => d.documentStatus === 'sent').length;
    const signedCount = documents.filter(d => d.documentStatus === 'signed').length;
    const totalAmount = documents.reduce((sum, d) => sum + d.getTotalAmountWithVat(), 0);

    return [
      { 'Показатель': 'Всего документов', 'Значение': totalDocuments },
      { 'Показатель': 'Сгенерировано', 'Значение': generatedCount },
      { 'Показатель': 'Отправлено', 'Значение': sentCount },
      { 'Показатель': 'Подписано', 'Значение': signedCount },
      { 'Показатель': 'Общая сумма', 'Значение': totalAmount }
    ];
  }
}