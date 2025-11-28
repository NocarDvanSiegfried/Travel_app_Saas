#!/bin/bash

# Скрипт для полной очистки и пересборки backend

echo "🧹 Очистка backend..."

# Удаляем dist
if [ -d "dist" ]; then
  rm -rf dist
  echo "✅ dist удалён"
fi

# Удаляем node_modules
if [ -d "node_modules" ]; then
  rm -rf node_modules
  echo "✅ node_modules удалён"
fi

# Удаляем package-lock.json
if [ -f "package-lock.json" ]; then
  rm -f package-lock.json
  echo "✅ package-lock.json удалён"
fi

# Удаляем .tsbuildinfo файлы
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null
echo "✅ .tsbuildinfo файлы удалены"

# Удаляем кэш ts-node
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✅ ts-node кэш удалён"
fi

# Переустанавливаем зависимости
echo "📦 Установка зависимостей..."
npm install

# Проверка TypeScript
echo "🔍 Проверка TypeScript..."
npm run type-check

# Сборка проекта
echo "🔨 Сборка проекта..."
npm run build

echo "✅ Очистка и пересборка завершены!"






