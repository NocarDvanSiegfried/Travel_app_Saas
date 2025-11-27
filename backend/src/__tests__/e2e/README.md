# E2E Tests with Playwright

End-to-end тесты для SMART Multimodal Routing System с использованием Playwright.

## Структура

```
e2e/
├── global.setup.ts          # Глобальная настройка (выполняется один раз)
├── global.teardown.ts       # Глобальная очистка (выполняется один раз)
├── smart-routes/            # Тесты для Smart Routes API
│   ├── build-route.test.ts  # Построение маршрутов
│   ├── autocomplete.test.ts # Автодополнение городов
│   ├── connectivity.test.ts # Проверка связности
│   └── reality-check.test.ts # Проверка реалистичности
└── README.md                # Этот файл
```

## Запуск тестов

### Установка Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Запуск всех E2E тестов

```bash
npm run test:e2e:playwright
```

### Запуск с UI

```bash
npm run test:e2e:playwright:ui
```

### Запуск в headed режиме

```bash
npm run test:e2e:playwright:headed
```

### Запуск конкретного теста

```bash
npx playwright test smart-routes/build-route
```

## Конфигурация

Конфигурация находится в `backend/playwright.config.ts`.

### Переменные окружения

- `API_BASE_URL` - базовый URL API (по умолчанию: `http://localhost:3001`)

## Требования

- Запущенный backend API сервер (автоматически запускается через `webServer`)
- Доступность PostgreSQL и Redis (через Docker Compose)

## Сценарии тестирования

### Build Route (`/smart-routes/build`)

- ✅ Простой маршрут (автобус)
- ✅ Маршрут через хабы (авиа)
- ✅ Мультимодальный маршрут
- ✅ Валидация входных данных
- ✅ Ограничение пересадок
- ✅ Сезонность транспорта

### Autocomplete (`/smart-routes/autocomplete`)

- ✅ Автодополнение по частичному названию
- ✅ Административная структура
- ✅ Ограничение результатов
- ✅ Обработка пустых запросов
- ✅ Регистронезависимый поиск

### Connectivity (`/smart-routes/connectivity`)

- ✅ Проверка связности графа
- ✅ Гарантия связности
- ✅ Обнаружение изолированных городов

### Reality Check (`/smart-routes/reality-check`)

- ✅ Проверка реалистичности маршрута
- ✅ Обнаружение несоответствий
- ✅ Предложения по коррекции

## Отчёты

После запуска тестов отчёт доступен по адресу:

```bash
npx playwright show-report
```

## Troubleshooting

### API недоступен

Убедитесь, что backend сервер запущен:

```bash
docker compose up backend
```

или

```bash
npm run docker:dev
```

### Timeout ошибки

Увеличьте `timeout` в `playwright.config.ts`:

```typescript
timeout: 120 * 1000, // 2 минуты
```




