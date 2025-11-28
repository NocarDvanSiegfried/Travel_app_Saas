#!/bin/bash

# Graph Rebuild Verification Script
# Usage: ./scripts/verify-graph-rebuild.sh

echo "=========================================="
echo "Graph Rebuild Verification"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if containers are running
if ! docker ps | grep -q "travel-app-backend"; then
    echo -e "${RED}❌ Backend container is not running${NC}"
    exit 1
fi

if ! docker ps | grep -q "travel-app-redis"; then
    echo -e "${RED}❌ Redis container is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Containers are running${NC}"
echo ""

# 1. Check pipeline execution
echo "1. Checking pipeline execution..."
PIPELINE_EXECUTED=$(docker logs travel-app-backend 2>&1 | grep -c "Starting automatic data initialization")
if [ "$PIPELINE_EXECUTED" -gt 0 ]; then
    echo -e "${GREEN}✅ Pipeline executed${NC}"
else
    echo -e "${RED}❌ Pipeline not executed${NC}"
fi

WORKERS_EXECUTED=$(docker logs travel-app-backend 2>&1 | grep -c "Workers executed: 4")
if [ "$WORKERS_EXECUTED" -gt 0 ]; then
    echo -e "${GREEN}✅ All 4 workers executed${NC}"
else
    echo -e "${YELLOW}⚠️  Workers count check failed${NC}"
fi
echo ""

# 2. Check virtual stops
echo "2. Checking virtual stops..."
VIRTUAL_STOPS=$(docker logs travel-app-backend 2>&1 | grep -i "Generated.*virtual stops" | tail -1 | grep -oE "[0-9]+" | head -1)
if [ -n "$VIRTUAL_STOPS" ] && [ "$VIRTUAL_STOPS" -gt 0 ]; then
    echo -e "${GREEN}✅ Virtual stops created: $VIRTUAL_STOPS${NC}"
else
    echo -e "${RED}❌ Virtual stops not created or count is 0${NC}"
fi
echo ""

# 3. Check graph version
echo "3. Checking graph version..."
GRAPH_VERSION=$(docker exec travel-app-redis redis-cli -a 123456S GET graph:current:version 2>/dev/null)
if [ -n "$GRAPH_VERSION" ] && [ "$GRAPH_VERSION" != "(nil)" ]; then
    echo -e "${GREEN}✅ Graph version: $GRAPH_VERSION${NC}"
else
    echo -e "${RED}❌ Graph version not found${NC}"
fi
echo ""

# 4. Check graph metadata
echo "4. Checking graph metadata..."
GRAPH_METADATA=$(docker exec travel-app-redis redis-cli -a 123456S GET graph:current:metadata 2>/dev/null)
if [ -n "$GRAPH_METADATA" ] && [ "$GRAPH_METADATA" != "(nil)" ]; then
    NODES=$(echo "$GRAPH_METADATA" | grep -oE '"nodes":[0-9]+' | grep -oE '[0-9]+' || echo "0")
    EDGES=$(echo "$GRAPH_METADATA" | grep -oE '"edges":[0-9]+' | grep -oE '[0-9]+' || echo "0")
    
    if [ "$NODES" -ge 40 ]; then
        echo -e "${GREEN}✅ Graph nodes: $NODES (>= 40)${NC}"
    else
        echo -e "${YELLOW}⚠️  Graph nodes: $NODES (< 40)${NC}"
    fi
    
    if [ "$EDGES" -ge 200 ]; then
        echo -e "${GREEN}✅ Graph edges: $EDGES (>= 200)${NC}"
    else
        echo -e "${YELLOW}⚠️  Graph edges: $EDGES (< 200)${NC}"
    fi
else
    echo -e "${RED}❌ Graph metadata not found${NC}"
fi
echo ""

