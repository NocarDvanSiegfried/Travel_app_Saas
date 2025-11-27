# Load Tests

Нагрузочные тесты для SMART Multimodal Routing System.

## Инструменты

- **k6**: Основной инструмент для нагрузочного тестирования
- **autocannon**: Альтернативный инструмент для быстрых тестов

## Установка k6

### Windows
```powershell
# Используя Chocolatey
choco install k6

# Или скачать с https://k6.io/docs/getting-started/installation/
```

### macOS
```bash
brew install k6
```

### Linux
```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Структура тестов

```
load/
├── api/
│   ├── route-building.load.js      # POST /smart-routes/build
│   ├── autocomplete.load.js        # GET /smart-routes/autocomplete
│   └── connectivity.load.js       # GET /smart-routes/connectivity
└── scenarios/
    ├── peak-load.scenario.js       # Пиковая нагрузка (500 RPS)
    └── stress-test.scenario.js     # Стресс-тест (1000 RPS)
```

## Запуск тестов

### Предварительные требования

1. Запустить backend API:
```bash
cd backend
docker compose up backend
# или
npm run dev
```

2. Убедиться, что API доступен:
```bash
curl http://localhost:3000/api/v1/health
```

### Базовые тесты

#### Построение маршрутов
```bash
cd backend/src/__tests__/load/api
k6 run route-building.load.js
```

#### Автодополнение
```bash
k6 run autocomplete.load.js
```

#### Проверка связности
```bash
k6 run connectivity.load.js
```

### Сценарии

#### Пиковая нагрузка
```bash
cd backend/src/__tests__/load/scenarios
k6 run peak-load.scenario.js
```

#### Стресс-тест
```bash
k6 run stress-test.scenario.js
```

### С кастомным BASE_URL

```bash
K6_BASE_URL=http://localhost:3000 k6 run route-building.load.js
```

## Метрики

### Производительность
- **RPS (Requests Per Second)**: Количество успешных запросов в секунду
- **Latency**: Время ответа (P50, P95, P99)
- **Throughput**: Пропускная способность (запросов/сек)

### Надёжность
- **Error Rate**: Процент ошибок (< 1% для нормальной нагрузки, < 5% для стресс-теста)
- **Success Rate**: Процент успешных запросов (> 99%)
- **Timeout Rate**: Процент таймаутов

### Пороговые значения (Thresholds)

#### route-building.load.js
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 1%
- Success rate > 99%

#### autocomplete.load.js
- P95 latency < 100ms
- P99 latency < 200ms
- Error rate < 0.1%
- Success rate > 99.9%

#### connectivity.load.js
- P95 latency < 5000ms
- P99 latency < 10000ms
- Error rate < 1%
- Success rate > 99%

#### peak-load.scenario.js
- P95 latency < 2000ms
- P99 latency < 5000ms
- Error rate < 1%
- Success rate > 99%

#### stress-test.scenario.js
- P95 latency < 5000ms
- P99 latency < 10000ms
- Error rate < 5%
- Success rate > 95%

## Интерпретация результатов

### Успешный тест
- Все пороговые значения соблюдены
- Error rate в пределах допустимого
- Latency соответствует требованиям

### Проблемы производительности
- **Высокий error rate**: Проверить логи сервера, возможно нехватка ресурсов
- **Высокая latency**: Оптимизировать запросы к БД, кэширование
- **Таймауты**: Увеличить таймауты или оптимизировать медленные запросы

### Рекомендации
- Запускать тесты на production-like окружении
- Мониторить ресурсы сервера (CPU, память, сеть) во время тестов
- Сравнивать результаты между версиями
- Документировать изменения производительности

## Автоматизация

### CI/CD интеграция
```yaml
# .github/workflows/load-test.yml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * *' # Ежедневно в 2:00
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/k6-action@v0.2.0
        with:
          filename: backend/src/__tests__/load/api/route-building.load.js
          cloud: true
          token: ${{ secrets.K6_CLOUD_TOKEN }}
```

## Дополнительные инструменты

### k6 Cloud
Для визуализации и хранения результатов:
```bash
k6 cloud route-building.load.js
```

### k6 InfluxDB
Для сохранения метрик в InfluxDB:
```bash
K6_OUT=influxdb=http://localhost:8086/k6 k6 run route-building.load.js
```

### Grafana Dashboard
Импортировать dashboard для визуализации метрик k6.




