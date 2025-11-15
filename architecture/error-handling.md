# Обработка ошибок

## 1. Общие принципы

### 1.1 Стратегия обработки ошибок
- **Единый формат ошибок** на всех уровнях
- **Логирование всех ошибок** для отладки
- **Понятные сообщения** для пользователя
- **Graceful degradation** при сбоях

### 1.2 Уровни обработки
- **Frontend:** Валидация, обработка API ошибок, отображение
- **Backend:** Валидация, бизнес-логика, инфраструктура
- **Infrastructure:** Ошибки БД, S3, файловой системы

---

## 2. Формат ошибок

### 2.1 Стандартный формат ответа

**Структура:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {
      "field": "validation error details"
    },
    "timestamp": "2024-01-15T10:00:00Z",
    "traceId": "trace-uuid"
  }
}
```

**Поля:**
- `code` — Код ошибки (обязательно)
- `message` — Сообщение для пользователя (обязательно)
- `details` — Детали ошибки (опционально)
- `timestamp` — Время ошибки (обязательно)
- `traceId` — ID для отслеживания (обязательно)

---

### 2.2 HTTP статусы

**Соответствие кодов ошибок и HTTP статусов:**
- `200 OK` — Успешный запрос
- `201 Created` — Ресурс создан
- `204 No Content` — Успешное удаление/обновление
- `400 Bad Request` — Ошибка валидации
- `401 Unauthorized` — Не авторизован
- `403 Forbidden` — Нет доступа
- `404 Not Found` — Ресурс не найден
- `409 Conflict` — Конфликт (например, email уже существует)
- `422 Unprocessable Entity` — Ошибка валидации данных
- `500 Internal Server Error` — Внутренняя ошибка сервера
- `503 Service Unavailable` — Сервис недоступен

---

## 3. Коды ошибок

### 3.1 Общие ошибки

| Код | HTTP | Описание |
|-----|------|-----------|
| `VALIDATION_ERROR` | 400 | Ошибка валидации входных данных |
| `UNAUTHORIZED` | 401 | Не авторизован |
| `FORBIDDEN` | 403 | Нет доступа к ресурсу |
| `NOT_FOUND` | 404 | Ресурс не найден |
| `INTERNAL_ERROR` | 500 | Внутренняя ошибка сервера |
| `SERVICE_UNAVAILABLE` | 503 | Сервис временно недоступен |

---

### 3.2 Ошибки авторизации

| Код | HTTP | Описание |
|-----|------|-----------|
| `EMAIL_ALREADY_EXISTS` | 409 | Email уже зарегистрирован |
| `INVALID_CREDENTIALS` | 401 | Неверный email или пароль |
| `TOKEN_EXPIRED` | 401 | Токен истек |
| `TOKEN_INVALID` | 401 | Невалидный токен |
| `TOKEN_MISSING` | 401 | Токен отсутствует |

---

### 3.3 Ошибки маршрутов

| Код | HTTP | Описание |
|-----|------|-----------|
| `ROUTE_NOT_FOUND` | 404 | Маршрут не найден |
| `ROUTE_NOT_AVAILABLE` | 400 | Маршрут недоступен |
| `INSUFFICIENT_SEATS` | 400 | Недостаточно мест |
| `INVALID_ROUTE_PARAMS` | 400 | Неверные параметры поиска |

---

### 3.4 Ошибки заказов

| Код | HTTP | Описание |
|-----|------|-----------|
| `ORDER_NOT_FOUND` | 404 | Заказ не найден |
| `ORDER_CANNOT_BE_CANCELLED` | 400 | Заказ нельзя отменить |
| `ORDER_ALREADY_CONFIRMED` | 409 | Заказ уже подтвержден |
| `INVALID_ORDER_DATA` | 400 | Неверные данные заказа |

---

### 3.5 Ошибки файлов

| Код | HTTP | Описание |
|-----|------|-----------|
| `FILE_TOO_LARGE` | 400 | Файл слишком большой |
| `INVALID_FILE_FORMAT` | 400 | Неверный формат файла |
| `FILE_UPLOAD_FAILED` | 500 | Ошибка загрузки файла |
| `FILE_NOT_FOUND` | 404 | Файл не найден |

---

### 3.6 Ошибки базы данных

| Код | HTTP | Описание |
|-----|------|-----------|
| `DATABASE_ERROR` | 500 | Ошибка базы данных |
| `DATABASE_CONNECTION_ERROR` | 503 | Ошибка подключения к БД |
| `CONSTRAINT_VIOLATION` | 400 | Нарушение ограничений БД |

---

## 4. Обработка на Backend

### 4.1 Global Error Handler

**Middleware:**
```javascript
app.use((err, req, res, next) => {
  const traceId = req.traceId || generateTraceId();
  
  // Логирование ошибки
  logger.error({
    error: err,
    traceId,
    path: req.path,
    method: req.method,
    userId: req.userId
  });
  
  // Формирование ответа
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Внутренняя ошибка сервера';
  
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      details: err.details,
      timestamp: new Date().toISOString(),
      traceId
    }
  });
});
```

---

### 4.2 Валидация запросов

**Пример:**
```javascript
// Валидация через middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ошибка валидации данных',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          })),
          timestamp: new Date().toISOString(),
          traceId: req.traceId
        }
      });
    }
    
    req.validatedData = value;
    next();
  };
};
```

---

### 4.3 Обработка бизнес-ошибок

**Пример:**
```javascript
// Custom Error класс
class BusinessError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.statusCode = this.getStatusCode(code);
  }
  
  getStatusCode(code) {
    const statusMap = {
      'ROUTE_NOT_FOUND': 404,
      'INSUFFICIENT_SEATS': 400,
      'ORDER_CANNOT_BE_CANCELLED': 400
    };
    return statusMap[code] || 400;
  }
}

