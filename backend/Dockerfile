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
    npm ci --prefer-offline --no-audit

# ============================================================================
# BUILDER - сборка TypeScript
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
# DEVELOPMENT - для разработки
# ============================================================================
FROM base AS development

ENV NODE_ENV=development

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем код (будет перезаписано volume в docker-compose)
COPY . .

# Устанавливаем глобальные инструменты для разработки
RUN npm install -g nodemon ts-node

EXPOSE 5000

CMD ["npm", "run", "docker:dev"]

# ============================================================================
# PRODUCTION - минимальный production образ
# ============================================================================
FROM base AS production

ENV NODE_ENV=production

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем собранные файлы
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 5000

CMD ["npm", "run", "docker:start"]
