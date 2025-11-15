# Архитектура данных

## 1. Общие принципы

### 1.1 Источники данных
- **PostgreSQL** — пользователи, заказы, профили
- **MinIO (S3)** — файлы (изображения, иконки)
- **Mock-файлы** — маршруты, города, достопримечательности, события, погода

### 1.2 Разделение данных
- **Реальные данные (PostgreSQL):** Пользователи, заказы, профили
- **Mock-данные (JSON):** Маршруты, города, достопримечательности, события, погода, гостиницы, аренда авто

## 2. Структура данных PostgreSQL

### 2.1 Таблица `users`
**Назначение:** Хранение пользователей

**Схема:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**Поля:**
- `id` — UUID пользователя
- `email` — Email (уникальный)
- `password_hash` — Хеш пароля (bcrypt)
- `full_name` — Полное имя
- `phone` — Телефон (опционально)
- `avatar_url` — URL аватара в MinIO
- `created_at` — Дата создания
- `updated_at` — Дата обновления
- `last_login_at` — Дата последнего входа

---

### 2.2 Таблица `orders`
**Назначение:** Хранение заказов

**Схема:**
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    route_id VARCHAR(255) NOT NULL, -- ID из mock-данных
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_price_amount DECIMAL(10, 2) NOT NULL,
    total_price_currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
