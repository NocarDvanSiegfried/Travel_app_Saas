-- Создание таблицы архива документов для 5-летнего хранения
CREATE TABLE IF NOT EXISTS document_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,

    -- Метаданные архива
    archive_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archive_reason VARCHAR(100) NOT NULL DEFAULT 'retention', -- retention, deleted, company_closed, etc.
    retention_expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Дата истечения срока хранения

    -- Полная копия данных документа (для восстановления)
    archived_data JSONB NOT NULL, -- Сериализованные данные документа

    -- Информация о файлах
    files_archive JSONB DEFAULT '[]', -- Архив всех версий файлов документа

    -- Аудит действий
    archived_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    archive_notes TEXT,

    -- Статус архивации
    archive_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (archive_status IN ('active', 'deleted', 'restored', 'expired')),

    -- Управление доступом
    is_access_restricted BOOLEAN DEFAULT false,
    restricted_until TIMESTAMP WITH TIME ZONE, -- Временное ограничение доступа

    -- Классификация для поиска
    document_type VARCHAR(50) NOT NULL,
    document_year INTEGER NOT NULL,
    document_month INTEGER NOT NULL,

    -- Индексация для быстрого поиска
    search_vector tsvector, -- Полнотекстовый поиск

    -- Хэш для проверки целостности
    data_hash VARCHAR(64) NOT NULL, -- SHA-256 хэш данных
    files_hash VARCHAR(64), -- SHA-256 хэш всех файлов

    -- Управление версиями архива
    archive_version INTEGER DEFAULT 1,
    previous_archive_id UUID REFERENCES document_archive(id) ON DELETE SET NULL,

    -- Сжатие и оптимизация хранения
    compression_type VARCHAR(20) DEFAULT 'gzip',
    compressed_size BIGINT, -- Размер в байтах после сжатия
    original_size BIGINT NOT NULL, -- Оригинальный размер

    -- Временные метки
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,

    -- Уникальность - один документ не может быть в архиве дважды в одно время
    CONSTRAINT unique_active_archive UNIQUE (original_document_id, archive_status)
    WHERE archive_status = 'active'
);

-- Создание индексов для быстрого поиска
CREATE INDEX idx_document_archive_company_id ON document_archive(company_id);
CREATE INDEX idx_document_archive_original_document_id ON document_archive(original_document_id);
CREATE INDEX idx_document_archive_archive_date ON document_archive(archive_date);
CREATE INDEX idx_document_archive_retention_expires_at ON document_archive(retention_expires_at);
CREATE INDEX idx_document_archive_archive_status ON document_archive(archive_status);
CREATE INDEX idx_document_archive_document_type ON document_archive(document_type);
CREATE INDEX idx_document_archive_document_year ON document_archive(document_year);
CREATE INDEX idx_document_archive_document_month ON document_archive(document_month);

-- Составные индексы для часто используемых запросов
CREATE INDEX idx_document_archive_company_status_date ON document_archive(company_id, archive_status, archive_date DESC);
CREATE INDEX idx_document_archive_company_year_type ON document_archive(company_id, document_year, document_type);
CREATE INDEX idx_document_archive_retention_cleanup ON document_archive(retention_expires_at, archive_status) WHERE archive_status = 'active';

-- Полнотекстовый поиск
CREATE INDEX idx_document_archive_search_vector ON document_archive USING GIN(search_vector);

-- Индексы для JSONB полей
CREATE INDEX idx_document_archive_archived_data ON document_archive USING GIN(archived_data);
CREATE INDEX idx_document_archive_files_archive ON document_archive USING GIN(files_archive);

-- Индекс для контроля доступа
CREATE INDEX idx_document_archive_access_restricted ON document_archive(is_access_restricted, restricted_until) WHERE is_access_restricted = true;

