# Отчёт об исправлении зависимостей Leaflet

## Файл: `package.json`

## Дата: 2025-01-XX

## Проблема

**Ошибка сборки**: `Module not found: Can't resolve 'leaflet'`

**Причина**: 
Пакет `leaflet` находился в `devDependencies`, но Next.js требует его в `dependencies` для корректной сборки и работы в production.

## Исправление

### Перемещение `leaflet` из `devDependencies` в `dependencies`

**Было** (строка 45):
```json
"devDependencies": {
  ...
  "leaflet": "^1.9.4",
  ...
}
```

**Стало** (строка 21):
```json
"dependencies": {
  "@tanstack/react-query": "^5.90.10",
  "leaflet": "^1.9.4",
  "next": "^14.2.33",
  ...
}
```

### Установка зависимостей

Выполнена команда:
```bash
npm install
```

Результат: ✅ Зависимости установлены успешно, `leaflet@1.9.4` доступен в `node_modules`.

## Результат

✅ **Пакет перемещён**: `leaflet` теперь в `dependencies`  
✅ **Зависимости установлены**: `leaflet@1.9.4` доступен в `node_modules`  
✅ **Сборка должна работать**: Next.js сможет разрешить модуль `leaflet`  
✅ **Код не изменён**: Leaflet-провайдер остался без изменений  

## Статус

**Готово к сборке** ✅

Ошибка `Module not found: Can't resolve 'leaflet'` должна исчезнуть при сборке или запуске Next.js.







