-- Создание таблицы B2B компаний
CREATE TABLE IF NOT EXISTS b2b_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(12) NOT NULL UNIQUE,
    kpp VARCHAR(9),
    ogrn VARCHAR(15) NOT NULL UNIQUE,
    legal_address TEXT NOT NULL,
    bank_bik VARCHAR(9),
    bank_account_number VARCHAR(20),
    bank_name VARCHAR(255),
    industry VARCHAR(100) NOT NULL,
    size VARCHAR(20) NOT NULL CHECK (size IN ('small', 'medium', 'large', 'enterprise')),
    subscription_type VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (subscription_type IN ('basic', 'professional', 'enterprise')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX idx_b2b_companies_inn ON b2b_companies(inn);
CREATE INDEX idx_b2b_companies_ogrn ON b2b_companies(ogrn);
CREATE INDEX idx_b2b_companies_industry ON b2b_companies(industry);
CREATE INDEX idx_b2b_companies_size ON b2b_companies(size);
CREATE INDEX idx_b2b_companies_subscription_type ON b2b_companies(subscription_type);
CREATE INDEX idx_b2b_companies_is_active ON b2b_companies(is_active);

-- Добавление комментариев
COMMENT ON TABLE b2b_companies IS 'B2B компании-клиенты';
COMMENT ON COLUMN b2b_companies.id IS 'Уникальный идентификатор компании';
COMMENT ON COLUMN b2b_companies.name IS 'Название компании';
COMMENT ON COLUMN b2b_companies.inn IS 'ИНН компании';
COMMENT ON COLUMN b2b_companies.kpp IS 'КПП компании';
COMMENT ON COLUMN b2b_companies.ogrn IS 'ОГРН компании';
COMMENT ON COLUMN b2b_companies.legal_address IS 'Юридический адрес';
COMMENT ON COLUMN b2b_companies.bank_bik IS 'БИК банка';
COMMENT ON COLUMN b2b_companies.bank_account_number IS 'Расчетный счет';
COMMENT ON COLUMN b2b_companies.bank_name IS 'Название банка';
COMMENT ON COLUMN b2b_companies.industry IS 'Отрасль компании';
COMMENT ON COLUMN b2b_companies.size IS 'Размер компании';
COMMENT ON COLUMN b2b_companies.subscription_type IS 'Тип подписки';
COMMENT ON COLUMN b2b_companies.is_active IS 'Активна ли компания';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_b2b_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_companies_updated_at
    BEFORE UPDATE ON b2b_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_b2b_companies_updated_at();