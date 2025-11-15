# Спецификация Mock-данных

## 1. Общие принципы

### 1.1 Назначение Mock-данных
- Демонстрация функциональности в MVP
- Независимость от внешних API
- Быстрая разработка и тестирование
- Стабильные данные для разработки

### 1.2 Формат данных
- **Формат:** JSON
- **Кодировка:** UTF-8
- **Расположение:** `backend/data/`
- **Структура:** Массивы объектов

---

## 2. Структура файлов

### 2.1 Список файлов
```
backend/data/
├── cities.json          # Города
├── routes.json          # Маршруты
├── attractions.json     # Достопримечательности
├── events.json          # События
├── weather.json         # Погода
├── hotels.json          # Гостиницы
├── car-rentals.json     # Аренда авто
├── insurance.json       # Страховка
└── premium-support.json # Премиальная поддержка
```

---

## 3. Детальные схемы

### 3.1 cities.json

**Назначение:** Список городов

**Схема:**
```json
{
  "cities": [
    {
      "id": "string (UUID)",
      "name": "string",
      "region": "string",
      "coordinates": {
        "lat": "number (-90 to 90)",
        "lng": "number (-180 to 180)"
      },
      "timezone": "string (IANA timezone)",
      "description": "string",
      "imageUrl": "string (URL)",
      "population": "number"
    }
  ]
}
```

**Пример:**
```json
{
  "cities": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Якутск",
      "region": "Республика Саха (Якутия)",
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "timezone": "Asia/Yakutsk",
      "description": "Столица Республики Саха, самый холодный крупный город на Земле",
      "imageUrl": "/images/cities/yakutsk.jpg",
      "population": 311760
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Москва",
      "region": "Московская область",
      "coordinates": {
        "lat": 55.7558,
        "lng": 37.6173
      },
      "timezone": "Europe/Moscow",
      "description": "Столица России",
      "imageUrl": "/images/cities/moscow.jpg",
      "population": 12615882
    }
  ]
}
```

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `name` — Название города (обязательно)
- `region` — Регион (обязательно)
- `coordinates` — Координаты (обязательно)
  - `lat` — Широта (-90 до 90)
  - `lng` — Долгота (-180 до 180)
- `timezone` — Часовой пояс (IANA format)
- `description` — Описание города
- `imageUrl` — URL изображения в MinIO
- `population` — Население

---

### 3.2 routes.json

**Назначение:** Маршруты между городами

**Схема:**
```json
{
  "routes": [
    {
      "id": "string (UUID)",
      "from": {
        "id": "string (UUID)",
        "name": "string",
        "coordinates": {
          "lat": "number",
          "lng": "number"
        }
      },
      "to": {
        "id": "string (UUID)",
        "name": "string",
        "coordinates": {
          "lat": "number",
          "lng": "number"
        }
      },
      "transport": {
        "type": "string (airplane|train|bus|ship)",
        "name": "string",
        "iconUrl": "string (URL)"
      },
      "departureTime": "string (ISO 8601)",
      "arrivalTime": "string (ISO 8601)",
      "duration": {
        "hours": "number",
        "minutes": "number"
      },
      "price": {
        "amount": "number",
        "currency": "string (RUB)"
      },
      "availableSeats": "number",
      "mapData": {
        "polyline": "string (encoded polyline)",
        "waypoints": [
          {
            "lat": "number",
            "lng": "number"
          }
        ]
      },
      "description": "string",
      "carrier": {
        "name": "string",
        "rating": "number (0-5)"
      }
    }
  ]
}
```

