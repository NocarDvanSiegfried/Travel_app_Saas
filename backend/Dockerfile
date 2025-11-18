# syntax=docker/dockerfile:1.4

# ============================================================================
# BASE - базовый образ
# ============================================================================
FROM node:18-alpine AS base

RUN apk add --no-cache libc6-compat curl wget

WORKDIR /app

# ============================================================================
# DEPS - установка зависимостей (кешируется при неизменных package.json)
# ============================================================================
FROM base AS deps

# Копируем ТОЛЬКО файлы зависимостей - это ключ к кэшированию
COPY package.json package-lock.json* ./

# Устанавливаем зависимости с BuildKit cache mount
# npm cache сохраняется между сборками автоматически
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --only=production

# ============================================================================
# BUILDER - сборка TypeScript (создание production-артефактов)
# ============================================================================
FROM base AS builder

ENV NODE_ENV=production

# Копируем зависимости из deps stage
COPY --from=deps /app/node_modules ./node_modules

# Копируем конфигурацию и исходный код ПОСЛЕ установки зависимостей
COPY tsconfig.json package.json ./
COPY src ./src

# Собираем TypeScript
RUN npm run build

# ============================================================================
# DEVELOPMENT - для разработки (ускоренная версия)
# ============================================================================
FROM base AS development

ENV NODE_ENV=development

# Создаем непривилегированного пользователя ДО копирования файлов
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Устанавливаем глобальные инструменты для разработки до смены пользователя
USER root
RUN npm install -g nodemon ts-node

# Устанавливаем все зависимости (включая devDependencies) для разработки
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Сменяем пользователя на непривилегированного
USER nodejs

# Копируем только необходимые файлы для разработки
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs tsconfig.json ./
COPY --chown=nodejs:nodejs src ./src

EXPOSE 5000

CMD ["npm", "run", "docker:dev"]

# ============================================================================
# PRODUCTION - минимальный production образ
# ============================================================================
FROM base AS production

ENV NODE_ENV=production

# Создаем непривилегированного пользователя
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Копируем зависимости
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Копируем собранные файлы
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 5000

CMD ["npm", "run", "docker:start"]