# 5. Check Verkhoyansk in graph
echo "5. Checking Verkhoyansk in graph..."
if [ -n "$GRAPH_VERSION" ] && [ "$GRAPH_VERSION" != "(nil)" ]; then
    VERSION_CLEAN=$(echo "$GRAPH_VERSION" | tr -d '"')
    VERKHOYANSK_IN_GRAPH=$(docker exec travel-app-redis redis-cli -a 123456S SISMEMBER "graph:${VERSION_CLEAN}:nodes" stop-023 2>/dev/null)
    if [ "$VERKHOYANSK_IN_GRAPH" = "1" ]; then
        echo -e "${GREEN}✅ Verkhoyansk (stop-023) is in graph${NC}"
    else
        echo -e "${RED}❌ Verkhoyansk (stop-023) is NOT in graph${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check - graph version not available${NC}"
fi
echo ""

# 6. Check Mirny in graph
echo "6. Checking Mirny in graph..."
if [ -n "$GRAPH_VERSION" ] && [ "$GRAPH_VERSION" != "(nil)" ]; then
    VERSION_CLEAN=$(echo "$GRAPH_VERSION" | tr -d '"')
    MIRNY_IN_GRAPH=$(docker exec travel-app-redis redis-cli -a 123456S SISMEMBER "graph:${VERSION_CLEAN}:nodes" stop-005 2>/dev/null)
    if [ "$MIRNY_IN_GRAPH" = "1" ]; then
        echo -e "${GREEN}✅ Mirny (stop-005) is in graph${NC}"
    else
        echo -e "${RED}❌ Mirny (stop-005) is NOT in graph${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Cannot check - graph version not available${NC}"
fi
echo ""

# 7. Test route search via API
echo "7. Testing route search (Верхоянск → Мирный)..."
ROUTE_RESULT=$(curl -s "http://localhost:5000/api/v1/routes/search?from=Верхоянск&to=Мирный&date=2025-01-20&passengers=1" 2>/dev/null)
if echo "$ROUTE_RESULT" | grep -q '"success":true'; then
    ROUTES_COUNT=$(echo "$ROUTE_RESULT" | grep -oE '"routes":\[.*\]' | grep -oE '\[.*\]' | grep -oE '{' | wc -l)
    if [ "$ROUTES_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Route found: Верхоянск → Мирный${NC}"
    else
        echo -e "${YELLOW}⚠️  Route search succeeded but no routes returned${NC}"
    fi
else
    ERROR_MSG=$(echo "$ROUTE_RESULT" | grep -oE '"error":"[^"]*"' | head -1)
    if [ -n "$ERROR_MSG" ]; then
        echo -e "${RED}❌ Route search failed: $ERROR_MSG${NC}"
    else
        echo -e "${RED}❌ Route search failed (unknown error)${NC}"
    fi
fi
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""

ALL_CHECKS_PASSED=true

if [ "$PIPELINE_EXECUTED" -eq 0 ]; then
    echo -e "${RED}❌ Pipeline not executed${NC}"
    ALL_CHECKS_PASSED=false
fi

if [ -z "$VIRTUAL_STOPS" ] || [ "$VIRTUAL_STOPS" -eq 0 ]; then
    echo -e "${RED}❌ Virtual stops not created${NC}"
    ALL_CHECKS_PASSED=false
fi

if [ -z "$GRAPH_VERSION" ] || [ "$GRAPH_VERSION" = "(nil)" ]; then
    echo -e "${RED}❌ Graph version not found${NC}"
    ALL_CHECKS_PASSED=false
fi

if [ -n "$NODES" ] && [ "$NODES" -lt 40 ]; then
    echo -e "${YELLOW}⚠️  Graph too small (nodes < 40)${NC}"
    ALL_CHECKS_PASSED=false
fi

if [ -n "$EDGES" ] && [ "$EDGES" -lt 200 ]; then
    echo -e "${YELLOW}⚠️  Graph too sparse (edges < 200)${NC}"
    ALL_CHECKS_PASSED=false
fi

if [ "$VERKHOYANSK_IN_GRAPH" != "1" ]; then
    echo -e "${RED}❌ Verkhoyansk not in graph${NC}"
    ALL_CHECKS_PASSED=false
fi

if [ "$MIRNY_IN_GRAPH" != "1" ]; then
    echo -e "${RED}❌ Mirny not in graph${NC}"
    ALL_CHECKS_PASSED=false
fi

echo ""
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✅ All checks passed! Graph rebuild successful.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please review the output above.${NC}"
    exit 1
fi









