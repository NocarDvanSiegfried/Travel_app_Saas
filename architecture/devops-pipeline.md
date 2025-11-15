# DevOps Pipeline (MVP)

## 1. Общие принципы

### 1.1 Цель Pipeline
- **Автоматизация** сборки, тестирования и развертывания
- **Качество кода** через линтинг и тесты
- **Быстрое развертывание** для MVP
- **Минимальная сложность** для начала

### 1.2 Инструменты
- **Git** — контроль версий
- **GitHub Actions / GitLab CI** — CI/CD
- **Docker** — контейнеризация
- **Docker Compose** — оркестрация

---

## 2. Git Workflow

### 2.1 Ветвление

**Стратегия:**
- **main** — продакшн код
- **develop** — разработка
- **feature/** — новые функции
- **bugfix/** — исправления багов
- **hotfix/** — критические исправления

---

### 2.2 Правила коммитов

**Формат:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Типы:**
- `feat` — новая функция
- `fix` — исправление бага
- `docs` — документация
- `style` — форматирование
- `refactor` — рефакторинг
- `test` — тесты
- `chore` — рутинные задачи

**Примеры:**
```
feat(orders): add order creation endpoint
fix(auth): fix JWT token expiration
docs(api): update API documentation
```

---

## 3. CI Pipeline

### 3.1 Этапы Pipeline

**Последовательность:**
1. **Lint** — проверка кода
2. **Test** — запуск тестов
3. **Build** — сборка приложения
4. **Deploy** — развертывание (опционально)

---

### 3.2 Lint Stage

**Задачи:**
- Проверка синтаксиса
- Проверка стиля кода
- Проверка типов (TypeScript)

**Пример (GitHub Actions):**
```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm run lint
    - run: npm run type-check
```

---

### 3.3 Test Stage

**Задачи:**
- Unit тесты
- Integration тесты
- E2E тесты (опционально)

**Пример:**
```yaml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm run test
    - run: npm run test:integration
```

---

### 3.4 Build Stage

**Задачи:**
- Сборка Frontend
- Сборка Backend
- Создание Docker образов

**Пример:**
```yaml
build:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Build Docker images
      run: |
        docker-compose build
    - name: Test Docker images
      run: |
        docker-compose up -d
        docker-compose ps
```

---

## 4. CD Pipeline (опционально для MVP)

### 4.1 Развертывание

**Стратегия:**
- **Manual deployment** для MVP
- **Automatic deployment** для staging
- **Approval required** для production

---

### 4.2 Deploy Stage

**Задачи:**
- Push Docker образов в registry
- Развертывание на сервер
- Проверка работоспособности

**Пример:**
```yaml
deploy:
  needs: [lint, test, build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v3
    - name: Deploy to server
      run: |
        # Deployment commands
```

---

## 5. Правила lint/test/build

### 5.1 Lint Rules

**Frontend:**
- ESLint с правилами React
- Prettier для форматирования
- TypeScript strict mode

**Backend:**
- ESLint с правилами Node.js
- Prettier для форматирования
- TypeScript strict mode

---

### 5.2 Test Rules

**Требования:**
- Минимум 70% покрытие кода
- Все тесты должны проходить
- Тесты должны быть быстрыми (< 5 минут)

---

### 5.3 Build Rules

**Требования:**
- Успешная сборка без ошибок
- Оптимизация размера bundle
- Проверка Docker образов

---

## 6. Ветвление Git

### 6.1 Feature Branch

**Процесс:**
1. Создание ветки `feature/feature-name` от `develop`
2. Разработка функции
3. Коммиты с понятными сообщениями
4. Push в remote
5. Создание Pull Request
6. Code review
7. Merge в `develop`

---

### 6.2 Bugfix Branch

**Процесс:**
1. Создание ветки `bugfix/bug-name` от `develop`
2. Исправление бага
3. Тесты
4. Pull Request
5. Merge в `develop`

---

### 6.3 Hotfix Branch

**Процесс:**
1. Создание ветки `hotfix/hotfix-name` от `main`
2. Исправление критического бага
3. Тесты
4. Merge в `main` и `develop`
5. Развертывание

---

## 7. Прод-процесс

### 7.1 Подготовка к релизу

**Шаги:**
1. Обновление версии
2. Обновление CHANGELOG
3. Создание release branch
4. Финальное тестирование
5. Merge в `main`

---

### 7.2 Развертывание в production

**Шаги:**
1. Сборка Docker образов
2. Тегирование версии
3. Развертывание на сервер
4. Проверка работоспособности
5. Мониторинг после развертывания

---

### 7.3 Откат (Rollback)

**Процесс:**
1. Определение версии для отката
2. Развертывание предыдущей версии
3. Проверка работоспособности
4. Анализ проблемы

---

## 8. Примеры конфигурации

### 8.1 GitHub Actions

**`.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: docker-compose build
```

---

## 9. Мониторинг Pipeline

### 9.1 Метрики

**Отслеживаемые метрики:**
- Время выполнения pipeline
- Процент успешных сборок
- Количество ошибок
- Время развертывания

---

### 9.2 Алерты

**Условия:**
- Неудачная сборка
- Неудачные тесты
- Проблемы с развертыванием

---

## 10. Будущие улучшения

### 10.1 Расширенный CI/CD
- Автоматическое развертывание
- Blue-green deployment
- Canary releases
- Автоматическое тестирование производительности

### 10.2 Интеграции
- Интеграция с мониторингом
- Автоматические алерты
- Интеграция с системами управления задачами



