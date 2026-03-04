# ── Stage 1: Install dependencies ──────────────────────────────
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.1.1 --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/social/package.json apps/social/
COPY packages/database/package.json packages/database/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/
COPY packages/content-generator/package.json packages/content-generator/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build application ─────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@9.1.1 --activate
WORKDIR /app

COPY --from=deps /app/ ./
COPY . .

# Generate Prisma client and build Next.js
RUN pnpm --filter @allonfire/database db:generate
RUN pnpm --filter @allonfire/social build

# ── Stage 3: Production runner ─────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/social/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/social/.next/static ./apps/social/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/social/public ./apps/social/public

USER nextjs
EXPOSE 3100
ENV PORT=3100
ENV NODE_ENV=production

CMD ["node", "apps/social/server.js"]
