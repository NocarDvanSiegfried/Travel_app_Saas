-- Создание таблицы лимитов на расходы пользователей
CREATE TABLE IF NOT EXISTS user_spending_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES b2b_users(id) ON DELETE CASCADE,
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,

    -- Тип лимита
    limit_type VARCHAR(30) NOT NULL CHECK (limit_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'per_transaction', 'cost_center_monthly')),

    -- Параметры лимита
    limit_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    current_spend DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    current_transaction_count INTEGER DEFAULT 0,

    -- Период действия лимита
    period_start_date TIMESTAMP WITH TIME ZONE,
    period_end_date TIMESTAMP WITH TIME ZONE,
    reset_day_of_month INTEGER CHECK (reset_day_of_month BETWEEN 1 AND 31), -- День месяца для сброса лимита

    -- Управление лимитом
    is_active BOOLEAN DEFAULT true,
    require_approval BOOLEAN DEFAULT false,
    approval_threshold DECIMAL(15,2), -- Порог выше которого требуется одобрение
    approver_id UUID REFERENCES b2b_users(id) ON DELETE SET NULL,

    -- Ограничения
    max_transactions_per_period INTEGER,
    max_single_transaction_amount DECIMAL(15,2),
    allowed_categories TEXT[], -- Разрешенные категории трат

    -- Уведомления
    warning_threshold_percent DECIMAL(5,2) DEFAULT 80.00, -- Процент для предупреждения
    warning_sent BOOLEAN DEFAULT false,
    block_when_exceeded BOOLEAN DEFAULT true,

    -- Метаданные
    notes TEXT,
    created_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Уникальность лимита для пользователя/типа/центра затрат
    CONSTRAINT unique_user_limit UNIQUE (company_id, user_id, limit_type, cost_center_id)
);

-- Создание индексов
CREATE INDEX idx_user_spending_limits_company_id ON user_spending_limits(company_id);
CREATE INDEX idx_user_spending_limits_user_id ON user_spending_limits(user_id);
CREATE INDEX idx_user_spending_limits_cost_center_id ON user_spending_limits(cost_center_id);
CREATE INDEX idx_user_spending_limits_type ON user_spending_limits(limit_type);
CREATE INDEX idx_user_spending_limits_active ON user_spending_limits(is_active);
CREATE INDEX idx_user_spending_limits_period ON user_spending_limits(period_start_date, period_end_date);
CREATE INDEX idx_user_spending_limits_approval ON user_spending_limits(approver_id);

-- Составные индексы для проверки лимитов
CREATE INDEX idx_user_spending_limits_user_active_type ON user_spending_limits(user_id, is_active, limit_type);
CREATE INDEX idx_user_spending_limits_cost_center_active ON user_spending_limits(cost_center_id, is_active) WHERE cost_center_id IS NOT NULL;

