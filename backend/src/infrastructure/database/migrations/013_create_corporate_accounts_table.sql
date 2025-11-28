-- Создание таблицы корпоративных счетов (депозитов)
CREATE TABLE IF NOT EXISTS corporate_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES b2b_companies(id) ON DELETE CASCADE,
    current_deposit_balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_deposited DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_withdrawn DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    account_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'blocked', 'closed')),
    credit_limit DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    minimum_balance_threshold DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    low_balance_alert_sent BOOLEAN DEFAULT false,
    auto_topup_enabled BOOLEAN DEFAULT false,
    auto_topup_amount DECIMAL(15,2),
    auto_topup_threshold DECIMAL(15,2),
    last_deposit_date TIMESTAMP WITH TIME ZONE,
    last_withdrawal_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX idx_corporate_accounts_company_id ON corporate_accounts(company_id);
CREATE INDEX idx_corporate_accounts_status ON corporate_accounts(account_status);
CREATE INDEX idx_corporate_accounts_balance ON corporate_accounts(current_deposit_balance);
CREATE INDEX idx_corporate_accounts_currency ON corporate_accounts(currency);
CREATE INDEX idx_corporate_accounts_created_at ON corporate_accounts(created_at);

-- Добавление комментариев
COMMENT ON TABLE corporate_accounts IS 'Корпоративные депозитные счета';
COMMENT ON COLUMN corporate_accounts.id IS 'Уникальный идентификатор счета';
COMMENT ON COLUMN corporate_accounts.company_id IS 'ID компании';
COMMENT ON COLUMN corporate_accounts.current_deposit_balance IS 'Текущий баланс депозита';
COMMENT ON COLUMN corporate_accounts.total_deposited IS 'Всего пополнено за все время';
COMMENT ON COLUMN corporate_accounts.total_withdrawn IS 'Всего списано за все время';
COMMENT ON COLUMN corporate_accounts.currency IS 'Валюта счета';
COMMENT ON COLUMN corporate_accounts.account_status IS 'Статус счета';
COMMENT ON COLUMN corporate_accounts.credit_limit IS 'Кредитный лимит (оверрафт)';
COMMENT ON COLUMN corporate_accounts.minimum_balance_threshold IS 'Порог для уведомлений о низком балансе';
COMMENT ON COLUMN corporate_accounts.low_balance_alert_sent IS 'Отправлено ли уведомление о низком балансе';
COMMENT ON COLUMN corporate_accounts.auto_topup_enabled IS 'Включен автопополнение';
COMMENT ON COLUMN corporate_accounts.auto_topup_amount IS 'Сумма автопополнения';
COMMENT ON COLUMN corporate_accounts.auto_topup_threshold IS 'Порог автопополнения';
COMMENT ON COLUMN corporate_accounts.last_deposit_date IS 'Дата последнего пополнения';
COMMENT ON COLUMN corporate_accounts.last_withdrawal_date IS 'Дата последнего списания';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_corporate_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_corporate_accounts_updated_at
    BEFORE UPDATE ON corporate_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_corporate_accounts_updated_at();

-- Создание функции проверки баланса перед списанием
CREATE OR REPLACE FUNCTION check_sufficient_funds()
RETURNS TRIGGER AS $$
DECLARE
    available_balance DECIMAL(15,2);
BEGIN
    -- Вычисляем доступный баланс (депозит + кредитный лимит)
    available_balance := NEW.current_deposit_balance + (
        SELECT credit_limit
        FROM corporate_accounts
        WHERE id = NEW.id
    );

    -- Проверяем, не превышает ли списание доступный баланс
    IF NEW.current_deposit_balance < 0 AND available_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient funds. Available: %', available_balance;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для проверки достаточности средств
-- CREATE TRIGGER trigger_check_sufficient_funds
--     BEFORE UPDATE OF current_deposit_balance ON corporate_accounts
--     FOR EACH ROW
--     EXECUTE FUNCTION check_sufficient_funds();