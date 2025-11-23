# Технологический стек LenaLink

## Frontend Stack
**Next.js 14** + **React 18** + **TypeScript** — SSR/SSG, производительность, SEO  
**Tailwind CSS** — быстрая стилизация компонентов  
**TanStack React Query** — управление серверным состоянием, кэширование  
**Zod** — валидация данных на клиенте  
**Playwright** — E2E-тестирование

## Backend Stack
**Node.js** + **Express** + **TypeScript** — REST API, Clean Architecture  
**PostgreSQL** — хранение остановок, маршрутов, рейсов  
**Redis** — кэширование графа маршрутов, быстрый поиск (Dijkstra)  
**MinIO** — S3-хранилище для бэкапов датасетов  
**Zod** — валидация API, type-safe схемы  
**Swagger** — автоматическая документация API  
**Jest** — unit и интеграционное тестирование

## Infrastructure
**Docker** + **Docker Compose** — контейнеризация и оркестрация сервисов

## Архитектура
**Clean Architecture** — разделение на слои (Domain, Application, Infrastructure)  
**Graph-based routing** — мультимодальный поиск маршрутов через граф транспорта  
**Worker pattern** — фоновые воркеры для синхронизации данных

---

### Ключевые преимущества
✅ Type-safe (TypeScript + Zod)  
✅ High Performance (Redis-кэш, оптимизированный Next.js)  
✅ Scalable (микросервисы, Docker)  
✅ Testable (unit, integration, e2e)  
✅ Maintainable (Clean Architecture)




