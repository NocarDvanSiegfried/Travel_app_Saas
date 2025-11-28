import { Request, Response } from 'express';
import { B2BReportingService } from '../../application/services/B2BReportingService';
import { FinancialDocumentRepository } from '../../infrastructure/repositories/FinancialDocumentRepository';
import { TransactionLogRepository } from '../../infrastructure/repositories/TransactionLogRepository';
import { CostCenterRepository } from '../../infrastructure/repositories/CostCenterRepository';
import { DocumentGeneratorService } from '../../infrastructure/services/DocumentGeneratorService';
import { ExportService } from '../../infrastructure/services/ExportService';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { ApiResponse } from '../responses/ApiResponse';
import { validateReportFilters } from '../validators/reporting.validator';
import { validateDocumentGeneration } from '../validators/document.validator';

export class B2BReportingController {
  private reportingService: B2BReportingService;
  private documentRepository: FinancialDocumentRepository;
  private exportService: ExportService;
  private documentGenerator: DocumentGeneratorService;

  constructor() {
    // Инициализация сервисов
    this.reportingService = new B2BReportingService();
    this.documentRepository = new FinancialDocumentRepository();
    this.exportService = new ExportService(new StorageManager());
    this.documentGenerator = new DocumentGeneratorService(new StorageManager());
  }

  /**
   * Получение списка финансовых документов с фильтрацией
   */
  async getDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const filters = {
        companyId,
        documentType: req.query.documentType as string,
        documentStatus: req.query.documentStatus as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        reportingPeriodFrom: req.query.reportingPeriodFrom ? new Date(req.query.reportingPeriodFrom as string) : undefined,
        reportingPeriodTo: req.query.reportingPeriodTo ? new Date(req.query.reportingPeriodTo as string) : undefined,
        costCenterId: req.query.costCenterId as string,
        hasDiscrepancies: req.query.hasDiscrepancies === 'true',
        isUnsigned: req.query.isUnsigned === 'true'
      };

      const pagination = {
        limit: Math.min(parseInt(req.query.limit as string) || 50, 100),
        offset: parseInt(req.query.offset as string) || 0,
        sortBy: req.query.sortBy as string || 'created_at',
        sortOrder: (req.query.sortOrder as string)?.toUpperCase() === 'ASC' ? 'ASC' as const : 'DESC' as const
      };

      const result = await this.documentRepository.findByFilters(filters, pagination);

