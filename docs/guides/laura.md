# Laura

Laura (`apps/laura`), until it is rebuilt.

- Keep Laura's `randomUUID` fallback while its own Tailscale dev script serves HTTP, where secure-context APIs can be unavailable.
- For fixed-height pages, pass available height down a flex chain; iOS Safari viewport calculations can overflow.
- For Safari blur and opacity, include `-webkit-backdrop-filter` and use `color-mix(in srgb, ...)` where needed.

## Laura App Structure (`apps/laura/src/`)

Family photo gallery and games app. Uses next-intl for i18n (Italian + English), Framer Motion for animations, and an old viewer role system (`UserRoleProvider` + `checkMutationAccess`), replaced by two Roles (see Roles below).

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
├── games/quiz/leaderboard/page.tsx     → Quiz leaderboard
├── games/quiz/edit/page.tsx            → Quiz questions management (ADMIN)
├── games/quiz/edit/new/page.tsx        → Create new quiz question (ADMIN)
└── games/quiz/edit/[id]/page.tsx       → Edit existing quiz question (ADMIN)
```

### Feature Layer (`features/`)

No barrel index files — import directly.

Features: `gallery/`, `games/`, `upload/`, `settings/`, `layout/`

Each has: `components/` (UI), `actions/` (server actions), optionally `hooks/`

### Shared Layer

- `components/` — `animated-page`, `motion-provider` (LazyMotion), `user-role-provider`
- `lib/` — `auth.ts`, `animation-variants.ts`, `file-validation.ts`, `seo.ts`
- `i18n/` — next-intl routing and request config

### Roles

- Laura has two Roles, Admin and User (ADR 0032): its floor in `ACCESS.APP_SETTINGS` is User, so no Viewer enters it and its Role picker offers Admin and User. The Viewer Role itself stays in the system for an App that wants a read-only Role.
- The API has `requireApp(App.LAURA)` (User or Admin) and `requireApp(App.LAURA, Role.ADMIN)` for an Admin-only Section such as Upload.
- This page describes the old app, which still branches on a `"VIEWER"` string (`UserRoleProvider`, `useIsViewer()`, `checkMutationAccess`) until Phase 3 empties its `src/` and Phase 7 deletes it.

### Laura Dashboard Routes

- `/` — Photo gallery grid with infinite scroll
- `/favorites` — Favorited photos
- `/upload` — Photo upload (Admin only)
- `/settings` — Language, theme, user info
- `/games` — Game hub
- `/games/memory` — Memory card game
- `/games/memory/leaderboard` — Memory scores
- `/games/quiz` — Quiz game
- `/games/quiz/leaderboard` — Quiz scores
- `/games/quiz/edit` — Quiz question management (ADMIN)
- `/games/quiz/edit/new` — Create new quiz question
- `/games/quiz/edit/[id]` — Edit existing quiz question

### Caching and link previews

- Leaderboards are `"use cache"` plus `cacheTag`, and a submitted score `updateTag`s its game (`features/games/actions/leaderboard-cache.ts`); the quiz admin actions call `revalidatePath("/games/quiz/edit", "layout")`, which clears the whole client router cache; `staleTimes.dynamic` is 300: `apps/laura/next.config.ts`.
- The layout names `openGraph.images` and `twitter.images` (the root `/opengraph-image`) explicitly, since WhatsApp and iMessage miss the convention file alone; `appleWebApp.title` matches the manifest's `short_name`; JSON-LD in `src/components/json-ld.tsx`.
- Laura's dev scripts and its env, under the old names: `apps/laura/README.md`.
