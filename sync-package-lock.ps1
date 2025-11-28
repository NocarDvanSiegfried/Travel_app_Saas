# Скрипт для синхронизации package.json и package-lock.json (PowerShell)

Write-Host "🔄 Начинаю синхронизацию package-lock.json файлов..." -ForegroundColor Cyan

# Backend
Write-Host ""
Write-Host "📦 Backend: пересборка package-lock.json..." -ForegroundColor Yellow
Set-Location backend
if (Test-Path "package-lock.json") {
    Write-Host "  Удаляю старый package-lock.json..." -ForegroundColor Gray
    Remove-Item -Force package-lock.json
}
Write-Host "  Устанавливаю зависимости для обновления package-lock.json..." -ForegroundColor Gray
npm install --package-lock-only --no-audit --no-fund
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Backend package-lock.json пересобран" -ForegroundColor Green
} else {
    Write-Host "  ❌ Ошибка при пересборке backend package-lock.json" -ForegroundColor Red
    exit 1
}

# Frontend
Write-Host ""
Write-Host "📦 Frontend: пересборка package-lock.json..." -ForegroundColor Yellow
Set-Location ../frontend
if (Test-Path "package-lock.json") {
    Write-Host "  Удаляю старый package-lock.json..." -ForegroundColor Gray
    Remove-Item -Force package-lock.json
}
Write-Host "  Устанавливаю зависимости для обновления package-lock.json..." -ForegroundColor Gray
npm install --package-lock-only --no-audit --no-fund
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Frontend package-lock.json пересобран" -ForegroundColor Green
} else {
    Write-Host "  ❌ Ошибка при пересборке frontend package-lock.json" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Синхронизация завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "Проверка синхронизации:" -ForegroundColor Cyan
Write-Host "  Backend:  npm ci --dry-run"
Write-Host "  Frontend: npm ci --dry-run"

Set-Location ..





