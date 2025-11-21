#!/bin/bash
# Script to apply PostgreSQL migration 003_optimized_storage_schema.sql

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting migration 003: Optimized Storage Schema${NC}"
echo ""

# Database configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-travel_app}"
DB_USER="${DB_USER:-travel_user}"
DB_PASSWORD="${DB_PASSWORD:-travel_password}"

# Migration file
MIGRATION_FILE="src/infrastructure/database/migrations/003_optimized_storage_schema.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  DB_HOST: $DB_HOST"
echo "  DB_PORT: $DB_PORT"
echo "  DB_NAME: $DB_NAME"
echo "  DB_USER: $DB_USER"
echo ""

# Test database connection
echo -e "${YELLOW}🔍 Testing database connection...${NC}"
export PGPASSWORD="$DB_PASSWORD"

if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo -e "${YELLOW}💡 Make sure PostgreSQL is running:${NC}"
    echo "   docker-compose up -d postgres"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# Check if tables already exist
echo -e "${YELLOW}🔍 Checking if tables already exist...${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('stops', 'virtual_stops', 'routes', 'virtual_routes', 'flights', 'datasets', 'graphs')" 2>/dev/null || echo "0")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warning: $TABLE_COUNT table(s) from migration already exist${NC}"
    echo -e "${YELLOW}The migration uses IF NOT EXISTS, so it's safe to run${NC}"
    echo ""
fi

# Apply migration
echo -e "${YELLOW}📝 Applying migration...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Migration applied successfully${NC}"
else
    echo ""
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

echo ""

# Verify tables created
echo -e "${YELLOW}🔍 Verifying tables...${NC}"
TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('stops', 'virtual_stops', 'routes', 'virtual_routes', 'flights', 'datasets', 'graphs') ORDER BY table_name")

echo ""
echo -e "${GREEN}✅ Created tables:${NC}"
echo "$TABLES" | while read -r table; do
    if [ -n "$table" ]; then
        echo "  - $table"
    fi
done

echo ""

# Verify views created
echo -e "${YELLOW}🔍 Verifying views...${NC}"
VIEWS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name IN ('current_dataset_stats', 'current_graph_stats', 'system_health') ORDER BY table_name")

echo ""
echo -e "${GREEN}✅ Created views:${NC}"
echo "$VIEWS" | while read -r view; do
    if [ -n "$view" ]; then
        echo "  - $view"
    fi
done

echo ""

# Show system health
echo -e "${YELLOW}🏥 System Health Check:${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM system_health"

echo ""
echo -e "${GREEN}🎉 Migration 003 completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📊 Next steps:${NC}"
echo "  1. Implement PostgreSQL repositories"
echo "  2. Implement Redis graph repository"
echo "  3. Implement background workers"
echo "  4. Optimize backend startup"
echo ""




