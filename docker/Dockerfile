# syntax=docker/dockerfile:1
ARG NODE_VERSION=24

# Stage 1: Prune monorepo to only the target app's dependency tree
FROM node:${NODE_VERSION}-alpine AS pruner
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.1.1 --activate
WORKDIR /app
COPY . .
ARG APP_NAME
# The lockfile's turbo, pinned exactly in package.json: a bare `npx turbo`
# here has no node_modules, fetches npm's latest, and the builder's locked
# turbo then fails to parse the turbo.json that latest writes.
RUN npx "turbo@$(node -p "require('./package.json').devDependencies.turbo")" prune @allonfire/${APP_NAME} --docker

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
# collection. NEXT_PUBLIC_API_URL must match the runtime value: Next.js bakes in
# the API the browser calls, and the Back Office's build fails without it.
# BACK_OFFICE_URL is the Back Office's metadataBase, baked into prerendered
# pages; it must equal the runtime value.
# Other values are placeholders that never reach the runner stage. The
# secret-shaped ones live on the build RUN line, not ENV, so they never enter
# the image config and the SecretsUsedInArgOrEnv check stays quiet.
ARG NEXT_PUBLIC_API_URL
ARG BACK_OFFICE_URL
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    API_URL="http://build.placeholder" \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    BACK_OFFICE_URL=${BACK_OFFICE_URL}
RUN pnpm --filter @allonfire/database db:generate
RUN AUTH_SECRET="build-placeholder-secret-not-used-at-runtime" \
    AUTH_URL="http://build.placeholder" \
    STORAGE_ACCESS_KEY="build" \
    STORAGE_SECRET_KEY="build-placeholder" \
    pnpm turbo build --filter=@allonfire/${APP_NAME}

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
