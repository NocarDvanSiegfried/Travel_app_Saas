#!/bin/bash

# Скрипт для запуска E2E тестов валидации умных маршрутов через Playwright

set -e

echo "🎭 Запуск E2E тестов валидации умных маршрутов через Playwright..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка наличия Playwright
if ! command -v npx &> /dev/null; then
  echo -e "${YELLOW}⚠️  npx не найден. Установите Node.js и npm.${NC}"
  exit 1
fi

# 1. Установка браузеров Playwright (если нужно)
echo -e "${BLUE}📦 Проверка установки браузеров Playwright...${NC}"
npx playwright install --with-deps chromium 2>/dev/null || true
echo ""

# 2. Запуск E2E тестов валидации
echo -e "${BLUE}🎭 Запуск E2E тестов: smart-routes-validation${NC}"
npx playwright test e2e/smart-routes-validation.spec.ts
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ E2E тесты валидации пройдены${NC}"
else
  echo -e "${YELLOW}⚠️  E2E тесты валидации не пройдены${NC}"
  exit 1
fi
echo ""

# 3. Генерация отчёта (опционально)
echo -e "${BLUE}📊 Генерация отчёта...${NC}"
npx playwright show-report 2>/dev/null || echo "Отчёт доступен в playwright-report/"
echo ""

echo -e "${GREEN}🎉 Все E2E тесты валидации успешно пройдены!${NC}"






