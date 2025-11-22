# Troubleshooting Guide

Руководство по решению типичных проблем Travel App Backend.

## Содержание

- [Проблемы запуска](#проблемы-запуска)
- [Проблемы с базой данных](#проблемы-с-базой-данных)
- [Проблемы с Redis](#проблемы-с-redis)
- [Проблемы производительности](#проблемы-производительности)
- [Проблемы с API](#проблемы-с-api)
- [Проблемы с графом маршрутов](#проблемы-с-графом-маршрутов)

## Проблемы запуска

### Проблема: Приложение не запускается

**Симптомы:**
- Ошибка при запуске `npm start`
- Контейнер падает сразу после запуска

**Решение:**

1. **Проверьте переменные окружения:**
   ```bash
   # Убедитесь, что все обязательные переменные установлены
   env | grep -E "DB_|REDIS_|JWT_"
   ```

2. **Проверьте логи:**
   ```bash
   # Docker
   docker compose logs backend
   
   # PM2
   pm2 logs travel-app-backend
   ```

3. **Проверьте доступность зависимостей:**
   ```bash
   # PostgreSQL
   psql -h localhost -U travel_user -d travel_app -c "SELECT 1"
   
   # Redis
   redis-cli -h localhost -p 6379 -a <password> ping
   ```

4. **Проверьте порт:**
   ```bash
   # Убедитесь, что порт 5000 свободен
   lsof -i :5000
   # или
   netstat -an | grep 5000
   ```

### Проблема: Ошибка "Cannot find module"

**Симптомы:**
```
Error: Cannot find module 'express'
```

**Решение:**

1. **Переустановите зависимости:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Проверьте версию Node.js:**
   ```bash
   node --version  # Должна быть 20.x или выше
   ```

### Проблема: Ошибка компиляции TypeScript

**Симптомы:**
```
error TS2307: Cannot find module
```

**Решение:**

1. **Проверьте tsconfig.json:**
   ```bash
   npm run type-check
   ```

2. **Пересоберите проект:**
   ```bash
   npm run build
   ```

## Проблемы с базой данных

### Проблема: "Connection refused" к PostgreSQL

**Симптомы:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Решение:**

1. **Проверьте, запущен ли PostgreSQL:**
   ```bash
   # Docker
   docker compose ps postgres
   
   # Systemd
   systemctl status postgresql
   ```

2. **Проверьте переменные окружения:**
   ```bash
   echo $DB_HOST
   echo $DB_PORT
   echo $DB_NAME
   echo $DB_USER
   ```

3. **Проверьте доступность:**
   ```bash
   telnet $DB_HOST $DB_PORT
   ```

4. **Проверьте firewall:**
   ```bash
   # Если PostgreSQL на удаленном сервере
   sudo ufw allow 5432/tcp
   ```

### Проблема: "Too many connections"

**Симптомы:**
```
Error: remaining connection slots are reserved
```

**Решение:**

1. **Увеличьте лимит соединений в PostgreSQL:**
   ```sql
   -- В postgresql.conf
   max_connections = 200
   ```

2. **Уменьшите размер пула в приложении:**
   ```bash
   DB_POOL_MAX=20
   ```

3. **Проверьте активные соединения:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

### Проблема: Медленные запросы к БД

**Симптомы:**
- Высокий `db_query_duration_seconds`
- Медленные ответы API

**Решение:**

1. **Проверьте индексы:**
   ```sql
   -- Найти таблицы без индексов
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename NOT IN (
     SELECT tablename FROM pg_indexes WHERE schemaname = 'public'
   );
   ```

2. **Проверьте медленные запросы:**
   ```sql
   -- Включить логирование медленных запросов
   -- В postgresql.conf:
   log_min_duration_statement = 1000  -- логировать запросы > 1 сек
   ```

3. **Оптимизируйте запросы:**
   - Используйте `EXPLAIN ANALYZE` для анализа планов запросов
   - Добавьте недостающие индексы
   - Используйте `SELECT` только нужных полей (не `SELECT *`)

## Проблемы с Redis

### Проблема: "Connection refused" к Redis

**Симптомы:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Решение:**

1. **Проверьте, запущен ли Redis:**
   ```bash
   # Docker
   docker compose ps redis
   
   # Systemd
   systemctl status redis
   ```

2. **Проверьте переменные окружения:**
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   echo $REDIS_PASSWORD
   ```

3. **Проверьте доступность:**
   ```bash
   redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
   ```

### Проблема: "NOAUTH Authentication required"

**Симптомы:**
```
Error: NOAUTH Authentication required
```

**Решение:**

1. **Проверьте пароль:**
   ```bash
   # Убедитесь, что REDIS_PASSWORD установлен правильно
   redis-cli -h localhost -p 6379 -a <password> ping
   ```

2. **Проверьте конфигурацию Redis:**
   ```bash
   # В redis.conf должно быть:
   requirepass <password>
   ```

### Проблема: Высокое использование памяти Redis

**Симптомы:**
- Redis использует много памяти
- Ошибки "OOM command not allowed"

**Решение:**

1. **Проверьте использование памяти:**
   ```bash
   redis-cli INFO memory
   ```

2. **Очистите старые ключи:**
   ```bash
   # Найти ключи с TTL
   redis-cli --scan --pattern "*" | while read key; do
     ttl=$(redis-cli TTL "$key")
     if [ $ttl -eq -1 ]; then
       echo "Key without TTL: $key"
     fi
   done
   ```

3. **Настройте maxmemory policy:**
   ```bash
   # В redis.conf:
   maxmemory 2gb
   maxmemory-policy allkeys-lru
   ```

## Проблемы производительности

### Проблема: Медленные HTTP запросы

**Симптомы:**
- Высокий `http_request_duration_seconds`
- Медленные ответы API

**Решение:**

1. **Проверьте метрики:**
   ```bash
   curl http://localhost:5000/api/v1/metrics | grep http_request_duration_seconds
   ```

2. **Оптимизируйте запросы к БД:**
   - Используйте индексы
   - Избегайте N+1 запросов
   - Используйте `SELECT` только нужных полей

3. **Используйте кеширование:**
   - Проверьте, работает ли Redis кеш
   - Увеличьте TTL для часто запрашиваемых данных

4. **Проверьте нагрузку:**
   ```bash
   # CPU
   top
   
   # Memory
   free -h
   
   # Network
   iftop
   ```

### Проблема: Высокое использование CPU

**Симптомы:**
- CPU usage > 80%
- Медленные ответы

**Решение:**

1. **Проверьте активные процессы:**
   ```bash
   top -p $(pgrep -f "node.*index.js")
   ```

2. **Проверьте логи на ошибки:**
   ```bash
   grep -i error /var/log/travel-app-backend/*.log
   ```

3. **Оптимизируйте код:**
   - Избегайте синхронных операций
   - Используйте пулы соединений
   - Кешируйте результаты вычислений

## Проблемы с API

### Проблема: 500 Internal Server Error

**Симптомы:**
- API возвращает 500 ошибки
- В логах ошибки

**Решение:**

1. **Проверьте логи:**
   ```bash
   docker compose logs backend | grep -i error
   ```

2. **Проверьте health check:**
   ```bash
   curl http://localhost:5000/health
   ```

3. **Проверьте зависимости:**
   ```bash
   curl http://localhost:5000/health/ready
   ```

### Проблема: 429 Too Many Requests

**Симптомы:**
- API возвращает 429 ошибки
- Сообщение "Rate limit exceeded"

**Решение:**

1. **Проверьте лимиты:**
   ```bash
   echo $RATE_LIMIT_MAX_REQUESTS
   echo $RATE_LIMIT_WINDOW_MS
   ```

2. **Увеличьте лимиты (если необходимо):**
   ```bash
   RATE_LIMIT_MAX_REQUESTS=200
   RATE_LIMIT_WINDOW_MS=900000
   ```

3. **Проверьте, не атака ли это:**
   ```bash
   # Проверьте IP адреса с большим количеством запросов
   grep "429" /var/log/travel-app-backend/*.log | awk '{print $NF}' | sort | uniq -c | sort -rn
   ```

### Проблема: 400 Validation Error

**Симптомы:**
- API возвращает 400 ошибки
- Сообщение "Validation error"

**Решение:**

1. **Проверьте формат запроса:**
   ```bash
   # Убедитесь, что запрос соответствует схеме
   curl -X POST http://localhost:5000/api/v1/routes/risk/assess \
     -H "Content-Type: application/json" \
     -d '{"route": {...}}'
   ```

2. **Проверьте Swagger документацию:**
   ```bash
   # Откройте http://localhost:5000/api-docs
   ```

## Проблемы с графом маршрутов

### Проблема: Граф недоступен

**Симптомы:**
- `/health` возвращает `graphAvailable: false`
- Поиск маршрутов не работает

**Решение:**

1. **Проверьте статус графа:**
   ```bash
   curl http://localhost:5000/health | jq '.dependencies.graph'
   ```

2. **Запустите воркер построения графа:**
   ```bash
   npm run worker:graph-builder
   ```

3. **Проверьте Redis:**
   ```bash
   # Убедитесь, что граф сохранен в Redis
   redis-cli KEYS "graph:*"
   ```

4. **Проверьте логи воркера:**
   ```bash
   docker compose logs backend | grep -i "graph"
   ```

### Проблема: Граф не обновляется

**Симптомы:**
- Граф устарел
- Новые маршруты не появляются

**Решение:**

1. **Проверьте последнее обновление:**
   ```bash
   curl http://localhost:5000/health | jq '.dependencies.graph.lastBuilt'
   ```

2. **Запустите воркер вручную:**
   ```bash
   npm run worker:graph-builder
   ```

3. **Настройте автоматический запуск:**
   ```bash
   # Добавьте в cron
   0 */6 * * * cd /path/to/backend && npm run worker:graph-builder
   ```

## Общие рекомендации

1. **Всегда проверяйте логи** при возникновении проблем
2. **Используйте health checks** для диагностики
3. **Мониторьте метрики** для раннего обнаружения проблем
4. **Создавайте резервные копии** перед изменениями
5. **Тестируйте изменения** в staging окружении перед продакшеном

## Получение помощи

Если проблема не решена:

1. **Соберите информацию:**
   - Логи приложения
   - Метрики Prometheus
   - Результаты health checks
   - Версия Node.js и зависимостей

2. **Проверьте документацию:**
   - [DEPLOYMENT.md](./DEPLOYMENT.md)
   - [MONITORING.md](./MONITORING.md)
   - [README.md](./README.md)

3. **Создайте issue** в репозитории с подробным описанием проблемы

