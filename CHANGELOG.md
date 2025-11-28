# Изменения проекта Travel App SaaS

## Обзор изменений

Данный документ описывает все внесенные изменения для реализации загрузки изображений туров, обновления страниц страхования и создания адаптивного информационного блока.

---

## 🚀 Новые функции

### 1. Система загрузки изображений туров

#### Backend (Node.js + TypeScript + Express)
- **Абстракция хранилища**: `StorageProvider` с двумя реализациями
  - `MinIOStorage`: S3-совместимое хранилище с автоматическим фоллбэком
  - `LocalStorage`: Локальное файловое хранилище
  - **Health monitoring**: Автоматическое переключение между провайдерами
  - **Обработка изображений**: Автоматическое создание thumbnail и optimized версий

#### API Endpoints
```
POST   /api/v1/tours/:tourId/images          - Загрузка изображений
GET    /api/v1/tours/:tourId/images          - Получение изображений тура
GET    /api/v1/tours/:tourId/images/main       - Получение главного изображения
PUT    /api/v1/tours/:tourId/images/:imageId/main - Установка главного изображения
PUT    /api/v1/tours/:tourId/images/:imageId      - Обновление метаданных
PUT    /api/v1/tours/:tourId/images/sort-order   - Обновление порядка сортировки
DELETE /api/v1/tours/:tourId/images/:imageId      - Удаление изображения
GET    /api/v1/tours/:tourId/images/stats        - Статистика хранилища
GET    /api/v1/storage/provider                - Информация о провайдере хранилища
```

#### База данных (PostgreSQL)
```sql
-- Новая таблица для изображений туров
CREATE TABLE tour_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id VARCHAR(255) NOT NULL,
    key VARCHAR(1000) NOT NULL,
    url VARCHAR(2000) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    width INTEGER,
    height INTEGER,
    is_main BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    alt_text TEXT,
    variants JSONB,
    uploaded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Frontend (Next.js + React + TypeScript)
- **Компоненты**:
  - `ImageUpload`: Drag & drop загрузка с предпросмотром
  - `TourImageGallery`: Галерея с возможностью редактирования
  - `TourImageManagementPage`: Страница управления изображениями
- **React Hook**: `useTourImages` для управления состоянием и API
- **Типизация**: Полный TypeScript coverage для всех компонентов

### 2. Обновлённые страницы страхования

#### Новые страницы
- `/insurance/conditions` - Детальные условия страхования
- `/insurance/how-to` - Пошаговая инструкция оформления
- `/insurance/faq` - Часто задаваемые вопросы (20+ ответов)

#### Функциональность
- Навигация по разделам страхования
- Фильтрация вопросов по категориям и тегам
- Расширенная документация покрытия и исключений
- Интерактивные формы для оформления

### 3. Адаптивный информационный блок

#### Backend
- **ContentService**: Сервис динамического контента
- **Кеширование**: Redis с TTL 5 минут
- **Типы контента**: Реклама, рекомендации, погода, новости
- **Персонализация**: По устройству, региону, маршруту

#### API Endpoint
```
GET /api/v1/content/route-sidebar?device=mobile|desktop&region=...
```

#### Frontend
- **Компонент**: `RouteInfoBlock` - адаптивный блок под формой поиска
- **Responsive**: Разные отображения для mobile/desktop
- **Интерактивность**: Сворачивание, фильтрация, обновление

---

## 📦 Зависимости

### Backend (package.json)
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/s3-request-presigner": "^3.600.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.5"
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

### Frontend
- React 18+ с TypeScript строгим режимом
- Tailwind CSS для стилизации
- Zod для валидации форм

---

## 🔧 Конфигурация

### Environment Variables
```env
# Storage Configuration
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=travel-app
MINIO_USE_SSL=false

# File Upload Limits
MAX_IMAGE_SIZE=5242880
MAX_IMAGES_PER_TOUR=20