// Использование
if (route.availableSeats < passengersCount) {
  throw new BusinessError(
    'INSUFFICIENT_SEATS',
    'Недостаточно мест на маршруте',
    { available: route.availableSeats, requested: passengersCount }
  );
}
```

---

## 5. Обработка на Frontend

### 5.1 Обработка API ошибок

**Axios Interceptor:**
```javascript
axios.interceptors.response.use(
  response => response,
  error => {
    const { response } = error;
    
    if (response) {
      const { code, message, details } = response.data.error;
      
      // Обработка специфичных ошибок
      switch (code) {
        case 'UNAUTHORIZED':
          // Перенаправление на страницу входа
          router.push('/login');
          break;
        case 'VALIDATION_ERROR':
          // Отображение ошибок валидации
          showValidationErrors(details);
          break;
        default:
          // Общая обработка
          showError(message);
      }
    } else {
      // Сетевая ошибка
      showError('Ошибка сети. Проверьте подключение к интернету.');
    }
    
    return Promise.reject(error);
  }
);
```

---

### 5.2 Error Boundary

**React Error Boundary:**
```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Логирование ошибки
    logger.error({ error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    
    return this.props.children;
  }
}
```

---

### 5.3 Отображение ошибок

**Компонент ошибки:**
```javascript
const ErrorMessage = ({ error }) => {
  return (
    <div className="error-message">
      <Icon name="error" />
      <p>{error.message}</p>
      {error.details && (
        <ul>
          {Object.entries(error.details).map(([field, message]) => (
            <li key={field}>{field}: {message}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

---

## 6. Логирование ошибок

### 6.1 Формат логов

**Структура:**
```json
{
  "level": "error",
  "timestamp": "2024-01-15T10:00:00Z",
  "traceId": "trace-uuid",
  "userId": "user-uuid",
  "path": "/api/v1/orders",
  "method": "POST",
  "error": {
    "code": "ORDER_CANNOT_BE_CANCELLED",
    "message": "Заказ нельзя отменить",
    "stack": "Error stack trace"
  },
  "context": {
    "orderId": "order-uuid",
    "status": "confirmed"
  }
}
```

---

### 6.2 Уровни логирования

- **error** — Критические ошибки (требуют внимания)
- **warn** — Предупреждения (потенциальные проблемы)
- **info** — Информационные сообщения
- **debug** — Отладочная информация

---

### 6.3 Контекст ошибок

**Обязательный контекст:**
- `traceId` — ID для отслеживания запроса
- `userId` — ID пользователя (если доступен)
- `path` — Путь запроса
- `method` — HTTP метод
- `timestamp` — Время ошибки

**Опциональный контекст:**
- `requestBody` — Тело запроса (без паролей)
- `queryParams` — Параметры запроса
- `headers` — Заголовки (без токенов)

---

## 7. Правила логирования

### 7.1 Что логировать

**Обязательно:**
- Все ошибки (error level)
- Предупреждения (warn level)
- Критические операции (info level)

**Не логировать:**
- Пароли и токены
- Персональные данные (кроме ID)
- Чувствительная информация

---

### 7.2 Маскирование данных

**Пример:**
```javascript
const maskSensitiveData = (data) => {
  const masked = { ...data };
  
  if (masked.password) masked.password = '***';
  if (masked.token) masked.token = '***';
  if (masked.email) masked.email = maskEmail(masked.email);
  
  return masked;
};
```

---

## 8. Мониторинг ошибок

### 8.1 Метрики

**Отслеживаемые метрики:**
- Количество ошибок по кодам
- Время отклика при ошибках
- Частота ошибок по endpoints
- Топ ошибок по частоте

---

### 8.2 Алерты

**Условия алертов:**
- Критическая ошибка (500) > 10 в минуту
- Ошибка авторизации (401) > 50 в минуту
- Ошибка БД (503) > 5 в минуту

---

## 9. Примеры обработки

### 9.1 Ошибка валидации

**Backend:**
```javascript
// 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ошибка валидации данных",
    "details": {
      "email": "Неверный формат email",
      "password": "Пароль должен содержать минимум 8 символов"
    },
    "timestamp": "2024-01-15T10:00:00Z",
    "traceId": "trace-uuid"
  }
}
```

**Frontend:**
```javascript
// Отображение ошибок валидации в форме
<FormField
  name="email"
  error={errors.email}
/>
```

---

### 9.2 Ошибка авторизации

**Backend:**
```javascript
// 401 Unauthorized
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Не авторизован. Пожалуйста, войдите в систему.",
    "timestamp": "2024-01-15T10:00:00Z",
    "traceId": "trace-uuid"
  }
}
```

**Frontend:**
```javascript
// Перенаправление на страницу входа
if (error.code === 'UNAUTHORIZED') {
  router.push('/login');
  showMessage('Сессия истекла. Пожалуйста, войдите снова.');
}
```

---

### 9.3 Ошибка ресурса

**Backend:**
```javascript
// 404 Not Found
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Маршрут не найден",
    "timestamp": "2024-01-15T10:00:00Z",
    "traceId": "trace-uuid"
  }
}
```

**Frontend:**
```javascript
// Отображение сообщения об ошибке
<ErrorMessage
  message="Маршрут не найден"
  action={<Button onClick={handleRetry}>Попробовать снова</Button>}
/>
```

---

## 10. Тестирование обработки ошибок

### 10.1 Unit тесты

**Пример:**
```javascript
describe('ErrorHandler', () => {
  it('should return 400 for validation error', () => {
    const error = new ValidationError('Invalid email');
    const response = errorHandler.handle(error);
    
    expect(response.statusCode).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

### 10.2 Integration тесты

**Пример:**
```javascript
describe('POST /api/v1/orders', () => {
  it('should return 400 for invalid order data', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .send({ invalid: 'data' });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## 11. Будущие улучшения

### 11.1 Централизованное логирование
- Интеграция с Sentry или аналогичным сервисом
- Агрегация ошибок
- Автоматические алерты

### 11.2 Улучшенная обработка
- Retry logic для временных ошибок
- Circuit breaker для защиты от каскадных отказов
- Graceful degradation для критических сервисов

