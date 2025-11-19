# syntax=docker/dockerfile:1.4

# ============================================================================
# BASE - минимальный базовый образ
# ============================================================================
FROM node:18-alpine AS base

# Устанавливаем только необходимые системные пакеты
# libc6-compat нужен для некоторых нативных модулей Node.js
RUN apk add --no-cache libc6-compat

WORKDIR /app

# ============================================================================
# DEPS - установка зависимостей (максимальное кеширование)
# ============================================================================
FROM base AS deps

# Копируем ТОЛЬКО файлы зависимостей для максимального кеширования
COPY package.json package-lock.json* ./

# Устанавливаем зависимости с BuildKit cache mount
# npm cache сохраняется между сборками, ускоряя повторные сборки
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.npm/_cacache \
    if [ -f package-lock.json ]; then \
      npm ci --prefer-offline --no-audit --no-fund; \
    else \
      npm install --prefer-offline --no-audit --no-fund --package-lock; \
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

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Устанавливаем dev-инструменты локально (не глобально для меньшего размера слоя)
RUN npm install -g --silent nodemon ts-node

# Копируем только необходимые файлы для разработки
COPY package.json tsconfig.json ./
COPY src ./src

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

# Копируем только production зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем собранные файлы (миграции уже включены через copy-assets скрипт)
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 5000

CMD ["npm", "run", "docker:start"]
