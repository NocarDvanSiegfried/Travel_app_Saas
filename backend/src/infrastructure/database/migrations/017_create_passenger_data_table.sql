-- Создание таблицы централизованной базы пассажиров
CREATE TABLE IF NOT EXISTS passenger_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES b2b_users(id) ON DELETE SET NULL, -- Связь с пользователем если он есть в системе

    -- Основные данные (не шифрованные)
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    full_name_generated VARCHAR(301) GENERATED ALWAYS AS (
        COALESCE(last_name, '') || ' ' ||
        COALESCE(first_name, '') ||
        CASE WHEN COALESCE(middle_name, '') != '' THEN ' ' || COALESCE(middle_name, '') ELSE '' END
    ) STORED,

    -- Дата рождения (не шифрованная для валидации возраста льгот)
    birth_date DATE NOT NULL,

    -- Зашифрованные паспортные данные (PII)
    encrypted_passport_series VARCHAR(255), -- Зашифрованная серия паспорта
    encrypted_passport_number VARCHAR(255), -- Зашифрованный номер паспорта
    encrypted_passport_issue_date VARCHAR(255), -- Зашифрованная дата выдачи
    encrypted_passport_issuing_authority VARCHAR(500), -- Зашифрованный орган выдачи
    encrypted_passport_full_data TEXT, -- Зашифрованный полный текст паспорта

    -- Контактная информация (зашифрованная)
    encrypted_phone VARCHAR(255),
    encrypted_email VARCHAR(255),

    -- Льготы и субсидии
    has_benefits BOOLEAN DEFAULT false,
    benefit_type VARCHAR(50), -- 'veteran', 'disabled', 'student', 'pensioner', 'subsidized'
    benefit_certificate_number VARCHAR(100), -- Номер сертификата/удостоверения
    benefit_expiry_date DATE, -- Срок действия льгот
    benefit_verified BOOLEAN DEFAULT false,
    benefit_verification_date TIMESTAMP WITH TIME ZONE,

    -- Категории для тарификации
    passenger_category VARCHAR(20) DEFAULT 'adult' CHECK (passenger_category IN ('adult', 'child', 'student', 'senior', 'disabled')),

    -- Статус и привилегии
    is_vip BOOLEAN DEFAULT false,
    is_company_manager BOOLEAN DEFAULT false,
    requires_special_assistance BOOLEAN DEFAULT false,
    special_assistance_notes TEXT,

    -- Департамент и структура компании
    department VARCHAR(100),
    position VARCHAR(100),
    cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,

    -- Метаданные
    data_source VARCHAR(20) DEFAULT 'manual' CHECK (data_source IN ('manual', 'csv_import', 'hr_integration')),
    import_batch_id UUID,
    last_verified_date TIMESTAMP WITH TIME ZONE,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),

    -- Аудит и безопасность
    created_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Уникальность: один человек не может быть дважды в одной компании
    CONSTRAINT unique_passenger_per_company UNIQUE (company_id, encrypted_passport_full_data)
);

-- Создание индексов
CREATE INDEX idx_passenger_data_company_id ON passenger_data(company_id);
CREATE INDEX idx_passenger_data_employee_id ON passenger_data(employee_id);
CREATE INDEX idx_passenger_data_full_name ON passenger_data(full_name_generated);
CREATE INDEX idx_passenger_data_benefit_type ON passenger_data(benefit_type);
CREATE INDEX idx_passenger_data_benefit_verified ON passenger_data(benefit_verified);
CREATE INDEX idx_passenger_data_passenger_category ON passenger_data(passenger_category);
CREATE INDEX idx_passenger_data_department ON passenger_data(department);
CREATE INDEX idx_passenger_data_cost_center_id ON passenger_data(cost_center_id);
CREATE INDEX idx_passenger_data_verification_status ON passenger_data(verification_status);
CREATE INDEX idx_passenger_data_created_at ON passenger_data(created_at);
CREATE INDEX idx_passenger_data_birth_date ON passenger_data(birth_date);

-- Составные индексы для основных запросов
CREATE INDEX idx_passenger_data_company_benefits ON passenger_data(company_id, has_benefits, benefit_verified);
CREATE INDEX idx_passenger_data_company_category ON passenger_data(company_id, passenger_category);
CREATE INDEX idx_passenger_data_department_category ON passenger_data(company_id, department, passenger_category);

