#!/bin/bash

# Скрипт для синхронизации package.json и package-lock.json

set -e

echo "🔄 Начинаю синхронизацию package-lock.json файлов..."

# Backend
echo ""
echo "📦 Backend: пересборка package-lock.json..."
cd backend
if [ -f "package-lock.json" ]; then
    echo "  Удаляю старый package-lock.json..."
    rm -f package-lock.json
fi
echo "  Устанавливаю зависимости для обновления package-lock.json..."
npm install --package-lock-only --no-audit --no-fund
echo "  ✅ Backend package-lock.json пересобран"

# Frontend
echo ""
echo "📦 Frontend: пересборка package-lock.json..."
cd ../frontend
if [ -f "package-lock.json" ]; then
    echo "  Удаляю старый package-lock.json..."
    rm -f package-lock.json
fi
echo "  Устанавливаю зависимости для обновления package-lock.json..."
npm install --package-lock-only --no-audit --no-fund
echo "  ✅ Frontend package-lock.json пересобран"

echo ""
echo "✅ Синхронизация завершена!"
echo ""
echo "Проверка синхронизации:"
echo "  Backend:  npm ci --dry-run"
echo "  Frontend: npm ci --dry-run"