**Пример:**
```json
{
  "routes": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "from": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Якутск",
        "coordinates": {
          "lat": 62.0278,
          "lng": 129.7317
        }
      },
      "to": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
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
        "polyline": "encoded_polyline_string_here",
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

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `from` — Город отправления (обязательно)
  - `id` — ID города из cities.json
  - `name` — Название города
  - `coordinates` — Координаты
- `to` — Город назначения (обязательно)
  - `id` — ID города из cities.json
  - `name` — Название города
  - `coordinates` — Координаты
- `transport` — Тип транспорта (обязательно)
  - `type` — Тип: `airplane`, `train`, `bus`, `ship`
  - `name` — Название транспорта
  - `iconUrl` — URL иконки в MinIO
- `departureTime` — Время отправления (ISO 8601, обязательно)
- `arrivalTime` — Время прибытия (ISO 8601, обязательно)
- `duration` — Длительность (обязательно)
  - `hours` — Часы
  - `minutes` — Минуты
- `price` — Цена (обязательно)
  - `amount` — Сумма (неотрицательное число)
  - `currency` — Валюта (RUB)
- `availableSeats` — Доступные места (неотрицательное число)
- `mapData` — Данные для карты (обязательно)
  - `polyline` — Encoded polyline для отображения линии
  - `waypoints` — Точки маршрута
- `description` — Описание маршрута
- `carrier` — Перевозчик
  - `name` — Название
  - `rating` — Рейтинг (0-5)

---

### 3.3 attractions.json

**Назначение:** Достопримечательности

**Схема:**
```json
{
  "attractions": [
    {
      "id": "string (UUID)",
      "name": "string",
      "description": "string",
      "cityId": "string (UUID)",
      "coordinates": {
        "lat": "number",
        "lng": "number"
      },
      "category": "string (monument|museum|park|nature|other)",
      "iconUrl": "string (URL)",
      "imageUrl": "string (URL)",
      "images": ["string (URL)"],
      "rating": "number (0-5)",
      "reviewsCount": "number",
      "workingHours": "string",
      "address": "string"
    }
  ]
}
```

**Пример:**
```json
{
  "attractions": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "Памятник мамонту",
      "description": "Символ Якутии, установлен в центре Якутска",
      "cityId": "550e8400-e29b-41d4-a716-446655440000",
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

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `name` — Название (обязательно)
- `description` — Описание
- `cityId` — ID города из cities.json (обязательно)
- `coordinates` — Координаты (обязательно)
- `category` — Категория (обязательно): `monument`, `museum`, `park`, `nature`, `other`
- `iconUrl` — URL иконки в MinIO
- `imageUrl` — URL основного изображения
- `images` — Массив дополнительных изображений
- `rating` — Рейтинг (0-5)
- `reviewsCount` — Количество отзывов
- `workingHours` — Часы работы
- `address` — Адрес

---

### 3.4 events.json

**Назначение:** События в городах

**Схема:**
```json
{
  "events": [
    {
      "id": "string (UUID)",
      "name": "string",
      "description": "string",
      "cityId": "string (UUID)",
      "coordinates": {
        "lat": "number",
        "lng": "number"
      },
      "date": "string (ISO 8601)",
      "duration": {
        "hours": "number"
      },
      "category": "string (festival|concert|exhibition|sports|other)",
      "iconUrl": "string (URL)",
      "imageUrl": "string (URL)",
      "organizer": "string",
      "price": {
        "amount": "number",
        "currency": "string (RUB)"
      },
      "website": "string (URL)"
    }
  ]
}
```

**Пример:**
```json
{
  "events": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "name": "Фестиваль северного сияния",
      "description": "Ежегодный фестиваль в Якутске",
      "cityId": "550e8400-e29b-41d4-a716-446655440000",
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
      "organizer": "Организатор фестиваля",
      "price": {
        "amount": 0,
        "currency": "RUB"
      },
      "website": "https://example.com"
    }
  ]
}
```

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `name` — Название (обязательно)
- `description` — Описание
- `cityId` — ID города из cities.json (обязательно)
- `coordinates` — Координаты (обязательно)
- `date` — Дата и время (ISO 8601, обязательно)
- `duration` — Длительность
  - `hours` — Часы
- `category` — Категория (обязательно): `festival`, `concert`, `exhibition`, `sports`, `other`
- `iconUrl` — URL иконки в MinIO
- `imageUrl` — URL изображения
- `organizer` — Организатор
- `price` — Цена
  - `amount` — Сумма (неотрицательное число)
  - `currency` — Валюта (RUB)
- `website` — Сайт события (URL)

---

### 3.5 weather.json

**Назначение:** Погода в городах

**Схема:**
```json
{
  "weather": [
    {
      "cityId": "string (UUID)",
      "temperature": "number",
      "condition": "string (sunny|cloudy|rain|snow|storm|fog)",
      "iconUrl": "string (URL)",
      "forecast": "string",
      "windSpeed": "number",
      "humidity": "number (0-100)",
      "updatedAt": "string (ISO 8601)"
    }
  ]
}
```

**Пример:**
```json
{
  "weather": [
    {
      "cityId": "550e8400-e29b-41d4-a716-446655440000",
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

**Поля:**
- `cityId` — ID города из cities.json (обязательно)
- `temperature` — Температура (°C)
- `condition` — Условия (обязательно): `sunny`, `cloudy`, `rain`, `snow`, `storm`, `fog`
- `iconUrl` — URL иконки в MinIO
- `forecast` — Прогноз
- `windSpeed` — Скорость ветра (м/с)
- `humidity` — Влажность (0-100%)
- `updatedAt` — Дата обновления (ISO 8601)

---

### 3.6 hotels.json

**Назначение:** Гостиницы

**Схема:**
```json
{
  "hotels": [
    {
      "id": "string (UUID)",
      "name": "string",
      "cityId": "string (UUID)",
      "coordinates": {
        "lat": "number",
        "lng": "number"
      },
      "rating": "number (0-5)",
      "pricePerNight": {
        "amount": "number",
        "currency": "string (RUB)"
      },
      "imageUrl": "string (URL)",
      "amenities": ["string"]
    }
  ]
}
```

**Пример:**
```json
{
  "hotels": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "name": "Отель Полярная звезда",
      "cityId": "550e8400-e29b-41d4-a716-446655440000",
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

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `name` — Название (обязательно)
- `cityId` — ID города из cities.json (обязательно)
- `coordinates` — Координаты (обязательно)
- `rating` — Рейтинг (0-5)
- `pricePerNight` — Цена за ночь (обязательно)
  - `amount` — Сумма (неотрицательное число)
  - `currency` — Валюта (RUB)
- `imageUrl` — URL изображения
- `amenities` — Удобства (массив строк)

---

### 3.7 car-rentals.json

**Назначение:** Аренда автомобилей

**Схема:**
```json
{
  "carRentals": [
    {
      "id": "string (UUID)",
      "car": {
        "model": "string",
        "category": "string (economy|comfort|business|premium)",
        "seats": "number"
      },
      "cityId": "string (UUID)",
      "pricePerDay": {
        "amount": "number",
        "currency": "string (RUB)"
      },
      "imageUrl": "string (URL)",
      "features": ["string"]
    }
  ]
}
```

**Пример:**
```json
{
  "carRentals": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "car": {
        "model": "Toyota Camry",
        "category": "economy",
        "seats": 5
      },
      "cityId": "550e8400-e29b-41d4-a716-446655440000",
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

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `car` — Информация об авто (обязательно)
  - `model` — Модель
  - `category` — Категория: `economy`, `comfort`, `business`, `premium`
  - `seats` — Количество мест
- `cityId` — ID города из cities.json (обязательно)
- `pricePerDay` — Цена за день (обязательно)
  - `amount` — Сумма (неотрицательное число)
  - `currency` — Валюта (RUB)
- `imageUrl` — URL изображения
- `features` — Особенности (массив строк)

---

### 3.8 insurance.json

**Назначение:** Варианты страховки

**Схема:**
```json
{
  "insurance": [
    {
      "id": "string (UUID)",
      "name": "string",
      "description": "string",
      "price": {
        "amount": "number",
        "currency": "string (RUB)"
      },
      "coverage": ["string"]
    }
  ]
}
```

**Пример:**
```json
{
  "insurance": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
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
      "id": "bb0e8400-e29b-41d4-a716-446655440001",
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

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `name` — Название (обязательно)
- `description` — Описание
- `price` — Цена (обязательно)
  - `amount` — Сумма (неотрицательное число)
  - `currency` — Валюта (RUB)
- `coverage` — Покрытие (массив строк)

---

### 3.9 premium-support.json

**Назначение:** Премиальная поддержка

**Схема:**
```json
{
  "premiumSupport": [
    {
      "id": "string (UUID)",
      "name": "string",
      "description": "string",
      "price": {
        "amount": "number",
        "currency": "string (RUB)"
      },
      "features": ["string"]
    }
  ]
}
```

**Пример:**
```json
{
  "premiumSupport": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
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

**Поля:**
- `id` — Уникальный идентификатор (UUID)
- `name` — Название (обязательно)
- `description` — Описание
- `price` — Цена (обязательно)
  - `amount` — Сумма (неотрицательное число)
  - `currency` — Валюта (RUB)
- `features` — Возможности (массив строк)

---

## 4. Связи между данными

### 4.1 Связи по ID
- `routes.from.id` → `cities.id`
- `routes.to.id` → `cities.id`
- `attractions.cityId` → `cities.id`
- `events.cityId` → `cities.id`
- `weather.cityId` → `cities.id`
- `hotels.cityId` → `cities.id`
- `carRentals.cityId` → `cities.id`

### 4.2 Связи по координатам
- Фильтрация достопримечательностей и событий по координатам маршрута
- Поиск в радиусе от точки маршрута

---

## 5. Валидация данных

### 5.1 Обязательные поля
- Указаны в схеме как "обязательно"
- Проверка на Backend при чтении файлов

### 5.2 Форматы данных
- UUID: формат `550e8400-e29b-41d4-a716-446655440000`
- ISO 8601: формат `2024-01-20T08:00:00Z`
- Координаты: lat в диапазоне [-90, 90], lng в диапазоне [-180, 180]
- Цены: неотрицательные числа

### 5.3 Ограничения значений
- `transport.type`: только допустимые значения
- `attractions.category`: только допустимые значения
- `events.category`: только допустимые значения
- `car.category`: только допустимые значения
- `weather.condition`: только допустимые значения
- `rating`: в диапазоне [0, 5]
- `humidity`: в диапазоне [0, 100]

---

## 6. Загрузка и кэширование

### 6.1 Загрузка данных
- Backend загружает файлы при старте
- Кэширование в памяти для быстрого доступа
- Перезагрузка при изменении файлов (опционально)

### 6.2 Поиск и фильтрация
- Поиск по ID: O(1) через Map
- Фильтрация по условиям: O(n) через Array.filter
- Индексация по cityId для быстрого поиска

---

## 7. Примеры использования

### 7.1 Поиск маршрутов
```javascript
// Фильтрация маршрутов
const routes = mockData.routes.filter(route => 
  route.from.name === fromCity && 
  route.to.name === toCity &&
  route.departureTime.startsWith(date)
);
```

### 7.2 Получение достопримечательностей для города
```javascript
// Фильтрация достопримечательностей
const attractions = mockData.attractions.filter(attraction =>
  attraction.cityId === cityId
);
```

### 7.3 Получение погоды для города
```javascript
// Поиск погоды
const weather = mockData.weather.find(w => w.cityId === cityId);
```

---

## 8. Будущие улучшения

### 8.1 Замена на реальные API
- Интеграция с API маршрутизации
- Интеграция с погодными сервисами
- Интеграция с сервисами гостиниц

### 8.2 Динамические данные
- Обновление данных в реальном времени
- Синхронизация с внешними источниками