-- Добавление комментариев
COMMENT ON TABLE user_spending_limits IS 'Лимиты на расходы пользователей';
COMMENT ON COLUMN user_spending_limits.id IS 'Уникальный идентификатор лимита';
COMMENT ON COLUMN user_spending_limits.company_id IS 'ID компании';
COMMENT ON COLUMN user_spending_limits.user_id IS 'ID пользователя';
COMMENT ON COLUMN user_spending_limits.cost_center_id IS 'ID центра затрат';
COMMENT ON COLUMN user_spending_limits.limit_type IS 'Тип лимита';
COMMENT ON COLUMN user_spending_limits.limit_amount IS 'Максимальная сумма лимита';
COMMENT ON COLUMN user_spending_limits.current_spend IS 'Текущие расходы в периоде';
COMMENT ON COLUMN user_spending_limits.current_transaction_count IS 'Количество транзакций в периоде';
COMMENT ON COLUMN user_spending_limits.period_start_date IS 'Начало периода лимита';
COMMENT ON COLUMN user_spending_limits.period_end_date IS 'Конец периода лимита';
COMMENT ON COLUMN user_spending_limits.reset_day_of_month IS 'День месяца для сброса лимита';
COMMENT ON COLUMN user_spending_limits.is_active IS 'Активен ли лимит';
COMMENT ON COLUMN user_spending_limits.require_approval IS 'Требуется ли одобрение';
COMMENT ON COLUMN user_spending_limits.approval_threshold IS 'Порог для обязательного одобрения';
COMMENT ON COLUMN user_spending_limits.approver_id IS 'ID утверждающего';
COMMENT ON COLUMN user_spending_limits.max_transactions_per_period IS 'Максимальное количество транзакций';
COMMENT ON COLUMN user_spending_limits.max_single_transaction_amount IS 'Максимальная сумма одной транзакции';
COMMENT ON COLUMN user_spending_limits.allowed_categories IS 'Разрешенные категории';
COMMENT ON COLUMN user_spending_limits.warning_threshold_percent IS 'Процент для предупреждения';
COMMENT ON COLUMN user_spending_limits.warning_sent IS 'Отправлено ли предупреждение';
COMMENT ON COLUMN user_spending_limits.block_when_exceeded IS 'Блокировать при превышении';
COMMENT ON COLUMN user_spending_limits.notes IS 'Заметки';
COMMENT ON COLUMN user_spending_limits.created_by IS 'Кто создал лимит';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_user_spending_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_user_spending_limits_updated_at
    BEFORE UPDATE ON user_spending_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_spending_limits_updated_at();

-- Создание функции для автоматической установки периодов
CREATE OR REPLACE FUNCTION set_limit_periods()
RETURNS TRIGGER AS $$
BEGIN
    -- Устанавливаем периоды на основе типа лимита
    IF NEW.period_start_date IS NULL THEN
        NEW.period_start_date := CURRENT_TIMESTAMP;

        CASE NEW.limit_type
            WHEN 'daily' THEN
                NEW.period_end_date := NEW.period_start_date + INTERVAL '1 day';
                NEW.reset_day_of_month := NULL;
            WHEN 'weekly' THEN
                NEW.period_end_date := NEW.period_start_date + INTERVAL '1 week';
                NEW.reset_day_of_month := NULL;
            WHEN 'monthly' THEN
                NEW.period_end_date := NEW.period_start_date + INTERVAL '1 month';
                NEW.reset_day_of_month := EXTRACT(DAY FROM NEW.period_start_date)::INTEGER;
            WHEN 'quarterly' THEN
                NEW.period_end_date := NEW.period_start_date + INTERVAL '3 months';
                NEW.reset_day_of_month := NULL;
            WHEN 'yearly' THEN
                NEW.period_end_date := NEW.period_start_date + INTERVAL '1 year';
                NEW.reset_day_of_month := NULL;
            WHEN 'per_transaction' THEN
                NEW.period_end_date := NULL; -- Бессрочный для транзакций
                NEW.reset_day_of_month := NULL;
            WHEN 'cost_center_monthly' THEN
                NEW.period_end_date := NEW.period_start_date + INTERVAL '1 month';
                NEW.reset_day_of_month := EXTRACT(DAY FROM NEW.period_start_date)::INTEGER;
        END CASE;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_set_limit_periods
    BEFORE INSERT ON user_spending_limits
    FOR EACH ROW
    EXECUTE FUNCTION set_limit_periods();

-- Создание функции для обновления расходов пользователя при транзакциях
CREATE OR REPLACE FUNCTION update_user_spending_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
    limit_record RECORD;
    exceeded_limits TEXT[];
