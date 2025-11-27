# syntax=docker/dockerfile:1.4

# ============================================================================
# BASE - минимальный базовый образ
# ============================================================================
FROM node:18-alpine AS base

# Устанавливаем только необходимые системные пакеты
# libc6-compat нужен для некоторых нативных модулей Node.js
# wget нужен для healthchecks
RUN apk add --no-cache libc6-compat wget

WORKDIR /app

# ============================================================================
# DEPS - установка всех зависимостей (dev + prod)
# ============================================================================
FROM base AS deps

# Копируем ТОЛЬКО файлы зависимостей для максимального кеширования
COPY package.json package-lock.json* ./

# Устанавливаем все зависимости (включая devDependencies) с BuildKit cache mount
# Используем npm ci если lock-файл существует и синхронизирован, иначе npm install
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --prefer-offline --no-audit --no-fund || npm install --prefer-offline --no-audit --no-fund; \
    else \
      npm install --prefer-offline --no-audit --no-fund; \
    fi

# ============================================================================
# DEPS-PROD - только production зависимости
# ============================================================================
FROM base AS deps-prod

# Копируем ТОЛЬКО файлы зависимостей
COPY package.json package-lock.json* ./

# Устанавливаем только production зависимости
# Используем npm ci если lock-файл существует и синхронизирован, иначе npm install
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --only=production --prefer-offline --no-audit --no-fund || npm install --only=production --prefer-offline --no-audit --no-fund; \
    else \
      npm install --only=production --prefer-offline --no-audit --no-fund; \
    fi

# ============================================================================
# BUILDER - сборка TypeScript
# ============================================================================
FROM base AS builder

ENV NODE_ENV=production

# Копируем зависимости из deps stage
COPY --from=deps /app/node_modules ./node_modules

# Копируем только необходимые файлы для сборки
COPY tsconfig.json package.json ./
COPY src ./src

# Собираем TypeScript
RUN npm run build

# ============================================================================
# DEVELOPMENT - для разработки (оптимизировано)
# ============================================================================
FROM base AS development

ENV NODE_ENV=development

# Удаляем любые артефакты сборки перед копированием
RUN rm -rf dist build .ts-node .cache *.tsbuildinfo 2>/dev/null || true

# Копируем зависимости (включая devDependencies с nodemon и ts-node)
COPY --from=deps /app/node_modules ./node_modules

# Копируем только необходимые файлы для разработки
COPY package.json tsconfig.json ./
COPY src ./src

# Убеждаемся, что артефакты не попали в контейнер
RUN rm -rf dist build .ts-node .cache *.tsbuildinfo 2>/dev/null || true

EXPOSE 5000

CMD ["npm", "run", "docker:dev"]

# ============================================================================
# PRODUCTION - минимальный production образ
# ============================================================================
FROM base AS production

ENV NODE_ENV=production

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Копируем только production зависимости (без devDependencies)
COPY --from=deps-prod /app/node_modules ./node_modules

# Копируем собранные файлы (миграции уже включены через copy-assets скрипт)
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 5000

CMD ["npm", "run", "docker:start"]
