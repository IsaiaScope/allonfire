<p align="center">
  <img src="../../docs/assets/allonfire-laura-horizontal.svg" width="200" alt="AllOnFire Laura" />
</p>

<h1 align="center">Photos & Games</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/next--intl-i18n-007ACC?logoColor=white" alt="next-intl" />
  <img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query" />
</p>

<p align="center">
  Our private place for two: a photo gallery and the Memory game, in Italian and English, installable as a PWA and wearing the Ocean Design.
</p>

---

Laura is a Next App on the shared scaffold (ADR 0033). It reads the API only: no
Prisma client, no service, and Better Auth runs in the API. Screenshots arrive
with the cutover phase.

## 📱 Routes

| | Route | Page | Status |
|-|-------|------|--------|
| 🖼️ | `/` | Gallery | placeholder, Phase 4 |
| ⭐ | `/favorites` | Favorites | placeholder, Phase 4 |
| 🃏 | `/memory` | Memory game | placeholder, Phase 6 |
| 🏆 | `/memory/leaderboard` | Memory leaderboard | placeholder, Phase 6 |
| 📤 | `/upload` | Upload (Admin only) | placeholder, Phase 5 |

The signed-out pages are Sign in, Forgot password, Reset password, Email
verified and Offline. Nobody registers: an Admin adds Users in the Back Office.

## 🏗️ Architecture

```
src/
  app/             Next's routes: [locale]/ pages, manifest, icons, special pages
  environment/     the env schema (owner-prefixed names)
  features/        auth, errors, i18n, metadata, navigation, pwa: thin bindings
  shared/          constants (LAURA, page information), components, test helpers
```

An App holds only its descriptor (`LAURA` in `src/shared/constants/laura.ts`),
its words, its Ocean dressing and its pages; the frame, account menu, sign-in
pages, notices, PWA pieces and page information are shared packages
(`packages/ui`, `packages/core`, `packages/auth`, `packages/design`). Where each
one lives and what Laura binds: `docs/guides/laura.md`.

## 🔧 Development

```bash
cp .env.example .env.development   # Local values; see the table below
pnpm --filter @allonfire/laura dev       # :3200
pnpm --filter @allonfire/laura test      # unit tests
pnpm --filter @allonfire/laura test:browser
pnpm --filter @allonfire/laura test:e2e  # production build on :3210, with the API
pnpm --filter @allonfire/laura preview   # production build on :3220
```

`pnpm dev` from the repo root starts both Apps, the API and the Local services;
over Tailscale, see the root `README.md` (Local).

## 🔑 Environment Variables

Every variable is documented in `.env.example`.

| Variable | Required | Description |
|----------|:--------:|-------------|
| `API_URL` | yes | The API's address for the server |
| `API_AUTH_URL` | yes | The API's Auth address for the server |
| `NEXT_PUBLIC_API_URL` | yes | The API's address for the browser, baked in at build |
| `AUTH_APP` | yes | `LAURA`: the App a sign-in is for |
| `AUTH_COOKIE_DOMAIN` | | Production: the parent domain the Apps share Session cookies on |
| `LAURA_URL` | yes | Laura's own address; build and runtime must match |
| `BACK_OFFICE_URL` | yes | The Back Office's address, for the App switcher; build and runtime must match |
| `TELEMETRY_*` | | No endpoint, no telemetry |

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
