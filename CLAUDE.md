# AllOnFire — Claude Code Rules

Read AGENTS.md first for universal conventions. This file adds Claude Code-specific guidance.

## Server-Side Rendering First

Default to Server Components. Only add `"use client"` when the component actually needs:

- React hooks (`useState`, `useEffect`, `useTransition`, `useForm`, etc.)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `localStorage`, `navigator`)
- Third-party client libraries (`useTheme`, `usePathname`, context providers)

**Do not** add `"use client"` to pure presentational components that just receive props and render JSX — they work as Server Components with zero client JS cost.

**Pragmatic rule**: if making something server-side requires significantly more complexity (extra data-fetching layers, prop-drilling through many levels, splitting one simple component into server/client pairs), just use `"use client"`. Simplicity wins over purity.

### Patterns

- Fetch data in Server Components (pages, layouts), pass as props to client components
- Use Server Actions for mutations — keep form logic in client components but action definitions server-side
- Use `initialData` pattern with TanStack Query: server-fetch in page, hydrate in client component
- Providers (`ThemeProvider`, `QueryClientProvider`) must be client — wrap them in a single `Providers` component

## Context7 Usage

Always use Context7 MCP tools when generating code involving:

- Next.js, React, Prisma, BetterAuth, shadcn/ui, TanStack Query, Zustand
- Resolve library ID first, then query docs

## Content Generation Workflow

When generating social media posts:

1. Check `packages/content-generator/src/prompts/` for existing templates
2. Each prompt type (meme, news, learning) has platform-specific rules
3. Platform rules are in `packages/content-generator/src/platforms/`
4. Generate via `pnpm --filter @allonfire/content-generator generate`
5. Stay within token budget: ~5K-15K tokens per topic × 4 platforms

## Database Schema Quick Reference

Key models: `Topic` (discovered content), `Post` (generated social posts), `User` (admin)
Key enums: `TopicCategory`, `TopicStatus`, `PostType`, `PostStatus`, `Platform`, `MediaType`
Schema: `packages/database/prisma/schema.prisma`

## Social App Structure (`apps/social/src/`)

### Route Layer (`app/`)

Pages contain **full component code** — no barrel re-exports. All dashboard pages are async Server Components.

```
app/(dashboard)/
├── layout.tsx              → Dashboard shell (sidebar, auth). Imports from @/features/layout/
├── page.tsx                → Overview stats (standalone, no feature imports)
├── discover/page.tsx       → Topic discovery. Imports from @/features/topics/
├── generate/page.tsx       → Generation queue. Imports from @/features/generation/
├── drafts/page.tsx         → Draft review. Imports from @/features/posts/
├── drafts/[id]/page.tsx    → Post editor. Imports from @/features/posts/
├── schedule/page.tsx       → Scheduled posts. Imports from @/features/posts/
├── users/page.tsx          → User management. Imports from @/features/users/
├── settings/layout.tsx     → Settings nav. Imports from @/features/settings/
├── settings/page.tsx       → Redirect to /settings/general
├── settings/general/page.tsx    → Webhooks. Imports from @/features/settings/
└── settings/providers/page.tsx  → AI providers. Imports from @/features/providers/
```

### Feature Layer (`features/`)

Domain-specific components, server actions, hooks, and constants. **No barrel index files** — import directly:

```ts
// Correct
import { GenerateButton } from "@/features/generation/components/generate-button";
// Wrong — no index.ts barrels
import { GenerateButton } from "@/features/generation";
```

Features: `layout/`, `topics/`, `generation/`, `posts/`, `users/`, `settings/`, `providers/`

Each has: `components/` (UI), `actions/` (server actions), optionally `hooks/`, `constants/`

### Shared Layer

- `components/` — Cross-cutting: `empty-state`, `providers`, `theme-provider`, `theme-toggle`
- `lib/` — `auth.ts` (BetterAuth config), `auth-client.ts`, `api-auth.ts` (webhook key validation)
- `env.ts` — Zod-validated environment variables

### Import Rules

- Pages → features: `@/features/<domain>/components/<component>`
- Features → UI: `@allonfire/ui/components/<component>`
- Features → DB: `@allonfire/database`
- Features → shared: `@/components/<component>`

## Dashboard Routes

- `/` — Overview with stats
- `/discover` — Browse discovered topics
- `/generate` — Trigger + monitor generation
- `/drafts` — Review + approve generated posts
- `/schedule` — Calendar of scheduled posts
- `/settings` — n8n webhook URLs, platform config
- `/settings/providers` — AI provider management
- `/users` — User management (admin only)

## Deployment

- VPS: Hetzner CAX11 at 188.245.174.30 (ssh main-vps)
- Orchestrator: Dokploy
- DB: Shared PostgreSQL 16 (database: allonfire)
- Proxy: Traefik with Let's Encrypt SSL

