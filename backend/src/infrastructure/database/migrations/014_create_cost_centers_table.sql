-- Создание таблицы центров затрат (Cost Centers)
CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES b2b_companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    parent_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES b2b_users(id) ON DELETE SET NULL,
    budget_limit DECIMAL(15,2) DEFAULT 0.00,
    current_spend DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    period_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    period_start_date DATE,
    period_end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Уникальность кода в рамках компании
    CONSTRAINT unique_cost_center_code UNIQUE (company_id, code)
);

-- Создание индексов
CREATE INDEX idx_cost_centers_company_id ON cost_centers(company_id);
CREATE INDEX idx_cost_centers_parent_id ON cost_centers(parent_center_id);
CREATE INDEX idx_cost_centers_manager_id ON cost_centers(manager_id);
CREATE INDEX idx_cost_centers_code ON cost_centers(code);
CREATE INDEX idx_cost_centers_active ON cost_centers(is_active);
CREATE INDEX idx_cost_centers_hierarchy ON cost_centers(company_id, parent_center_id, is_active);

-- Добавление комментариев
COMMENT ON TABLE cost_centers IS 'Центры затрат для корпоративных клиентов';
COMMENT ON COLUMN cost_centers.id IS 'Уникальный идентификатор центра затрат';
COMMENT ON COLUMN cost_centers.company_id IS 'ID компании';
COMMENT ON COLUMN cost_centers.name IS 'Название центра затрат';
COMMENT ON COLUMN cost_centers.code IS 'Код центра затрат';
COMMENT ON COLUMN cost_centers.description IS 'Описание центра затрат';
COMMENT ON COLUMN cost_centers.parent_center_id IS 'ID родительского центра затрат (для иерархии)';
COMMENT ON COLUMN cost_centers.manager_id IS 'ID ответственного менеджера';
COMMENT ON COLUMN cost_centers.budget_limit IS 'Лимит бюджета на период';
COMMENT ON COLUMN cost_centers.current_spend IS 'Текущие расходы за период';
COMMENT ON COLUMN cost_centers.period_type IS 'Тип периода (день, неделя, месяц, квартал, год)';
COMMENT ON COLUMN cost_centers.period_start_date IS 'Начало бюджетного периода';
COMMENT ON COLUMN cost_centers.period_end_date IS 'Конец бюджетного периода';
COMMENT ON COLUMN cost_centers.is_active IS 'Активен ли центр затрат';

-- Создание триггера для обновления updated_at
CREATE OR REPLACE FUNCTION update_cost_centers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_cost_centers_updated_at
    BEFORE UPDATE ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION update_cost_centers_updated_at();

-- Создание функции для проверки циклических ссылок в иерархии
CREATE OR REPLACE FUNCTION check_cost_center_hierarchy()
RETURNS TRIGGER AS $$
DECLARE
    ancestor_count INTEGER;
BEGIN
    -- Проверяем циклические ссылки при обновлении parent_center_id
    IF TG_OP = 'UPDATE' AND (OLD.parent_center_id IS DISTINCT FROM NEW.parent_center_id) THEN
        -- Если пытаемся сделать центру затрат самого себя родителем
        IF NEW.parent_center_id = NEW.id THEN
            RAISE EXCEPTION 'Cost center cannot be its own parent';
        END IF;

        -- Проверяем, не создается ли циклическая зависимость
        WITH RECURSIVE cost_center_tree AS (
            SELECT id, parent_center_id, 1 as level
            FROM cost_centers
            WHERE id = NEW.parent_center_id AND company_id = NEW.company_id

            UNION ALL

            SELECT cc.id, cc.parent_center_id, ct.level + 1
            FROM cost_centers cc
            JOIN cost_center_tree ct ON cc.id = ct.parent_center_id
            WHERE ct.level < 10 -- Ограничиваем глубину иерархии
        )
        SELECT COUNT(*) INTO ancestor_count
        FROM cost_center_tree
        WHERE id = NEW.id;

        IF ancestor_count > 0 THEN
            RAISE EXCEPTION 'Cyclic dependency detected in cost center hierarchy';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_check_cost_center_hierarchy
    BEFORE INSERT OR UPDATE ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION check_cost_center_hierarchy();

-- Создание функции для автоматического сброса расходов при смене периода
CREATE OR REPLACE FUNCTION reset_cost_center_spend()
RETURNS TRIGGER AS $$
BEGIN
    -- Если изменился период или сбрасываем расходы вручную
    IF TG_OP = 'UPDATE' AND (
        OLD.period_start_date IS DISTINCT FROM NEW.period_start_date OR
        OLD.period_end_date IS DISTINCT FROM NEW.period_end_date OR
        NEW.current_spend = 0
    ) THEN
        NEW.current_spend = 0;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_reset_cost_center_spend
    BEFORE UPDATE ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION reset_cost_center_spend();