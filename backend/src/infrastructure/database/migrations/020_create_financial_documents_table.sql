-- Создание таблицы финансовых документов (Акты, Счета-фактуры, УПД)
CREATE TABLE IF NOT EXISTS financial_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,

    -- Основные атрибуты документа
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('act', 'invoice', 'upd', 'certificate')),
    document_number VARCHAR(100) NOT NULL,
    document_date DATE NOT NULL,
    document_status VARCHAR(20) NOT NULL DEFAULT 'generated' CHECK (document_status IN ('generated', 'sent', 'signed', 'cancelled')),

    -- Период отчетности
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,

    -- Финансовые показатели
    total_amount DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount_with_vat DECIMAL(15,2) GENERATED ALWAYS AS (total_amount + vat_amount) STORED,

    -- Валюта и курсы
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,

    -- Связи с транзакциями
    transaction_count INTEGER NOT NULL DEFAULT 0,
    transaction_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    verified_total DECIMAL(15,2) NOT NULL DEFAULT 0.00, -- Результат E-Reconciliation
    discrepancy_amount DECIMAL(15,2) GENERATED ALWAYS AS (transaction_total - verified_total) STORED,

    -- Детализация по центрам затрат
    cost_center_summary JSONB DEFAULT '{}', -- Сводка по cost_center_id
    transaction_ids UUID[] DEFAULT '{}', -- ID связанных транзакций для сверки

    -- Контрагенты (исполнитель и заказчик)
    provider_name VARCHAR(255) NOT NULL DEFAULT 'Travel App SaaS',
    provider_inn VARCHAR(12) DEFAULT '123456789012',
    provider_kpp VARCHAR(9) DEFAULT '123456789',
    provider_address TEXT DEFAULT 'г. Москва, ул. Центральная, д. 1',
    provider_bank_account VARCHAR(20) DEFAULT '40702810000000000001',
    provider_bank_name VARCHAR(255) DEFAULT 'ПАО СБЕРБАНК',
    provider_bank_bik VARCHAR(9) DEFAULT '044525225',

    client_name VARCHAR(255) NOT NULL,
    client_inn VARCHAR(12),
    client_kpp VARCHAR(9),
    client_address TEXT,
    client_bank_account VARCHAR(20),
    client_bank_name VARCHAR(255),
    client_bank_bik VARCHAR(9),

    -- Основание для оказания услуг
    contract_number VARCHAR(100),
    contract_date DATE,
    service_description TEXT NOT NULL,

    -- Файлы и хэши для целостности
    file_path VARCHAR(500), -- Путь к PDF файлу в MinIO
    file_hash VARCHAR(64), -- SHA-256 хэш файла
    file_size BIGINT, -- Размер файла в байтах

    -- Управление версиями
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES financial_documents(id) ON DELETE SET NULL, -- Для версионности

    -- Электронная подпись
    is_electronically_signed BOOLEAN DEFAULT false,
    signature_date TIMESTAMP WITH TIME ZONE,
    signature_certificate_id VARCHAR(100),

    -- Метаданные и аудит
    created_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    sent_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE,

    -- Автоматические временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Уникальность номера документа в рамках компании и типа
    CONSTRAINT unique_document_number UNIQUE (company_id, document_type, document_number)
);

-- Создание индексов для быстрого поиска
CREATE INDEX idx_financial_documents_company_id ON financial_documents(company_id);
CREATE INDEX idx_financial_documents_type ON financial_documents(document_type);
CREATE INDEX idx_financial_documents_status ON financial_documents(document_status);
CREATE INDEX idx_financial_documents_date ON financial_documents(document_date);
CREATE INDEX idx_financial_documents_period ON financial_documents(reporting_period_start, reporting_period_end);
CREATE INDEX idx_financial_documents_amount ON financial_documents(total_amount);
CREATE INDEX idx_financial_documents_file_path ON financial_documents(file_path) WHERE file_path IS NOT NULL;
CREATE INDEX idx_financial_documents_created_by ON financial_documents(created_by);
CREATE INDEX idx_financial_documents_version ON financial_documents(parent_document_id) WHERE parent_document_id IS NOT NULL;