-- Добавление комментариев
COMMENT ON TABLE document_archive IS 'Архив финансовых документов с 5-летним сроком хранения';
COMMENT ON COLUMN document_archive.id IS 'Уникальный идентификатор записи архива';
COMMENT ON COLUMN document_archive.original_document_id IS 'ID оригинального документа';
COMMENT ON COLUMN document_archive.company_id IS 'ID компании';
COMMENT ON COLUMN document_archive.archive_date IS 'Дата помещения в архив';
COMMENT ON COLUMN document_archive.archive_reason IS 'Причина архивации';
COMMENT ON COLUMN document_archive.retention_expires_at IS 'Дата истечения срока хранения';
COMMENT ON COLUMN document_archive.archived_data IS 'Полная копия данных документа в JSON';
COMMENT ON COLUMN document_archive.files_archive IS 'Архив всех версий файлов';
COMMENT ON COLUMN document_archive.archived_by IS 'Кто поместил в архив';
COMMENT ON COLUMN document_archive.archive_notes IS 'Заметки об архивации';
COMMENT ON COLUMN document_archive.archive_status IS 'Статус архивации';
COMMENT ON COLUMN document_archive.is_access_restricted IS 'Ограничен ли доступ';
COMMENT ON COLUMN document_archive.restricted_until IS 'До какого момента ограничен доступ';
COMMENT ON COLUMN document_archive.document_type IS 'Тип документа для классификации';
COMMENT ON COLUMN document_archive.document_year IS 'Год документа для классификации';
COMMENT ON COLUMN document_archive.document_month IS 'Месяц документа для классификации';
COMMENT ON COLUMN document_archive.search_vector IS 'Вектор для полнотекстового поиска';
COMMENT ON COLUMN document_archive.data_hash IS 'SHA-256 хэш данных';
COMMENT ON COLUMN document_archive.files_hash IS 'SHA-256 хэш файлов';
COMMENT ON COLUMN document_archive.archive_version IS 'Версия записи архива';
COMMENT ON COLUMN document_archive.previous_archive_id IS 'ID предыдущей версии архива';
COMMENT ON COLUMN document_archive.compression_type IS 'Тип сжатия данных';
COMMENT ON COLUMN document_archive.compressed_size IS 'Размер после сжатия';
COMMENT ON COLUMN document_archive.original_size IS 'Оригинальный размер';
COMMENT ON COLUMN document_archive.last_accessed_at IS 'Дата последнего доступа';
COMMENT ON COLUMN document_archive.access_count IS 'Количество обращений к архиву';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_document_archive_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_accessed_at = CURRENT_TIMESTAMP;
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_document_archive_updated_at
    BEFORE UPDATE ON document_archive
    FOR EACH ROW
    EXECUTE FUNCTION update_document_archive_updated_at();

