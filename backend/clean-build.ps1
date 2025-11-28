# Скрипт для полной очистки и пересборки backend (PowerShell)

Write-Host "🧹 Очистка backend..." -ForegroundColor Cyan

# Удаляем dist
if (Test-Path "dist") {
  Remove-Item -Recurse -Force dist
  Write-Host "✅ dist удалён" -ForegroundColor Green
}

# Удаляем node_modules
if (Test-Path "node_modules") {
  Remove-Item -Recurse -Force node_modules
  Write-Host "✅ node_modules удалён" -ForegroundColor Green
}

# Удаляем package-lock.json
if (Test-Path "package-lock.json") {
  Remove-Item -Force package-lock.json
  Write-Host "✅ package-lock.json удалён" -ForegroundColor Green
}

# Удаляем .tsbuildinfo файлы
Get-ChildItem -Recurse -Filter "*.tsbuildinfo" -ErrorAction SilentlyContinue | Remove-Item -Force
Write-Host "✅ .tsbuildinfo файлы удалены" -ForegroundColor Green

# Удаляем кэш ts-node
if (Test-Path "node_modules\.cache") {
  Remove-Item -Recurse -Force node_modules\.cache
  Write-Host "✅ ts-node кэш удалён" -ForegroundColor Green
}

# Переустанавливаем зависимости
Write-Host "📦 Установка зависимостей..." -ForegroundColor Cyan
npm install

# Проверка TypeScript
Write-Host "🔍 Проверка TypeScript..." -ForegroundColor Cyan
npm run type-check

# Сборка проекта
Write-Host "🔨 Сборка проекта..." -ForegroundColor Cyan
npm run build

Write-Host "✅ Очистка и пересборка завершены!" -ForegroundColor Green





