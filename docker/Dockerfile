# syntax=docker/dockerfile:1
ARG NODE_VERSION=22

# Stage 1: Prune monorepo to only the target app's dependency tree
FROM node:${NODE_VERSION}-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.1.1 --activate
WORKDIR /app
COPY . .
ARG APP_NAME
RUN npx turbo prune @allonfire/${APP_NAME} --docker

# Stage 2: Install dependencies (cached unless package.jsons change)
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.1.1 --activate
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Stage 3: Build the app
FROM node:${NODE_VERSION}-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.1.1 --activate
WORKDIR /app
COPY --from=deps /app/ .
COPY --from=pruner /app/out/full/ .
ARG APP_NAME
# Build-time env stubs: satisfy @t3-oss/env validation during Next.js page data
# collection. STORAGE_ENDPOINT and NEXT_PUBLIC_API_URL must match runtime values:
# Next.js bakes them in at build (STORAGE_ENDPOINT is the /storage/images
# rewrite target, NEXT_PUBLIC_API_URL the API the browser calls). The Back
# office's build fails without STORAGE_ENDPOINT or NEXT_PUBLIC_API_URL.
# Other values are placeholders that never reach the runner stage.
ARG STORAGE_ENDPOINT
ARG NEXT_PUBLIC_API_URL
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    AUTH_SECRET="build-placeholder-secret-not-used-at-runtime" \
    AUTH_URL="http://build.placeholder" \
    STORAGE_ENDPOINT=${STORAGE_ENDPOINT} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    STORAGE_ACCESS_KEY="build" \
    STORAGE_SECRET_KEY="build-placeholder"
RUN pnpm --filter @allonfire/database db:generate
RUN pnpm turbo build --filter=@allonfire/${APP_NAME}

# Stage 4a: the API (and any Node Host): runs the TypeScript sources with tsx,
# with the workspace's installed dependencies. ponytail: bundle the API if
# start time or image size ever matters.
FROM node:${NODE_VERSION}-alpine AS node-runner
# Prisma's musl engine needs OpenSSL.
RUN apk add --no-cache openssl
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
ARG APP_NAME
ENV APP_NAME=${APP_NAME} NODE_ENV=production PORT=3000
COPY --from=builder --chown=appuser:nodejs /app ./
USER appuser
EXPOSE 3000
WORKDIR /app/apps/${APP_NAME}
CMD ["node_modules/.bin/tsx", "src/index.ts"]

# Stage 4b: a Next App (standalone). The last stage, so the default target.
FROM node:${NODE_VERSION}-alpine AS next-runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
COPY --from=builder --chown=appuser:nodejs /app/apps/${APP_NAME}/.next/standalone ./
COPY --from=builder --chown=appuser:nodejs /app/apps/${APP_NAME}/.next/static ./apps/${APP_NAME}/.next/static
COPY --from=builder --chown=appuser:nodejs /app/apps/${APP_NAME}/public ./apps/${APP_NAME}/public
USER appuser
ENV PORT=3000 HOSTNAME=0.0.0.0 NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "node apps/${APP_NAME}/server.js"]
