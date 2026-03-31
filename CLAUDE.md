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
5. Stay within token budget: ~5K-15K tokens per topic × 2 platforms

## Database Schema Quick Reference

Schema: `packages/database/prisma/schema.prisma`

- **Auth (shared):** `User`, `Session`, `Account`, `Verification`
- **Social:** `Topic`, `Prompt`, `Post`, `AiProvider`, `SocialAccount`, `Settings`, `WebhookLog`
- **Laura:** `Photo`, `Favorite`, `GameScore`, `QuizQuestion`, `QuizAnswer`
- **Key enums:** `TopicCategory`, `TopicStatus`, `PostType`, `PostStatus`, `Platform`, `MediaType`, `GameType`, `Role`

## Social App Structure (`apps/social/src/`)

### Route Layer (`app/`)

Pages contain **full component code** — no barrel re-exports. All dashboard pages are async Server Components.

```
app/(dashboard)/
├── layout.tsx              → Dashboard shell (sidebar, auth). Imports from @/features/layout/
├── page.tsx                → Overview stats (standalone, no feature imports)
├── discover/page.tsx       → Topic discovery. Imports from @/features/topics/
├── generate/page.tsx       → Generation queue. Imports from @/features/generation/
├── publish/page.tsx        → Social media publishing wizard. Imports from @/features/publish/
├── admin/layout.tsx        → Admin panel shell (auth guard, submenu). Imports from @/features/admin/
├── admin/page.tsx          → Redirect to /admin/users
├── admin/users/page.tsx    → User management. Imports from @/features/admin/
├── admin/users/[id]/page.tsx → User detail. Imports from @/features/admin/
├── admin/providers/page.tsx → AI providers. Imports from @/features/admin/
├── settings/layout.tsx     → Settings nav. Imports from @/features/settings/
├── settings/page.tsx       → Redirect to /settings/general
└── settings/general/page.tsx    → Webhooks. Imports from @/features/settings/
```

### Feature Layer (`features/`)

Domain-specific components, server actions, hooks, and constants. **No barrel index files** — import directly:

```ts
// Correct
import { GenerateButton } from "@/features/generation/components/generate-button";
// Wrong — no index.ts barrels
import { GenerateButton } from "@/features/generation";
```

Features: `layout/`, `overview/`, `topics/`, `generation/`, `publish/`, `settings/`, `admin/` (includes user management + AI providers)

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

## Laura App Structure (`apps/laura/src/`)

Family photo gallery and games app. Uses next-intl for i18n (Italian + English), Framer Motion for animations, and a viewer role system (`UserRoleProvider` + `checkMutationAccess`).

### Route Layer (`app/[locale]/`)

All routes are nested under `[locale]` for i18n. Dashboard pages are async Server Components.

```
app/[locale]/(auth)/login/page.tsx
app/[locale]/(dashboard)/
├── layout.tsx                          → Dashboard shell (top bar, auth, UserRoleProvider)
├── page.tsx                            → Photo gallery (main view)
├── favorites/page.tsx                  → Favorited photos
├── upload/page.tsx                     → Photo upload (USER/ADMIN only)
├── settings/page.tsx                   → Language, appearance, user info
├── games/page.tsx                      → Game hub (memory + quiz cards)
├── games/memory/page.tsx               → Memory card matching game
├── games/memory/leaderboard/page.tsx   → Memory leaderboard
├── games/quiz/page.tsx                 → Quiz game
├── games/quiz/upload/page.tsx          → Create quiz questions (USER/ADMIN)
└── games/quiz/leaderboard/page.tsx     → Quiz leaderboard
```

### Feature Layer (`features/`)

Same conventions as Social — no barrel index files, import directly.

Features: `gallery/`, `games/`, `upload/`, `settings/`, `layout/`

Each has: `components/` (UI), `actions/` (server actions), optionally `hooks/`

### Shared Layer

- `components/` — `animated-page`, `motion-provider` (LazyMotion), `user-role-provider`
- `lib/` — `auth.ts`, `animation-variants.ts`, `file-validation.ts`, `seo.ts`
- `i18n/` — next-intl routing and request config

### Viewer Role System

- Server: `checkMutationAccess(auth)` in `packages/auth/src/guard.ts` guards all write actions
- Client: `UserRoleProvider` + `useIsViewer()` hook for UI restrictions
- Viewers can browse gallery and play games but cannot upload, favorite, delete, or submit scores

### Laura Dashboard Routes

- `/` — Photo gallery grid with infinite scroll
- `/favorites` — Favorited photos
- `/upload` — Photo upload (blocked for viewers)
- `/settings` — Language, theme, user info
- `/games` — Game hub
- `/games/memory` — Memory card game
- `/games/memory/leaderboard` — Memory scores
- `/games/quiz` — Quiz game
- `/games/quiz/upload` — Create quiz questions
- `/games/quiz/leaderboard` — Quiz scores

## Social Dashboard Routes

- `/` — Overview with stats
- `/discover` — Browse discovered topics
- `/generate` — Trigger + monitor generation
- `/publish` — Compose and publish social media posts
- `/settings` — n8n webhook URLs, platform config
- `/admin` — Admin panel redirect → `/admin/users`
- `/admin/users` — User management (admin only)
- `/admin/providers` — AI provider management (admin only)

## Deployment

- VPS: Hetzner CAX11 at 188.245.174.30 (ssh main-vps)
- Orchestrator: Dokploy
- DB: Shared PostgreSQL 16 (database: allonfire)
- Proxy: Traefik with Let's Encrypt SSL

