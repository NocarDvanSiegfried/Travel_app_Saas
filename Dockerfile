# syntax=docker/dockerfile:1.4

# ============================================================================
# BASE - базовый образ
# ============================================================================
FROM node:18-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# ============================================================================
# DEPS - установка зависимостей (кешируется при неизменных package.json)
# ============================================================================
FROM base AS deps

# Копируем ТОЛЬКО файлы зависимостей - это ключ к кэшированию
# package-lock.json* с * означает что файл опционален
COPY package.json package-lock.json* ./

# Устанавливаем зависимости с BuildKit cache mount
# npm ci работает только если есть package-lock.json, иначе используем npm install
# npm cache сохраняется между сборками автоматически
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --prefer-offline --no-audit; \
    else \
      npm install --prefer-offline --no-audit --package-lock; \
    fi

# ============================================================================
# BUILDER - сборка приложения
# ============================================================================
FROM base AS builder

ENV NODE_ENV=production

# Копируем зависимости из deps stage
COPY --from=deps /app/node_modules ./node_modules

# Копируем исходный код ПОСЛЕ установки зависимостей
COPY . .

# Собираем приложение с кэшированием .next/cache
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ============================================================================
# DEVELOPMENT - для разработки
# ============================================================================
FROM base AS development

ENV NODE_ENV=development
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем код (будет перезаписано volume в docker-compose)
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================================================
# PRODUCTION - минимальный production образ
# ============================================================================
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копируем зависимости
COPY --from=deps /app/node_modules ./node_modules

# Копируем собранное приложение
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
