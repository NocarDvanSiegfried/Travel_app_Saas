-- Создание таблицы B2B доставок
CREATE TABLE IF NOT EXISTS b2b_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    tracking_number VARCHAR(50) UNIQUE NOT NULL,

    -- Адрес отправления
    from_street VARCHAR(255) NOT NULL,
    from_city VARCHAR(100) NOT NULL,
    from_postal_code VARCHAR(20) NOT NULL,
    from_country VARCHAR(100) NOT NULL DEFAULT 'Россия',
    from_latitude DECIMAL(10, 8),
    from_longitude DECIMAL(11, 8),
    from_contact_person VARCHAR(255),
    from_contact_phone VARCHAR(20),

    -- Адрес назначения
    to_street VARCHAR(255) NOT NULL,
    to_city VARCHAR(100) NOT NULL,
    to_postal_code VARCHAR(20) NOT NULL,
    to_country VARCHAR(100) NOT NULL DEFAULT 'Россия',
    to_latitude DECIMAL(10, 8),
    to_longitude DECIMAL(11, 8),
    to_contact_person VARCHAR(255),
    to_contact_phone VARCHAR(20),

    -- Характеристики груза
    length DECIMAL(8,2) NOT NULL DEFAULT 0,
    width DECIMAL(8,2) NOT NULL DEFAULT 0,
    height DECIMAL(8,2) NOT NULL DEFAULT 0,
    dimension_unit VARCHAR(2) NOT NULL DEFAULT 'cm' CHECK (dimension_unit IN ('cm', 'mm', 'in')),
    weight DECIMAL(8,2) NOT NULL DEFAULT 0,
    category VARCHAR(20) NOT NULL DEFAULT 'parcel' CHECK (category IN ('document', 'parcel', 'cargo', 'fragile', 'perishable', 'dangerous')),

    -- Статус и приоритет
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_pickup', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'failed')),
    priority VARCHAR(10) NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard', 'express', 'urgent')),

    -- Финансы
    delivery_cost DECIMAL(10,2),
    service_fee DECIMAL(10,2) DEFAULT 1000,
    insurance_amount DECIMAL(10,2),
    declared_value DECIMAL(10,2),

    -- Время
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,

    -- Капитан
    captain_id UUID REFERENCES b2b_users(id) ON DELETE SET NULL,

    -- Дополнительная информация
    notes TEXT,
    special_instructions TEXT,
    photos TEXT[], -- JSON array of photo URLs

    -- Аудит
    created_by UUID NOT NULL REFERENCES b2b_users(id) ON DELETE RESTRICT,
    confirmed_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX idx_b2b_deliveries_company_id ON b2b_deliveries(company_id);
CREATE INDEX idx_b2b_deliveries_tracking_number ON b2b_deliveries(tracking_number);
CREATE INDEX idx_b2b_deliveries_status ON b2b_deliveries(status);
CREATE INDEX idx_b2b_deliveries_priority ON b2b_deliveries(priority);
CREATE INDEX idx_b2b_deliveries_category ON b2b_deliveries(category);
CREATE INDEX idx_b2b_deliveries_captain_id ON b2b_deliveries(captain_id);
CREATE INDEX idx_b2b_deliveries_from_city ON b2b_deliveries(from_city);
CREATE INDEX idx_b2b_deliveries_to_city ON b2b_deliveries(to_city);
CREATE INDEX idx_b2b_deliveries_weight ON b2b_deliveries(weight);
CREATE INDEX idx_b2b_deliveries_created_at ON b2b_deliveries(created_at);
CREATE INDEX idx_b2b_deliveries_estimated_delivery ON b2b_deliveries(estimated_delivery);
CREATE INDEX idx_b2b_deliveries_actual_delivery ON b2b_deliveries(actual_delivery);

-- Составные индексы для быстрых запросов
CREATE INDEX idx_b2b_deliveries_company_status ON b2b_deliveries(company_id, status);
CREATE INDEX idx_b2b_deliveries_captain_status ON b2b_deliveries(captain_id, status) WHERE captain_id IS NOT NULL;
CREATE INDEX idx_b2b_deliveries_route ON b2b_deliveries(from_city, to_city);

