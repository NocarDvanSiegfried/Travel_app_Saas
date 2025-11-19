# Скрипт для синхронизации зависимостей во всех проектах (PowerShell)
# Автоматически обновляет package-lock.json для backend и frontend

$ErrorActionPreference = "Stop"

Write-Host "🔄 Синхронизация зависимостей для всех проектов..." -ForegroundColor Cyan
Write-Host ""

# Функция для синхронизации зависимостей
function Sync-Dependencies {
    param(
        [string]$Dir,
        [string]$Name
    )
    
    Write-Host "📦 Синхронизация зависимостей для $Name..." -ForegroundColor Blue
    Write-Host ""
    
    if (-not (Test-Path $Dir)) {
        Write-Host "⚠️  Директория $Dir не найдена, пропускаем..." -ForegroundColor Yellow
        Write-Host ""
        return
    }
    
    if (-not (Test-Path "$Dir\package.json")) {
        Write-Host "⚠️  package.json не найден в $Dir, пропускаем..." -ForegroundColor Yellow
        Write-Host ""
        return
    }
    
    Push-Location $Dir
    
    try {
        # Удаляем старый lock-файл
        if (Test-Path "package-lock.json") {
            Write-Host "🗑️  Удаляем старый package-lock.json..."
            Remove-Item "package-lock.json" -Force
        }
        
        # Регенерируем package-lock.json
        Write-Host "📦 Устанавливаем зависимости для синхронизации..."
        Write-Host ""
        
        npm install --package-lock-only --no-audit --no-fund
        
        Write-Host ""
        Write-Host "✅ package-lock.json обновлен для $Name!" -ForegroundColor Green
        Write-Host ""
    }
    finally {
        Pop-Location
    }
}

# Синхронизируем backend
Sync-Dependencies -Dir "backend" -Name "Backend"

# Синхронизируем frontend
Sync-Dependencies -Dir "frontend" -Name "Frontend"

Write-Host "🎉 Синхронизация всех зависимостей завершена!" -ForegroundColor Green
Write-Host ""