-- Создание триггера для обновления access_count при чтении
CREATE OR REPLACE FUNCTION update_archive_access_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = CURRENT_TIMESTAMP;
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание функции для автоматического вычисления срока хранения
CREATE OR REPLACE FUNCTION calculate_retention_expires_at(document_date DATE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
    -- 5 лет с даты документа + 1 день для безопасности
    RETURN (document_date + INTERVAL '5 years 1 day')::TIMESTAMP WITH TIME ZONE;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для генерации поискового вектора
CREATE OR REPLACE FUNCTION update_archive_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('russian',
        COALESCE(NEW.archived_data::text, '') || ' ' ||
        COALESCE(NEW.archive_reason, '') || ' ' ||
        COALESCE(NEW.archive_notes, '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_archive_search_vector
    BEFORE INSERT OR UPDATE ON document_archive
    FOR EACH ROW
    EXECUTE FUNCTION update_archive_search_vector();

-- Создание функции для архивации документа
CREATE OR REPLACE FUNCTION archive_document(
    p_document_id UUID,
    p_reason VARCHAR(100) DEFAULT 'retention',
    p_archived_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_archive_id UUID;
    v_document JSONB;
    v_files JSONB;
    v_data_hash VARCHAR(64);
    v_files_hash VARCHAR(64);
    v_retention_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Получаем данные документа
    SELECT row_to_json(fd.*)
    INTO v_document
    FROM financial_documents fd
    WHERE fd.id = p_document_id;

    IF v_document IS NULL THEN
        RAISE EXCEPTION 'Document not found: %', p_document_id;
    END IF;

    -- Получаем информацию о файлах
    SELECT jsonb_agg(
        jsonb_build_object(
            'file_path', file_path,
            'file_hash', file_hash,
            'file_size', file_size,
            'created_at', created_at
        )
    )
    INTO v_files
    FROM financial_documents
    WHERE id = p_document_id AND file_path IS NOT NULL;

    -- Вычисляем хэши
    v_data_hash := encode(sha256(v_document::text::bytea), 'hex');

    IF v_files IS NOT NULL THEN
        v_files_hash := encode(sha256(v_files::text::bytea), 'hex');
    END IF;

    -- Вычисляем дату окончания хранения
    v_retention_date := calculate_retention_expires_at((v_document->>'document_date')::DATE);

    -- Создаем запись в архиве
    INSERT INTO document_archive (
        original_document_id,
        company_id,
        archive_reason,
        retention_expires_at,
        archived_data,
        files_archive,
        archived_by,
        archive_notes,
        document_type,
        document_year,
        document_month,
        data_hash,
        files_hash,
        original_size
    ) VALUES (
        p_document_id,
        v_document->>'company_id',
        p_reason,
        v_retention_date,
        v_document,
        COALESCE(v_files, '[]'::JSONB),
        p_archived_by,
        p_notes,
        v_document->>'document_type',
        EXTRACT(YEAR FROM (v_document->>'document_date')::DATE)::INTEGER,
        EXTRACT(MONTH FROM (v_document->>'document_date')::DATE)::INTEGER,
        v_data_hash,
        v_files_hash,
        octet_length(v_document::text::bytea)
    )
    RETURNING id INTO v_archive_id;

    -- Удаляем оригинальный документ (если необходимо)
    -- DELETE FROM financial_documents WHERE id = p_document_id;

    RETURN v_archive_id;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для восстановления документа из архива
CREATE OR REPLACE FUNCTION restore_document_from_archive(p_archive_id UUID)
RETURNS UUID AS $$
DECLARE
    v_archive JSONB;
    v_document_id UUID;
    v_restored_document_id UUID;
BEGIN
    -- Получаем данные из архива
    SELECT archived_data
    INTO v_archive
    FROM document_archive
    WHERE id = p_archive_id AND archive_status = 'active';

    IF v_archive IS NULL THEN
        RAISE EXCEPTION 'Archive record not found or not active: %', p_archive_id;
    END IF;

    -- Восстанавливаем документ в основной таблице
    INSERT INTO financial_documents (
        id,
        company_id,
        document_type,
        document_number,
        document_date,
        document_status,
        reporting_period_start,
        reporting_period_end,
        total_amount,
        vat_amount,
        currency,
        exchange_rate,
        transaction_count,
        transaction_total,
        verified_total,
        cost_center_summary,
        transaction_ids,
        provider_name,
        provider_inn,
        provider_kpp,
        provider_address,
        provider_bank_account,
        provider_bank_name,
        provider_bank_bik,
        client_name,
        client_inn,
        client_kpp,
        client_address,
        client_bank_account,
        client_bank_name,
        client_bank_bik,
        contract_number,
        contract_date,
        service_description,
        file_path,
        file_hash,
        file_size,
        version,
        parent_document_id,
        is_electronically_signed,
        signature_date,
        signature_certificate_id,
        created_by,
        approved_by,
        approved_at,
        sent_by,
        sent_at,
        created_at,
        updated_at
    ) VALUES (
        v_archive->>'id',
        v_archive->>'company_id',
        v_archive->>'document_type',
        v_archive->>'document_number',
        v_archive->>'document_date',
        v_archive->>'document_status',
        v_archive->>'reporting_period_start',
        v_archive->>'reporting_period_end',
        (v_archive->>'total_amount')::DECIMAL,
        (v_archive->>'vat_amount')::DECIMAL,
        v_archive->>'currency',
        (v_archive->>'exchange_rate')::DECIMAL,
        (v_archive->>'transaction_count')::INTEGER,
        (v_archive->>'transaction_total')::DECIMAL,
        (v_archive->>'verified_total')::DECIMAL,
        v_archive->>'cost_center_summary',
        v_archive->>'transaction_ids',
        v_archive->>'provider_name',
        v_archive->>'provider_inn',
        v_archive->>'provider_kpp',
        v_archive->>'provider_address',
        v_archive->>'provider_bank_account',
        v_archive->>'provider_bank_name',
        v_archive->>'provider_bank_bik',
        v_archive->>'client_name',
        v_archive->>'client_inn',
        v_archive->>'client_kpp',
        v_archive->>'client_address',
        v_archive->>'client_bank_account',
        v_archive->>'client_bank_name',
        v_archive->>'client_bank_bik',
        v_archive->>'contract_number',
        v_archive->>'contract_date',
        v_archive->>'service_description',
        v_archive->>'file_path',
        v_archive->>'file_hash',
        (v_archive->>'file_size')::BIGINT,
        (v_archive->>'version')::INTEGER,
        v_archive->>'parent_document_id',
        (v_archive->>'is_electronically_signed')::BOOLEAN,
        v_archive->>'signature_date',
        v_archive->>'signature_certificate_id',
        v_archive->>'created_by',
        v_archive->>'approved_by',
        v_archive->>'approved_at',
        v_archive->>'sent_by',
        v_archive->>'sent_at',
        v_archive->>'created_at',
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO v_restored_document_id;

    -- Обновляем статус архива
    UPDATE document_archive
    SET archive_status = 'restored',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_archive_id;

    RETURN v_restored_document_id;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для очистки устаревших архивов
CREATE OR REPLACE FUNCTION cleanup_expired_archives()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Удаляем архивные записи, у которых истек срок хранения
    DELETE FROM document_archive
    WHERE retention_expires_at < CURRENT_TIMESTAMP
    AND archive_status = 'active';

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для проверки целостности архива
CREATE OR REPLACE FUNCTION verify_archive_integrity(p_archive_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_archive document_archive%ROWTYPE;
    v_current_data_hash VARCHAR(64);
    v_current_files_hash VARCHAR(64);
BEGIN
    -- Получаем запись архива
    SELECT * INTO v_archive
    FROM document_archive
    WHERE id = p_archive_id;

    IF v_archive IS NULL THEN
        RAISE EXCEPTION 'Archive record not found: %', p_archive_id;
    END IF;

    -- Пересчитываем хэши данных
    v_current_data_hash := encode(sha256(v_archive.archived_data::text::bytea), 'hex');

    IF v_archive.data_hash != v_current_data_hash THEN
        RETURN FALSE;
    END IF;

    -- Проверяем хэш файлов (если есть)
    IF v_archive.files_hash IS NOT NULL AND v_archive.files_archive IS NOT NULL THEN
        v_current_files_hash := encode(sha256(v_archive.files_archive::text::bytea), 'hex');

        IF v_archive.files_hash != v_current_files_hash THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Создание scheduled job для ежедневной очистки (для pg_cron)
-- SELECT cron.schedule('cleanup-expired-archives', '0 2 * * *', 'SELECT cleanup_expired_archives();');

-- Создание представления для быстрого доступа к активным архивам
CREATE VIEW active_document_archives AS
SELECT
    id,
    original_document_id,
    company_id,
    archive_date,
    retention_expires_at,
    document_type,
    document_year,
    document_month,
    archive_status,
    is_access_restricted,
    data_hash,
    archived_by,
    archive_reason
FROM document_archive
WHERE archive_status = 'active'
ORDER BY archive_date DESC;