BEGIN
    -- Обрабатываем только успешные транзакции списания
    IF NEW.status = 'completed' AND NEW.transaction_type IN ('withdrawal', 'fee', 'debit')
       AND NEW.user_id IS NOT NULL THEN

        -- Обновляем расходы для всех подходящих лимитов пользователя
        FOR limit_record IN
            SELECT *
            FROM user_spending_limits
            WHERE user_id = NEW.user_id
            AND company_id = NEW.company_id
            AND is_active = true
            AND (
                -- Транзакционные лимиты
                limit_type = 'per_transaction'
                -- Или временные лимиты с незавершенным периодом
                OR (limit_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'cost_center_monthly')
                    AND CURRENT_TIMESTAMP BETWEEN period_start_date AND COALESCE(period_end_date, 'infinity'::timestamp))
            )
            AND (
                cost_center_id IS NULL -- Общие лимиты
                OR cost_center_id = NEW.cost_center_id -- Лимиты для конкретного центра затрат
            )
        LOOP
            -- Обновляем текущие расходы
            UPDATE user_spending_limits
            SET
                current_spend = current_spend + NEW.amount,
                current_transaction_count = current_transaction_count + 1
            WHERE id = limit_record.id;

            -- Проверяем превышение лимита
            IF (limit_record.current_spend + NEW.amount) > limit_record.limit_amount THEN
                exceeded_limits := array_append(exceeded_limits, limit_record.limit_type);
            END IF;
        END LOOP;

        -- Если есть превышенные лимиты, логируем это
        IF array_length(exceeded_limits, 1) > 0 THEN
            -- Здесь можно добавить логику для блокировки или уведомлений
            PERFORM pg_notify('limit_exceeded',
                json_build_object(
                    'user_id', NEW.user_id,
                    'company_id', NEW.company_id,
                    'transaction_id', NEW.id,
                    'amount', NEW.amount,
                    'exceeded_limits', exceeded_limits
                )::text
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер после вставки/обновления транзакции
CREATE TRIGGER trigger_update_user_spending_from_transaction
    AFTER INSERT OR UPDATE ON transaction_log
    FOR EACH ROW
    EXECUTE FUNCTION update_user_spending_from_transaction();

-- Создание функции для сброса периодических лимитов
CREATE OR REPLACE FUNCTION reset_periodic_limits()
RETURNS void AS $$
BEGIN
    -- Сбрасываем ежемесячные лимиты
    UPDATE user_spending_limits
    SET
        current_spend = 0,
        current_transaction_count = 0,
        warning_sent = false,
        period_start_date = CASE
            WHEN reset_day_of_month IS NOT NULL THEN
                CASE
                    WHEN EXTRACT(DAY FROM CURRENT_DATE) >= reset_day_of_month THEN
                        make_timestamp(
                            EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                            EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
                            reset_day_of_month,
                            0, 0, 0
                        )
                    ELSE
                        make_timestamp(
                            EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                            EXTRACT(MONTH FROM CURRENT_DATE) - 1,
                            reset_day_of_month,
                            0, 0, 0
                        )
                END
            ELSE CURRENT_TIMESTAMP
        END,
        period_end_date = CASE
            WHEN reset_day_of_month IS NOT NULL THEN
                period_start_date + INTERVAL '1 month'
            ELSE NULL
        END
    WHERE limit_type IN ('monthly', 'cost_center_monthly')
    AND is_active = true
    AND (
        period_end_date IS NULL
        OR period_end_date <= CURRENT_TIMESTAMP
    );

    -- Аналогично для других периодов (дневных, недельных и т.д.)
    UPDATE user_spending_limits
    SET
        current_spend = 0,
        current_transaction_count = 0,
        warning_sent = false,
        period_start_date = CURRENT_TIMESTAMP,
        period_end_date = CURRENT_TIMESTAMP + INTERVAL '1 day'
    WHERE limit_type = 'daily'
    AND is_active = true
    AND period_end_date <= CURRENT_TIMESTAMP;

    UPDATE user_spending_limits
    SET
        current_spend = 0,
        current_transaction_count = 0,
        warning_sent = false,
        period_start_date = CURRENT_TIMESTAMP,
        period_end_date = CURRENT_TIMESTAMP + INTERVAL '1 week'
    WHERE limit_type = 'weekly'
    AND is_active = true
    AND period_end_date <= CURRENT_TIMESTAMP;

    -- И так далее для квартальных и годовых лимитов...
END;
$$ LANGUAGE plpgsql;