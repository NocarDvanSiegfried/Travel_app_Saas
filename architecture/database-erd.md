# Database ERD (Entity Relationship Diagram)

## 1. Общая схема базы данных

### 1.1 Список таблиц
- `users` — Пользователи
- `orders` — Заказы
- `order_passengers` — Пассажиры в заказе
- `order_services` — Услуги в заказе
- `user_preferences` — Настройки пользователя

---

## 2. ERD Диаграмма

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTITY RELATIONSHIP DIAGRAM                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│       users          │
├──────────────────────┤
│ PK id (UUID)         │
│    email (VARCHAR)   │──┐
│    password_hash     │  │
│    full_name         │  │
│    phone             │  │
│    avatar_url        │  │
│    created_at        │  │
│    updated_at        │  │
│    last_login_at     │  │
└──────────────────────┘  │
         │                │
         │ 1              │ 1
         │                │
         │                │
         │                │
┌────────▼───────────────┴────────┐
│          orders                  │
├──────────────────────────────────┤
│ PK id (UUID)                    │
│ FK user_id (UUID) ───────────────┼──┐
│    route_id (VARCHAR)            │  │
│    status (VARCHAR)              │  │
│    total_price_amount (DECIMAL) │  │
│    total_price_currency (VARCHAR)│  │
│    created_at (TIMESTAMP)        │  │
│    updated_at (TIMESTAMP)        │  │
│    confirmed_at (TIMESTAMP)      │  │
│    cancelled_at (TIMESTAMP)      │  │
└──────────────────────────────────┘  │
         │                              │
         │ 1                            │
         │                              │
         │                              │
         │ N                            │
         │                              │
┌────────▼──────────────┐  ┌────────────▼──────────────┐
│ order_passengers      │  │  order_services           │
├───────────────────────┤  ├───────────────────────────┤
│ PK id (UUID)          │  │ PK id (UUID)              │
│ FK order_id (UUID) ───┼──┤ FK order_id (UUID) ──────┼──┐
│    full_name          │  │    service_type (VARCHAR) │  │
│    document_number    │  │    service_id (VARCHAR)  │  │
│    created_at         │  │    name (VARCHAR)         │  │
└───────────────────────┘  │    price_amount (DECIMAL) │  │
                           │    price_currency (VARCHAR)│  │
                           │    created_at (TIMESTAMP)  │  │
                           └────────────────────────────┘  │
                                                            │
                                                            │
                           ┌───────────────────────────────┘
                           │
                           │ 1
                           │
┌──────────────────────────▼──────────────┐
│      user_preferences                    │
├──────────────────────────────────────────┤
│ PK FK user_id (UUID) ───────────────────┼──┐
│    notifications_enabled (BOOLEAN)        │  │
│    language (VARCHAR)                    │  │
│    theme (VARCHAR)                       │  │
│    updated_at (TIMESTAMP)                 │  │
└──────────────────────────────────────────┘  │
                                               │
                                               │ 1
                                               │
┌───────────────────────────────────────────────┘
│
│ Relationship Types:
│ 1:N = One-to-Many
│ 1:1 = One-to-One
│
│ PK = Primary Key
│ FK = Foreign Key
```

---

## 3. Детальное описание таблиц

### 3.1 Таблица `users`

**Назначение:** Хранение пользователей системы

**Схема:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP
);
```

**Индексы:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Ограничения (Constraints):**
- `PRIMARY KEY` на `id`
- `UNIQUE` на `email`
- `NOT NULL` на `email`, `password_hash`, `full_name`
- `CHECK` на `email` (формат email)

**Связи:**
- `1:N` с `orders` (один пользователь → много заказов)
- `1:1` с `user_preferences` (один пользователь → одна запись настроек)

---

### 3.2 Таблица `orders`

**Назначение:** Хранение заказов пользователей

