import { Router } from 'express';
import { B2BReportingController } from '../controllers/B2BReportingController';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireB2BRole } from '../middleware/b2b-auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const controller = new B2BReportingController();

// Все маршруты требуют аутентификации и B2B роли
router.use(authenticateToken);
router.use(requireB2BRole(['admin', 'accountant', 'booking_agent']));

/**
 * GET /api/b2b/reporting/documents
 * Получение списка финансовых документов с фильтрацией и пагинацией
 */
router.get('/documents', controller.getDocuments.bind(controller));

/**
 * GET /api/b2b/reporting/documents/:id
 * Получение детальной информации о документе
 */
router.get('/documents/:id', controller.getDocumentById.bind(controller));

/**
 * POST /api/b2b/reporting/documents/:id/send
 * Отправка документа клиенту
 */
router.post('/documents/:id/send', controller.sendDocument.bind(controller));

/**
 * POST /api/b2b/reporting/documents/:id/sign
 * Подписание документа
 */
router.post('/documents/:id/sign', controller.signDocument.bind(controller));

/**
 * POST /api/b2b/reporting/documents/:id/cancel
 * Отмена документа
 */
router.post('/documents/:id/cancel', controller.cancelDocument.bind(controller));

/**
 * GET /api/b2b/reporting/documents/:id/download
 * Скачивание PDF файла документа
 */
router.get('/documents/:id/download', controller.downloadDocument.bind(controller));

/**
 * GET /api/b2b/reporting/documents/discrepancies
 * Получение документов с расхождениями
 */
router.get('/documents/discrepancies', controller.getDocumentsWithDiscrepancies.bind(controller));

/**
 * POST /api/b2b/reporting/reconcile/:id
 * Выполнение E-Reconciliation для конкретного документа
 */
router.post('/reconcile/:id', controller.performReconciliation.bind(controller));

/**
 * POST /api/b2b/reporting/reconcile/bulk
 * Массовая E-Reconciliation для всех неподписанных документов
 */
router.post('/reconcile/bulk', controller.performBulkReconciliation.bind(controller));

/**
 * POST /api/b2b/reporting/generate/closing
 * Генерация закрывающих документов за период
 */
router.post('/generate/closing', controller.generateClosingDocuments.bind(controller));

/**
 * POST /api/b2b/reporting/generate/monthly-package
 * Генерация полного месячного пакета документов
 */
router.post('/generate/monthly-package', controller.generateMonthlyPackage.bind(controller));

/**
 * POST /api/b2b/reporting/consolidated
 * Генерация консолидированного отчета
 */
router.post('/consolidated', controller.generateConsolidatedReport.bind(controller));

/**
 * GET /api/b2b/reporting/transactions
 * Получение транзакций для отчета с фильтрацией
 */
router.get('/transactions', controller.getTransactionsForReport.bind(controller));

/**
 * POST /api/b2b/reporting/export/transactions
 * Экспорт транзакций в CSV/Excel
 */
router.post('/export/transactions', controller.exportTransactions.bind(controller));

/**
 * POST /api/b2b/reporting/export/data
 * Экспорт данных в различных форматах
 */
router.post('/export/data', controller.exportData.bind(controller));

/**
 * GET /api/b2b/reporting/statistics
 * Получение статистики по документам
 */
router.get('/statistics', controller.getDocumentStatistics.bind(controller));

export default router;