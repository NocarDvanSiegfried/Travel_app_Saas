# Архитектура логирования

## 1. Общие принципы

### 1.1 Стратегия логирования
- **Структурированное логирование** (JSON формат)
- **Уровни логирования** для фильтрации
- **Контекст** для отслеживания запросов
- **Безопасность** (без секретов и персональных данных)

### 1.2 Назначение логов
- **Отладка** — поиск и исправление ошибок
- **Мониторинг** — отслеживание состояния системы
- **Аудит** — запись важных операций
- **Аналитика** — анализ использования системы

---

## 2. Формат логов

### 2.1 Структура лога

**Базовый формат:**
```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "message": "User logged in",
  "context": {
    "path": "/api/v1/auth/login",
    "method": "POST",
    "ip": "192.168.1.1"
  }
}
```

**Поля:**
- `level` — Уровень логирования (обязательно)
- `timestamp` — Время события (обязательно)
- `traceId` — ID для отслеживания запроса (обязательно)
- `userId` — ID пользователя (если доступен)
- `message` — Сообщение (обязательно)
- `context` — Дополнительный контекст (опционально)

---

### 2.2 Уровни логирования

**Иерархия:**
1. **error** — Критические ошибки (требуют внимания)
2. **warn** — Предупреждения (потенциальные проблемы)
3. **info** — Информационные сообщения (важные события)
4. **debug** — Отладочная информация (детали выполнения)

**Использование:**
- **error:** Ошибки, исключения, сбои
- **warn:** Предупреждения, деградация функциональности
- **info:** Успешные операции, важные события
- **debug:** Детали выполнения, промежуточные значения

---

## 3. Структура entry

### 3.1 Обязательные поля

**Базовые поля:**
```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Operation completed"
}
```

---

### 3.2 Контекст запроса

