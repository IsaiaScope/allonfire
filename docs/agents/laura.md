# Laura

Laura (`apps/laura`), until it is rebuilt.

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

### Viewer Role System

- Server: `checkMutationAccess(auth)` now lives in `packages/auth-old/src/guard.ts` (local only, untracked) until Laura's refactor; the API has only `requireApp(App.LAURA)`, which lets Viewers in (Laura's floor); a guard for "USER or higher in Laura" comes with Laura's API (`roleIn` + `hasRole`)
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
- `/games/quiz/leaderboard` — Quiz scores
- `/games/quiz/edit` — Quiz question management (ADMIN)
- `/games/quiz/edit/new` — Create new quiz question
- `/games/quiz/edit/[id]` — Edit existing quiz question

