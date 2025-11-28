-- Создание таблицы транзакционного лога
CREATE TABLE IF NOT EXISTS transaction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'refund', 'refund_pending', 'fee', 'credit', 'debit')),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,

    -- Связь с билетом (если транзакция связана с билетом)
    ticket_id UUID REFERENCES b2b_tickets(id) ON DELETE SET NULL,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES b2b_users(id) ON DELETE SET NULL,

    -- Описание и метаданные
    description TEXT NOT NULL,
    reference_number VARCHAR(100) UNIQUE,
    external_reference VARCHAR(100), -- Внешний ID из платежной системы
    category VARCHAR(50), -- Категория транзакции (travel, accommodation, etc.)
    tags JSONB DEFAULT '{}',

    -- Статус и обработка
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Метаданные для аудита
    ip_address INET,
    user_agent TEXT,
    created_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,

    -- Временные метки
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Для возвратов
    original_transaction_id UUID REFERENCES transaction_log(id) ON DELETE SET NULL,
    refund_reason TEXT,

    -- Для служебных целей
    batch_id UUID, -- для группировки транзакций
    metadata JSONB DEFAULT '{}'
);

-- Создание индексов для быстрого поиска
CREATE INDEX idx_transaction_log_company_id ON transaction_log(company_id);
CREATE INDEX idx_transaction_log_type ON transaction_log(transaction_type);
CREATE INDEX idx_transaction_log_status ON transaction_log(status);
CREATE INDEX idx_transaction_log_date ON transaction_log(transaction_date);
CREATE INDEX idx_transaction_log_ticket_id ON transaction_log(ticket_id);
CREATE INDEX idx_transaction_log_cost_center_id ON transaction_log(cost_center_id);
CREATE INDEX idx_transaction_log_user_id ON transaction_log(user_id);
CREATE INDEX idx_transaction_log_reference ON transaction_log(reference_number);
CREATE INDEX idx_transaction_log_external_reference ON transaction_log(external_reference);
CREATE INDEX idx_transaction_log_original_transaction ON transaction_log(original_transaction_id);

-- Составные индексы для часто используемых запросов
CREATE INDEX idx_transaction_log_company_date_type ON transaction_log(company_id, transaction_date DESC, transaction_type);
CREATE INDEX idx_transaction_log_company_status_date ON transaction_log(company_id, status, transaction_date DESC);
CREATE INDEX idx_transaction_log_cost_center_date ON transaction_log(cost_center_id, transaction_date DESC) WHERE cost_center_id IS NOT NULL;
CREATE INDEX idx_transaction_log_user_date ON transaction_log(user_id, transaction_date DESC) WHERE user_id IS NOT NULL;

-- Индексы для JSONB полей
CREATE INDEX idx_transaction_log_tags ON transaction_log USING GIN(tags);
CREATE INDEX idx_transaction_log_metadata ON transaction_log USING GIN(metadata);

-- Уникальный индекс для reference_number (только где он не NULL)
CREATE UNIQUE INDEX idx_transaction_log_reference_unique ON transaction_log(reference_number) WHERE reference_number IS NOT NULL;

