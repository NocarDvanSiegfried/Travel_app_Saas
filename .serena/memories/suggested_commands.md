# Essential Commands for Travel App SaaS Development

## Quick Start Commands

### Start All Services (Recommended)
```bash
docker compose up --build
```

### Individual Service Management
```bash
# Database and cache only
docker compose up postgres redis

# Backend with dependencies
docker compose up backend

# Frontend only
docker compose up frontend

# View logs
docker compose logs -f [service]

# Restart service
docker compose restart [service]
```

## Development Commands

### Backend Development
```bash
cd backend

# Install dependencies
npm install

# Development (Docker-based)
docker compose up backend

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Install B2B portal dependencies
npm install @tanstack/react-table @tanstack/react-virtual recharts
npm install react-hook-form @hookform/resolvers zod sonner zustand
npm install @radix-ui/react-select @radix-ui/react-checkbox
npm install @radix-ui/react-dialog @radix-ui/react-label

# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
npm run format:check

# Testing
npm run test
npm run test:watch
npm run test:e2e
npm run test:e2e:ui
npm run test:coverage
```

## B2B Portal Setup Commands

### Database Migrations (Required Order)
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

### B2B Portal Access
```bash
# After setup, access at:
http://localhost:3000/b2b-portal/[company]/login

# Default credentials (check your .env file)
# Company: [company-slug]
# User: Check B2B users table or create via API
```

## Testing Commands

### Comprehensive Testing
```bash
# Backend full test suite
cd backend && npm run test:all

# Frontend full test suite
cd frontend && npm test

# B2B portal specific tests
cd frontend && npm run test -- --testPathPattern=b2b-portal
```

### Performance Testing
```bash
# Backend load testing
cd backend && artillery run quick --config load-tests/backend-performance.yml

# Frontend Lighthouse
cd frontend && npm run test:lighthouse
```

## Utility Commands

### File Operations
```bash
# Find specific patterns
find . -name "*.ts" -exec grep -l "search-term" {} \;

# Search for specific functions
grep -r "functionName" src/

# Check file sizes
find . -name "*.ts" -o -name "*.tsx" | xargs du -h | sort -hr
```

### System Monitoring
```bash
# Check port availability
netstat -tlnp | grep -E ':(3000|5000|5432|6380|9000|9001)'

# Check Docker status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check system resources
free -h && df -h
```

### Git Operations
```bash
# Check current status
git status

# Create feature branch
git checkout -b feature/new-feature

# Merge changes
git checkout main
git pull origin main
git merge feature/new-feature
git push origin main
```

## Troubleshooting Commands

### Common Issues
```bash
# Fix Sharp module for Linux
npm install --os=linux --cpu=x64 sharp

# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset database (development only)
docker compose down -v
docker compose up postgres
```

### Docker Issues
```bash
# Rebuild specific service
docker compose up --build backend

# Remove orphaned containers
docker container prune

# Check Docker logs for errors
docker compose logs [service] --tail=100
```

## Production Deployment Commands

### Build for Production
```bash
# Frontend production build
cd frontend && npm run build

# Backend production build
cd backend && npm run build
```

### Production Environment
```bash
# Production Docker compose
docker compose -f docker-compose.prod.yml up --build

# Environment setup for production
cp .env.example .env.prod
# Edit .env.prod with production values
```

## Development Workflow Commands

### Before Commit
```bash
# Backend quality checks
cd backend
npm run type-check
npm run lint
npm run test:unit

# Frontend quality checks
cd frontend
npm run type-check
npm run lint
npm run format:check
npm run test
```

### Feature Development
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Install dependencies (if needed)
npm install

# 3. Develop your feature
# 4. Run tests
npm run test

# 5. Run type checking
npm run type-check

# 6. Run linting
npm run lint

# 7. Commit changes
git add .
git commit -m "feat: add your feature description"

# 8. Push and create PR
git push origin feature/your-feature-name
```

### Database Development
```bash
# Create new migration
# 1. Create SQL file: XXX_description.sql
# 2. Add to appropriate directory
# 3. Test migration locally
docker compose exec postgres psql -U postgres -d travel_app -f /path/to/migration.sql
# 4. Test rollback if needed
```

## Environment Management

### Development Environment
```bash
# Start development environment
docker compose up --build

# Stop development environment
docker compose down

# Clean up volumes (development only)
docker compose down -v
```

### Environment Variables
```bash
# Check current environment
env | grep -E 'NODE_|POSTGRES_|REDIS_|JWT_'

# Set environment variable
export VARIABLE_NAME=value

# Load environment from file
source .env
```

## Documentation Commands

### Generate Documentation
```bash
# API documentation (if implemented)
npm run docs:generate

# Type documentation
npm run docs:types

# Coverage report
npm run test:coverage
```

### Update Documentation
```bash
# Update README after major changes
# Update API documentation after API changes
# Update CLAUDE.md for new development patterns
```

These commands provide a comprehensive reference for common development tasks in the Travel App SaaS project. Always run appropriate quality checks before committing changes.