**HTTP запрос:**
```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "message": "Request processed",
  "context": {
    "path": "/api/v1/orders",
    "method": "POST",
    "statusCode": 201,
    "duration": 150,
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

---

### 3.3 Контекст ошибки

**Ошибка:**
```json
{
  "level": "error",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "message": "Failed to create order",
  "error": {
    "code": "INSUFFICIENT_SEATS",
    "message": "Not enough seats available",
    "stack": "Error stack trace"
  },
  "context": {
    "path": "/api/v1/orders",
    "method": "POST",
    "orderId": "order-uuid",
    "routeId": "route-uuid"
  }
}
```

---

## 4. Бизнес-логи vs системные логи

### 4.1 Бизнес-логи

**Назначение:** Запись важных бизнес-событий

**Примеры:**
- Создание заказа
- Отмена заказа
- Регистрация пользователя
- Вход пользователя
- Выбор услуги

**Формат:**
```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "message": "Order created",
  "businessEvent": {
    "type": "order.created",
    "orderId": "order-uuid",
    "routeId": "route-uuid",
    "totalPrice": 15000,
    "status": "pending"
  }
}
```

---

### 4.2 Системные логи

**Назначение:** Запись системных событий

**Примеры:**
- Запуск/остановка сервера
- Подключение к БД
- Ошибки инфраструктуры
- Производительность

**Формат:**
```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Database connection established",
  "systemEvent": {
    "type": "database.connected",
    "host": "localhost",
    "port": 5432,
    "database": "travel_app"
  }
}
```

---

## 5. Правила для ошибок

### 5.1 Логирование ошибок

**Обязательно логировать:**
- Все исключения (error level)
- Ошибки валидации (warn level)
- Ошибки бизнес-логики (error level)
- Ошибки инфраструктуры (error level)

---

### 5.2 Контекст ошибки

**Обязательный контекст:**
- `traceId` — для отслеживания запроса
- `userId` — ID пользователя (если доступен)
- `path` — путь запроса
- `method` — HTTP метод
- `error.code` — код ошибки
- `error.message` — сообщение об ошибке
- `error.stack` — стек вызовов (для error level)

---

### 5.3 Примеры логирования ошибок

**Ошибка валидации:**
```json
{
  "level": "warn",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user-uuid",
  "message": "Validation error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  },
  "context": {
    "path": "/api/v1/auth/register",
    "method": "POST"
  }
}
```

**Ошибка БД:**
```json
{
  "level": "error",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Database error",
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Connection timeout",
    "stack": "Error stack trace"
  },
  "context": {
    "path": "/api/v1/orders",
    "method": "POST",
    "query": "SELECT * FROM orders WHERE user_id = $1"
  }
}
```

---

## 6. Реализация на Backend

### 6.1 Logger Middleware

**Пример:**
```javascript
const loggerMiddleware = (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  req.traceId = traceId;
  
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info({
      level: 'info',
      timestamp: new Date().toISOString(),
      traceId,
      userId: req.userId,
      message: 'Request processed',
      context: {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    });
  });
  
  next();
};
```

---

### 6.2 Error Logger

**Пример:**
```javascript
const errorLogger = (err, req, res, next) => {
  logger.error({
    level: 'error',
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    userId: req.userId,
    message: err.message || 'Internal server error',
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      stack: err.stack
    },
    context: {
      path: req.path,
      method: req.method,
      body: maskSensitiveData(req.body),
      query: req.query
    }
  });
  
  next(err);
};
```

---

## 7. Реализация на Frontend

### 7.1 Client Logger

**Пример:**
```javascript
const logger = {
  error: (message, context = {}) => {
    console.error({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    });
    
    // Отправка на сервер для критических ошибок
    if (context.critical) {
      sendErrorToServer({ message, context });
    }
  },
  
  info: (message, context = {}) => {
    console.info({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      context
    });
  }
};
```

---

## 8. Маскирование данных

### 8.1 Правила маскирования

**Маскировать:**
- Пароли
- Токены (JWT)
- Email (частично)
- Персональные данные (кроме ID)

---

### 8.2 Реализация

**Пример:**
```javascript
const maskSensitiveData = (data) => {
  const masked = { ...data };
  
  if (masked.password) masked.password = '***';
  if (masked.token) masked.token = '***';
  if (masked.email) masked.email = maskEmail(masked.email);
  if (masked.documentNumber) masked.documentNumber = '***';
  
  return masked;
};

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  if (local.length <= 2) return '***@' + domain;
  return local.substring(0, 2) + '***@' + domain;
};
```

---

## 9. Хранение и ротация логов

### 9.1 Хранение логов

**Development:**
- Консоль (stdout)
- Файлы (опционально)

**Production:**
- Централизованное хранилище (ELK, CloudWatch, etc.)
- Ротация логов
- Архивация старых логов

---

### 9.2 Ротация логов

**Правила:**
- Максимальный размер файла: 100 MB
- Максимальное количество файлов: 10
- Хранение: 30 дней
- Сжатие старых логов

---

## 10. Мониторинг и алерты

### 10.1 Метрики

**Отслеживаемые метрики:**
- Количество ошибок по уровням
- Частота ошибок по endpoints
- Время отклика (p50, p95, p99)
- Количество запросов

---

### 10.2 Алерты

**Условия алертов:**
- Критическая ошибка (error) > 10 в минуту
- Ошибка БД > 5 в минуту
- Время отклика p95 > 1s
- Недоступность сервиса

---

## 11. Примеры использования

### 11.1 Логирование запроса

```javascript
logger.info({
  level: 'info',
  timestamp: new Date().toISOString(),
  traceId: req.traceId,
  userId: req.userId,
  message: 'Route search requested',
  context: {
    path: '/api/v1/routes/search',
    method: 'GET',
    query: {
      from: 'Yakutsk',
      to: 'Moscow',
      date: '2024-01-20'
    }
  }
});
```

---

### 11.2 Логирование успешной операции

```javascript
logger.info({
  level: 'info',
  timestamp: new Date().toISOString(),
  traceId: req.traceId,
  userId: req.userId,
  message: 'Order created',
  businessEvent: {
    type: 'order.created',
    orderId: order.id,
    routeId: order.routeId,
    totalPrice: order.totalPrice
  }
});
```

---

### 11.3 Логирование ошибки

```javascript
logger.error({
  level: 'error',
  timestamp: new Date().toISOString(),
  traceId: req.traceId,
  userId: req.userId,
  message: 'Failed to create order',
  error: {
    code: 'INSUFFICIENT_SEATS',
    message: 'Not enough seats available',
    stack: error.stack
  },
  context: {
    path: '/api/v1/orders',
    method: 'POST',
    routeId: routeId,
    requestedSeats: passengersCount
  }
});
```

---

## 12. Будущие улучшения

### 12.1 Централизованное логирование
- Интеграция с ELK Stack
- Агрегация логов
- Поиск и анализ

### 12.2 Улучшенный мониторинг
- Дашборды с метриками
- Автоматические алерты
- Анализ трендов

### 12.3 Трассировка
- Распределенная трассировка (OpenTelemetry)
- Отслеживание запросов через микросервисы
- Визуализация потоков

