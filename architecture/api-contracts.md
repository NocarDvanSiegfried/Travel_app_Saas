# API Контракты (Frontend ↔ Backend)

## 1. Общие принципы API

### 1.1 Версионирование API
**Формат:** `/api/v1/...`
- Все endpoints начинаются с `/api/v1/`
- Версионирование через URL path
- Обратная совместимость при обновлении версий

### 1.2 Формат запросов/ответов
- **Content-Type:** `application/json`
- **Кодировка:** UTF-8
- **Формат дат:** ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

### 1.3 Аутентификация
- **Схема:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer {token}`
- **Токен:** Получается через `/api/v1/auth/login`
- **Хранение:** Frontend хранит в localStorage или httpOnly cookie

### 1.4 Обработка ошибок
**Стандартный формат ошибки:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

**HTTP статусы:**
- `200 OK` — успешный запрос
- `201 Created` — ресурс создан
- `204 No Content` — успешное удаление/обновление
- `400 Bad Request` — ошибка валидации
- `401 Unauthorized` — не авторизован
- `403 Forbidden` — нет доступа
- `404 Not Found` — ресурс не найден
- `500 Internal Server Error` — ошибка сервера

## 2. Endpoints API

### 2.1 Авторизация

#### POST `/api/v1/auth/register`
**Описание:** Регистрация нового пользователя

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "Иван Иванов"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Иван Иванов",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "token": "jwt_token_here"
}
```

**Ошибки:**
- `400` — Email уже существует, неверный формат email, слабый пароль
- `422` — Ошибки валидации

---

#### POST `/api/v1/auth/login`
**Описание:** Вход пользователя

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Иван Иванов"
  },
  "token": "jwt_token_here",
  "expiresAt": "2024-01-16T10:00:00Z"
}
```

**Ошибки:**
- `401` — Неверный email или пароль
- `400` — Ошибки валидации

---

#### POST `/api/v1/auth/logout`
**Описание:** Выход пользователя

**Headers:** `Authorization: Bearer {token}`

**Response (204 No Content):**

**Ошибки:**
- `401` — Не авторизован

---

#### GET `/api/v1/auth/me`
**Описание:** Получение текущего пользователя

**Headers:** `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "Иван Иванов",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Ошибки:**
- `401` — Не авторизован

---

### 2.2 Маршруты

#### GET `/api/v1/routes/search`
**Описание:** Поиск маршрутов

**Query Parameters:**
- `from` (string, required) — город отправления
- `to` (string, required) — город назначения
- `date` (string, required) — дата поездки (YYYY-MM-DD)
- `passengers` (number, optional) — количество пассажиров (default: 1)

**Example:** `/api/v1/routes/search?from=Yakutsk&to=Moscow&date=2024-01-20&passengers=2`