**Схема:**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    route_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_price_amount DECIMAL(10, 2) NOT NULL,
    total_price_currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    CONSTRAINT fk_orders_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_orders_status 
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    
    CONSTRAINT chk_orders_price_positive 
        CHECK (total_price_amount >= 0)
);
```

**Индексы:**
```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_route_id ON orders(route_id);
```

**Ограничения (Constraints):**
- `PRIMARY KEY` на `id`
- `FOREIGN KEY` на `user_id` → `users(id)` с `ON DELETE CASCADE`
- `CHECK` на `status` (допустимые значения)
- `CHECK` на `total_price_amount` (неотрицательное значение)
- `NOT NULL` на обязательные поля

**Связи:**
- `N:1` с `users` (много заказов → один пользователь)
- `1:N` с `order_passengers` (один заказ → много пассажиров)
- `1:N` с `order_services` (один заказ → много услуг)

**Статусы:**
- `pending` — ожидает подтверждения
- `confirmed` — подтвержден
- `cancelled` — отменен
- `completed` — выполнен

---

### 3.3 Таблица `order_passengers`

**Назначение:** Хранение пассажиров в заказе

**Схема:**
```sql
CREATE TABLE order_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_order_passengers_order_id 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE
);
```

**Индексы:**
```sql
CREATE INDEX idx_order_passengers_order_id ON order_passengers(order_id);
```

**Ограничения (Constraints):**
- `PRIMARY KEY` на `id`
- `FOREIGN KEY` на `order_id` → `orders(id)` с `ON DELETE CASCADE`
- `NOT NULL` на обязательные поля

**Связи:**
- `N:1` с `orders` (много пассажиров → один заказ)

---

### 3.4 Таблица `order_services`

**Назначение:** Хранение услуг в заказе (страховка, премиальная поддержка)

**Схема:**
```sql
CREATE TABLE order_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    service_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_amount DECIMAL(10, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_order_services_order_id 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_order_services_service_type 
        CHECK (service_type IN ('insurance', 'premium-support')),
    
    CONSTRAINT chk_order_services_price_positive 
        CHECK (price_amount >= 0)
);
```

**Индексы:**
```sql
CREATE INDEX idx_order_services_order_id ON order_services(order_id);
CREATE INDEX idx_order_services_service_type ON order_services(service_type);
```

**Ограничения (Constraints):**
- `PRIMARY KEY` на `id`
- `FOREIGN KEY` на `order_id` → `orders(id)` с `ON DELETE CASCADE`
- `CHECK` на `service_type` (допустимые значения)
- `CHECK` на `price_amount` (неотрицательное значение)
- `NOT NULL` на обязательные поля

**Связи:**
- `N:1` с `orders` (много услуг → один заказ)

**Типы услуг:**
- `insurance` — страховка
- `premium-support` — премиальная поддержка

---

### 3.5 Таблица `user_preferences`

**Назначение:** Хранение настроек пользователя

**Схема:**
```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY,
    notifications_enabled BOOLEAN DEFAULT true NOT NULL,
    language VARCHAR(10) DEFAULT 'ru' NOT NULL,
    theme VARCHAR(20) DEFAULT 'light' NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_user_preferences_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_user_preferences_language 
        CHECK (language IN ('ru', 'en')),
    
    CONSTRAINT chk_user_preferences_theme 
        CHECK (theme IN ('light', 'dark'))
);
```

**Индексы:**
```sql
-- Primary key уже является индексом
```

**Ограничения (Constraints):**
- `PRIMARY KEY` на `user_id`
- `FOREIGN KEY` на `user_id` → `users(id)` с `ON DELETE CASCADE`
- `CHECK` на `language` (допустимые значения)
- `CHECK` на `theme` (допустимые значения)
- `NOT NULL` на обязательные поля

**Связи:**
- `1:1` с `users` (один пользователь → одна запись настроек)

---

## 4. Типы данных

### 4.1 UUID
- **Использование:** Первичные ключи
- **Формат:** `123e4567-e89b-12d3-a456-426614174000`
- **Генерация:** `gen_random_uuid()`

### 4.2 VARCHAR
- **Использование:** Текстовые поля переменной длины
- **Ограничения:** Максимальная длина указана в скобках

### 4.3 DECIMAL
- **Использование:** Денежные суммы
- **Формат:** `DECIMAL(10, 2)` — 10 цифр, 2 после запятой

### 4.4 TIMESTAMP
- **Использование:** Даты и время
- **Формат:** `YYYY-MM-DD HH:MM:SS`
- **По умолчанию:** `CURRENT_TIMESTAMP`

### 4.5 BOOLEAN
- **Использование:** Логические значения
- **Значения:** `true`, `false`

### 4.6 TEXT
- **Использование:** Длинные текстовые поля (URL)
- **Ограничения:** Без ограничения длины

---

## 5. Связи между таблицами

### 5.1 One-to-Many (1:N)

**users → orders**
- Один пользователь может иметь много заказов
- Foreign Key: `orders.user_id` → `users.id`
- Каскадное удаление: при удалении пользователя удаляются все его заказы

**orders → order_passengers**
- Один заказ может содержать много пассажиров
- Foreign Key: `order_passengers.order_id` → `orders.id`
- Каскадное удаление: при удалении заказа удаляются все пассажиры

**orders → order_services**
- Один заказ может содержать много услуг
- Foreign Key: `order_services.order_id` → `orders.id`
- Каскадное удаление: при удалении заказа удаляются все услуги

### 5.2 One-to-One (1:1)

**users → user_preferences**
- Один пользователь имеет одну запись настроек
- Foreign Key: `user_preferences.user_id` → `users.id` (Primary Key)
- Каскадное удаление: при удалении пользователя удаляются его настройки

---

## 6. Индексы

### 6.1 Первичные ключи (Primary Keys)
- Автоматически создают индекс
- `users.id`
- `orders.id`
- `order_passengers.id`
- `order_services.id`
- `user_preferences.user_id`

### 6.2 Внешние ключи (Foreign Keys)
- Рекомендуется создавать индексы для ускорения JOIN операций
- `orders.user_id`
- `order_passengers.order_id`
- `order_services.order_id`

### 6.3 Дополнительные индексы
- `users.email` — для быстрого поиска по email
- `orders.status` — для фильтрации по статусу
- `orders.created_at` — для сортировки по дате
- `order_services.service_type` — для фильтрации по типу услуги

---

## 7. Ограничения (Constraints)

### 7.1 Primary Key Constraints
- Гарантируют уникальность и непустоту
- Автоматически создают индекс

### 7.2 Foreign Key Constraints
- Гарантируют целостность данных
- `ON DELETE CASCADE` — каскадное удаление

### 7.3 Check Constraints
- Проверяют допустимые значения
- `orders.status` — только допустимые статусы
- `order_services.service_type` — только допустимые типы услуг
- `user_preferences.language` — только допустимые языки
- `user_preferences.theme` — только допустимые темы
- Цены — неотрицательные значения

### 7.4 Unique Constraints
- Гарантируют уникальность
- `users.email` — уникальный email

### 7.5 Not Null Constraints
- Гарантируют наличие значения
- Применяются к обязательным полям

---

## 8. Миграции

### 8.1 Создание таблиц
Порядок создания важен из-за Foreign Key зависимостей:

1. `users` (нет зависимостей)
2. `user_preferences` (зависит от `users`)
3. `orders` (зависит от `users`)
4. `order_passengers` (зависит от `orders`)
5. `order_services` (зависит от `orders`)

### 8.2 Удаление таблиц
Порядок удаления (обратный порядку создания):

1. `order_services`
2. `order_passengers`
3. `orders`
4. `user_preferences`
5. `users`

---

## 9. Примеры запросов

### 9.1 Получение заказа с пассажирами и услугами
```sql
SELECT 
    o.id,
    o.status,
    o.total_price_amount,
    u.email,
    u.full_name as user_name,
    json_agg(DISTINCT jsonb_build_object(
        'id', op.id,
        'full_name', op.full_name,
        'document_number', op.document_number
    )) as passengers,
    json_agg(DISTINCT jsonb_build_object(
        'id', os.id,
        'service_type', os.service_type,
        'name', os.name,
        'price_amount', os.price_amount
    )) as services
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_passengers op ON o.id = op.order_id
LEFT JOIN order_services os ON o.id = os.order_id
WHERE o.id = $1
GROUP BY o.id, u.email, u.full_name;
```

### 9.2 Получение всех заказов пользователя
```sql
SELECT 
    o.*,
    COUNT(DISTINCT op.id) as passengers_count,
    COUNT(DISTINCT os.id) as services_count
FROM orders o
LEFT JOIN order_passengers op ON o.id = op.order_id
LEFT JOIN order_services os ON o.id = os.order_id
WHERE o.user_id = $1
GROUP BY o.id
ORDER BY o.created_at DESC;
```

---

## 10. Будущие расширения

### 10.1 Возможные дополнительные таблицы
- `payments` — платежи
- `notifications` — уведомления
- `user_sessions` — сессии пользователей
- `audit_logs` — логи аудита

### 10.2 Оптимизации
- Партиционирование таблицы `orders` по дате
- Материализованные представления для аналитики
- Полнотекстовый поиск по полям


