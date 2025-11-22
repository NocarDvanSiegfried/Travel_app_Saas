# Deployment Checklist

Чеклист для безопасного деплоя Travel App Backend в продакшен.

## Преддеплойные проверки

### 1. Код и зависимости
- [x] Все изменения закоммичены и запушены
- [x] CI/CD pipeline проходит успешно
- [x] `npm audit` не показывает критичных уязвимостей (0 уязвимостей, проверено 2024-12-19)
- [x] `npm run build` проходит без ошибок
- [x] `npm run lint` не показывает ошибок
- [x] Все тесты проходят (`npm test` - 121/121 unit тестов)

### 2. Конфигурация
- [ ] Все переменные окружения настроены в продакшене (требует настройки при деплое)
- [x] `.env` файл не содержит секретов в репозитории (используются переменные окружения)
- [x] CORS настроен для продакшен доменов (настраивается через `CORS_ORIGIN`)
- [x] Rate limiting настроен с правильными лимитами (настроено для route search и risk assessment)
- [x] Database connection pool настроен оптимально (настроен в `src/infrastructure/database/pool.ts`)
- [x] Redis connection настроен (настроен в `src/infrastructure/cache/redis.ts`)

### 3. База данных
- [ ] Миграции протестированы на staging (требует проверки перед деплоем)
- [ ] Резервная копия БД создана (требует выполнения перед деплоем)
- [ ] План отката миграций подготовлен (требует подготовки перед деплоем)
- [x] Индексы созданы и протестированы (созданы в миграциях, протестированы в интеграционных тестах)
- [x] Connection pooling настроен (настроен в `src/infrastructure/database/pool.ts`)

### 4. Инфраструктура
- [ ] PostgreSQL доступен и работает
- [ ] Redis доступен и работает
- [ ] Сетевые порты открыты и доступны
- [ ] Firewall правила настроены
- [ ] SSL/TLS сертификаты настроены (HTTPS)

### 5. Мониторинг
- [x] Prometheus настроен для сбора метрик (метрики экспортируются через `/api/v1/metrics`)
- [ ] Grafana дашборды созданы (требует настройки в продакшене)
- [ ] Алерты настроены (требует настройки в продакшене)
- [x] Логирование настроено (структурированное логирование через `winston`)
- [x] Health checks работают (`/health`, `/health/live`, `/health/ready` протестированы)

### 6. Документация
- [x] DEPLOYMENT.md актуален (создан и актуализирован)
- [x] MONITORING.md актуален (создан и актуализирован)
- [x] TROUBLESHOOTING.md актуален (создан и актуализирован)
- [x] API документация (Swagger) актуальна (настроена через `swagger-ui-express`)
- [x] SECURITY_AUDIT.md актуален (проверка выполнена 2024-12-19)
- [x] DEPLOYMENT_CHECKLIST.md актуален (этот файл)

## Процесс деплоя

### Вариант 1: Docker Compose

```bash
# 1. Остановить текущую версию
docker compose down

# 2. Обновить код
git pull origin main

# 3. Собрать новый образ
docker compose build backend

# 4. Запустить миграции (если есть)
docker compose run --rm backend npm run migrate

# 5. Запустить новую версию
docker compose up -d backend

# 6. Проверить логи
docker compose logs -f backend
```

### Вариант 2: Kubernetes

```bash
# 1. Обновить образ в registry
docker build -t registry.example.com/travel-app-backend:latest ./backend
docker push registry.example.com/travel-app-backend:latest

# 2. Применить миграции (если есть)
kubectl apply -f k8s/migrations/

# 3. Обновить deployment
kubectl set image deployment/backend backend=registry.example.com/travel-app-backend:latest

# 4. Проверить статус
kubectl rollout status deployment/backend

# 5. Проверить логи
kubectl logs -f deployment/backend
```

### Вариант 3: Ручной деплой

