-- Создание таблицы B2B билетов
CREATE TABLE IF NOT EXISTS b2b_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES b2b_users(id) ON DELETE RESTRICT,
    event_name VARCHAR(255) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    category VARCHAR(20) NOT NULL DEFAULT 'business' CHECK (category IN ('business', 'training', 'conference', 'corporate_event', 'team_building')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'used', 'expired')),
    department VARCHAR(100),
    purchase_date TIMESTAMP WITH TIME ZONE,
    qr_code VARCHAR(255) UNIQUE,
    notes TEXT,
    created_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    confirmed_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX idx_b2b_tickets_company_id ON b2b_tickets(company_id);
CREATE INDEX idx_b2b_tickets_employee_id ON b2b_tickets(employee_id);
CREATE INDEX idx_b2b_tickets_event_date ON b2b_tickets(event_date);
CREATE INDEX idx_b2b_tickets_status ON b2b_tickets(status);
CREATE INDEX idx_b2b_tickets_category ON b2b_tickets(category);
CREATE INDEX idx_b2b_tickets_department ON b2b_tickets(department);
CREATE INDEX idx_b2b_tickets_price ON b2b_tickets(price);
CREATE INDEX idx_b2b_tickets_created_at ON b2b_tickets(created_at);
CREATE INDEX idx_b2b_tickets_purchase_date ON b2b_tickets(purchase_date);
CREATE UNIQUE INDEX idx_b2b_tickets_qr_code ON b2b_tickets(qr_code) WHERE qr_code IS NOT NULL;

-- Составной индекс для быстрых запросов
CREATE INDEX idx_b2b_tickets_company_employee_status ON b2b_tickets(company_id, employee_id, status);
CREATE INDEX idx_b2b_tickets_company_date_status ON b2b_tickets(company_id, event_date, status);

-- Добавление комментариев
COMMENT ON TABLE b2b_tickets IS 'Корпоративные билеты';
COMMENT ON COLUMN b2b_tickets.id IS 'Уникальный идентификатор билета';
COMMENT ON COLUMN b2b_tickets.company_id IS 'ID компании';
COMMENT ON COLUMN b2b_tickets.employee_id IS 'ID сотрудника';
COMMENT ON COLUMN b2b_tickets.event_name IS 'Название мероприятия';
COMMENT ON COLUMN b2b_tickets.event_date IS 'Дата мероприятия';
COMMENT ON COLUMN b2b_tickets.price IS 'Цена билета';
COMMENT ON COLUMN b2b_tickets.currency IS 'Валюта';
COMMENT ON COLUMN b2b_tickets.category IS 'Категория билета';
COMMENT ON COLUMN b2b_tickets.status IS 'Статус билета';
COMMENT ON COLUMN b2b_tickets.department IS 'Отдел';
COMMENT ON COLUMN b2b_tickets.purchase_date IS 'Дата покупки';
COMMENT ON COLUMN b2b_tickets.qr_code IS 'QR-код билета';
COMMENT ON COLUMN b2b_tickets.notes IS 'Заметки';
COMMENT ON COLUMN b2b_tickets.created_by IS 'Кто создал';
COMMENT ON COLUMN b2b_tickets.confirmed_by IS 'Кто подтвердил';
COMMENT ON COLUMN b2b_tickets.confirmed_at IS 'Когда подтвержден';
COMMENT ON COLUMN b2b_tickets.cancelled_by IS 'Кто отменил';
COMMENT ON COLUMN b2b_tickets.cancelled_at IS 'Когда отменен';
COMMENT ON COLUMN b2b_tickets.cancellation_reason IS 'Причина отмены';
COMMENT ON COLUMN b2b_tickets.used_at IS 'Когда использован';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_b2b_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_tickets_updated_at
    BEFORE UPDATE ON b2b_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_b2b_tickets_updated_at();

-- Создание функции для автоматической генерации QR-кода при подтверждении
CREATE OR REPLACE FUNCTION generate_qr_code_on_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- Генерируем QR-код только при изменении статуса на confirmed
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' AND NEW.qr_code IS NULL THEN
        NEW.qr_code = 'QR_' || UPPER(substring(encode(gen_random_bytes(16), 'hex'), 1, 16));
        NEW.confirmed_at = CURRENT_TIMESTAMP;
    END IF;

    -- Устанавливаем время отмены
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        NEW.cancelled_at = CURRENT_TIMESTAMP;
    END IF;

    -- Устанавливаем время использования
    IF OLD.status != 'used' AND NEW.status = 'used' THEN
        NEW.used_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_tickets_status_changes
    BEFORE UPDATE ON b2b_tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_qr_code_on_confirmation();

-- Создание функции для проверки истечения срока действия билетов
CREATE OR REPLACE FUNCTION check_ticket_expiration()
RETURNS TRIGGER AS $$
BEGIN
    -- Автоматически помечаем билет как просроченный, если дата мероприятия прошла
    IF NEW.event_date < CURRENT_TIMESTAMP AND NEW.status IN ('pending', 'confirmed') THEN
        NEW.status = 'expired';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_tickets_check_expiration
    BEFORE UPDATE ON b2b_tickets
    FOR EACH ROW
    EXECUTE FUNCTION check_ticket_expiration();