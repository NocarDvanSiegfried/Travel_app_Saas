-- Создание таблицы для управления мультимодальными соединениями и рисками
CREATE TABLE IF NOT EXISTS multimodal_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Точки соединения
    connection_point VARCHAR(255) NOT NULL, -- "Олёкминск, Автовокзал"
    connection_coordinates POINT NOT NULL,

    -- Сегменты соединения
    from_segment_type VARCHAR(20) NOT NULL, -- 'flight', 'bus', 'taxi', 'river'
    to_segment_type VARCHAR(20) NOT NULL, -- 'flight', 'bus', 'taxi', 'river'

    -- Временные характеристики
    min_connection_time_minutes INTEGER NOT NULL, -- Минимальное время пересадки
    recommended_connection_time_minutes INTEGER NOT NULL, -- Рекомендуемое время
    max_safe_connection_time_minutes INTEGER, -- Максимальное безопасное время

    -- Риски соединения
    connection_risk_level VARCHAR(10) DEFAULT 'medium' CHECK (connection_risk_level IN ('low', 'medium', 'high', 'critical')),
    delay_probability DECIMAL(3,2) DEFAULT 0.1, -- Вероятность задержки (0.00-1.00)
    average_delay_minutes INTEGER DEFAULT 0, -- Средняя задержка в минутах

    -- Факторы риска
    risk_factors JSONB, -- {
        -- "weather_sensitivity": 0.8, -- Чувствительность к погоде
        -- "traffic_dependent": true, -- Зависимость от трафика
        -- "seasonal_issues": ["winter", "spring_breakup"],
        -- "infrastructure_quality": "medium",
        -- "frequency_reliability": 0.9 -- Надежность расписания
    -- }

    -- Альтернативные варианты
    alternative_connections JSONB, -- [{"point": "Солнечный", "additional_time_minutes": 120, "risk_level": "low"}]

    -- Инфраструктура и удобства
    has_waiting_facilities BOOLEAN DEFAULT false,
    waiting_facilities JSONB, -- {"heated_waiting_room": true, "cafe": false, "restrooms": true}
    accessibility_support BOOLEAN DEFAULT false,

    -- Временные ограничения
    seasonal_availability JSONB, -- {"winter": "limited", "summer_breakup": "unavailable"}
    operating_hours JSONB, -- {"opens": "06:00", "closes": "22:00"}

    -- Статистика и мониторинг
    success_rate DECIMAL(3,2) DEFAULT 0.95, -- Успешность соединений
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_confidence_level VARCHAR(10) DEFAULT 'medium' CHECK (data_confidence_level IN ('low', 'medium', 'high')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для логирования реальных соединений (для анализа и улучшения)
CREATE TABLE IF NOT EXISTS connection_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID REFERENCES multimodal_connections(id) ON DELETE SET NULL,

    -- Детали конкретного соединения
    booking_id UUID, -- Ссылка на конкретное бронирование
    route_segment_from VARCHAR(255),
    route_segment_to VARCHAR(255),

    -- Временные данные
    scheduled_arrival_time TIMESTAMP WITH TIME ZONE,
    actual_arrival_time TIMESTAMP WITH TIME ZONE,
    scheduled_departure_time TIMESTAMP WITH TIME ZONE,
    actual_departure_time TIMESTAMP WITH TIME ZONE,

    -- Результаты
    connection_successful BOOLEAN NOT NULL,
    connection_time_minutes INTEGER,
    delay_minutes INTEGER DEFAULT 0,
    missed_connection BOOLEAN DEFAULT false,

    -- Причины проблем
    delay_reasons JSONB, -- [{"type": "weather", "description": "Strong winds"}]
    resolution_actions JSONB, -- [{"type": "reroute", "description": "Alternative transport provided"}]

    -- Оценка
    passenger_satisfaction INTEGER CHECK (passenger_satisfaction BETWEEN 1 AND 5),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для управления интеграцией с внешними API рисков
CREATE TABLE IF NOT EXISTS external_risk_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Информация о провайдере
    provider_name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(20) NOT NULL, -- 'weather', 'traffic', 'transport', 'infrastructure'
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT, -- Зашифрованный API ключ
    api_rate_limit INTEGER, -- Лимит запросов в час

    -- Настройки
    is_active BOOLEAN DEFAULT true,
    priority_order INTEGER DEFAULT 1, -- Порядок приоритета
    timeout_seconds INTEGER DEFAULT 30,
    retry_attempts INTEGER DEFAULT 3,

    -- Покрытие
    coverage_areas JSONB, -- [{"region": "Sakha", "cities": ["Yakutsk", "Mirny"]}]

    -- Статистика
    last_successful_call TIMESTAMP WITH TIME ZONE,
    total_api_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    average_response_time_ms INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для multimodal_connections
CREATE INDEX idx_multimodal_connections_point ON multimodal_connections(connection_point);
CREATE INDEX idx_multimodal_connections_from_type ON multimodal_connections(from_segment_type);
CREATE INDEX idx_multimodal_connections_to_type ON multimodal_connections(to_segment_type);
CREATE INDEX idx_multimodal_connections_risk_level ON multimodal_connections(connection_risk_level);
CREATE INDEX idx_multimodal_connections_coordinates ON multimodal_connections USING GIST(connection_coordinates);
CREATE INDEX idx_multimodal_connections_updated_at ON multimodal_connections(last_updated);

-- Составные индексы
CREATE INDEX idx_multimodal_connections_type_pair ON multimodal_connections(from_segment_type, to_segment_type);
CREATE INDEX idx_multimodal_connections_point_type ON multimodal_connections(connection_point, from_segment_type, to_segment_type);

-- Индексы для connection_performance_logs
CREATE INDEX idx_connection_performance_logs_connection_id ON connection_performance_logs(connection_id);
CREATE INDEX idx_connection_performance_logs_booking_id ON connection_performance_logs(booking_id);
CREATE INDEX idx_connection_performance_logs_successful ON connection_performance_logs(connection_successful);
CREATE INDEX idx_connection_performance_logs_created_at ON connection_performance_logs(created_at);

-- Индексы для external_risk_providers
CREATE INDEX idx_external_risk_providers_type ON external_risk_providers(provider_type);
CREATE INDEX idx_external_risk_providers_active ON external_risk_providers(is_active);
CREATE INDEX idx_external_risk_providers_priority ON external_risk_providers(priority_order);

-- Добавление комментариев
COMMENT ON TABLE multimodal_connections IS 'Точки мультимодальных соединений с оценкой рисков';
COMMENT ON COLUMN multimodal_connections.connection_point IS 'Точка соединения транспортных сегментов';
COMMENT ON COLUMN multimodal_connections.min_connection_time_minutes IS 'Минимальное безопасное время пересадки';
COMMENT ON COLUMN multimodal_connections.recommended_connection_time_minutes IS 'Рекомендуемое время пересадки';
COMMENT ON COLUMN multimodal_connections.connection_risk_level IS 'Уровень риска соединения';
COMMENT ON COLUMN multimodal_connections.delay_probability IS 'Вероятность задержки';
COMMENT ON COLUMN multimodal_connections.risk_factors IS 'Детальные факторы риска';
COMMENT ON COLUMN multimodal_connections.alternative_connections IS 'Альтернативные точки пересадки';
COMMENT ON COLUMN multimodal_connections.waiting_facilities IS 'Инфраструктура ожидания';

COMMENT ON TABLE connection_performance_logs IS 'Логи производительности реальных соединений';
COMMENT ON COLUMN connection_performance_logs.connection_successful IS 'Успешность соединения';
COMMENT ON COLUMN connection_performance_logs.delay_minutes IS 'Время задержки';
COMMENT ON COLUMN connection_performance_logs.missed_connection IS 'Было ли соединение пропущено';

COMMENT ON TABLE external_risk_providers IS 'Внешние поставщики данных о рисках';
COMMENT ON COLUMN external_risk_providers.provider_type IS 'Тип поставщика данных';

-- Создание триггеров
CREATE OR REPLACE FUNCTION update_multimodal_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_multimodal_connections_updated_at
    BEFORE UPDATE ON multimodal_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_multimodal_connections_updated_at();

CREATE OR REPLACE FUNCTION update_external_risk_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_external_risk_providers_updated_at
    BEFORE UPDATE ON external_risk_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_external_risk_providers_updated_at();

-- Функция для обновления статистики соединений
CREATE OR REPLACE FUNCTION update_connection_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем статистику для точки соединения
    UPDATE multimodal_connections
    SET
        success_rate = (
            SELECT CASE
                WHEN COUNT(*) = 0 THEN 0.95
                ELSE ROUND(
                    SUM(CASE WHEN connection_successful = true THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)::DECIMAL, 2
                )
            END
            FROM connection_performance_logs
            WHERE connection_id = NEW.connection_id
              AND created_at > CURRENT_DATE - INTERVAL '90 days'
        ),
        last_updated = CURRENT_TIMESTAMP
    WHERE id = NEW.connection_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_connection_statistics
    AFTER INSERT ON connection_performance_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_connection_statistics();

-- Функция для анализа риска соединения в реальном времени
CREATE OR REPLACE FUNCTION analyze_connection_risk(
    p_connection_id UUID,
    p_planned_time TIMESTAMP WITH TIME ZONE,
    p_weather_forecast JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    risk_analysis JSONB;
    connection_record multimodal_connections%ROWTYPE;
    base_risk_score DECIMAL := 0.0;
BEGIN
    -- Получаем данные о соединении
    SELECT * INTO connection_record
    FROM multimodal_connections
    WHERE id = p_connection_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Connection not found');
    END IF;

    -- Базовый риск на основе historical data
    base_risk_score := CASE connection_record.connection_risk_level
        WHEN 'low' THEN 0.1
        WHEN 'medium' THEN 0.3
        WHEN 'high' THEN 0.6
        WHEN 'critical' THEN 0.9
        ELSE 0.3
    END;

    -- Учитываем вероятность задержки
    base_risk_score := base_risk_score + (connection_record.delay_probability * 0.5);

    -- Анализ погодных условий
    IF p_weather_forecast IS NOT NULL THEN
        -- Добавляем логику анализа погоды
        base_risk_score := base_risk_score + 0.2; -- Placeholder
    END IF;

    risk_analysis := jsonb_build_object(
        'risk_score', LEAST(1.0, base_risk_score),
        'risk_level', CASE
            WHEN base_risk_score < 0.3 THEN 'low'
            WHEN base_risk_score < 0.6 THEN 'medium'
            WHEN base_risk_score < 0.8 THEN 'high'
            ELSE 'critical'
        END,
        'recommended_buffer_minutes', connection_record.recommended_connection_time_minutes,
        'min_safe_time_minutes', connection_record.min_connection_time_minutes,
        'delay_probability', connection_record.delay_probability,
        'success_rate', connection_record.success_rate,
        'has_alternatives', jsonb_array_length(connection_record.alternative_connections) > 0
    );

    RETURN risk_analysis;
END;
$$ LANGUAGE plpgsql;

-- Создание представлений для удобного доступа
CREATE VIEW high_risk_connections AS
SELECT *
FROM multimodal_connections
WHERE connection_risk_level IN ('high', 'critical')
  OR delay_probability > 0.3
ORDER BY delay_probability DESC, connection_risk_level DESC;

COMMENT ON VIEW high_risk_connections IS 'Точки соединений с высоким риском';

CREATE VIEW connection_performance_summary AS
SELECT
    mc.connection_point,
    mc.from_segment_type,
    mc.to_segment_type,
    mc.connection_risk_level,
    COUNT(cpl.id) as total_connections,
    SUM(CASE WHEN cpl.connection_successful = true THEN 1 ELSE 0 END) as successful_connections,
    ROUND(AVG(cpl.delay_minutes), 1) as average_delay,
    SUM(CASE WHEN cpl.missed_connection = true THEN 1 ELSE 0 END) as missed_connections,
    MAX(cpl.created_at) as last_connection
FROM multimodal_connections mc
LEFT JOIN connection_performance_logs cpl ON mc.id = cpl.connection_id
GROUP BY mc.id, mc.connection_point, mc.from_segment_type, mc.to_segment_type, mc.connection_risk_level
ORDER BY missed_connections DESC, average_delay DESC;

COMMENT ON VIEW connection_performance_summary IS 'Сводка производительности соединений';

-- Вставка базовых данных для соединений в Якутии
INSERT INTO multimodal_connections (
    connection_point,
    connection_coordinates,
    from_segment_type,
    to_segment_type,
    min_connection_time_minutes,
    recommended_connection_time_minutes,
    max_safe_connection_time_minutes,
    connection_risk_level,
    delay_probability,
    average_delay_minutes,
    risk_factors,
    has_waiting_facilities,
    waiting_facilities,
    accessibility_support
) VALUES
-- Олёкминск: Пересадка с рейса на автобус
('Олёкминск, Автовокзал', ST_MakePoint(120.4144, 60.3833), 'flight', 'bus', 30, 60, 180, 'medium', 0.15, 15,
 '{"weather_sensitivity": 0.6, "traffic_dependent": false, "seasonal_issues": ["winter"], "infrastructure_quality": "medium", "frequency_reliability": 0.8}',
 true, '{"heated_waiting_room": true, "cafe": true, "restrooms": true}', true),

-- Мирный: Пересадка с автобуса на вертолет
('Мирный, Вертолетная площадка', ST_MakePoint(113.9391, 62.5336), 'bus', 'helicopter', 45, 75, 240, 'high', 0.25, 30,
 '{"weather_sensitivity": 0.9, "traffic_dependent": false, "seasonal_issues": ["winter", "summer_breakup"], "infrastructure_quality": "low", "frequency_reliability": 0.6}',
 false, '{}', false),

-- Ленск: Пересадка с речного транспорта на автомобиль
('Ленск, Речной порт', ST_MakePoint(114.4157, 60.7267), 'river', 'taxi', 20, 40, 120, 'medium', 0.2, 25,
 '{"weather_sensitivity": 0.4, "traffic_dependent": true, "seasonal_issues": ["winter"], "infrastructure_quality": "medium", "frequency_reliability": 0.7}',
 true, '{"heated_waiting_room": true, "cafe": false, "restrooms": true}', true),

-- Якутск: Пересадка в аэропорту Туран
('Якутск, Аэропорт Туран', ST_MakePoint(129.7750, 62.0833), 'flight', 'taxi', 15, 30, 90, 'low', 0.1, 10,
 '{"weather_sensitivity": 0.7, "traffic_dependent": true, "seasonal_issues": ["winter"], "infrastructure_quality": "high", "frequency_reliability": 0.9}',
 true, '{"heated_waiting_room": true, "cafe": true, "restrooms": true}', true);