-- Добавление комментариев
COMMENT ON TABLE b2b_deliveries IS 'B2B доставки "Капитанская почта"';
COMMENT ON COLUMN b2b_deliveries.id IS 'Уникальный идентификатор доставки';
COMMENT ON COLUMN b2b_deliveries.company_id IS 'ID компании';
COMMENT ON COLUMN b2b_deliveries.tracking_number IS 'Трекинг номер';
COMMENT ON COLUMN b2b_deliveries.from_street IS 'Улица отправления';
COMMENT ON COLUMN b2b_deliveries.from_city IS 'Город отправления';
COMMENT ON COLUMN b2b_deliveries.from_postal_code IS 'Почтовый индекс отправления';
COMMENT ON COLUMN b2b_deliveries.from_country IS 'Страна отправления';
COMMENT ON COLUMN b2b_deliveries.from_latitude IS 'Широта отправления';
COMMENT ON COLUMN b2b_deliveries.from_longitude IS 'Долгота отправления';
COMMENT ON COLUMN b2b_deliveries.from_contact_person IS 'Контактное лицо отправления';
COMMENT ON COLUMN b2b_deliveries.from_contact_phone IS 'Телефон отправления';
COMMENT ON COLUMN b2b_deliveries.to_street IS 'Улица назначения';
COMMENT ON COLUMN b2b_deliveries.to_city IS 'Город назначения';
COMMENT ON COLUMN b2b_deliveries.to_postal_code IS 'Почтовый индекс назначения';
COMMENT ON COLUMN b2b_deliveries.to_country IS 'Страна назначения';
COMMENT ON COLUMN b2b_deliveries.to_latitude IS 'Широта назначения';
COMMENT ON COLUMN b2b_deliveries.to_longitude IS 'Долгота назначения';
COMMENT ON COLUMN b2b_deliveries.to_contact_person IS 'Контактное лицо назначения';
COMMENT ON COLUMN b2b_deliveries.to_contact_phone IS 'Телефон назначения';
COMMENT ON COLUMN b2b_deliveries.length IS 'Длина';
COMMENT ON COLUMN b2b_deliveries.width IS 'Ширина';
COMMENT ON COLUMN b2b_deliveries.height IS 'Высота';
COMMENT ON COLUMN b2b_deliveries.dimension_unit IS 'Единица измерения размеров';
COMMENT ON COLUMN b2b_deliveries.weight IS 'Вес';
COMMENT ON COLUMN b2b_deliveries.category IS 'Категория доставки';
COMMENT ON COLUMN b2b_deliveries.status IS 'Статус доставки';
COMMENT ON COLUMN b2b_deliveries.priority IS 'Приоритет доставки';
COMMENT ON COLUMN b2b_deliveries.delivery_cost IS 'Стоимость доставки';
COMMENT ON COLUMN b2b_deliveries.service_fee IS 'Сервисный сбор';
COMMENT ON COLUMN b2b_deliveries.insurance_amount IS 'Страховая сумма';
COMMENT ON COLUMN b2b_deliveries.declared_value IS 'Объявленная ценность';
COMMENT ON COLUMN b2b_deliveries.estimated_delivery IS 'Планируемая доставка';
COMMENT ON COLUMN b2b_deliveries.actual_delivery IS 'Фактическая доставка';
COMMENT ON COLUMN b2b_deliveries.captain_id IS 'ID капитана';
COMMENT ON COLUMN b2b_deliveries.notes IS 'Заметки';
COMMENT ON COLUMN b2b_deliveries.special_instructions IS 'Специальные инструкции';
COMMENT ON COLUMN b2b_deliveries.photos IS 'Фотографии';
COMMENT ON COLUMN b2b_deliveries.created_by IS 'Кто создал';
COMMENT ON COLUMN b2b_deliveries.confirmed_by IS 'Кто подтвердил';
COMMENT ON COLUMN b2b_deliveries.confirmed_at IS 'Когда подтверждена';
COMMENT ON COLUMN b2b_deliveries.cancelled_by IS 'Кто отменил';
COMMENT ON COLUMN b2b_deliveries.cancelled_at IS 'Когда отменена';
COMMENT ON COLUMN b2b_deliveries.cancellation_reason IS 'Причина отмены';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_b2b_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_deliveries_updated_at
    BEFORE UPDATE ON b2b_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_b2b_deliveries_updated_at();

-- Создание функции для генерации трекинг номера
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tracking_number IS NULL THEN
        NEW.tracking_number = 'TRK' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || LPAD(EXTRACT(MICROSECONDS FROM CURRENT_TIME)::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_deliveries_generate_tracking_number
    BEFORE INSERT ON b2b_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION generate_tracking_number();

-- Создание функции для отслеживания изменений статуса
CREATE OR REPLACE FUNCTION track_delivery_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Устанавливаем время подтверждения
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
        NEW.confirmed_at = CURRENT_TIMESTAMP;
        -- Рассчитываем примерное время доставки
        IF NEW.estimated_delivery IS NULL THEN
            NEW.estimated_delivery = CURRENT_TIMESTAMP + INTERVAL '3 days';
            -- Учитываем приоритет
            IF NEW.priority = 'express' THEN
                NEW.estimated_delivery = CURRENT_TIMESTAMP + INTERVAL '1 day';
            ELSIF NEW.priority = 'urgent' THEN
                NEW.estimated_delivery = CURRENT_TIMESTAMP + INTERVAL '12 hours';
            END IF;
        END IF;
    END IF;

    -- Устанавливаем время отмены
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        NEW.cancelled_at = CURRENT_TIMESTAMP;
    END IF;

    -- Устанавливаем время фактической доставки
    IF OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
        NEW.actual_delivery = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_deliveries_status_changes
    BEFORE UPDATE ON b2b_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION track_delivery_status_changes();