**Response (200 OK):**
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
        "iconUrl": "http://minio:9000/bucket/icons/transport/airplane.png"
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
      }
    }
  ],
  "total": 5
}
```

**Ошибки:**
- `400` — Неверные параметры запроса
- `404` — Маршруты не найдены

---

#### GET `/api/v1/routes/:id`
**Описание:** Детали маршрута

**Path Parameters:**
- `id` (string, required) — ID маршрута

**Response (200 OK):**
```json
{
  "id": "route-uuid",
  "from": {
    "id": "city-uuid",
    "name": "Якутск",
    "coordinates": {"lat": 62.0278, "lng": 129.7317}
  },
  "to": {
    "id": "city-uuid",
    "name": "Москва",
    "coordinates": {"lat": 55.7558, "lng": 37.6173}
  },
  "transport": {
    "type": "airplane",
    "name": "Самолет",
    "iconUrl": "http://minio:9000/bucket/icons/transport/airplane.png"
  },
  "departureTime": "2024-01-20T08:00:00Z",
  "arrivalTime": "2024-01-20T14:30:00Z",
  "duration": {"hours": 6, "minutes": 30},
  "price": {"amount": 15000, "currency": "RUB"},
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
```

**Ошибки:**
- `404` — Маршрут не найден

---

#### GET `/api/v1/routes/:id/map`
**Описание:** Данные карты для маршрута

**Path Parameters:**
- `id` (string, required) — ID маршрута

**Response (200 OK):**
```json
{
  "routeId": "route-uuid",
  "polyline": "encoded_polyline_string",
  "waypoints": [
    {"lat": 62.0278, "lng": 129.7317, "name": "Якутск"},
    {"lat": 55.7558, "lng": 37.6173, "name": "Москва"}
  ],
  "attractions": [
    {
      "id": "attraction-uuid",
      "name": "Достопримечательность",
      "coordinates": {"lat": 60.0, "lng": 130.0},
      "iconUrl": "http://minio:9000/bucket/icons/attractions/monument.png",
      "imageUrl": "http://minio:9000/bucket/images/attractions/monument.jpg"
    }
  ],
  "events": [
    {
      "id": "event-uuid",
      "name": "Событие",
      "coordinates": {"lat": 61.0, "lng": 131.0},
      "date": "2024-01-21T12:00:00Z",
      "iconUrl": "http://minio:9000/bucket/icons/events/festival.png"
    }
  ]
}
```

---

### 2.3 Заказы

#### POST `/api/v1/orders`
**Описание:** Создание заказа

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "routeId": "route-uuid",
  "passengers": [
    {
      "fullName": "Иван Иванов",
      "documentNumber": "1234567890"
    }
  ],
  "services": [
    {
      "type": "insurance",
      "id": "insurance-uuid",
      "price": {"amount": 500, "currency": "RUB"}
    },
    {
      "type": "premium-support",
      "id": "premium-support-uuid",
      "price": {"amount": 1000, "currency": "RUB"}
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "id": "order-uuid",
  "route": {
    "id": "route-uuid",
    "from": {"name": "Якутск"},
    "to": {"name": "Москва"},
    "departureTime": "2024-01-20T08:00:00Z"
  },
  "status": "pending",
  "totalPrice": {
    "amount": 16500,
    "currency": "RUB"
  },
  "services": [
    {
      "type": "insurance",
      "name": "Страховка",
      "price": {"amount": 500, "currency": "RUB"}
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**Ошибки:**
- `400` — Ошибки валидации, маршрут недоступен
- `401` — Не авторизован
- `404` — Маршрут не найден

---

#### GET `/api/v1/orders`
**Описание:** Список заказов пользователя

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `page` (number, optional) — номер страницы (default: 1)
- `limit` (number, optional) — количество на странице (default: 10)

**Response (200 OK):**
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "route": {
        "id": "route-uuid",
        "from": {"name": "Якутск"},
        "to": {"name": "Москва"}
      },
      "status": "confirmed",
      "totalPrice": {"amount": 16500, "currency": "RUB"},
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Ошибки:**
- `401` — Не авторизован

---

#### GET `/api/v1/orders/:id`
**Описание:** Детали заказа

**Headers:** `Authorization: Bearer {token}`

**Path Parameters:**
- `id` (string, required) — ID заказа

**Response (200 OK):**
```json
{
  "id": "order-uuid",
  "route": {
    "id": "route-uuid",
    "from": {"name": "Якутск", "coordinates": {"lat": 62.0278, "lng": 129.7317}},
    "to": {"name": "Москва", "coordinates": {"lat": 55.7558, "lng": 37.6173}},
    "transport": {"type": "airplane", "name": "Самолет"},
    "departureTime": "2024-01-20T08:00:00Z",
    "arrivalTime": "2024-01-20T14:30:00Z"
  },
  "passengers": [
    {
      "fullName": "Иван Иванов",
      "documentNumber": "1234567890"
    }
  ],
  "status": "confirmed",
  "totalPrice": {"amount": 16500, "currency": "RUB"},
  "services": [
    {
      "type": "insurance",
      "name": "Страховка",
      "price": {"amount": 500, "currency": "RUB"}
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:05:00Z"
}
```

**Ошибки:**
- `401` — Не авторизован
- `403` — Заказ принадлежит другому пользователю
- `404` — Заказ не найден

---

#### DELETE `/api/v1/orders/:id`
**Описание:** Отмена заказа

**Headers:** `Authorization: Bearer {token}`

**Path Parameters:**
- `id` (string, required) — ID заказа

**Response (204 No Content):**

**Ошибки:**
- `400` — Заказ нельзя отменить (уже подтвержден)
- `401` — Не авторизован
- `403` — Заказ принадлежит другому пользователю
- `404` — Заказ не найден

---

### 2.4 Помощник (мамонтёнок)

#### POST `/api/v1/assistant/chat`
**Описание:** Отправка сообщения помощнику

**Headers:** `Authorization: Bearer {token}` (optional)

**Request:**
```json
{
  "message": "Привет, что ты знаешь о Якутске?",
  "context": {
    "routeId": "route-uuid",
    "currentPage": "route-details"
  }
}
```

**Response (200 OK):**
```json
{
  "response": {
    "message": "Привет! Якутск — столица Республики Саха. Интересный факт: здесь очень холодные зимы, температура может опускаться до -50°C!",
    "weather": {
      "city": "Якутск",
      "temperature": -25,
      "condition": "snow",
      "iconUrl": "http://minio:9000/bucket/icons/weather/snow.png",
      "forecast": "Ожидается снегопад"
    },
    "risk": {
      "level": "medium",
      "message": "Возможны задержки из-за погодных условий",
      "recommendations": ["Рекомендуем выбрать страховку"]
    },
    "facts": [
      "Якутск — самый холодный крупный город на Земле",
      "Город основан в 1632 году"
    ],
    "suggestions": [
      {
        "type": "insurance",
        "message": "Рекомендуем оформить страховку на случай задержки",
        "action": "show-insurance"
      }
    ]
  }
}
```

**Ошибки:**
- `400` — Ошибки валидации

---

#### GET `/api/v1/assistant/weather/:cityId`
**Описание:** Получение погоды для города

**Path Parameters:**
- `cityId` (string, required) — ID города

**Response (200 OK):**
```json
{
  "city": {
    "id": "city-uuid",
    "name": "Якутск"
  },
  "temperature": -25,
  "condition": "snow",
  "iconUrl": "http://minio:9000/bucket/icons/weather/snow.png",
  "forecast": "Ожидается снегопад",
  "windSpeed": 15,
  "humidity": 85,
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Ошибки:**
- `404` — Город не найден

---

#### GET `/api/v1/assistant/risk/:routeId`
**Описание:** Оценка рисков для маршрута

**Path Parameters:**
- `routeId` (string, required) — ID маршрута

**Response (200 OK):**
```json
{
  "routeId": "route-uuid",
  "riskLevel": "medium",
  "factors": [
    {
      "type": "weather",
      "severity": "medium",
      "message": "Ожидается снегопад в городе отправления"
    },
    {
      "type": "season",
      "severity": "low",
      "message": "Зимний период — возможны задержки"
    }
  ],
  "recommendations": [
    "Рекомендуем оформить страховку",
    "Прибыть в аэропорт заранее"
  ],
  "estimatedDelayProbability": 0.3
}
```

**Ошибки:**
- `404` — Маршрут не найден

---

### 2.5 Страховка

#### GET `/api/v1/insurance/options`
**Описание:** Получение вариантов страховки

**Query Parameters:**
- `routeId` (string, optional) — ID маршрута для расчета

**Response (200 OK):**
```json
{
  "options": [
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

---

#### POST `/api/v1/insurance/select`
**Описание:** Выбор страховки для заказа

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "orderId": "order-uuid",
  "insuranceId": "insurance-uuid"
}
```

**Response (200 OK):**
```json
{
  "orderId": "order-uuid",
  "insurance": {
    "id": "insurance-uuid",
    "name": "Базовая страховка",
    "price": {"amount": 500, "currency": "RUB"}
  },
  "updatedTotalPrice": {
    "amount": 16500,
    "currency": "RUB"
  }
}
```

**Ошибки:**
- `400` — Ошибки валидации
- `401` — Не авторизован
- `404` — Заказ или страховка не найдены

---

### 2.6 Премиальная поддержка

#### GET `/api/v1/premium-support/options`
**Описание:** Получение вариантов премиальной поддержки

**Response (200 OK):**
```json
{
  "options": [
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

---

#### POST `/api/v1/premium-support/activate`
**Описание:** Активация премиальной поддержки

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "orderId": "order-uuid",
  "premiumSupportId": "premium-uuid"
}
```

**Response (200 OK):**
```json
{
  "orderId": "order-uuid",
  "premiumSupport": {
    "id": "premium-uuid",
    "name": "Премиальная поддержка",
    "price": {"amount": 1000, "currency": "RUB"},
    "activatedAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-02-15T10:00:00Z"
  }
}
```

**Ошибки:**
- `400` — Ошибки валидации
- `401` — Не авторизован
- `404` — Заказ или поддержка не найдены

---

### 2.7 Достопримечательности

#### GET `/api/v1/attractions`
**Описание:** Список достопримечательностей

**Query Parameters:**
- `cityId` (string, optional) — фильтр по городу
- `bounds` (string, optional) — границы карты (lat1,lng1,lat2,lng2)

**Response (200 OK):**
```json
{
  "attractions": [
    {
      "id": "attraction-uuid",
      "name": "Памятник мамонту",
      "description": "Символ Якутии",
      "city": {
        "id": "city-uuid",
        "name": "Якутск"
      },
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "category": "monument",
      "iconUrl": "http://minio:9000/bucket/icons/attractions/monument.png",
      "imageUrl": "http://minio:9000/bucket/images/attractions/mammoth.jpg",
      "rating": 4.8
    }
  ],
  "total": 15
}
```

---

#### GET `/api/v1/attractions/:id`
**Описание:** Детали достопримечательности

**Path Parameters:**
- `id` (string, required) — ID достопримечательности

**Response (200 OK):**
```json
{
  "id": "attraction-uuid",
  "name": "Памятник мамонту",
  "description": "Символ Якутии, установлен в центре Якутска",
  "city": {
    "id": "city-uuid",
    "name": "Якутск"
  },
  "coordinates": {
    "lat": 62.0278,
    "lng": 129.7317
  },
  "category": "monument",
  "iconUrl": "http://minio:9000/bucket/icons/attractions/monument.png",
  "imageUrl": "http://minio:9000/bucket/images/attractions/mammoth.jpg",
  "images": [
    "http://minio:9000/bucket/images/attractions/mammoth-1.jpg",
    "http://minio:9000/bucket/images/attractions/mammoth-2.jpg"
  ],
  "rating": 4.8,
  "reviewsCount": 125,
  "workingHours": "Круглосуточно",
  "address": "ул. Ленина, 1"
}
```

---

### 2.8 События

#### GET `/api/v1/events`
**Описание:** Список событий

**Query Parameters:**
- `cityId` (string, optional) — фильтр по городу
- `dateFrom` (string, optional) — дата начала (YYYY-MM-DD)
- `dateTo` (string, optional) — дата окончания (YYYY-MM-DD)

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "event-uuid",
      "name": "Фестиваль северного сияния",
      "description": "Ежегодный фестиваль",
      "city": {
        "id": "city-uuid",
        "name": "Якутск"
      },
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "date": "2024-01-25T18:00:00Z",
      "category": "festival",
      "iconUrl": "http://minio:9000/bucket/icons/events/festival.png",
      "imageUrl": "http://minio:9000/bucket/images/events/aurora-festival.jpg"
    }
  ],
  "total": 8
}
```

---

#### GET `/api/v1/events/:id`
**Описание:** Детали события

**Path Parameters:**
- `id` (string, required) — ID события

**Response (200 OK):**
```json
{
  "id": "event-uuid",
  "name": "Фестиваль северного сияния",
  "description": "Ежегодный фестиваль в Якутске",
  "city": {
    "id": "city-uuid",
    "name": "Якутск"
  },
  "coordinates": {
    "lat": 62.0278,
    "lng": 129.7317
  },
  "date": "2024-01-25T18:00:00Z",
  "duration": {
    "hours": 4
  },
  "category": "festival",
  "iconUrl": "http://minio:9000/bucket/icons/events/festival.png",
  "imageUrl": "http://minio:9000/bucket/images/events/aurora-festival.jpg",
  "organizer": "Организатор",
  "price": {
    "amount": 0,
    "currency": "RUB"
  },
  "website": "https://example.com"
}
```

---

### 2.9 Гостиницы

#### GET `/api/v1/hotels`
**Описание:** Список гостиниц

**Query Parameters:**
- `cityId` (string, required) — ID города
- `checkIn` (string, optional) — дата заезда (YYYY-MM-DD)
- `checkOut` (string, optional) — дата выезда (YYYY-MM-DD)

**Response (200 OK):**
```json
{
  "hotels": [
    {
      "id": "hotel-uuid",
      "name": "Отель Полярная звезда",
      "city": {
        "id": "city-uuid",
        "name": "Якутск"
      },
      "coordinates": {
        "lat": 62.0278,
        "lng": 129.7317
      },
      "rating": 4.5,
      "pricePerNight": {
        "amount": 3000,
        "currency": "RUB"
      },
      "imageUrl": "http://minio:9000/bucket/images/hotels/polar-star.jpg"
    }
  ],
  "total": 12
}
```

---

### 2.10 Аренда авто

#### GET `/api/v1/car-rentals`
**Описание:** Список вариантов аренды авто

**Query Parameters:**
- `cityId` (string, required) — ID города
- `dateFrom` (string, required) — дата начала (YYYY-MM-DD)
- `dateTo` (string, required) — дата окончания (YYYY-MM-DD)

**Response (200 OK):**
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
      "city": {
        "id": "city-uuid",
        "name": "Якутск"
      },
      "pricePerDay": {
        "amount": 2500,
        "currency": "RUB"
      },
      "imageUrl": "http://minio:9000/bucket/images/cars/toyota-camry.jpg"
    }
  ],
  "total": 5
}
```

---

### 2.11 Профиль пользователя

#### GET `/api/v1/users/profile`
**Описание:** Получение профиля пользователя

**Headers:** `Authorization: Bearer {token}`

**Response (200 OK):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "fullName": "Иван Иванов",
  "phone": "+7 999 123 45 67",
  "avatarUrl": "http://minio:9000/bucket/images/users/avatar.jpg",
  "createdAt": "2024-01-15T10:00:00Z",
  "preferences": {
    "notifications": true,
    "language": "ru"
  }
}
```

**Ошибки:**
- `401` — Не авторизован

---

#### PUT `/api/v1/users/profile`
**Описание:** Обновление профиля пользователя

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "fullName": "Иван Петров",
  "phone": "+7 999 123 45 67"
}
```

