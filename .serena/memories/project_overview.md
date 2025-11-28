# Travel App SaaS - Project Overview

## Project Purpose
Travel App SaaS is a comprehensive travel planning and booking system with an intelligent AI assistant. It provides route search, hotel booking, travel services, and features a dedicated B2B/B2G platform for corporate clients.

## Architecture Principles

### Backend - Clean Architecture
- **Domain Layer** (`/domain`): Core business logic, entities, value objects
- **Application Layer** (`/application`): Use cases, CQRS pattern, Pipeline Behaviors
- **Infrastructure Layer** (`/infrastructure`): Database, external services, MinIO, Redis
- **Presentation Layer** (`/presentation`): API controllers, middleware, error handling
- **Shared** (`/shared`): Common utilities and types

### Frontend - Feature-Based Architecture
- **App Router** (`/app`): Next.js App Router pages and layouts
- **Modules** (`/modules`): Feature modules with compound components:
  - `routes/`: Route search and management
  - `hotels/`: Hotel booking
  - `services/`: Travel services and insurance
  - `transport/`: Transportation options
  - `favorites/`: User favorites
  - `b2b/`: B2B/B2G corporate platform
- **Shared** (`/shared`): Reusable components, hooks, utilities
- **Stores** (`/stores`): Zustand state management
- **Components** (`/components`): UI components library (shadcn/ui)

## Technology Stack

### Backend
- **Runtime**: Node.js 18 with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15 with connection pooling
- **Cache**: Redis 7 with multiple TTL strategies
- **Storage**: MinIO (S3-compatible) for file storage
- **Authentication**: JWT with bcrypt
- **Validation**: Zod schemas
- **Testing**: Jest with ts-jest preset

### Frontend
- **Framework**: Next.js 14 with React 18 and TypeScript
- **Styling**: Tailwind CSS with custom "Yakut North" theme
- **State Management**: Zustand with React Query
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Form Handling**: React Hook Form with Zod resolvers
- **Charts**: Recharts for data visualization
- **Testing**: Jest for unit tests, Playwright for E2E tests

### Infrastructure
- **Containerization**: Docker with Docker Compose
- **Services**: PostgreSQL, MinIO, Redis, Backend API, Frontend
- **Network**: Bridge network for service communication
- **Health Checks**: Automated service monitoring

## Key Features

### B2B/B2G Enterprise Platform
- **Multi-tenant Architecture**: Company-isolated data
- **Role-Based Access Control**: 7-level permission system
- **Two-Factor Authentication**: TOTP + SMS with QR code support
- **Advanced Security**: Session management, audit logging, risk scoring
- **Financial Module**: Corporate deposit system with spending limits
- **Self-Service Portal**: Passenger data management and multimodal search
- **Instant Refunds**: Sub-1 minute processing with atomic transactions

### Performance Optimizations
- **Sub-10ms Route Search**: Pre-built graph with caching
- **Virtual Scrolling**: Handle 100k+ records efficiently
- **Multi-layer Caching**: Redis, application-level, browser cache
- **Lazy Loading**: Code splitting by routes
- **Real-time Updates**: WebSocket integration

### Security Features
- **"Банк-Клиент" Standards**: Enterprise-grade security
- **AES-256 Encryption**: Data at rest and in transit
- **Immutable Audit Trail**: Blockchain-like integrity verification
- **Session Security**: Device fingerprinting, impossible travel detection
- **PII Protection**: Automated data masking and access controls

## Development Workflow

### Docker-First Development
- **Local Development**: Use Docker Compose for consistency
- **Service Dependencies**: Backend depends on PostgreSQL, MinIO, Redis
- **Hot Reload**: Volume mounts for development files
- **Health Checks**: Automated service startup verification

### Code Quality
- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Consistent code style and error prevention
- **Prettier**: Automatic code formatting (frontend)
- **Husky**: Pre-commit hooks for quality gates
- **Testing**: Unit, integration, and E2E test suites

### B2B Portal Recent Implementation
- **Enhanced UI/UX**: Corporate design with security focus
- **Virtual Tables**: Audit log with 100k+ record capability
- **Session Timeout**: 15-minute auto-logout with warnings
- **Role Management**: Complete user and permission administration
- **Financial Dashboard**: Real-time balance with trend analysis

## Database Schema
- **Core Tables**: Routes, hotels, transportation, favorites
- **B2B Tables**: Companies, users, tickets, subscriptions (migrations 005-009)
- **Security Tables**: Enhanced users, audit log, secure sessions (010-012)
- **Financial Tables**: Corporate accounts, cost centers, transactions (013-016)
- **Self-Service Tables**: Passenger data, route templates, multimodal connections (017-019)
- **Reporting Tables**: Financial documents, document archive (020-021)

## API Structure
- **RESTful Design**: Standard HTTP methods with proper status codes
- **Versioning**: `/api/v1/` namespace for backwards compatibility
- **B2B Endpoints**: `/api/b2b/*` for corporate features
- **B2B Portal**: `/api/b2b-portal/*` for enhanced security
- **Documentation**: Swagger/OpenAPI for API contracts
- **Error Handling**: Centralized error middleware with context

## Environment Configuration
- **Development**: Local Docker environment with hot reload
- **Services**: Frontend (3000), Backend (5000), PostgreSQL (5432), MinIO (9000/9001), Redis (6380)
- **Configuration**: Environment variables for all services
- **Secrets Management**: JWT secrets, database credentials, API keys
- **Service Discovery**: Docker Compose network for internal communication