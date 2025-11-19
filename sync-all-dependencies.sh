#!/bin/bash

# Скрипт для синхронизации зависимостей во всех проектах
# Автоматически обновляет package-lock.json для backend и frontend

set -e

echo "🔄 Синхронизация зависимостей для всех проектов..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для синхронизации зависимостей
sync_dependencies() {
    local dir=$1
    local name=$2
    
    echo -e "${BLUE}📦 Синхронизация зависимостей для ${name}...${NC}"
    echo ""
    
    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}⚠️  Директория ${dir} не найдена, пропускаем...${NC}"
        echo ""
        return
    fi
    
    if [ ! -f "$dir/package.json" ]; then
        echo -e "${YELLOW}⚠️  package.json не найден в ${dir}, пропускаем...${NC}"
        echo ""
        return
    fi
    
    cd "$dir"
    
    # Удаляем старый lock-файл
    if [ -f "package-lock.json" ]; then
        echo "🗑️  Удаляем старый package-lock.json..."
        rm -f package-lock.json
    fi
    
    # Регенерируем package-lock.json
    echo "📦 Устанавливаем зависимости для синхронизации..."
    echo ""
    
    npm install --package-lock-only --no-audit --no-fund
    
    # Проверяем синхронизацию
    echo ""
    echo "✅ package-lock.json обновлен для ${name}!"
    echo ""
    
    cd - > /dev/null
}

# Синхронизируем backend
sync_dependencies "backend" "Backend"

# Синхронизируем frontend
sync_dependencies "frontend" "Frontend"

echo -e "${GREEN}🎉 Синхронизация всех зависимостей завершена!${NC}"
echo ""

