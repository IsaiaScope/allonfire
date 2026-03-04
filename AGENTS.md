# AllOnFire — Agent Rules

Universal coding conventions for all AI agents (Claude Code, Cursor, Copilot, etc.)

## Project Overview

Social content automation monorepo. Pipeline: n8n discovers topics → user curates in dashboard → Claude generates platform-optimized posts → n8n publishes.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js Server Components + Server Actions
- **Database**: PostgreSQL 16, Prisma 7 ORM
- **Auth**: BetterAuth (login-only, no registration)
- **Content Gen**: Anthropic Claude API via `@anthropic-ai/sdk`
- **Automation**: n8n workflows (topic discovery, publishing, notifications)
- **Linting**: Ultracite (Biome under the hood)
- **Deployment**: Dokploy on Hetzner VPS, Docker multi-stage builds

## Workspace Packages

| Package | Path | Description |
|---------|------|-------------|
| `@allonfire/social` | `apps/social` | Next.js admin dashboard |
| `@allonfire/database` | `packages/database` | Prisma schema + client |
| `@allonfire/ui` | `packages/ui` | shadcn/ui shared components |
| `@allonfire/content-generator` | `packages/content-generator` | Claude content generation |
| `@allonfire/config` | `packages/config` | Shared TypeScript configs |

## Coding Conventions

### TypeScript
- Strict mode always
- Use `type` keyword only — never `interface`
- Prefer `unknown` over `any`
- Use `as const` for literal types
- Kebab-case for file names

### React / Next.js
- Server Components by default — only `"use client"` when needed
- Use Server Actions for mutations
- TanStack Query for client-side interactivity with `initialData` from Server Components
- Zustand for client-side UI state only (sidebar, filters)
- Use `@allonfire/ui` components — don't create duplicate primitives

### Database
- Import `prisma` from `@allonfire/database`
- Import types from `@allonfire/database` (re-exported from Prisma)
- Never import from `generated/prisma` directly

### Formatting
- Run `pnpm lint:fix` before committing
- Biome handles formatting — no Prettier
- Double quotes, semicolons, trailing commas

### Git
- Conventional commits with required scope: `feat(social): add topic filtering`
- Scopes: `social`, `database`, `ui`, `generator`, `config`, `n8n`, `docker`, `ci`

## Commands

```bash
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm lint             # Check formatting + linting
pnpm lint:fix         # Fix formatting + linting
pnpm check-types      # TypeScript type checking
pnpm db               # Push Prisma schema to DB
pnpm db:generate      # Generate Prisma client
pnpm docker:up        # Start dev PostgreSQL + app
pnpm docker:down      # Stop dev containers
pnpm dev:full         # docker:up + db:generate + db + dev
```

## Environment Variables

Required in `apps/social/.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Auth encryption secret
- `BETTER_AUTH_URL` — App URL for auth redirects

Required in `packages/content-generator/.env`:
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — Claude API key
