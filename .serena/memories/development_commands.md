# Development Commands Guide

## Project Setup & Development

### Quick Start (Recommended)
```bash
# Start all services with Docker Compose
docker compose up --build
```

### Alternative Local Development

#### Backend Development
```bash
cd backend
npm install

# Note: Local development is disabled by default for consistency
# Use Docker for development: docker compose up backend

# View backend logs
docker compose logs -f backend

# Restart backend
docker compose restart backend
```

#### Frontend Development
```bash
cd frontend
npm install
npm run dev          # Development server (localhost:3000)

# Available commands:
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint code quality check
npm run type-check    # TypeScript validation
npm run format        # Prettier formatting
npm run format:check  # Check formatting without changes
npm run test          # Run all tests
npm run test:watch    # Watch mode for unit tests
npm run test:e2e      # Playwright E2E tests
npm run test:coverage # Coverage reports
```

### Testing Strategies

#### Backend Testing
```bash
# From backend directory
npm test                     # All tests
npm run test:unit           # Unit tests only
npm run test:integration      # Integration tests (requires PostgreSQL and Redis)
npm run test:e2e             # End-to-end API testing
npm run test:coverage       # Coverage reports

# Test configurations:
- Unit tests: `jest.config.js` with ts-jest preset, 70% coverage threshold
- Integration tests: `jest.integration.config.js` (separate, needs real DB)
- E2E tests: `jest.e2e.config.js` (API testing with supertest)
```

#### Frontend Testing
```bash
# From frontend directory
npm test                     # Run all tests
npm run test:watch            # Watch mode
npm run test:e2e              # Playwright E2E tests
npm run test:e2e:ui           # Playwright with UI mode
npm run test:coverage         # Coverage reports

# Coverage: Zero thresholds during development, configurable in production
```

### B2B Module Development

#### Database Migrations (Order Matters)
```bash
# Core B2B tables
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/005_create_b2b_companies_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/006_create_b2b_users_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/007_create_b2b_tickets_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/008_create_b2b_deliveries_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/009_create_b2b_subscriptions_table.sql

# Enhanced security
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/010_enhance_b2b_users_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/011_create_audit_log_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/012_create_secure_sessions_table.sql

# Financial module
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/013_create_corporate_accounts_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/014_create_cost_centers_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/015_create_transaction_log_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/016_create_user_spending_limits_table.sql

# Self-service module
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/017_create_passenger_data_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/018_create_route_templates_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/019_create_multimodal_connections_table.sql

# Reporting module
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/020_create_financial_documents_table.sql
docker compose exec postgres psql -U postgres -d travel_app -f /docker-entrypoint-initdb.d/021_create_document_archive_table.sql
```

### Service Management

#### Docker Compose Commands
```bash
# Start specific services
docker compose up postgres redis      # Database and cache only
docker compose up backend           # Backend with dependencies
docker compose up frontend          # Frontend only

# View logs
docker compose logs -f [service]       # Follow logs for specific service
docker compose logs -f backend -f 100 # Last 100 lines of backend logs

# Restart services
docker compose restart [service]         # Restart specific service
docker compose restart postgres redis backend   # Multiple services

# Stop services
docker compose down [service]          # Stop specific service
docker compose down                    # Stop all services

# Force rebuild and start
docker compose up --build --force-recreate
```

#### Container Management
```bash
# View container status
docker compose ps

# Enter running container (for debugging)
docker compose exec backend bash
docker compose exec postgres psql -U postgres -d travel_app

# View container health
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Health}}"

# Remove stopped containers
docker compose rm -f
```

### Performance & Testing Commands

#### Load Testing
```bash
# From backend directory
npm run test:performance

# Alternative with artillery
artillery run quick --config load-tests/backend-performance.yml
```

#### Security Testing
```bash
# Dependency scanning
npm audit

# Run security-focused tests
npm run test:security
```

#### Code Quality
```bash
# Backend linting
cd backend && npm run lint

# Frontend linting
cd frontend && npm run lint

# Backend type checking
cd backend && npm run type-check

# Frontend type checking
cd frontend && npm run type-check
```

### Environment Management

#### Development Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env  # or use your preferred editor

# Specific B2B environment
cp .env.example .env.b2b
```

#### Production Build
```bash
# Build frontend for production
cd frontend && npm run build

# Build backend for production
cd backend && npm run build

# Run production with Docker
docker compose -f docker-compose.prod.yml up --build
```

## Utility Commands

### Git Operations
```bash
# View current branch and status
git status
git branch --show-current

# Commit with conventional message
git commit -m "feat: add new functionality"

# Pull latest changes
git pull origin main

# Push changes
git push origin feature/your-branch-name
```

### File Operations
```bash
# Search for specific patterns
find . -name "*.ts" -exec grep -l "your-search-term" {} \;

# List large files
find . -type f -size +10M

# Clean up node modules
find . -name "node_modules" -type d -exec rm -rf {} +
```

### System Checks
```bash
# Check port availability
netstat -tlnp | grep :3000  # Check frontend port
netstat -tlnp | grep :5000  # Check backend port

# Check Docker status
docker info
docker version

# Check system resources
free -h                    # Memory usage
df -h                       # Disk space
top                          # Running processes
```

## Troubleshooting Common Issues

### Docker Issues
- **Docker not found in WSL2**: Enable WSL integration in Docker Desktop settings
- **Port conflicts**: Check if ports 3000, 5000, 5432, 9000, 9001 are available
- **Permission issues**: Ensure Docker has proper permissions for volume mounts

### Database Issues
- **Connection refused**: Ensure PostgreSQL is healthy with `docker compose logs postgres`
- **Migration errors**: Run migrations in correct order, check SQL syntax
- **Performance**: Check PostgreSQL connection pooling settings

### Node.js Issues
- **Module not found**: Run `npm install` in correct directory
- **Port already in use**: Kill process using the port or change port in .env
- **Memory issues**: Increase Node.js memory with `NODE_OPTIONS=--max-old-space-size=4096`

### Frontend Issues
- **Build failures**: Clear `.next` directory and rebuild
- **TypeScript errors**: Check tsconfig.json paths and type definitions
- **Styling issues**: Ensure Tailwind CSS is properly configured

### B2B Portal Issues
- **Access denied**: Check user roles and permissions in database
- **Session timeouts**: Verify JWT_SECRET and expiration settings
- **Real-time updates**: Ensure WebSocket connections are working

## Development Best Practices

### Code Style
- **TypeScript**: Use strict mode, comprehensive type hints
- **Naming**: Use consistent conventions (camelCase for vars, PascalCase for types)
- **Documentation**: Add JSDoc comments for complex functions
- **Error Handling**: Use centralized error middleware with context

### Testing
- **Test-driven development**: Write tests before implementation
- **Coverage**: Maintain >70% unit test coverage
- **Integration testing**: Test real API endpoints
- **E2E testing**: Simulate real user scenarios

### Performance
- **Database**: Use connection pooling, proper indexing
- **Caching**: Multi-layer strategy (Redis, application, browser)
- **Frontend**: Use lazy loading, code splitting, virtual scrolling
- **API**: Implement rate limiting, request validation