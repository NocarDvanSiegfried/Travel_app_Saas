# Base stage - общий базовый образ
FROM node:18-alpine AS base

# Установка системных зависимостей
RUN apk add --no-cache libc6-compat curl wget

# Установка рабочей директории
WORKDIR /app

# Отключение telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies stage - установка всех зависимостей для разработки
FROM base AS deps

# Копирование файлов зависимостей
COPY package.json package-lock.json* ./

# Установка всех зависимостей (включая devDependencies)
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Development stage - для разработки
FROM base AS development

# Переменные окружения для разработки
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Копирование node_modules из deps stage
COPY --from=deps /app/node_modules ./node_modules

# Копирование всех файлов проекта
COPY . .

# Открытие порта
EXPOSE 3000

# Переменные окружения для Next.js
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Запуск dev сервера
CMD ["npm", "run", "dev"]

# Builder stage - для production сборки
FROM base AS builder

# Переменные окружения для сборки
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копирование файлов зависимостей
COPY package.json package-lock.json* ./

# Установка всех зависимостей (включая devDependencies для сборки)
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Копирование исходного кода
COPY . .

# Сборка Next.js приложения
RUN npm run build

# Runner stage - для production запуска
FROM base AS runner

# Переменные окружения для production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создание системного пользователя
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Копирование публичных файлов
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Копирование standalone build если существует, иначе полный build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Переключение на пользователя nextjs
USER nextjs

# Открытие порта
EXPOSE 3000

# Переменные окружения для Next.js
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Запуск приложения
CMD ["node", "server.js"]