```

**Поля:**
- `id` — UUID заказа
- `user_id` — Ссылка на пользователя
- `route_id` — ID маршрута из mock-данных
- `status` — Статус: `pending`, `confirmed`, `cancelled`, `completed`
- `total_price_amount` — Сумма заказа
- `total_price_currency` — Валюта (RUB)
- `created_at` — Дата создания
- `updated_at` — Дата обновления
- `confirmed_at` — Дата подтверждения
- `cancelled_at` — Дата отмены

---

### 2.3 Таблица `order_passengers`
**Назначение:** Пассажиры в заказе

**Схема:**
```sql
CREATE TABLE order_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_passengers_order_id ON order_passengers(order_id);
```

**Поля:**
- `id` — UUID пассажира
- `order_id` — Ссылка на заказ
- `full_name` — Полное имя пассажира
- `document_number` — Номер документа
- `created_at` — Дата создания

---

### 2.4 Таблица `order_services`
**Назначение:** Услуги в заказе (страховка, премиальная поддержка)

**Схема:**
```sql
CREATE TABLE order_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL, -- 'insurance', 'premium-support'
    service_id VARCHAR(255) NOT NULL, -- ID услуги из mock-данных
    name VARCHAR(255) NOT NULL,
    price_amount DECIMAL(10, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_services_order_id ON order_services(order_id);
CREATE INDEX idx_order_services_service_type ON order_services(service_type);
```

**Поля:**
- `id` — UUID услуги в заказе
- `order_id` — Ссылка на заказ
- `service_type` — Тип услуги: `insurance`, `premium-support`
- `service_id` — ID услуги из mock-данных
- `name` — Название услуги
- `price_amount` — Цена услуги
- `price_currency` — Валюта (RUB)
- `created_at` — Дата создания

---

### 2.5 Таблица `user_preferences`
**Назначение:** Настройки пользователя

**Схема:**
```sql
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'ru',
    theme VARCHAR(20) DEFAULT 'light',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Поля:**
- `user_id` — Ссылка на пользователя
- `notifications_enabled` — Включены ли уведомления
- `language` — Язык интерфейса (ru, en)
- `theme` — Тема (light, dark)
- `updated_at` — Дата обновления

---

## 3. Структура Mock-данных (JSON)

### 3.1 Маршруты (`routes.json`)
**Формат:**
```json
{
  "routes": [
    {
      "id": "route-uuid",
      "from": {
        "id": "city-uuid",
        "name": "Якутск",
        "coordinates": {
          "lat": 62.0278,
          "lng": 129.7317
        }
      },
      "to": {
        "id": "city-uuid",
        "name": "Москва",
        "coordinates": {
          "lat": 55.7558,
          "lng": 37.6173
        }
      },
      "transport": {
        "type": "airplane",
        "name": "Самолет",
        "iconUrl": "/icons/transport/airplane.png"
      },
      "departureTime": "2024-01-20T08:00:00Z",
      "arrivalTime": "2024-01-20T14:30:00Z",
      "duration": {
        "hours": 6,
        "minutes": 30
      },
      "price": {
        "amount": 15000,
        "currency": "RUB"
      },
      "availableSeats": 45,
      "mapData": {
        "polyline": "encoded_polyline_string",
        "waypoints": [
          {"lat": 62.0278, "lng": 129.7317},
          {"lat": 55.7558, "lng": 37.6173}
        ]
      },
      "description": "Прямой рейс",
      "carrier": {
        "name": "Авиакомпания",
        "rating": 4.5
      }
    }
  ]
}
```

**Поля маршрута:**
- `id` — Уникальный ID маршрута
- `from` — Город отправления (объект с id, name, coordinates)
- `to` — Город назначения (объект с id, name, coordinates)
- `transport` — Тип транспорта (type, name, iconUrl)
- `departureTime` — Время отправления (ISO 8601)
- `arrivalTime` — Время прибытия (ISO 8601)
- `duration` — Длительность (hours, minutes)
- `price` — Цена (amount, currency)
- `availableSeats` — Доступные места
- `mapData` — Данные для карты (polyline, waypoints)
- `description` — Описание маршрута
- `carrier` — Перевозчик (name, rating)

---

### 3.2 Города (`cities.json`)
**Формат:**
```json
{
  "cities": [
    {
      "id": "city-uuid",
      "name": "Якутск",
      "region": "Республика Саха (Якутия)",
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "timezone": "Asia/Yakutsk",
      "description": "Столица Республики Саха",
      "imageUrl": "/images/cities/yakutsk.jpg",
      "population": 311760
    }
  ]
}
```

**Поля города:**
- `id` — Уникальный ID города
- `name` — Название города
- `region` — Регион
- `coordinates` — Координаты (lat, lng)
- `timezone` — Часовой пояс
- `description` — Описание
- `imageUrl` — URL изображения в MinIO
- `population` — Население

---

### 3.3 Достопримечательности (`attractions.json`)
**Формат:**
```json
{
  "attractions": [
    {
      "id": "attraction-uuid",
      "name": "Памятник мамонту",
      "description": "Символ Якутии",
      "cityId": "city-uuid",
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "category": "monument",
      "iconUrl": "/icons/attractions/monument.png",
      "imageUrl": "/images/attractions/mammoth.jpg",
      "images": [
        "/images/attractions/mammoth-1.jpg",
        "/images/attractions/mammoth-2.jpg"
      ],
      "rating": 4.8,
      "reviewsCount": 125,
      "workingHours": "Круглосуточно",
      "address": "ул. Ленина, 1"
    }
  ]
}
```

**Поля достопримечательности:**
- `id` — Уникальный ID
- `name` — Название
- `description` — Описание
- `cityId` — ID города
- `coordinates` — Координаты (lat, lng)
- `category` — Категория (monument, museum, park, etc.)
- `iconUrl` — URL иконки в MinIO
- `imageUrl` — URL основного изображения
- `images` — Массив дополнительных изображений
- `rating` — Рейтинг (0-5)
- `reviewsCount` — Количество отзывов
- `workingHours` — Часы работы
- `address` — Адрес

---

### 3.4 События (`events.json`)
**Формат:**
```json
{
  "events": [
    {
      "id": "event-uuid",
      "name": "Фестиваль северного сияния",
      "description": "Ежегодный фестиваль",
      "cityId": "city-uuid",
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "date": "2024-01-25T18:00:00Z",
      "duration": {
        "hours": 4
      },
      "category": "festival",
      "iconUrl": "/icons/events/festival.png",
      "imageUrl": "/images/events/aurora-festival.jpg",
      "organizer": "Организатор",
      "price": {
        "amount": 0,
        "currency": "RUB"
      },
      "website": "https://example.com"
    }
  ]
}
```

**Поля события:**
- `id` — Уникальный ID
- `name` — Название
- `description` — Описание
- `cityId` — ID города
- `coordinates` — Координаты (lat, lng)
- `date` — Дата и время (ISO 8601)
- `duration` — Длительность (hours)
- `category` — Категория (festival, concert, exhibition, etc.)
- `iconUrl` — URL иконки в MinIO
- `imageUrl` — URL изображения
- `organizer` — Организатор
- `price` — Цена (amount, currency)
- `website` — Сайт события

---

### 3.5 Погода (`weather.json`)
**Формат:**
```json
{
  "weather": [
    {
      "cityId": "city-uuid",
      "temperature": -25,
      "condition": "snow",
      "iconUrl": "/icons/weather/snow.png",
      "forecast": "Ожидается снегопад",
      "windSpeed": 15,
      "humidity": 85,
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**Поля погоды:**
- `cityId` — ID города
- `temperature` — Температура (°C)
- `condition` — Условия (sunny, cloudy, rain, snow, etc.)
- `iconUrl` — URL иконки в MinIO
- `forecast` — Прогноз
- `windSpeed` — Скорость ветра (м/с)
- `humidity` — Влажность (%)
- `updatedAt` — Дата обновления (ISO 8601)

---

### 3.6 Страховка (`insurance.json`)
**Формат:**
```json
{
  "insurance": [
    {
      "id": "insurance-uuid",
      "name": "Базовая страховка",
      "description": "Покрытие основных рисков",
      "price": {
        "amount": 500,
        "currency": "RUB"
      },
      "coverage": [
        "Задержка рейса",
        "Отмена рейса",
        "Багаж"
      ]
    },
    {
      "id": "insurance-uuid-2",
      "name": "Расширенная страховка",
      "description": "Полное покрытие",
      "price": {
        "amount": 1000,
        "currency": "RUB"
      },
      "coverage": [
        "Задержка рейса",
        "Отмена рейса",
        "Багаж",
        "Медицинская помощь",
        "Эвакуация"
      ]
    }
  ]
}
```

**Поля страховки:**
- `id` — Уникальный ID
- `name` — Название
- `description` — Описание
- `price` — Цена (amount, currency)
- `coverage` — Массив покрываемых рисков

---

### 3.7 Премиальная поддержка (`premium-support.json`)
**Формат:**
```json
{
  "premiumSupport": [
    {
      "id": "premium-uuid",
      "name": "Премиальная поддержка",
      "description": "Приоритетная поддержка 24/7",
      "price": {
        "amount": 1000,
        "currency": "RUB"
      },
      "features": [
        "Приоритетная поддержка",
        "Персональный менеджер",
        "Экстренная связь"
      ]
    }
  ]
}
```

**Поля премиальной поддержки:**
- `id` — Уникальный ID
- `name` — Название
- `description` — Описание
- `price` — Цена (amount, currency)
- `features` — Массив возможностей

---

### 3.8 Гостиницы (`hotels.json`)
**Формат:**
```json
{
  "hotels": [
    {
      "id": "hotel-uuid",
      "name": "Отель Полярная звезда",
      "cityId": "city-uuid",
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "rating": 4.5,
      "pricePerNight": {
        "amount": 3000,
        "currency": "RUB"
      },
      "imageUrl": "/images/hotels/polar-star.jpg",
      "amenities": ["Wi-Fi", "Завтрак", "Парковка"]
    }
  ]
}
```

**Поля гостиницы:**
- `id` — Уникальный ID
- `name` — Название
- `cityId` — ID города
- `coordinates` — Координаты (lat, lng)
- `rating` — Рейтинг (0-5)
- `pricePerNight` — Цена за ночь (amount, currency)
- `imageUrl` — URL изображения
- `amenities` — Удобства

---

### 3.9 Аренда авто (`car-rentals.json`)
**Формат:**
```json
{
  "carRentals": [
    {
      "id": "rental-uuid",
      "car": {
        "model": "Toyota Camry",
        "category": "economy",
        "seats": 5
      },
      "cityId": "city-uuid",
      "pricePerDay": {
        "amount": 2500,
        "currency": "RUB"
      },
      "imageUrl": "/images/cars/toyota-camry.jpg",
      "features": ["Кондиционер", "Навигация"]
    }
  ]
}
```

**Поля аренды авто:**
- `id` — Уникальный ID
- `car` — Информация об авто (model, category, seats)
- `cityId` — ID города
- `pricePerDay` — Цена за день (amount, currency)
- `imageUrl` — URL изображения
- `features` — Особенности

---

## 4. Структура MinIO (S3)

### 4.1 Bucket структура
**Bucket:** `travel-app`

**Папки:**
```
travel-app/
├── icons/
│   ├── transport/
│   │   ├── airplane.png
│   │   ├── train.png
│   │   ├── ship.png
│   │   └── bus.png
│   ├── attractions/
│   │   ├── monument.png
│   │   ├── museum.png
│   │   └── park.png
│   ├── events/
│   │   ├── festival.png
│   │   ├── concert.png
│   │   └── exhibition.png
│   └── weather/
│       ├── sunny.png
│       ├── cloudy.png
│       ├── rain.png
│       └── snow.png
├── images/
│   ├── cities/
│   │   ├── yakutsk.jpg
│   │   └── moscow.jpg
│   ├── attractions/
│   │   ├── mammoth.jpg
│   │   └── ...
│   ├── events/
│   │   ├── aurora-festival.jpg
│   │   └── ...
│   ├── hotels/
│   │   ├── polar-star.jpg
│   │   └── ...
│   ├── cars/
│   │   ├── toyota-camry.jpg
│   │   └── ...
│   └── users/
│       ├── avatar-{userId}.jpg
│       └── ...
└── maps/
    └── (будущее использование)
```

### 4.2 Правила доступа
- **Публичный доступ:** `icons/`, `images/cities/`, `images/attractions/`, `images/events/`, `images/hotels/`, `images/cars/`
- **Приватный доступ:** `images/users/` (только для владельца)

### 4.3 Форматы файлов
- **Изображения:** JPEG, PNG, WebP
- **Иконки:** PNG, SVG
- **Максимальный размер:** 10 MB для изображений, 1 MB для иконок

---

## 5. Связи между данными

### 5.1 Связь заказа с маршрутом
- `orders.route_id` → `routes.id` (из mock-данных)
- Backend читает маршрут из mock-файла по `route_id`

### 5.2 Связь маршрута с городами
- `routes.from.id` → `cities.id`
- `routes.to.id` → `cities.id`

### 5.3 Связь достопримечательностей с городом
- `attractions.cityId` → `cities.id`

### 5.4 Связь событий с городом
- `events.cityId` → `cities.id`

### 5.5 Связь погоды с городом
- `weather.cityId` → `cities.id`

### 5.6 Связь пользователя с заказами
- `orders.user_id` → `users.id` (PostgreSQL)

---

## 6. Индексация и поиск

### 6.1 PostgreSQL индексы
- `users.email` — уникальный индекс для быстрого поиска
- `orders.user_id` — индекс для фильтрации заказов пользователя
- `orders.status` — индекс для фильтрации по статусу

### 6.2 Mock-данные поиск
- Поиск маршрутов: фильтрация по `from.name`, `to.name`, `date`
- Поиск достопримечательностей: фильтрация по `cityId`, `category`
- Поиск событий: фильтрация по `cityId`, `date`

---

## 7. Валидация данных

### 7.1 Валидация на Backend
- Email: формат email, уникальность
- Пароль: минимум 8 символов, буквы и цифры
- Координаты: lat в диапазоне [-90, 90], lng в диапазоне [-180, 180]
- Цены: положительные числа
- Даты: формат ISO 8601

### 7.2 Валидация на Frontend
- Валидация форм перед отправкой
- Проверка обязательных полей
- Форматирование дат и цен

---

## 8. Миграции данных

### 8.1 PostgreSQL миграции
- Использование инструмента миграций (например, Flyway, Liquibase)
- Версионирование схемы БД
- Откат миграций при необходимости

### 8.2 Mock-данные версионирование
- Версионирование JSON файлов
- Обратная совместимость при обновлении структуры