-- Составные индексы для часто используемых запросов
CREATE INDEX idx_financial_documents_company_period_type ON financial_documents(company_id, reporting_period_start DESC, document_type);
CREATE INDEX idx_financial_documents_company_status_date ON financial_documents(company_id, document_status, document_date DESC);
CREATE INDEX idx_financial_documents_unsent_documents ON financial_documents(document_status, reporting_period_end) WHERE document_status IN ('generated', 'sent');

-- JSONB индексы для cost_center_summary
CREATE INDEX idx_financial_documents_cost_center_summary ON financial_documents USING GIN(cost_center_summary);

-- Индексы для массива transaction_ids
CREATE INDEX idx_financial_documents_transaction_ids ON financial_documents USING GIN(transaction_ids);

-- Добавление комментариев
COMMENT ON TABLE financial_documents IS 'Финансовые документы (Акты, Счета-фактуры) с E-Reconciliation';
COMMENT ON COLUMN financial_documents.id IS 'Уникальный идентификатор документа';
COMMENT ON COLUMN financial_documents.company_id IS 'ID компании';
COMMENT ON COLUMN financial_documents.document_type IS 'Тип документа (act, invoice, upd, certificate)';
COMMENT ON COLUMN financial_documents.document_number IS 'Номер документа';
COMMENT ON COLUMN financial_documents.document_date IS 'Дата документа';
COMMENT ON COLUMN financial_documents.document_status IS 'Статус документа (generated, sent, signed, cancelled)';
COMMENT ON COLUMN financial_documents.reporting_period_start IS 'Начало отчетного периода';
COMMENT ON COLUMN financial_documents.reporting_period_end IS 'Конец отчетного периода';
COMMENT ON COLUMN financial_documents.total_amount IS 'Сумма без НДС';
COMMENT ON COLUMN financial_documents.vat_amount IS 'Сумма НДС';
COMMENT ON COLUMN financial_documents.total_amount_with_vat IS 'Сумма с НДС';
COMMENT ON COLUMN financial_documents.currency IS 'Валюта документа';
COMMENT ON COLUMN financial_documents.exchange_rate IS 'Курс валюты';
COMMENT ON COLUMN financial_documents.transaction_count IS 'Количество транзакций в документе';
COMMENT ON COLUMN financial_documents.transaction_total IS 'Сумма всех транзакций из transaction_log';
COMMENT ON COLUMN financial_documents.verified_total IS 'Проверенная сумма (E-Reconciliation)';
COMMENT ON COLUMN financial_documents.discrepancy_amount IS 'Расхождение между transaction_total и verified_total';
COMMENT ON COLUMN financial_documents.cost_center_summary IS 'Сводка по центрам затрат в формате JSON';
COMMENT ON COLUMN financial_documents.transaction_ids IS 'Массив ID связанных транзакций';
COMMENT ON COLUMN financial_documents.provider_name IS 'Наименование исполнителя';
COMMENT ON COLUMN financial_documents.client_name IS 'Наименование заказчика';
COMMENT ON COLUMN financial_documents.contract_number IS 'Номер договора';
COMMENT ON COLUMN financial_documents.contract_date IS 'Дата договора';
COMMENT ON COLUMN financial_documents.service_description IS 'Описание оказанных услуг';
COMMENT ON COLUMN financial_documents.file_path IS 'Путь к PDF файлу в MinIO';
COMMENT ON COLUMN financial_documents.file_hash IS 'SHA-256 хэш файла для проверки целостности';
COMMENT ON COLUMN financial_documents.file_size IS 'Размер файла в байтах';
COMMENT ON COLUMN financial_documents.version IS 'Версия документа';
COMMENT ON COLUMN financial_documents.parent_document_id IS 'ID родительского документа (для версионности)';
COMMENT ON COLUMN financial_documents.is_electronronically_signed IS 'Электронная подпись';
COMMENT ON COLUMN financial_documents.signature_date IS 'Дата подписания';
COMMENT ON COLUMN financial_documents.signature_certificate_id IS 'ID сертификата электронной подписи';
COMMENT ON COLUMN financial_documents.created_by IS 'Кто создал документ';
COMMENT ON COLUMN financial_documents.approved_by IS 'Кто одобрил документ';
COMMENT ON COLUMN financial_documents.approved_at is 'Дата одобрения';
COMMENT ON COLUMN financial_documents.sent_by IS 'Кто отправил документ';
COMMENT ON COLUMN financial_documents.sent_at IS 'Дата отправки';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_financial_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_financial_documents_updated_at
    BEFORE UPDATE ON financial_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_financial_documents_updated_at();

