<h1 align="center"><img src="docs/assets/allonfire.svg" width="36" alt="" />&nbsp;&nbsp;AllOnFire 🔥</h1>

<br />

<p align="center">
  <img src="https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/Turborepo-2-EF4444?logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Biome-linter-60A5FA?logo=biome&logoColor=white" alt="Biome" />
  <img src="https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white" alt="Node" />
</p>

---

## 🔥 About

AllOnFire is a Turborepo-powered monorepo with shared packages, apps, and infrastructure managed through pnpm workspaces. It provides a unified development experience with shared TypeScript config, UI components, database services, and CI/CD pipelines across all projects.

## 📱 Apps

<!-- Add a screenshot for each app as it's built -->
<!-- <p align="center"><img src="docs/screenshots/social.png" width="600" alt="Social App" /></p> -->

### 🔥 [social](apps/social/) — Social Media Dashboard

Discover topics, generate AI content, and publish to Twitter and LinkedIn from a single dashboard.

<p>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white" alt="TanStack Query" />
</p>

> 📖 See the full docs in [apps/social/](apps/social/)

---

## 🚀 Quick Start

```bash
pnpm install                 # Install all dependencies
pnpm docker:up               # Start PostgreSQL, n8n, Adminer
pnpm db:push && pnpm db:seed # Push schema and seed data
pnpm dev                     # Start the social app on :3100
```

> Or run everything at once with `pnpm dev:full`

## 📦 Packages

| | Package | Description |
|-|---------|-------------|
| 🗄️ | **[@allonfire/database](packages/database/)** | Prisma ORM, PostgreSQL services, encrypted token storage |
| 🤖 | **[@allonfire/content-generator](packages/content-generator/)** | AI content generation (Anthropic, Gemini, Groq, OpenRouter) |
| 📤 | **[@allonfire/social-publisher](packages/social-publisher/)** | Platform adapters, OAuth flows, image processing |
| 🎨 | **[@allonfire/ui](packages/ui/)** | Shared UI components (shadcn/ui + Radix + Tailwind) |
| 🪝 | **[@allonfire/hooks](packages/hooks/)** | Responsive breakpoint hooks |
| 🔧 | **[@allonfire/utils](packages/utils/)** | Type-safe utility functions |
| ⚙️ | **[@allonfire/config](packages/config/)** | Shared TypeScript configuration |

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start social app with hot reload |
| `pnpm build` | Build all packages via Turbo |
| `pnpm dev:setup` | Full local setup (Docker + DB + seed + n8n) |
| `pnpm docker:up` / `docker:down` | Start/stop dev containers |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:seed` | Seed database with test data |
| `pnpm lint` / `lint:fix` | Ultracite (Biome) linter |
| `pnpm check-types` | TypeScript type checking |

## 🗂️ Project Structure

```
allonfire/
  apps/
    social/               Next.js dashboard app
  packages/
    content-generator/    AI content generation
    database/             Prisma ORM + services
    social-publisher/     Platform adapters + OAuth
    ui/                   Shared UI components
    hooks/                React hooks
    utils/                Utility functions
    config/               TypeScript config
  docker/                 Docker Compose + Dockerfile
  n8n/                    Workflow automation
  docs/                   Project documentation
  .github/                CI/CD workflows
```

## 🏗️ Infrastructure

| | Component | Stack |
|-|-----------|-------|
| 🖥️ | **VPS** | Hetzner CAX11 |
| 🚀 | **Orchestrator** | Dokploy |
| 🐘 | **Database** | PostgreSQL 16 |
| 🔒 | **Proxy** | Traefik + Let's Encrypt SSL |
| ⚡ | **Automation** | n8n (self-hosted) |
| 🔄 | **CI** | GitHub Actions |

## ⚡ n8n Automation

Daily discovery pipeline scraping 9 sources for trending tech topics. See [n8n/README.md](n8n/README.md) for details.