      res.json(ApiResponse.success(result, 'Documents retrieved successfully'));
    } catch (error) {
      console.error('Error retrieving documents:', error);
      res.status(500).json(ApiResponse.error('Failed to retrieve documents'));
    }
  }

  /**
   * Получение детальной информации о документе
   */
  async getDocumentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      const document = await this.documentRepository.findById(id);

      if (!document) {
        res.status(404).json(ApiResponse.error('Document not found'));
        return;
      }

      if (document.companyId !== companyId) {
        res.status(403).json(ApiResponse.error('Access denied'));
        return;
      }

      res.json(ApiResponse.success(document, 'Document retrieved successfully'));
    } catch (error) {
      console.error('Error retrieving document:', error);
      res.status(500).json(ApiResponse.error('Failed to retrieve document'));
    }
  }

  /**
   * Генерация консолидированного отчета
   */
  async generateConsolidatedReport(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const filters = validateReportFilters({
        ...req.body,
        companyId
      });

      const report = await this.reportingService.generateConsolidatedReport(filters);

      res.json(ApiResponse.success(report, 'Consolidated report generated successfully'));
    } catch (error) {
      console.error('Error generating consolidated report:', error);
      res.status(500).json(ApiResponse.error('Failed to generate consolidated report'));
    }
  }

  /**
   * Экспорт данных
   */
  async exportData(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const { reportData, format, options } = req.body;

      const exportResult = await this.reportingService.exportReport(reportData, format, options);

      res.json(ApiResponse.success(exportResult, 'Data exported successfully'));
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json(ApiResponse.error('Failed to export data'));
    }
  }

  /**
   * Выполнение E-Reconciliation для документа
   */
  async performReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      const document = await this.documentRepository.findById(id);
      if (!document) {
        res.status(404).json(ApiResponse.error('Document not found'));
        return;
      }

      if (document.companyId !== companyId) {
        res.status(403).json(ApiResponse.error('Access denied'));
        return;
      }

      const reconciliationResult = await this.reportingService.performEReconciliation(id);

      res.json(ApiResponse.success(reconciliationResult, 'E-Reconciliation completed successfully'));
    } catch (error) {
      console.error('Error performing reconciliation:', error);
      res.status(500).json(ApiResponse.error('Failed to perform reconciliation'));
    }
  }

  /**
   * Массовая E-Reconciliation для всех неподписанных документов компании
   */
  async performBulkReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;

      const results = await this.reportingService.performBulkEReconciliation(companyId);

      const summary = {
        totalDocuments: results.length,
        reconciledDocuments: results.filter(r => r.isReconciled).length,
        documentsWithDiscrepancies: results.filter(r => !r.isReconciled).length,
        totalDiscrepancyAmount: results.reduce((sum, r) => sum + Math.abs(r.discrepancyAmount), 0)
      };

      res.json(ApiResponse.success({
        results,
        summary
      }, 'Bulk E-Reconciliation completed successfully'));
    } catch (error) {
      console.error('Error performing bulk reconciliation:', error);
      res.status(500).json(ApiResponse.error('Failed to perform bulk reconciliation'));
    }
  }

  /**
   * Генерация закрывающих документов за период
   */
  async generateClosingDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const { periodStart, periodEnd, documentType, clientInfo, contractInfo, options } = validateDocumentGeneration({
        ...req.body,
        companyId
      });

      const documents = await this.reportingService.generateClosingDocuments(
        companyId,
        new Date(periodStart),
        new Date(periodEnd),
        {
          documentType,
          clientInfo,
          contractInfo,
          ...options
        }
      );

      // Генерация PDF файлов для документов
      const generatedFiles = [];
      for (const document of documents) {
        const pdfResult = await this.documentGenerator.generatePDF(document);

        // Обновление документа с информацией о файле
        await this.documentRepository.attachFile(
          document.id,
          pdfResult.filePath,
          pdfResult.fileHash,
          pdfResult.fileSize
        );

        generatedFiles.push({
          documentId: document.id,
          fileName: pdfResult.fileName,
          downloadUrl: pdfResult.downloadUrl
        });
      }

      res.json(ApiResponse.success({
        documents,
        generatedFiles
      }, 'Closing documents generated successfully'));
    } catch (error) {
      console.error('Error generating closing documents:', error);
      res.status(500).json(ApiResponse.error('Failed to generate closing documents'));
    }
  }

  /**
   * Генерация месячного пакета документов (Акт + Счет-фактура + УПД)
   */
  async generateMonthlyPackage(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const { year, month, clientInfo, contractInfo } = req.body;

      const documents = await this.reportingService.generateMonthlyClosingPackage(
        companyId,
        parseInt(year),
        parseInt(month),
        clientInfo,
        contractInfo
      );

      // Генерация PDF файлов
      const generatedFiles = [];
      for (const document of documents) {
        const pdfResult = await this.documentGenerator.generatePDF(document);

        await this.documentRepository.attachFile(
          document.id,
          pdfResult.filePath,
          pdfResult.fileHash,
          pdfResult.fileSize
        );

        generatedFiles.push({
          documentId: document.id,
          documentType: document.documentType,
          fileName: pdfResult.fileName,
          downloadUrl: pdfResult.downloadUrl
        });
      }

      res.json(ApiResponse.success({
        documents,
        generatedFiles
      }, 'Monthly package generated successfully'));
    } catch (error) {
      console.error('Error generating monthly package:', error);
      res.status(500).json(ApiResponse.error('Failed to generate monthly package'));
    }
  }

  /**
   * Отправка документа клиенту
   */
  async sendDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      const document = await this.documentRepository.findById(id);
      if (!document) {
        res.status(404).json(ApiResponse.error('Document not found'));
        return;
      }

      if (document.companyId !== companyId) {
        res.status(403).json(ApiResponse.error('Access denied'));
        return;
      }

      if (document.documentStatus !== 'generated') {
        res.status(400).json(ApiResponse.error('Document cannot be sent'));
        return;
      }

      const updatedDocument = document.markAsSent(req.user.id);
      await this.documentRepository.update(updatedDocument);

      res.json(ApiResponse.success(updatedDocument, 'Document sent successfully'));
    } catch (error) {
      console.error('Error sending document:', error);
      res.status(500).json(ApiResponse.error('Failed to send document'));
    }
  }

  /**
   * Подписание документа
   */
  async signDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { companyId } = req.user;
      const { signatureCertificateId } = req.body;

      const document = await this.documentRepository.findById(id);
      if (!document) {
        res.status(404).json(ApiResponse.error('Document not found'));
        return;
      }

      if (document.companyId !== companyId) {
        res.status(403).json(ApiResponse.error('Access denied'));
        return;
      }

      if (!document.isSent()) {
        res.status(400).json(ApiResponse.error('Document must be sent before signing'));
        return;
      }

      const updatedDocument = document.markAsSigned(req.user.id, signatureCertificateId);
      await this.documentRepository.update(updatedDocument);

      res.json(ApiResponse.success(updatedDocument, 'Document signed successfully'));
    } catch (error) {
      console.error('Error signing document:', error);
      res.status(500).json(ApiResponse.error('Failed to sign document'));
    }
  }

  /**
   * Получение статистики по документам
   */
  async getDocumentStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const { startDate, endDate } = req.query;

      const statistics = await this.reportingService.getDocumentStatistics(
        companyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json(ApiResponse.success(statistics, 'Document statistics retrieved successfully'));
    } catch (error) {
      console.error('Error retrieving document statistics:', error);
      res.status(500).json(ApiResponse.error('Failed to retrieve document statistics'));
    }
  }

  /**
   * Скачивание файла документа
   */
  async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      const document = await this.documentRepository.findById(id);
      if (!document) {
        res.status(404).json(ApiResponse.error('Document not found'));
        return;
      }

      if (document.companyId !== companyId) {
        res.status(403).json(ApiResponse.error('Access denied'));
        return;
      }

      if (!document.hasFile()) {
        res.status(404).json(ApiResponse.error('Document file not found'));
        return;
      }

      // Получение файла из хранилища
      const storageManager = new StorageManager();
      const fileStream = await storageManager.getFileStream(document.filePath!);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${document.documentNumber}.pdf"`);

      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json(ApiResponse.error('Failed to download document'));
    }
  }

  /**
   * Получение списка транзакций для отчета
   */
  async getTransactionsForReport(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const {
        dateStart,
        dateEnd,
        costCenterIds,
        userIds,
        transactionTypes,
        categories,
        includeRefunds = true,
        includeDeposits = false,
        minAmount,
        maxAmount
      } = req.query;

      const filters = {
        companyId,
        dateStart: new Date(dateStart as string),
        dateEnd: new Date(dateEnd as string),
        costCenterIds: costCenterIds ? (costCenterIds as string).split(',') : undefined,
        userIds: userIds ? (userIds as string).split(',') : undefined,
        transactionTypes: transactionTypes ? (transactionTypes as string).split(',') : undefined,
        categories: categories ? (categories as string).split(',') : undefined,
        includeRefunds: includeRefunds === 'true',
        includeDeposits: includeDeposits === 'true',
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined
      };

      const report = await this.reportingService.generateConsolidatedReport(filters);

      res.json(ApiResponse.success(report, 'Transactions for report retrieved successfully'));
    } catch (error) {
      console.error('Error retrieving transactions for report:', error);
      res.status(500).json(ApiResponse.error('Failed to retrieve transactions for report'));
    }
  }

  /**
   * Экспорт транзакций в CSV/Excel
   */
  async exportTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;
      const { format, options } = req.body;
      const filters = req.body.filters;

      // Получение транзакций по фильтрам
      const report = await this.reportingService.generateConsolidatedReport({
        ...filters,
        companyId
      });

      // Загрузка детальных транзакций для экспорта
      const transactionRepository = new TransactionLogRepository();
      const transactions = await transactionRepository.findByFilters(filters);

      const exportResult = await this.exportService.exportTransactionsToExcel(transactions, options);

      res.json(ApiResponse.success(exportResult, 'Transactions exported successfully'));
    } catch (error) {
      console.error('Error exporting transactions:', error);
      res.status(500).json(ApiResponse.error('Failed to export transactions'));
    }
  }

  /**
   * Получение документов с расхождениями
   */
  async getDocumentsWithDiscrepancies(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.user;

      const documents = await this.documentRepository.findDocumentsWithDiscrepancies(companyId);

      res.json(ApiResponse.success(documents, 'Documents with discrepancies retrieved successfully'));
    } catch (error) {
      console.error('Error retrieving documents with discrepancies:', error);
      res.status(500).json(ApiResponse.error('Failed to retrieve documents with discrepancies'));
    }
  }

  /**
   * Отмена документа
   */
  async cancelDocument(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      const document = await this.documentRepository.findById(id);
      if (!document) {
        res.status(404).json(ApiResponse.error('Document not found'));
        return;
      }

      if (document.companyId !== companyId) {
        res.status(403).json(ApiResponse.error('Access denied'));
        return;
      }

      if (document.documentStatus === 'signed') {
        res.status(400).json(ApiResponse.error('Signed document cannot be cancelled'));
        return;
      }

      const updatedDocument = document.markAsCancelled();
      await this.documentRepository.update(updatedDocument);

      res.json(ApiResponse.success(updatedDocument, 'Document cancelled successfully'));
    } catch (error) {
      console.error('Error cancelling document:', error);
      res.status(500).json(ApiResponse.error('Failed to cancel document'));
    }
  }
}