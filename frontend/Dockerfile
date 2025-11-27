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

ENV NEXT_TELEMETRY_DISABLED=1

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
# DEPS-PROD - только production зависимости (для standalone mode не нужен, но для консистентности)
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
# BUILDER - сборка приложения
# ============================================================================
FROM base AS builder

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем зависимости из deps stage
COPY --from=deps /app/node_modules ./node_modules

# Копируем конфигурационные файлы сначала (меняются реже)
COPY package.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY tsconfig.json ./

# Копируем статические файлы (меняются реже)
COPY public ./public

# Копируем исходный код последним (меняется чаще)
COPY src ./src

# Собираем приложение с кэшированием .next/cache
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ============================================================================
# DEVELOPMENT - для разработки (оптимизировано)
# ============================================================================
FROM base AS development

ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем конфигурационные файлы сначала (меняются реже)
COPY package.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY tsconfig.json ./

# Копируем статические файлы (меняются реже)
COPY public ./public

# Копируем исходный код последним (меняется чаще)
COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================================================
# PRODUCTION - минимальный production образ
# ============================================================================
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копируем собранное приложение из standalone mode (включает только необходимые node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