-- Добавление комментариев
COMMENT ON TABLE passenger_data IS 'Централизованная база данных пассажиров корпоративных клиентов';
COMMENT ON COLUMN passenger_data.id IS 'Уникальный идентификатор записи пассажира';
COMMENT ON COLUMN passenger_data.company_id IS 'ID компании-владельца';
COMMENT ON COLUMN passenger_data.employee_id IS 'ID сотрудника если он зарегистрирован в B2B портале';
COMMENT ON COLUMN passenger_data.last_name IS 'Фамилия пассажира';
COMMENT ON COLUMN passenger_data.first_name IS 'Имя пассажира';
COMMENT ON COLUMN passenger_data.middle_name IS 'Отчество пассажира';
COMMENT ON COLUMN passenger_data.full_name_generated IS 'Автоматически генерируемое ФИО';
COMMENT ON COLUMN passenger_data.birth_date IS 'Дата рождения (не шифрованная для валидации)';
COMMENT ON COLUMN passenger_data.encrypted_passport_series IS 'Зашифрованная серия паспорта';
COMMENT ON COLUMN passenger_data.encrypted_passport_number IS 'Зашифрованный номер паспорта';
COMMENT ON COLUMN passenger_data.encrypted_passport_issue_date IS 'Зашифрованная дата выдачи паспорта';
COMMENT ON COLUMN passenger_data.encrypted_passport_issuing_authority IS 'Зашифрованный орган выдачи паспорта';
COMMENT ON COLUMN passenger_data.encrypted_passport_full_data IS 'Полные паспортные данные в зашифрованном виде';
COMMENT ON COLUMN passenger_data.encrypted_phone IS 'Зашифрованный телефон';
COMMENT ON COLUMN passenger_data.encrypted_email IS 'Зашифрованный email';
COMMENT ON COLUMN passenger_data.has_benefits IS 'Наличие льготного статуса';
COMMENT ON COLUMN passenger_data.benefit_type IS 'Тип льготы';
COMMENT ON COLUMN passenger_data.benefit_certificate_number IS 'Номер удостоверения/сертификата';
COMMENT ON COLUMN passenger_data.benefit_expiry_date IS 'Срок действия льгот';
COMMENT ON COLUMN passenger_data.benefit_verified IS 'Подтверждены ли льготы';
COMMENT ON COLUMN passenger_data.benefit_verification_date IS 'Дата верификации льгот';
COMMENT ON COLUMN passenger_data.passenger_category IS 'Категория для тарификации';
COMMENT ON COLUMN passenger_data.is_vip IS 'VIP статус пассажира';
COMMENT ON COLUMN passenger_data.is_company_manager IS 'Является ли менеджером компании';
COMMENT ON COLUMN passenger_data.requires_special_assistance IS 'Требуется ли специальная помощь';
COMMENT ON COLUMN passenger_data.special_assistance_notes IS 'Заметки о специальной помощи';
COMMENT ON COLUMN passenger_data.department IS 'Департамент компании';
COMMENT ON COLUMN passenger_data.position IS 'Должность';
COMMENT ON COLUMN passenger_data.cost_center_id IS 'Центр затрат';
COMMENT ON COLUMN passenger_data.data_source IS 'Источник данных';
COMMENT ON COLUMN passenger_data.import_batch_id IS 'ID пакета импорта';
COMMENT ON COLUMN passenger_data.last_verified_date IS 'Последняя дата верификации данных';
COMMENT ON COLUMN passenger_data.verification_status IS 'Статус верификации';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_passenger_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_passenger_data_updated_at
    BEFORE UPDATE ON passenger_data
    FOR EACH ROW
    EXECUTE FUNCTION update_passenger_data_updated_at();

-- Функция для автоматической категории пассажира на основе возраста
CREATE OR REPLACE FUNCTION determine_passenger_category()
RETURNS TRIGGER AS $$
DECLARE
    age_years INTEGER;
BEGIN
    -- Вычисляем возраст
    age_years := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.birth_date));

    -- Определяем категорию
    IF age_years < 12 THEN
        NEW.passenger_category := 'child';
    ELSIF age_years >= 60 THEN
        NEW.passenger_category := 'senior';
    ELSIF NEW.benefit_type = 'student' AND age_years BETWEEN 18 AND 25 THEN
        NEW.passenger_category := 'student';
    ELSIF NEW.benefit_type = 'disabled' THEN
        NEW.passenger_category := 'disabled';
    ELSE
        NEW.passenger_category := 'adult';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_determine_passenger_category
    BEFORE INSERT OR UPDATE ON passenger_data
    FOR EACH ROW
    EXECUTE FUNCTION determine_passenger_category();

-- Функция для проверки срока действия льгот
CREATE OR REPLACE FUNCTION check_benefits_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Отзываем просроченные льготы
    IF NEW.benefit_expiry_date IS NOT NULL
       AND NEW.benefit_expiry_date < CURRENT_DATE
       AND NEW.benefit_verified = true THEN
        NEW.benefit_verified := false;
        NEW.verification_status := 'expired';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_check_benefits_expiry
    BEFORE UPDATE ON passenger_data
    FOR EACH ROW
    EXECUTE FUNCTION check_benefits_expiry();

-- Создание представления для безопасного доступа (без зашифрованных данных)
CREATE VIEW passenger_data_safe AS
SELECT
    id,
    company_id,
    employee_id,
    last_name,
    first_name,
    middle_name,
    full_name_generated,
    birth_date,
    has_benefits,
    benefit_type,
    benefit_certificate_number,
    benefit_expiry_date,
    benefit_verified,
    benefit_verification_date,
    passenger_category,
    is_vip,
    is_company_manager,
    requires_special_assistance,
    department,
    position,
    cost_center_id,
    data_source,
    verification_status,
    created_at,
    updated_at
FROM passenger_data;

COMMENT ON VIEW passenger_data_safe IS 'Безопасное представление пассажирских данных без персональной информации';