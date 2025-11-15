FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl wget
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client if using Prisma
# RUN npx prisma generate

# Development stage
FROM base AS development
WORKDIR /app

ENV NODE_ENV=development

RUN apk add --no-cache curl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install nodemon for hot reload
RUN npm install -g nodemon ts-node

EXPOSE 5000

CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]

