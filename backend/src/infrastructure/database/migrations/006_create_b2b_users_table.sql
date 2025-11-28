-- Создание таблицы B2B пользователей
CREATE TABLE IF NOT EXISTS b2b_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'company_admin', 'department_manager', 'employee', 'captain')),
    department VARCHAR(100),
    position VARCHAR(100),
    manager_id UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE UNIQUE INDEX idx_b2b_users_email ON b2b_users(email) WHERE is_active = true;
CREATE INDEX idx_b2b_users_company_id ON b2b_users(company_id);
CREATE INDEX idx_b2b_users_role ON b2b_users(role);
CREATE INDEX idx_b2b_users_department ON b2b_users(department);
CREATE INDEX idx_b2b_users_manager_id ON b2b_users(manager_id);
CREATE INDEX idx_b2b_users_is_active ON b2b_users(is_active);
CREATE INDEX idx_b2b_users_last_login_at ON b2b_users(last_login_at);

-- Добавление комментариев
COMMENT ON TABLE b2b_users IS 'Пользователи B2B платформы';
COMMENT ON COLUMN b2b_users.id IS 'Уникальный идентификатор пользователя';
COMMENT ON COLUMN b2b_users.company_id IS 'ID компании';
COMMENT ON COLUMN b2b_users.email IS 'Email пользователя';
COMMENT ON COLUMN b2b_users.password_hash IS 'Хеш пароля';
COMMENT ON COLUMN b2b_users.full_name IS 'Полное имя пользователя';
COMMENT ON COLUMN b2b_users.phone IS 'Телефон пользователя';
COMMENT ON COLUMN b2b_users.avatar_url IS 'URL аватара';
COMMENT ON COLUMN b2b_users.role IS 'Роль в системе';
COMMENT ON COLUMN b2b_users.department IS 'Отдел';
COMMENT ON COLUMN b2b_users.position IS 'Должность';
COMMENT ON COLUMN b2b_users.manager_id IS 'ID руководителя';
COMMENT ON COLUMN b2b_users.is_active IS 'Активен ли пользователь';
COMMENT ON COLUMN b2b_users.email_verified IS 'Подтвержден ли email';
COMMENT ON COLUMN b2b_users.email_verification_token IS 'Токен верификации email';
COMMENT ON COLUMN b2b_users.password_reset_token IS 'Токен сброса пароля';
COMMENT ON COLUMN b2b_users.password_reset_expires_at IS 'Срок действия токена сброса пароля';
COMMENT ON COLUMN b2b_users.last_login_at IS 'Время последнего входа';
COMMENT ON COLUMN b2b_users.login_attempts IS 'Количество неудачных попыток входа';
COMMENT ON COLUMN b2b_users.locked_until IS 'Аккаунт заблокирован до';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_b2b_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_users_updated_at
    BEFORE UPDATE ON b2b_users
    FOR EACH ROW
    EXECUTE FUNCTION update_b2b_users_updated_at();

-- Создание функции для проверки иерархии менеджеров
CREATE OR REPLACE FUNCTION check_manager_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем, что менеджер не является подчиненным текущего пользователя
    IF NEW.manager_id IS NOT NULL THEN
        WITH RECURSIVE subordinates AS (
            SELECT id FROM b2b_users WHERE id = NEW.id
            UNION ALL
            SELECT u.id FROM b2b_users u
            INNER JOIN subordinates s ON u.manager_id = s.id
        )
        SELECT 1 FROM subordinates WHERE id = NEW.manager_id;

        IF FOUND THEN
            RAISE EXCEPTION 'Менеджер не может быть подчиненным текущего пользователя';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_b2b_users_check_manager_hierarchy
    BEFORE INSERT OR UPDATE ON b2b_users
    FOR EACH ROW
    EXECUTE FUNCTION check_manager_hierarchy();