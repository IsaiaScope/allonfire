<p align="center">
  <img src="public/allonfire-social-horizontal.svg" width="200" alt="AllOnFire Social" />
</p>

<h3 align="center">Social Media Dashboard</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query" />
</p>

<p align="center">
  Discover trending topics, generate AI-powered content, and publish to Twitter and LinkedIn — all from one dashboard.
</p>

---

<p align="center">
  <img src="../../docs/screenshots/dashboard.png" width="550" alt="Dashboard" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-dashboard.png" width="180" alt="Mobile Dashboard" />
</p>

## 📱 Routes

| | Route | Page | Feature |
|-|-------|------|---------|
| 📊 | `/` | Overview with pipeline stats | [overview](src/features/overview/) |
| 🔍 | `/discover` | Browse and manage discovered topics | [topics](src/features/topics/) |
| ✨ | `/generate` | Trigger and monitor content generation | [generation](src/features/generation/) |
| 📝 | `/generate/[topicId]` | Single topic generation detail | [generation](src/features/generation/) |
| 📤 | `/publish` | Multi-step publishing wizard | [publish](src/features/publish/) |
| 👥 | `/admin/users` | User management (admin only) | [admin](src/features/admin/) |
| 🤖 | `/admin/providers` | AI provider configuration | [admin](src/features/admin/) |
| ⚙️ | `/settings/general` | Platform connections and preferences | [settings](src/features/settings/) |

## 🖼️ Features Gallery

<p align="center">
  <img src="../../docs/screenshots/discover.png" width="550" alt="Discover" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-discover.png" width="180" alt="Mobile Discover" />
</p>

**🔍 [Discover](src/features/topics/)** — Browse AI-curated topics from 9 sources. Filter by category, search, select for generation, or bulk delete.

---

<p align="center">
  <img src="../../docs/screenshots/generate.png" width="550" alt="Generate" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-generate.png" width="180" alt="Mobile Generate" />
</p>

**✨ [Generate](src/features/generation/)** — View selected topics and trigger AI content generation. Filter by feedback status, manage prompts.

---

<p align="center">
  <img src="../../docs/screenshots/publish-compose.png" width="550" alt="Publish" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-publish.png" width="180" alt="Mobile Publish" />
</p>

**📤 [Publish](src/features/publish/)** — 5-step wizard: compose content, select platforms, AI-adapt per platform, confirm, and publish. Supports image upload with drag-to-reorder.

---

<p align="center">
  <img src="../../docs/screenshots/admin-users.png" width="380" alt="Admin Users" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/admin-providers.png" width="380" alt="Admin Providers" />
</p>

**👥 [Admin](src/features/admin/)** — Manage team members and configure AI providers (Anthropic, OpenRouter, Google Gemini, Groq).

---

<p align="center">
  <img src="../../docs/screenshots/settings.png" width="550" alt="Settings" />
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/mobile-settings.png" width="180" alt="Mobile Settings" />
</p>

**⚙️ [Settings](src/features/settings/)** — Connect social media accounts (Twitter, LinkedIn), view active AI model, toggle theme.

## 🏗️ Architecture

```
pages ──> features ──> shared packages

  app/(dashboard)/
    page.tsx           server component, fetches data
        |
    features/{name}/
      components/      UI (client components)
      actions/         server actions (mutations)
      hooks/           client state management
      constants/       shared config
```

Each feature is self-contained with its own components, actions, and hooks. No barrel `index.ts` files — import directly from the specific file.

## 🔧 Development

```bash
pnpm dev          # Start on :3100
pnpm dev:mobile   # Start on :3101 (Tailscale)
pnpm build        # Production build
pnpm check-types  # TypeScript check
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | ✅ | Auth session encryption key |
| `BETTER_AUTH_URL` | ✅ | App base URL for auth callbacks |
| `N8N_API_KEY` | | Webhook authentication key |
| `TWITTER_CLIENT_ID` | | Twitter OAuth 2.0 client ID |
| `TWITTER_CLIENT_SECRET` | | Twitter OAuth 2.0 client secret |
| `LINKEDIN_CLIENT_ID` | | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | | LinkedIn OAuth client secret |
| `GOOGLE_CLIENT_ID` | | YouTube OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | | YouTube OAuth client secret |
| `VIEWER_EMAIL` | | Email for auto-created viewer account |
| `VIEWER_PASSWORD` | | Password for auto-created viewer account |

---

<p align="center">
  ⬅️ <a href="../../README.md">Back to monorepo root</a>
</p>