-- Создание функции для автоматической генерации номера документа
CREATE OR REPLACE FUNCTION generate_document_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.document_number IS NULL THEN
        -- Генерация номера: <тип>-<компания>-<год><месяц><день>-<порядковый номер>
        WITH last_doc AS (
            SELECT document_number
            FROM financial_documents
            WHERE company_id = NEW.company_id
            AND document_type = NEW.document_type
            AND document_date = CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        )
        SELECT COALESCE(
            CASE
                WHEN ld.document_number ~ '\d+$' THEN
                    UPPER(NEW.document_type) || '-' ||
                    EXTRACT(YEAR FROM CURRENT_DATE) ||
                    LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::text, 2, '0') ||
                    LPAD(EXTRACT(DAY FROM CURRENT_DATE)::text, 2, '0') || '-' ||
                    LPAD((REGEXP_REPLACE(ld.document_number, '.*(\d+)$', '\1')::int + 1)::text, 3, '0')
                ELSE
                    UPPER(NEW.document_type) || '-' ||
                    EXTRACT(YEAR FROM CURRENT_DATE) ||
                    LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::text, 2, '0') ||
                    LPAD(EXTRACT(DAY FROM CURRENT_DATE)::text, 2, '0') || '-' ||
                    '001'
            END,
            UPPER(NEW.document_type) || '-' ||
            EXTRACT(YEAR FROM CURRENT_DATE) ||
            LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::text, 2, '0') ||
            LPAD(EXTRACT(DAY FROM CURRENT_DATE)::text, 2, '0') || '-' ||
            '001'
        ) INTO NEW.document_number
        FROM last_doc ld;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_generate_document_number
    BEFORE INSERT ON financial_documents
    FOR EACH ROW
    EXECUTE FUNCTION generate_document_number();

-- Создание функции для автоматического расчета суммы транзакций при создании документа
CREATE OR REPLACE FUNCTION calculate_document_transaction_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Если указаны ID транзакций, пересчитываем их сумму
    IF NEW.transaction_ids IS NOT NULL AND array_length(NEW.transaction_ids, 1) > 0 THEN
        SELECT
            COUNT(*),
            COALESCE(SUM(
                CASE
                    WHEN transaction_type IN ('deposit', 'refund', 'credit') THEN amount
                    WHEN transaction_type IN ('withdrawal', 'fee', 'debit') THEN -amount
                    ELSE 0
                END
            ), 0)
        INTO
            NEW.transaction_count,
            NEW.transaction_total
        FROM transaction_log
        WHERE id = ANY(NEW.transaction_ids)
        AND status = 'completed'
        AND company_id = NEW.company_id;
    END IF;

    -- Изначально verified_total равен transaction_total
    NEW.verified_total := NEW.transaction_total;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_calculate_document_transaction_totals
    BEFORE INSERT OR UPDATE ON financial_documents
    FOR EACH ROW
    EXECUTE FUNCTION calculate_document_transaction_totals();

