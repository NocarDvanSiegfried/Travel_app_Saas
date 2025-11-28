import { pool } from '../database/connection';
import { FinancialDocument, DocumentType, DocumentStatus, DocumentParty } from '../../domain/entities/FinancialDocument';
import { CostCenterSummary } from '../../domain/entities/FinancialDocument';
import { TransactionLog } from '../../domain/entities/TransactionLog';

export interface FinancialDocumentFilter {
  companyId?: string;
  documentType?: DocumentType;
  documentStatus?: DocumentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  reportingPeriodFrom?: Date;
  reportingPeriodTo?: Date;
  costCenterId?: string;
  hasDiscrepancies?: boolean;
  isUnsigned?: boolean;
}

export interface DocumentSearchResult {
  documents: FinancialDocument[];
  totalCount: number;
  hasMore: boolean;
}

export class FinancialDocumentRepository {
  // Основные CRUD операции

  async create(document: FinancialDocument): Promise<FinancialDocument> {
    const query = `
      INSERT INTO financial_documents (
        id, company_id, document_type, document_number, document_date, document_status,
        reporting_period_start, reporting_period_end, total_amount, vat_amount, currency, exchange_rate,
        transaction_count, transaction_total, verified_total,
        cost_center_summary, transaction_ids,
        provider_name, provider_inn, provider_kpp, provider_address, provider_bank_account, provider_bank_name, provider_bank_bik,
        client_name, client_inn, client_kpp, client_address, client_bank_account, client_bank_name, client_bank_bik,
        contract_number, contract_date, service_description,
        file_path, file_hash, file_size,
        version, parent_document_id, is_electronically_signed, signature_date, signature_certificate_id,
        created_by, approved_by, approved_at, sent_by, sent_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15,
        $16, $17,
        $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31,
        $32, $33, $34,
        $35, $36, $37,
        $38, $39, $40, $41, $42,
        $43, $44, $45, $46, $47
      ) RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        document.id,
        document.companyId,
        document.documentType,
        document.documentNumber,
        document.documentDate,
        document.documentStatus,
        document.reportingPeriodStart,
        document.reportingPeriodEnd,
        document.totalAmount,
        document.vatAmount,
        document.currency,
        document.exchangeRate,
        document.transactionCount,
        document.transactionTotal,
        document.verifiedTotal,
        JSON.stringify(document.costCenterSummary),
        document.transactionIds,
        document.provider.name,
        document.provider.inn,
        document.provider.kpp,
        document.provider.address,
        document.provider.bankAccount,
        document.provider.bankName,
        document.provider.bankBik,
        document.client.name,
        document.client.inn,
        document.client.kpp,
        document.client.address,
        document.client.bankAccount,
        document.client.bankName,
        document.client.bankBik,
        document.contract.number,
        document.contract.date,
        document.contract.description,
        document.filePath,
        document.fileHash,
        document.fileSize,
        document.version,
        document.parentDocumentId,
        document.isElectronicallySigned,
        document.signatureDate,
        document.signatureCertificateId,
        document.createdById,
        document.approvedById,
        document.approvedAt,
        document.sentById,
        document.sentAt
      ]);

      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create financial document: ${error}`);
    }
  }

  async findById(id: string): Promise<FinancialDocument | null> {
    const query = `
      SELECT * FROM financial_documents
      WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToDocument(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find financial document: ${error}`);
    }
  }

  async findByCompanyAndNumber(companyId: string, documentType: DocumentType, documentNumber: string): Promise<FinancialDocument | null> {
    const query = `
      SELECT * FROM financial_documents
      WHERE company_id = $1 AND document_type = $2 AND document_number = $3
    `;

    try {
      const result = await pool.query(query, [companyId, documentType, documentNumber]);
      return result.rows.length > 0 ? this.mapRowToDocument(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find financial document by company and number: ${error}`);
    }
  }

  async update(document: FinancialDocument): Promise<FinancialDocument> {
    const query = `
      UPDATE financial_documents SET
        document_status = $2,
        total_amount = $3,
        vat_amount = $4,
        verified_total = $5,
        cost_center_summary = $6,
        transaction_ids = $7,
        client_name = $8, client_inn = $9, client_kpp = $10, client_address = $11,
        client_bank_account = $12, client_bank_name = $13, client_bank_bik = $14,
        contract_number = $15, contract_date = $16, service_description = $17,
        file_path = $18, file_hash = $19, file_size = $20,
        is_electronically_signed = $21, signature_date = $22, signature_certificate_id = $23,
        approved_by = $24, approved_at = $25,
        sent_by = $26, sent_at = $27,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        document.id,
        document.documentStatus,
        document.totalAmount,
        document.vatAmount,
        document.verifiedTotal,
        JSON.stringify(document.costCenterSummary),
        document.transactionIds,
        document.client.name,
        document.client.inn,
        document.client.kpp,
        document.client.address,
        document.client.bankAccount,
        document.client.bankName,
        document.client.bankBik,
        document.contract.number,
        document.contract.date,
        document.contract.description,
        document.filePath,
        document.fileHash,
        document.fileSize,
        document.isElectronicallySigned,
        document.signatureDate,
        document.signatureCertificateId,
        document.approvedById,
        document.approvedAt,
        document.sentById,
        document.sentAt
      ]);

      return this.mapRowToDocument(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update financial document: ${error}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM financial_documents
      WHERE id = $1
    `;

    try {
      const result = await pool.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete financial document: ${error}`);
    }
  }

  // Поиск и фильтрация

  async findByFilters(filter: FinancialDocumentFilter, pagination: {
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = { limit: 50, offset: 0 }): Promise<DocumentSearchResult> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Построение WHERE условия
    if (filter.companyId) {
      conditions.push(`company_id = $${paramIndex++}`);
      values.push(filter.companyId);
    }

    if (filter.documentType) {
      conditions.push(`document_type = $${paramIndex++}`);
      values.push(filter.documentType);
    }

    if (filter.documentStatus) {
      conditions.push(`document_status = $${paramIndex++}`);
      values.push(filter.documentStatus);
    }

    if (filter.dateFrom) {
      conditions.push(`document_date >= $${paramIndex++}`);
      values.push(filter.dateFrom);
    }

    if (filter.dateTo) {
      conditions.push(`document_date <= $${paramIndex++}`);
      values.push(filter.dateTo);
    }

    if (filter.reportingPeriodFrom) {
      conditions.push(`reporting_period_start >= $${paramIndex++}`);
      values.push(filter.reportingPeriodFrom);
    }

    if (filter.reportingPeriodTo) {
      conditions.push(`reporting_period_end <= $${paramIndex++}`);
      values.push(filter.reportingPeriodTo);
    }

    if (filter.costCenterId) {
      conditions.push(`cost_center_summary ? $${paramIndex++}`);
      values.push(filter.costCenterId);
    }

    if (filter.hasDiscrepancies) {
      conditions.push(`ABS(transaction_total - verified_total) > 0.01`);
    }

    if (filter.isUnsigned) {
      conditions.push(`document_status IN ('generated', 'sent')`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sortBy = pagination.sortBy || 'created_at';
    const sortOrder = pagination.sortOrder || 'DESC';

    // Запрос для получения данных
    const dataQuery = `
      SELECT * FROM financial_documents
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    // Запрос для получения общего количества
    const countQuery = `
      SELECT COUNT(*) as total FROM financial_documents
      ${whereClause}
    `;

    try {
      values.push(pagination.limit, pagination.offset);

      const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, values),
        pool.query(countQuery, values.slice(0, -2)) // Убираем limit и offset
      ]);

      const totalCount = parseInt(countResult.rows[0].total);
      const hasMore = pagination.offset + pagination.limit < totalCount;

      return {
        documents: dataResult.rows.map(row => this.mapRowToDocument(row)),
        totalCount,
        hasMore
      };
    } catch (error) {
      throw new Error(`Failed to search financial documents: ${error}`);
    }
  }

  // Специализированные запросы

  async findPendingDocuments(companyId: string): Promise<FinancialDocument[]> {
    const query = `
      SELECT * FROM financial_documents
      WHERE company_id = $1 AND document_status IN ('generated', 'sent')
      ORDER BY created_at ASC
    `;

    try {
      const result = await pool.query(query, [companyId]);
      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      throw new Error(`Failed to find pending documents: ${error}`);
    }
  }

  async findDocumentsWithDiscrepancies(companyId: string): Promise<FinancialDocument[]> {
    const query = `
      SELECT * FROM financial_documents
      WHERE company_id = $1 AND ABS(transaction_total - verified_total) > 0.01
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query, [companyId]);
      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      throw new Error(`Failed to find documents with discrepancies: ${error}`);
    }
  }

  async findDocumentsByPeriod(companyId: string, periodStart: Date, periodEnd: Date): Promise<FinancialDocument[]> {
    const query = `
      SELECT * FROM financial_documents
      WHERE company_id = $1
      AND reporting_period_start >= $2
      AND reporting_period_end <= $3
      ORDER BY reporting_period_start ASC, document_type ASC
    `;

    try {
      const result = await pool.query(query, [companyId, periodStart, periodEnd]);
      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      throw new Error(`Failed to find documents by period: ${error}`);
    }
  }

  async findDocumentsForTransactions(transactionIds: string[]): Promise<FinancialDocument[]> {
    const query = `
      SELECT * FROM financial_documents
      WHERE transaction_ids && $1
      ORDER BY created_at DESC
    `;

    try {
      const result = await pool.query(query, [transactionIds]);
      return result.rows.map(row => this.mapRowToDocument(row));
    } catch (error) {
      throw new Error(`Failed to find documents for transactions: ${error}`);
    }
  }

  async getCompanyDocumentsCount(companyId: string, status?: DocumentStatus): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM financial_documents WHERE company_id = $1`;
    const values = [companyId];

    if (status) {
      query += ` AND document_status = $2`;
      values.push(status);
    }

    try {
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new Error(`Failed to get company documents count: ${error}`);
    }
  }

  // Агрегатные функции и статистика

  async getDocumentsStatistics(companyId: string, startDate?: Date, endDate?: Date): Promise<{
    totalDocuments: number;
    totalAmount: number;
    totalTransactions: number;
    averageDocumentAmount: number;
    statusDistribution: Record<DocumentStatus, number>;
    typeDistribution: Record<DocumentType, number>;
  }> {
    const conditions: string[] = ['company_id = $1'];
    const values: any[] = [companyId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`document_date >= $${paramIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      conditions.push(`document_date <= $${paramIndex++}`);
      values.push(endDate);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT
        COUNT(*) as total_documents,
        COALESCE(SUM(total_amount + vat_amount), 0) as total_amount,
        COALESCE(SUM(transaction_count), 0) as total_transactions,
        COALESCE(AVG(total_amount + vat_amount), 0) as average_document_amount
      FROM financial_documents
      WHERE ${whereClause}
    `;

    const statusQuery = `
      SELECT document_status, COUNT(*) as count
      FROM financial_documents
      WHERE ${whereClause}
      GROUP BY document_status
    `;

    const typeQuery = `
      SELECT document_type, COUNT(*) as count
      FROM financial_documents
      WHERE ${whereClause}
      GROUP BY document_type
    `;

    try {
      const [result, statusResult, typeResult] = await Promise.all([
        pool.query(query, values),
        pool.query(statusQuery, values),
        pool.query(typeQuery, values)
      ]);

      const statusDistribution = statusResult.rows.reduce((acc, row) => {
        acc[row.document_status] = parseInt(row.count);
        return acc;
      }, {} as Record<DocumentStatus, number>);

      const typeDistribution = typeResult.rows.reduce((acc, row) => {
        acc[row.document_type] = parseInt(row.count);
        return acc;
      }, {} as Record<DocumentType, number>);

      return {
        totalDocuments: parseInt(result.rows[0].total_documents),
        totalAmount: parseFloat(result.rows[0].total_amount),
        totalTransactions: parseInt(result.rows[0].total_transactions),
        averageDocumentAmount: parseFloat(result.rows[0].average_document_amount),
        statusDistribution,
        typeDistribution
      };
    } catch (error) {
      throw new Error(`Failed to get documents statistics: ${error}`);
    }
  }

  // Вспомогательные методы

  private mapRowToDocument(row: any): FinancialDocument {
    const provider: DocumentParty = {
      name: row.provider_name,
      inn: row.provider_inn,
      kpp: row.provider_kpp,
      address: row.provider_address,
      bankAccount: row.provider_bank_account,
      bankName: row.provider_bank_name,
      bankBik: row.provider_bank_bik
    };

    const client: DocumentParty = {
      name: row.client_name,
      inn: row.client_inn,
      kpp: row.client_kpp,
      address: row.client_address,
      bankAccount: row.client_bank_account,
      bankName: row.client_bank_name,
      bankBik: row.client_bank_bik
    };

    const contract = {
      number: row.contract_number,
      date: row.contract_date,
      description: row.service_description
    };

    const costCenterSummary: CostCenterSummary[] = row.cost_center_summary
      ? JSON.parse(row.cost_center_summary)
      : [];

    return new FinancialDocument(
      row.id,
      row.company_id,
      row.document_type,
      row.document_number,
      row.document_date,
      row.document_status,
      row.reporting_period_start,
      row.reporting_period_end,
      parseFloat(row.total_amount),
      parseFloat(row.vat_amount),
      row.currency,
      parseFloat(row.exchange_rate),
      row.transaction_count,
      parseFloat(row.transaction_total),
      parseFloat(row.verified_total),
      costCenterSummary,
      row.transaction_ids || [],
      provider,
      client,
      contract,
      row.file_path,
      row.file_hash,
      row.file_size ? parseInt(row.file_size) : undefined,
      row.version,
      row.parent_document_id,
      row.is_electronically_signed,
      row.signature_date,
      row.signature_certificate_id,
      row.created_by,
      row.approved_by,
      row.approved_at,
      row.sent_by,
      row.sent_at,
      row.created_at,
      row.updated_at
    );
  }

  async updateVerificationStatus(documentId: string, verifiedTotal: number): Promise<void> {
    const query = `
      UPDATE financial_documents
      SET verified_total = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      await pool.query(query, [documentId, verifiedTotal]);
    } catch (error) {
      throw new Error(`Failed to update verification status: ${error}`);
    }
  }

  async attachFile(documentId: string, filePath: string, fileHash: string, fileSize: number): Promise<void> {
    const query = `
      UPDATE financial_documents
      SET file_path = $2, file_hash = $3, file_size = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      await pool.query(query, [documentId, filePath, fileHash, fileSize]);
    } catch (error) {
      throw new Error(`Failed to attach file: ${error}`);
    }
  }
}