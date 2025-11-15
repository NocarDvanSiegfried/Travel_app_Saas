FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat curl wget

# Dependencies stage - install all dependencies (including dev)
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies - use npm ci if package-lock.json exists, otherwise npm install
RUN if [ -f package-lock.json ]; then \
      npm ci && npm cache clean --force; \
    else \
      npm install && npm cache clean --force; \
    fi

# Production dependencies only
FROM base AS deps-prod
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production && npm cache clean --force; \
    else \
      npm install --only=production && npm cache clean --force; \
    fi

# Builder stage - compile TypeScript
FROM base AS builder
WORKDIR /app

# Copy all dependencies (including dev dependencies for TypeScript)
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package.json package-lock.json* ./

# Copy source code and config files
COPY tsconfig.json ./
COPY src ./src
COPY data ./data

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy only production dependencies
COPY --from=deps-prod /app/node_modules ./node_modules

# Copy built files and config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY package.json ./

EXPOSE 5000

# Start the application with tsconfig-paths for path alias resolution
CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]