-- Добавление комментариев
COMMENT ON TABLE transaction_log IS 'Транзакционный лог всех движений средств';
COMMENT ON COLUMN transaction_log.id IS 'Уникальный идентификатор транзакции';
COMMENT ON COLUMN transaction_log.company_id IS 'ID компании';
COMMENT ON COLUMN transaction_log.transaction_type IS 'Тип транзакции';
COMMENT ON COLUMN transaction_log.amount IS 'Сумма транзакции';
COMMENT ON COLUMN transaction_log.currency IS 'Валюта';
COMMENT ON COLUMN transaction_log.balance_before IS 'Баланс до транзакции';
COMMENT ON COLUMN transaction_log.balance_after IS 'Баланс после транзакции';
COMMENT ON COLUMN transaction_log.ticket_id IS 'ID связанного билета';
COMMENT ON COLUMN transaction_log.cost_center_id IS 'ID центра затрат';
COMMENT ON COLUMN transaction_log.user_id IS 'ID пользователя';
COMMENT ON COLUMN transaction_log.description IS 'Описание транзакции';
COMMENT ON COLUMN transaction_log.reference_number IS 'Уникальный номер транзакции';
COMMENT ON COLUMN transaction_log.external_reference IS 'Внешний ID из платежной системы';
COMMENT ON COLUMN transaction_log.category IS 'Категория транзакции';
COMMENT ON COLUMN transaction_log.tags IS 'Теги для дополнительной классификации';
COMMENT ON COLUMN transaction_log.status IS 'Статус транзакции';
COMMENT ON COLUMN transaction_log.failure_reason IS 'Причина неудачи';
COMMENT ON COLUMN transaction_log.retry_count IS 'Количество попыток повтора';
COMMENT ON COLUMN transaction_log.ip_address IS 'IP адрес транзакции';
COMMENT ON COLUMN transaction_log.user_agent IS 'User Agent браузера';
COMMENT ON COLUMN transaction_log.created_by IS 'Кто создал транзакцию';
COMMENT ON COLUMN transaction_log.approved_by IS 'Кто одобрил транзакцию';
COMMENT ON COLUMN transaction_log.approved_at IS 'Когда одобрена';
COMMENT ON COLUMN transaction_log.transaction_date IS 'Дата транзакции';
COMMENT ON COLUMN transaction_log.processed_at IS 'Дата обработки';
COMMENT ON COLUMN transaction_log.original_transaction_id IS 'ID оригинальной транзакции (для возвратов)';
COMMENT ON COLUMN transaction_log.refund_reason IS 'Причина возврата';
COMMENT ON COLUMN transaction_log.batch_id IS 'ID группы транзакций';
COMMENT ON COLUMN transaction_log.metadata IS 'Дополнительные метаданные';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_transaction_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.processed_at = COALESCE(NEW.processed_at, CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_transaction_log_processed_at
    BEFORE INSERT OR UPDATE ON transaction_log
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_log_processed_at();

-- Создание функции для генерации уникального номера транзакции
CREATE OR REPLACE FUNCTION generate_transaction_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_number IS NULL THEN
        NEW.reference_number = 'TXN_' || to_char(CURRENT_TIMESTAMP, 'YYYYMMDD_HH24MISS') || '_' || UPPER(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_generate_transaction_reference
    BEFORE INSERT ON transaction_log
    FOR EACH ROW
    EXECUTE FUNCTION generate_transaction_reference();

-- Создание функции для расчета балансов
CREATE OR REPLACE FUNCTION calculate_current_balance(p_company_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    current_balance DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(
        CASE
            WHEN transaction_type IN ('deposit', 'refund', 'credit') THEN amount
            WHEN transaction_type IN ('withdrawal', 'fee', 'debit') THEN -amount
            ELSE 0
        END
    ), 0) INTO current_balance
    FROM transaction_log
    WHERE company_id = p_company_id
    AND status = 'completed';

    RETURN current_balance;
END;
$$ LANGUAGE plpgsql;

-- Создание функции для автоматического обновления баланса корпоративного счета
CREATE OR REPLACE FUNCTION update_corporate_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    new_balance DECIMAL(15,2);
BEGIN
    -- Обновляем баланс только для завершенных транзакций
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Расчитываем новый баланс
        new_balance := calculate_current_balance(NEW.company_id);

        -- Обновляем баланс в corporate_accounts
        UPDATE corporate_accounts
        SET
            current_deposit_balance = new_balance,
            total_deposited = CASE
                WHEN NEW.transaction_type IN ('deposit', 'refund') THEN
                    total_deposited + NEW.amount
                ELSE total_deposited
            END,
            total_withdrawn = CASE
                WHEN NEW.transaction_type IN ('withdrawal', 'fee') THEN
                    total_withdrawn + NEW.amount
                ELSE total_withdrawn
            END,
            last_deposit_date = CASE
                WHEN NEW.transaction_type IN ('deposit', 'refund') THEN
                    NEW.transaction_date
                ELSE last_deposit_date
            END,
            last_withdrawal_date = CASE
                WHEN NEW.transaction_type IN ('withdrawal', 'fee') THEN
                    NEW.transaction_date
                ELSE last_withdrawal_date
            END,
            low_balance_alert_sent = false -- Сбрасываем флаг уведомления
        WHERE company_id = NEW.company_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_corporate_account_balance
    AFTER INSERT OR UPDATE ON transaction_log
    FOR EACH ROW
    EXECUTE FUNCTION update_corporate_account_balance();