# =============================================================================
# Dockerfile — nm-services (NestJS Monorepo)
# Uso: docker build --build-arg SERVICE=auth-service -t nm-auth .
# Build multistage: deps → builder → runner (imagen mínima de producción)
# =============================================================================

ARG SERVICE=gateway
ARG NODE_VERSION=20-alpine

# ─── Stage 1: Dependencias (compartido entre todos los servicios vía cache) ──
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat python3 make g++

COPY package.json package-lock.json ./

# Cache de npm + reintentos (evita ECONNRESET en builds paralelos)
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

# bcrypt necesita compilar su binding nativo (omitido por --ignore-scripts)
RUN npm rebuild bcrypt

# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
ARG SERVICE
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY nest-cli.json tsconfig.json ./
COPY apps ./apps
COPY libs ./libs

RUN npx prisma generate --schema=libs/database/prisma/schema.prisma
RUN npx nest build ${SERVICE}

# Quitar devDependencies aquí — el runner NO vuelve a ejecutar npm ci
RUN npm prune --omit=dev

# ─── Stage 3: Runner (imagen mínima de producción) ───────────────────────────
FROM node:${NODE_VERSION} AS runner
ARG SERVICE
ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE}
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

# node_modules ya pruned desde builder (sin segunda descarga de npm)
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma

RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs && \
    chown -R nestjs:nestjs /app
USER nestjs

EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007

CMD ["sh", "-c", "node dist/apps/${SERVICE_NAME}/apps/${SERVICE_NAME}/src/main.js"]
