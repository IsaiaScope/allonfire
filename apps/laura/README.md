<p align="center">
  <img src="public/allonfire-laura-horizontal.svg" width="200" alt="AllOnFire Laura" />
</p>

<h1 align="center">Photos & Games</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/next--intl-i18n-007ACC?logoColor=white" alt="next-intl" />
  <img src="https://img.shields.io/badge/Framer_Motion-12-FF0055?logo=framer&logoColor=white" alt="Framer Motion" />
</p>

<p align="center">
  Private family photo gallery with masonry grid, infinite scroll, memory and quiz games, i18n support, and blurhash placeholders.
</p>

---

<p align="center">
  <img src="../../docs/screenshots/laura-gallery.png" width="550" alt="Gallery" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-laura-gallery.png" width="180" alt="Mobile Gallery" />
</p>

## 📱 Routes

| | Route | Page | Feature |
|-|-------|------|---------|
| 🖼️ | `/` | Photo gallery with masonry grid and infinite scroll | [gallery](src/features/gallery/) |
| ❤️ | `/favorites` | Favorited photos | [gallery](src/features/gallery/) |
| 📤 | `/upload` | Photo upload with HEIC conversion (USER/ADMIN) | [upload](src/features/upload/) |
| ⚙️ | `/settings` | Language, appearance, user info | [settings](src/features/settings/) |
| 🎮 | `/games` | Game hub with animated cards | [games](src/features/games/) |
| 🃏 | `/games/memory` | Memory card matching game | [games](src/features/games/) |
| 🏆 | `/games/memory/leaderboard` | Memory scores | [games](src/features/games/) |
| ❓ | `/games/quiz` | Multiple choice quiz game | [games](src/features/games/) |
| 🏆 | `/games/quiz/leaderboard` | Quiz scores | [games](src/features/games/) |
| ✏️ | `/games/quiz/edit` | Quiz question management (ADMIN) | [games](src/features/games/) |
| ➕ | `/games/quiz/edit/new` | Create new quiz question (ADMIN) | [games](src/features/games/) |
| ✏️ | `/games/quiz/edit/[id]` | Edit existing quiz question (ADMIN) | [games](src/features/games/) |

## 🖼️ Features Gallery

<p align="center">
  <img src="../../docs/screenshots/laura-upload.png" width="550" alt="Upload" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-laura-upload.png" width="180" alt="Mobile Upload" />
</p>

**📤 [Upload](src/features/upload/)** — Drag-and-drop photo upload with HEIC auto-conversion, S3/MinIO storage, and real-time preview.

---

<p align="center">
  <img src="../../docs/screenshots/laura-games.png" width="550" alt="Games Hub" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-laura-games.png" width="180" alt="Mobile Games Hub" />
</p>

**🎮 [Games Hub](src/features/games/)** — Memory and Quiz game selection with Framer Motion animated cards and score summaries.

---

<p align="center">
  <img src="../../docs/screenshots/laura-memory.png" width="550" alt="Memory Game" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-laura-memory.png" width="180" alt="Mobile Memory Game" />
</p>

**🃏 [Memory Game](src/features/games/)** — Card matching game using gallery photos. Timer-based scoring with leaderboard.

---

<p align="center">
  <img src="../../docs/screenshots/laura-quiz.png" width="550" alt="Quiz Game" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-laura-quiz.png" width="180" alt="Mobile Quiz Game" />
</p>

**❓ [Quiz Game](src/features/games/)** — Multiple choice questions with image support. Score tracking and leaderboard.

---

<p align="center">
  <img src="../../docs/screenshots/laura-settings.png" width="550" alt="Settings" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-laura-settings.png" width="180" alt="Mobile Settings" />
</p>

**⚙️ [Settings](src/features/settings/)** — Language switcher (Italian/English), theme toggle, user profile info, and sign out.

## 🏗️ Architecture

```
pages ──> features ──> shared packages

  app/[locale]/(dashboard)/
    page.tsx           server component, fetches data
        |
    features/{name}/
      components/      UI (client components)
      actions/         server actions (mutations)
      hooks/           client state management
      utils/           shared helpers

  i18n: next-intl wraps all routes under [locale]
  roles: UserRoleProvider guards mutations for viewers
```

Each feature is self-contained with its own components, actions, and hooks. No barrel `index.ts` files — import directly from the specific file.

## 🔧 Development

```bash
pnpm dev          # Start on :3200
pnpm dev:mobile   # Start on :3201 (Tailscale)
pnpm build        # Production build
pnpm check-types  # TypeScript check
pnpm seed-photos  # Seed sample photos
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Auth session encryption key |
| `BETTER_AUTH_URL` | ✅ | App base URL for auth callbacks |
| `MINIO_ENDPOINT` | ✅ | MinIO/S3 endpoint URL |
| `MINIO_ACCESS_KEY` | ✅ | MinIO/S3 access key |
| `MINIO_SECRET_KEY` | ✅ | MinIO/S3 secret key |
| `MINIO_BUCKET` | ✅ | MinIO/S3 bucket name |
| `VIEWER_EMAIL` | | Email for auto-created viewer account |
| `VIEWER_PASSWORD` | | Password for auto-created viewer account |

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
