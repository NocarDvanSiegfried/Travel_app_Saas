-- Создание таблицы B2B подписок
CREATE TABLE IF NOT EXISTS b2b_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'professional', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    features TEXT[] NOT NULL DEFAULT '{}',
    employee_limit INTEGER,
    ticket_quota INTEGER,
    delivery_quota INTEGER,
    is_auto_renew BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    payment_method VARCHAR(50),
    last_payment_at TIMESTAMP WITH TIME ZONE,
    next_payment_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX idx_b2b_subscriptions_company_id ON b2b_subscriptions(company_id);
CREATE INDEX idx_b2b_subscriptions_plan ON b2b_subscriptions(plan);
CREATE INDEX idx_b2b_subscriptions_status ON b2b_subscriptions(status);
CREATE INDEX idx_b2b_subscriptions_end_date ON b2b_subscriptions(end_date);
CREATE INDEX idx_b2b_subscriptions_next_payment_at ON b2b_subscriptions(next_payment_at);
CREATE INDEX idx_b2b_subscriptions_is_active ON b2b_subscriptions(status) WHERE status = 'active';

-- Добавление комментариев
COMMENT ON TABLE b2b_subscriptions IS 'Подписки B2B компаний';
COMMENT ON COLUMN b2b_subscriptions.id IS 'Уникальный идентификатор подписки';
COMMENT ON COLUMN b2b_subscriptions.company_id IS 'ID компании';
COMMENT ON COLUMN b2b_subscriptions.plan IS 'Тарифный план';
COMMENT ON COLUMN b2b_subscriptions.status IS 'Статус подписки';
COMMENT ON COLUMN b2b_subscriptions.start_date IS 'Дата начала подписки';
COMMENT ON COLUMN b2b_subscriptions.end_date IS 'Дата окончания подписки';
COMMENT ON COLUMN b2b_subscriptions.monthly_fee IS 'Ежемесячная плата';
COMMENT ON COLUMN b2b_subscriptions.features IS 'Доступные функции';
COMMENT ON COLUMN b2b_subscriptions.employee_limit IS 'Лимит сотрудников';
COMMENT ON COLUMN b2b_subscriptions.ticket_quota IS 'Квота билетов';
COMMENT ON COLUMN b2b_subscriptions.delivery_quota IS 'Квота доставок';
COMMENT ON COLUMN b2b_subscriptions.is_auto_renew IS 'Автоматическое продление';
COMMENT ON COLUMN b2b_subscriptions.cancelled_at IS 'Дата отмены';
COMMENT ON COLUMN b2b_subscriptions.cancellation_reason IS 'Причина отмены';
COMMENT ON COLUMN b2b_subscriptions.payment_method IS 'Способ оплаты';
COMMENT ON COLUMN b2b_subscriptions.last_payment_at IS 'Последний платеж';
COMMENT ON COLUMN b2b_subscriptions.next_payment_at IS 'Следующий платеж';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_b2b_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_subscriptions_updated_at
    BEFORE UPDATE ON b2b_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_b2b_subscriptions_updated_at();

-- Создание функции для установки функций при изменении плана
CREATE OR REPLACE FUNCTION set_subscription_features()
RETURNS TRIGGER AS $$
BEGIN
    -- Устанавливаем функции в зависимости от плана
    CASE NEW.plan
        WHEN 'basic' THEN
            NEW.features = ARRAY['bulk_operations', 'expense_management'];
            NEW.monthly_fee = 5000;
            NEW.employee_limit = 50;
            NEW.ticket_quota = 100;
            NEW.delivery_quota = 200;
        WHEN 'professional' THEN
            NEW.features = ARRAY['unlimited_employees', 'advanced_analytics', 'ai_insights', 'bulk_operations', 'expense_management', 'budget_tracking'];
            NEW.monthly_fee = 15000;
            NEW.employee_limit = NULL; -- без ограничений
            NEW.ticket_quota = 500;
            NEW.delivery_quota = 1000;
        WHEN 'enterprise' THEN
            NEW.features = ARRAY['unlimited_employees', 'advanced_analytics', 'ai_insights', 'custom_reports', 'api_access', 'priority_support', 'bulk_operations', 'delivery_optimization', 'expense_management', 'budget_tracking', 'multi_department'];
            NEW.monthly_fee = 50000;
            NEW.employee_limit = NULL; -- без ограничений
            NEW.ticket_quota = NULL; -- без ограничений
            NEW.delivery_quota = NULL; -- без ограничений
    END CASE;

    -- Устанавливаем следующий платеж
    IF NEW.next_payment_at IS NULL AND NEW.status = 'active' THEN
        NEW.next_payment_at = NEW.start_date + INTERVAL '1 month';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_subscriptions_set_features
    BEFORE INSERT OR UPDATE ON b2b_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_subscription_features();

-- Создание функции для автоматической проверки статуса подписки
CREATE OR REPLACE FUNCTION check_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Автоматически истекаем подписку, если срок прошел
    IF NEW.end_date < CURRENT_TIMESTAMP AND NEW.status = 'active' THEN
        NEW.status = 'expired';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_subscriptions_check_status
    BEFORE UPDATE ON b2b_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION check_subscription_status();

-- Создание таблицы истории платежей
CREATE TABLE IF NOT EXISTS b2b_subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES b2b_subscriptions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255),
    external_payment_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    failure_reason TEXT,
    refund_amount DECIMAL(10,2),
    refund_date TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для истории платежей
CREATE INDEX idx_b2b_subscription_payments_subscription_id ON b2b_subscription_payments(subscription_id);
CREATE INDEX idx_b2b_subscription_payments_status ON b2b_subscription_payments(status);
CREATE INDEX idx_b2b_subscription_payments_payment_date ON b2b_subscription_payments(payment_date);
CREATE INDEX idx_b2b_subscription_payments_due_date ON b2b_subscription_payments(due_date);

-- Комментарии для таблицы платежей
COMMENT ON TABLE b2b_subscription_payments IS 'История платежей за подписки';
COMMENT ON COLUMN b2b_subscription_payments.id IS 'ID платежа';
COMMENT ON COLUMN b2b_subscription_payments.subscription_id IS 'ID подписки';
COMMENT ON COLUMN b2b_subscription_payments.amount IS 'Сумма платежа';
COMMENT ON COLUMN b2b_subscription_payments.currency IS 'Валюта';
COMMENT ON COLUMN b2b_subscription_payments.status IS 'Статус платежа';
COMMENT ON COLUMN b2b_subscription_payments.payment_method IS 'Способ оплаты';
COMMENT ON COLUMN b2b_subscription_payments.transaction_id IS 'ID транзакции';
COMMENT ON COLUMN b2b_subscription_payments.external_payment_id IS 'Внешний ID платежа';
COMMENT ON COLUMN b2b_subscription_payments.payment_date IS 'Дата платежа';
COMMENT ON COLUMN b2b_subscription_payments.due_date IS 'Срок оплаты';
COMMENT ON COLUMN b2b_subscription_payments.failure_reason IS 'Причина отказа';
COMMENT ON COLUMN b2b_subscription_payments.refund_amount IS 'Сумма возврата';
COMMENT ON COLUMN b2b_subscription_payments.refund_date IS 'Дата возврата';
COMMENT ON COLUMN b2b_subscription_payments.refund_reason IS 'Причина возврата';

-- Триггер для обновления updated_at в платежах
CREATE OR REPLACE FUNCTION update_b2b_subscription_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_subscription_payments_updated_at
    BEFORE UPDATE ON b2b_subscription_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_b2b_subscription_payments_updated_at();