-- Создание таблицы шаблонов маршрутов для часто используемых поездок
CREATE TABLE IF NOT EXISTS route_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,

    -- Основные данные шаблона
    template_name VARCHAR(255) NOT NULL,
    template_description TEXT,
    template_type VARCHAR(20) NOT NULL DEFAULT 'multimodal' CHECK (template_type IN ('single', 'multimodal', 'round_trip')),

    -- Точки маршрута
    origin_point VARCHAR(255) NOT NULL, -- "Якутск, Аэропорт Туран"
    origin_coordinates POINT, -- Географические координаты для точности
    destination_point VARCHAR(255) NOT NULL, -- "Мирный, Городской центр"
    destination_coordinates POINT,

    -- Транспортные характеристики
    transport_types VARCHAR(50)[] NOT NULL, -- ['flight', 'bus', 'taxi', 'river']
    estimated_duration_minutes INTEGER NOT NULL,
    estimated_distance_km DECIMAL(8,2),

    -- Информация о пересадках
    has_transfers BOOLEAN DEFAULT false,
    transfer_points JSONB, -- [{"name": "Олёкминск", "wait_time_minutes": 45, "transfer_type": "bus_to_taxi"}]

    -- Риски и надежность
    risk_level VARCHAR(10) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    risk_factors JSONB, -- {"weather_dependency": true, "seasonal": true, "road_quality": "medium"}

    -- Ограничения и требования
    max_passengers INTEGER DEFAULT 50,
    min_passengers INTEGER DEFAULT 1,
    accessibility_support BOOLEAN DEFAULT false,
    special_requirements JSONB, -- {"winter_equipment": true, "medical_support": false}

    -- Расписание и доступность
    is_seasonal BOOLEAN DEFAULT false,
    season_months INTEGER[], -- [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    operating_days VARCHAR(20)[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    departure_time_constraints JSONB, -- {"earliest": "06:00", "latest": "18:00", "preferred": ["08:00", "14:00"]}

    -- Ценообразование
    base_price DECIMAL(10,2),
    price_currency VARCHAR(3) DEFAULT 'RUB',
    price_variations JSONB, -- {"weekend_surcharge": 1.2, "seasonal_surcharge": 1.15}
    corporate_discount_available BOOLEAN DEFAULT true,

    -- Шаблонные сегменты маршрута (детализация)
    route_segments JSONB NOT NULL, -- Массив сегментов с детальной информацией

    -- Альтернативные варианты
    alternative_templates JSONB, -- [{"template_id": "uuid", "description": "Более дешевый вариант", "price_difference": "+15%"}]

    -- Популярность и использование
    usage_count INTEGER DEFAULT 0,
    popularity_score DECIMAL(3,2) DEFAULT 0.0, -- 0.00 до 10.00
    last_used_date TIMESTAMP WITH TIME ZONE,

    -- Статус и валидация
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_notes TEXT,

    -- Компания и настройки
    is_public_template BOOLEAN DEFAULT false, -- Доступно ли для других компаний
    template_category VARCHAR(30) DEFAULT 'business', -- 'business', 'training', 'field_work', 'emergency'

    -- Интеграция с поставщиками
    external_provider_references JSONB, -- {"flight_provider": "S7", "bus_company": "ЯкутАвтоТранс"}

    -- Мультимодальные настройки
    multimodal_settings JSONB, -- {
        -- "auto_booking": true,
        -- "connection_buffer_minutes": 60,
        -- "transfer_insurance": true,
        -- "real_time_tracking": false
    -- }

    -- Метаданные
    created_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Уникальность: один шаблон не может дублироваться в рамках компании
    CONSTRAINT unique_route_template_per_company UNIQUE (company_id, origin_point, destination_point, template_type)
);

-- Создание таблицы связок шаблонов с корпоративными событиями
CREATE TABLE IF NOT EXISTS template_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES route_templates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,

    -- Детали конкретной поездки по шаблону
    booking_name VARCHAR(255),
    departure_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE, -- для round_trip

    -- Пассажиры
    passenger_data_ids UUID[] NOT NULL, -- Массив ID из passenger_data
    passenger_count INTEGER NOT NULL,

    -- Финансовые данные
    calculated_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB',
    discount_applied DECIMAL(5,2) DEFAULT 0.00,
    final_price DECIMAL(10,2) NOT NULL,

    -- Статус бронирования
    booking_status VARCHAR(20) DEFAULT 'draft' CHECK (booking_status IN (
        'draft', 'pending_approval', 'approved', 'confirmed', 'cancelled', 'completed'
    )),

    -- Логистика
    assigned_vehicles JSONB, -- [{"type": "bus", "capacity": 45, "vehicle_number": "А123ВС"}]
    meeting_points JSONB, -- [{"location": "Офис компании", "time": "07:30", "address": "..."}]

    -- Дополнительные услуги
    additional_services JSONB, -- [{"name": "Страховка", "price": 500}, {"name": "Питание", "price": 300}]

    -- Аудит
    booked_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для route_templates
CREATE INDEX idx_route_templates_company_id ON route_templates(company_id);
CREATE INDEX idx_route_templates_origin_point ON route_templates(origin_point);
CREATE INDEX idx_route_templates_destination_point ON route_templates(destination_point);
CREATE INDEX idx_route_templates_template_type ON route_templates(template_type);
CREATE INDEX idx_route_templates_transport_types ON route_templates USING GIN(transport_types);
CREATE INDEX idx_route_templates_risk_level ON route_templates(risk_level);
CREATE INDEX idx_route_templates_is_active ON route_templates(is_active);
CREATE INDEX idx_route_templates_popularity_score ON route_templates(popularity_score DESC);
CREATE INDEX idx_route_templates_usage_count ON route_templates(usage_count DESC);
CREATE INDEX idx_route_templates_is_public_template ON route_templates(is_public_template);
CREATE INDEX idx_route_templates_created_at ON route_templates(created_at);

-- Пространственные индексы для географических запросов
CREATE INDEX idx_route_templates_origin_coordinates ON route_templates USING GIST(origin_coordinates);
CREATE INDEX idx_route_templates_destination_coordinates ON route_templates USING GIST(destination_coordinates);

-- Составные индексы для основных запросов
CREATE INDEX idx_route_templates_company_active ON route_templates(company_id, is_active);
CREATE INDEX idx_route_templates_company_type ON route_templates(company_id, template_type, is_active);
CREATE INDEX idx_route_templates_origin_destination ON route_templates(origin_point, destination_point);

-- Индексы для template_bookings
CREATE INDEX idx_template_bookings_template_id ON template_bookings(template_id);
CREATE INDEX idx_template_bookings_company_id ON template_bookings(company_id);
CREATE INDEX idx_template_bookings_departure_date ON template_bookings(departure_date);
CREATE INDEX idx_template_bookings_status ON template_bookings(booking_status);
CREATE INDEX idx_template_bookings_booked_by ON template_bookings(booked_by);
CREATE INDEX idx_template_bookings_created_at ON template_bookings(created_at);

-- Составные индексы для template_bookings
CREATE INDEX idx_template_bookings_company_date ON template_bookings(company_id, departure_date);
CREATE INDEX idx_template_bookings_template_date ON template_bookings(template_id, departure_date);

-- Добавление комментариев для route_templates
COMMENT ON TABLE route_templates IS 'Шаблоны маршрутов для часто используемых корпоративных поездок';
COMMENT ON COLUMN route_templates.id IS 'Уникальный идентификатор шаблона';
COMMENT ON COLUMN route_templates.company_id IS 'ID компании-владельца шаблона';
COMMENT ON COLUMN route_templates.template_name IS 'Название шаблона';
COMMENT ON COLUMN route_templates.template_description IS 'Описание шаблона';
COMMENT ON COLUMN route_templates.template_type IS 'Тип шаблона';
COMMENT ON COLUMN route_templates.origin_point IS 'Точка отправления';
COMMENT ON COLUMN route_templates.origin_coordinates IS 'Координаты точки отправления';
COMMENT ON COLUMN route_templates.destination_point IS 'Точка назначения';
COMMENT ON COLUMN route_templates.destination_coordinates IS 'Координаты точки назначения';
COMMENT ON COLUMN route_templates.transport_types IS 'Типы транспорта в маршруте';
COMMENT ON COLUMN route_templates.estimated_duration_minutes IS 'Расчетное время в минутах';
COMMENT ON COLUMN route_templates.estimated_distance_km IS 'Расчетное расстояние в км';
COMMENT ON COLUMN route_templates.has_transfers IS 'Наличие пересадок';
COMMENT ON COLUMN route_templates.transfer_points IS 'Детали пересадок';
COMMENT ON COLUMN route_templates.risk_level IS 'Уровень риска маршрута';
COMMENT ON COLUMN route_templates.risk_factors IS 'Факторы риска';
COMMENT ON COLUMN route_templates.max_passengers IS 'Максимальное количество пассажиров';
COMMENT ON COLUMN route_templates.min_passengers IS 'Минимальное количество пассажиров';
COMMENT ON COLUMN route_templates.accessibility_support IS 'Поддержка доступности';
COMMENT ON COLUMN route_templates.special_requirements IS 'Специальные требования';
COMMENT ON COLUMN route_templates.is_seasonal IS 'Сезонность маршрута';
COMMENT ON COLUMN route_templates.season_months IS 'Активные месяцы';
COMMENT ON COLUMN route_templates.operating_days IS 'Дни работы';
COMMENT ON COLUMN route_templates.departure_time_constraints IS 'Ограничения по времени отправления';
COMMENT ON COLUMN route_templates.base_price IS 'Базовая цена';
COMMENT ON COLUMN route_templates.price_currency IS 'Валюта цены';
COMMENT ON COLUMN route_templates.price_variations IS 'Вариации цены';
COMMENT ON COLUMN route_templates.corporate_discount_available IS 'Доступность корпоративной скидки';
COMMENT ON COLUMN route_templates.route_segments IS 'Детализация сегментов маршрута';
COMMENT ON COLUMN route_templates.alternative_templates IS 'Альтернативные варианты';
COMMENT ON COLUMN route_templates.usage_count IS 'Количество использований';
COMMENT ON COLUMN route_templates.popularity_score IS 'Популярность шаблона';
COMMENT ON COLUMN route_templates.last_used_date IS 'Дата последнего использования';
COMMENT ON COLUMN route_templates.is_active IS 'Активность шаблона';
COMMENT ON COLUMN route_templates.is_verified IS 'Верификация шаблона';
COMMENT ON COLUMN route_templates.is_public_template IS 'Публичный доступ к шаблону';
COMMENT ON COLUMN route_templates.template_category IS 'Категория шаблона';
COMMENT ON COLUMN route_templates.external_provider_references IS 'Ссылки на внешних поставщиков';
COMMENT ON COLUMN route_templates.multimodal_settings IS 'Настройки мультимодальности';

-- Комментарии для template_bookings
COMMENT ON TABLE template_bookings IS 'Бронирования по шаблонам маршрутов';
COMMENT ON COLUMN template_bookings.template_id IS 'ID используемого шаблона';
COMMENT ON COLUMN template_bookings.passenger_data_ids IS 'Массив ID пассажиров';
COMMENT ON COLUMN template_bookings.calculated_price IS 'Расчетная стоимость';
COMMENT ON COLUMN template_bookings.discount_applied IS 'Примененная скидка';
COMMENT ON COLUMN template_bookings.final_price IS 'Финальная стоимость';
COMMENT ON COLUMN template_bookings.booking_status IS 'Статус бронирования';
COMMENT ON COLUMN template_bookings.assigned_vehicles IS 'Назначенный транспорт';
COMMENT ON COLUMN template_bookings.meeting_points IS 'Точки сбора';
COMMENT ON COLUMN template_bookings.additional_services IS 'Дополнительные услуги';

-- Создание триггеров для обновления timestamps
CREATE OR REPLACE FUNCTION update_route_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_route_templates_updated_at
    BEFORE UPDATE ON route_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_route_templates_updated_at();

CREATE OR REPLACE FUNCTION update_template_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_template_bookings_updated_at
    BEFORE UPDATE ON template_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_template_bookings_updated_at();

-- Функция для автоматического обновления популярности шаблона
CREATE OR REPLACE FUNCTION update_template_popularity()
RETURNS TRIGGER AS $$
BEGIN
    -- Увеличиваем счетчик использования
    UPDATE route_templates
    SET
        usage_count = usage_count + 1,
        last_used_date = CURRENT_TIMESTAMP,
        popularity_score = GREATEST(10.0, LEAST(0.0,
            -- Расчет популярности: базовый балл + частота использования + недавность
            5.0 + (usage_count * 0.1) +
            CASE WHEN last_used_date > CURRENT_DATE - INTERVAL '30 days' THEN 3.0
                 WHEN last_used_date > CURRENT_DATE - INTERVAL '90 days' THEN 1.5
                 ELSE 0.0 END
        ))
    WHERE id = NEW.template_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_template_popularity
    AFTER INSERT ON template_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_template_popularity();

-- Создание представления для быстрого поиска шаблонов
CREATE VIEW route_templates_search AS
SELECT
    rt.*,
    COUNT(tb.id) as total_bookings,
    MAX(tb.departure_date) as last_booking_date
FROM route_templates rt
LEFT JOIN template_bookings tb ON rt.id = tb.template_id
WHERE rt.is_active = true
GROUP BY rt.id, rt.company_id, rt.template_name, rt.template_description, rt.template_type,
         rt.origin_point, rt.origin_coordinates, rt.destination_point, rt.destination_coordinates,
         rt.transport_types, rt.estimated_duration_minutes, rt.estimated_distance_km,
         rt.has_transfers, rt.transfer_points, rt.risk_level, rt.risk_factors,
         rt.max_passengers, rt.min_passengers, rt.accessibility_support, rt.special_requirements,
         rt.is_seasonal, rt.season_months, rt.operating_days, rt.departure_time_constraints,
         rt.base_price, rt.price_currency, rt.price_variations, rt.corporate_discount_available,
         rt.route_segments, rt.alternative_templates, rt.usage_count, rt.popularity_score,
         rt.last_used_date, rt.is_active, rt.is_verified, rt.verification_notes,
         rt.is_public_template, rt.template_category, rt.external_provider_references,
         rt.multimodal_settings, rt.created_by, rt.updated_by, rt.created_at, rt.updated_at;

COMMENT ON VIEW route_templates_search IS 'Представление для быстрого поиска и анализа шаблонов маршрутов';