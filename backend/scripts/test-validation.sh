#!/bin/bash

# Скрипт для запуска всех тестов валидации
# Используется для проверки RouteErrorDetector, RealityChecker и их интеграции

set -e

echo "🧪 Запуск тестов валидации умных маршрутов..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Unit тесты для RouteErrorDetector
echo -e "${BLUE}📋 Unit тесты: RouteErrorDetector${NC}"
npm run test:unit -- RouteErrorDetector.test.ts
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ RouteErrorDetector тесты пройдены${NC}"
else
  echo -e "${YELLOW}⚠️  RouteErrorDetector тесты не пройдены${NC}"
  exit 1
fi
echo ""

# 2. Unit тесты для RealityChecker
echo -e "${BLUE}📋 Unit тесты: RealityChecker${NC}"
npm run test:unit -- RealityChecker.test.ts
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ RealityChecker тесты пройдены${NC}"
else
  echo -e "${YELLOW}⚠️  RealityChecker тесты не пройдены${NC}"
  exit 1
fi
echo ""

# 3. Integration тесты для Smart Routes API
echo -e "${BLUE}📋 Integration тесты: Smart Routes API${NC}"
npm run test:integration -- smart-routes.api.test.ts
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Smart Routes API тесты пройдены${NC}"
else
  echo -e "${YELLOW}⚠️  Smart Routes API тесты не пройдены${NC}"
  exit 1
fi
echo ""

# 4. Все unit тесты валидации
echo -e "${BLUE}📋 Все unit тесты валидации${NC}"
npm run test:unit -- validation
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Все unit тесты валидации пройдены${NC}"
else
  echo -e "${YELLOW}⚠️  Некоторые unit тесты валидации не пройдены${NC}"
  exit 1
fi
echo ""

echo -e "${GREEN}🎉 Все тесты валидации успешно пройдены!${NC}"