-- Создание функции для обновления сводки по центрам затрат
CREATE OR REPLACE FUNCTION update_cost_center_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Если указаны ID транзакций, формируем сводку по центрам затрат
    IF NEW.transaction_ids IS NOT NULL AND array_length(NEW.transaction_ids, 1) > 0 THEN
        WITH cost_center_data AS (
            SELECT
                tl.cost_center_id,
                cc.name as cost_center_name,
                COUNT(*) as transaction_count,
                SUM(
                    CASE
                        WHEN tl.transaction_type IN ('deposit', 'refund', 'credit') THEN tl.amount
                        WHEN tl.transaction_type IN ('withdrawal', 'fee', 'debit') THEN -tl.amount
                        ELSE 0
                    END
                ) as total_amount
            FROM transaction_log tl
            LEFT JOIN cost_centers cc ON tl.cost_center_id = cc.id
            WHERE tl.id = ANY(NEW.transaction_ids)
            AND tl.status = 'completed'
            AND tl.company_id = NEW.company_id
            GROUP BY tl.cost_center_id, cc.name
        )
        SELECT jsonb_agg(
            jsonb_build_object(
                'cost_center_id', cost_center_id,
                'cost_center_name', cost_center_name,
                'transaction_count', transaction_count,
                'total_amount', total_amount
            ) ORDER BY cost_center_name
        ) INTO NEW.cost_center_summary
        FROM cost_center_data;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_cost_center_summary
    BEFORE INSERT OR UPDATE ON financial_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_cost_center_summary();

-- Создание функции для проверки целостности файла
CREATE OR REPLACE FUNCTION verify_document_integrity(p_document_id UUID, p_file_hash VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    DECLARE
        stored_hash VARCHAR(64);
    BEGIN
        SELECT file_hash INTO stored_hash
        FROM financial_documents
        WHERE id = p_document_id;

        RETURN stored_hash = p_file_hash;
    END;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для получения статистики по документам компании
CREATE OR REPLACE FUNCTION get_company_document_statistics(p_company_id UUID, p_start_date DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_documents', COUNT(*),
        'total_amount', COALESCE(SUM(total_amount_with_vat), 0),
        'total_transactions', COALESCE(SUM(transaction_count), 0),
        'by_status', jsonb_agg(jsonb_build_object('status', document_status, 'count', cnt) ORDER BY document_status),
        'by_type', jsonb_agg(jsonb_build_object('type', document_type, 'count', cnt, 'amount', total) ORDER BY document_type)
    ) INTO result
    FROM (
        SELECT
            COUNT(*) as doc_count,
            COALESCE(SUM(total_amount_with_vat), 0) as total_sum,
            COALESCE(SUM(transaction_count), 0) as total_trans
        FROM financial_documents
        WHERE company_id = p_company_id
        AND (p_start_date IS NULL OR document_date >= p_start_date)
        AND (p_end_date IS NULL OR document_date <= p_end_date)

        UNION ALL

        SELECT
            COUNT(*),
            COALESCE(SUM(total_amount_with_vat), 0),
            0
        FROM financial_documents
        WHERE company_id = p_company_id
        AND document_status = 'generated'
        AND (p_start_date IS NULL OR document_date >= p_start_date)
        AND (p_end_date IS NULL OR document_date <= p_end_date)
    ) stats
    CROSS JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('status', document_status, 'count', doc_count)) as by_status
        FROM (
            SELECT document_status, COUNT(*) as doc_count
            FROM financial_documents
            WHERE company_id = p_company_id
            AND (p_start_date IS NULL OR document_date >= p_start_date)
            AND (p_end_date IS NULL OR document_date <= p_end_date)
            GROUP BY document_status
        ) status_stats
    ) status_data
    CROSS JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('type', document_type, 'count', type_count, 'amount', type_total)) as by_type
        FROM (
            SELECT document_type, COUNT(*) as type_count, COALESCE(SUM(total_amount_with_vat), 0) as type_total
            FROM financial_documents
            WHERE company_id = p_company_id
            AND (p_start_date IS NULL OR document_date >= p_start_date)
            AND (p_end_date IS NULL OR document_date <= p_end_date)
            GROUP BY document_type
        ) type_stats
    ) type_data;

    RETURN result;
END;
$$ LANGUAGE plpgsql;