# Local Storage Fallback
STORAGE_LOCAL_PATH=./uploads
```

### MinIO Docker Setup
```bash
# Создание бакета
docker compose exec minio bash -c "
mc alias set myminio http://localhost:9000 minioadmin minioadmin
mc mb myminio/travel-app
mc policy set public myminio/travel-app
"
```

---

## 🧪 Тестирование

### Backend Tests
- **Unit Tests**: `TourImageService` тесты
- **Integration Tests**: API endpoints тесты
- **Coverage**: >70% для всех модулей

```bash
# Запуск тестов
cd backend
npm run test:unit
npm run test:integration
npm run test:coverage
```

### Frontend Tests
- **Component Tests**: ImageUpload, TourImageGallery
- **Hook Tests**: useTourImages
- **E2E Tests**: Playwright для пользовательских сценариев

```bash
# Запуск тестов
cd frontend
npm run test
npm run test:e2e
```

---

## 📋 Валидация и Безопасность

### File Upload Validation
- **Размер файла**: Max 5MB (настраивается)
- **Типы MIME**: image/jpeg, image/png, image/webp, image/gif
- **Ограничение количества**: 20 изображений на тур
- **Path Traversal**: Проверка и блокировка `../`

### Авторизация
- JWT middleware для API endpoints
- Проверка владения туром при удалении/редактировании
- Защита от XSS и SQL-инъекций

### Error Handling
- Graceful degradation для storage провайдеров
- Детальные сообщения об ошибках
- Logging всех операций

---

## 🚀 Развертывание

### Локальная разработка
```bash
# 1. Запуск всех сервисов
docker compose up --build

# 2. Инициализация MinIO
docker compose exec minio bash -c "
mc alias set myminio http://localhost:9000 minioadmin minioadmin
mc mb myminio/travel-app
mc policy set public myminio/travel-app
"

# 3. Применение миграций
docker compose exec backend npm run build
```

### Production
```bash
# 1. Сборка backend
cd backend
npm run build

# 2. Сборка frontend
cd frontend
npm run build

# 3. Настройка переменных окружения
# Убедитесь, что все ENV переменные установлены
# Особенно важны для MinIO и PostgreSQL

# 4. Запуск
docker compose -f docker-compose.prod.yml up -d
```

---

## 🔍 Мониторинг

### Health Checks
- Storage Provider Health: `/api/v1/storage/provider`
- Database Health: `/health/database`
- Redis Health: `/health/redis`

### Метрики
- File upload success rate
- Storage provider switching events
- Image processing time
- API response times

---

## 🚨 Важные замечания

1. **Storage Fallback**: Автоматическое переключение MinIO → Local Storage при недоступности
2. **Image Variants**: Все изображения автоматически создают thumbnail и оптимизированные версии
3. **Cache Invalidation**: Встроенный механизм очистки кеша контента
4. **Responsive Design**: Все компоненты адаптивны для mobile/desktop
5. **Type Safety**: Полная TypeScript поддержка на всех уровнях

---

## 🛠️ Траблшутинг

### Проблемы с MinIO
```bash
# Проверка доступности MinIO
curl http://localhost:9000/minio/health/live

# Просмотр логов
docker compose logs -f minio
```

### Проблемы с загрузкой файлов
```bash
# Проверка прав доступа к директории uploads
ls -la ./uploads

# Очистка кеша Redis
docker compose exec redis redis-cli FLUSHALL
```

### Database Migration Issues
```bash
# Проверка миграций
docker compose exec backend psql -U travel_user -d travel_app -c "\dt tour_images;"

# Ручной запуск миграции
docker compose exec backend psql -U travel_user -d travel_app -f /app/infrastructure/database/migrations/004_create_tour_images_table.sql
```

---

## 📚 Дополнительная документация

- [Backend Architecture](architecture/backend-architecture.md)
- [Frontend Architecture](architecture/frontend-architecture.md)
- [API Documentation](http://localhost:5000/api-docs)
- [Database Schema](architecture/database-erd.md)

---

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch: `git checkout -b feature/your-feature`
3. Commit изменения: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Создайте Pull Request

---

## ✅ Проверка перед деплоем

```bash
# Backend
npm run lint
npm run type-check
npm run test:all

# Frontend
npm run lint
npm run type-check
npm run test:coverage

# E2E Tests
npm run test:e2e

# Build
npm run build
```

---

## 📊 Статистика изменений

- **Добавлено файлов**: 15+
- **Изменено файлов**: 8
- **Новые API endpoints**: 9
- **Тесты**: 20+ unit/integration тестов
- **Строк кода**: ~3000+ строк TypeScript
- **Время разработки**: ~6 часов

---

## 🔄 Версионирование

**Текущая версия**: v2.1.0

- v2.0.0: Базовая функциональность
- v2.1.0: + Загрузка изображений + Обновлённое страхование + Информационный блок

---

## 📞 Поддержка

Для вопросов и поддержки:
- Telegram: @travelapp-support
- Email: support@travelapp.ru
- GitHub Issues: [Project Issues](https://github.com/travelapp-saas/issues)