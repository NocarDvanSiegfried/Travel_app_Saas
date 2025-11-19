# syntax=docker/dockerfile:1.4

# ============================================================================
# BASE - минимальный базовый образ
# ============================================================================
FROM node:18-alpine AS base

# Устанавливаем только необходимые системные пакеты
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

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
# BUILDER - сборка приложения
# ============================================================================
FROM base AS builder

ENV NODE_ENV=production

# Копируем зависимости из deps stage
COPY --from=deps /app/node_modules ./node_modules

# Копируем только необходимые файлы для сборки (не все!)
COPY package.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY tsconfig.json ./
COPY public ./public
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

# Копируем только необходимые файлы для разработки
COPY package.json ./
COPY next.config.js ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY tsconfig.json ./
COPY public ./public
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

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем собранное приложение из standalone mode
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