**Response (200 OK):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "fullName": "Иван Петров",
  "phone": "+7 999 123 45 67",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

**Ошибки:**
- `400` — Ошибки валидации
- `401` — Не авторизован

---

## 3. Коды ошибок

### 3.1 Общие ошибки
- `VALIDATION_ERROR` — ошибка валидации входных данных
- `UNAUTHORIZED` — не авторизован
- `FORBIDDEN` — нет доступа
- `NOT_FOUND` — ресурс не найден
- `INTERNAL_ERROR` — внутренняя ошибка сервера

### 3.2 Специфичные ошибки
- `EMAIL_ALREADY_EXISTS` — email уже зарегистрирован
- `INVALID_CREDENTIALS` — неверный email или пароль
- `ROUTE_NOT_AVAILABLE` — маршрут недоступен
- `ORDER_CANNOT_BE_CANCELLED` — заказ нельзя отменить
- `INSUFFICIENT_SEATS` — недостаточно мест

## 4. Пагинация

**Стандартный формат пагинации:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

## 5. Версионирование

**Текущая версия:** `v1`

**Правила обновления:**
- Обратная совместимость в рамках версии
- Новые версии через новый path: `/api/v2/`
- Deprecation через заголовок `X-API-Deprecated: true`
- Минимальный период поддержки старой версии: 6 месяцев