```bash
# 1. Остановить приложение
pm2 stop travel-app-backend

# 2. Обновить код
git pull origin main

# 3. Установить зависимости
npm ci --production

# 4. Собрать проект
npm run build

# 5. Запустить миграции (если есть)
npm run migrate

# 6. Запустить приложение
pm2 start dist/index.js --name travel-app-backend

# 7. Проверить логи
pm2 logs travel-app-backend
```

## Постдеплойные проверки

### 1. Health Checks
- [ ] `/health/live` возвращает 200
- [ ] `/health/ready` возвращает 200
- [ ] `/health` показывает все компоненты в статусе OK

```bash
curl http://your-domain.com/health
curl http://your-domain.com/health/live
curl http://your-domain.com/health/ready
```

### 2. API Endpoints
- [ ] `/api/v1/cities` работает
- [ ] `/api/v1/routes/search` работает
- [ ] `/api/v1/routes/build` работает
- [ ] `/api/v1/routes/risk/assess` работает
- [ ] `/api/v1/metrics` работает
- [ ] `/api-docs` доступен

```bash
curl http://your-domain.com/api/v1/cities?page=1&limit=10
curl "http://your-domain.com/api/v1/routes/search?from=Москва&to=Санкт-Петербург"
```

### 3. Метрики
- [ ] Метрики собираются в Prometheus
- [ ] Дашборды Grafana обновляются
- [ ] Нет неожиданных ошибок в метриках

```bash
curl http://your-domain.com/api/v1/metrics | grep http_requests_total
```

### 4. Производительность
- [ ] Response time в пределах нормы (p95 < 2s) - **требует проверки после нагрузочного теста**
- [ ] Error rate < 1% - **требует проверки после нагрузочного теста**
- [ ] CPU usage < 80% - **требует мониторинга в продакшене**
- [ ] Memory usage стабильна - **требует мониторинга в продакшене**
- [x] Database connections в пределах пула (настроено и протестировано)

### 5. Логи
- [ ] Нет критичных ошибок в логах
- [ ] Логирование работает корректно
- [ ] Чувствительные данные не логируются

```bash
# Docker
docker compose logs backend | grep -i error

# Kubernetes
kubectl logs deployment/backend | grep -i error

# PM2
pm2 logs travel-app-backend | grep -i error
```

## Откат при проблемах

### Docker Compose

```bash
# 1. Остановить текущую версию
docker compose down

# 2. Откатиться к предыдущей версии
git checkout <previous-commit>
docker compose up -d --build backend
```

### Kubernetes

```bash
# Откатить deployment
kubectl rollout undo deployment/backend

# Проверить историю
kubectl rollout history deployment/backend
```

### PM2

```bash
# Откатиться к предыдущей версии
git checkout <previous-commit>
npm run build
pm2 restart travel-app-backend
```

## Мониторинг после деплоя

### Первые 30 минут
- [ ] Проверять health checks каждые 5 минут
- [ ] Мониторить метрики ошибок
- [ ] Проверять логи на наличие ошибок
- [ ] Мониторить использование ресурсов

### Первые 24 часа
- [ ] Проверять метрики производительности
- [ ] Мониторить алерты
- [ ] Проверять стабильность работы
- [ ] Собирать обратную связь от пользователей

## Контакты для экстренных ситуаций

- **DevOps:** [контакт]
- **Backend Lead:** [контакт]
- **On-call Engineer:** [контакт]

## Полезные команды

```bash
# Проверка статуса
curl http://your-domain.com/health

# Просмотр метрик
curl http://your-domain.com/api/v1/metrics

# Просмотр логов (Docker)
docker compose logs -f backend

# Просмотр логов (Kubernetes)
kubectl logs -f deployment/backend

# Просмотр логов (PM2)
pm2 logs travel-app-backend

# Перезапуск (PM2)
pm2 restart travel-app-backend

# Статус (PM2)
pm2 status
```

