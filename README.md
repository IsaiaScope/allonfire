<p align="center">
  <img src="docs/assets/allonfire.png" width="80" alt="AllOnFire logo" />
</p>

<h3 align="center">AllOnFire 🔥</h3>

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

<p align="center">
  <img src="docs/assets/allonfire-social-horizontal.svg" width="200" alt="AllOnFire Social" />
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
  Discover topics, generate AI content, and publish to Twitter and LinkedIn from a single dashboard.
</p>

<p align="center">
  📖 <a href="apps/social/">See the full docs</a>
</p>

<br />

<p align="center">
  <img src="docs/assets/allonfire-laura-horizontal.svg" width="200" alt="AllOnFire Laura" />
</p>

<h3 align="center">Photo Gallery</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/next--intl-i18n-007ACC?logoColor=white" alt="next-intl" />
  <img src="https://img.shields.io/badge/Sharp-image_processing-99CC00?logo=sharp&logoColor=white" alt="Sharp" />
</p>

<p align="center">
  Private photo gallery with i18n support, S3/MinIO storage, and blurhash placeholders.
</p>

<p align="center">
  📖 <a href="apps/laura/">See the full docs</a>
</p>

---

## 📦 Packages

Shared libraries consumed by all apps in the monorepo.

| | Package | Description |
|-|---------|-------------|
| 🗄️ | **[@allonfire/database](packages/database/)** | Prisma ORM, PostgreSQL services, encrypted token storage |
| 🤖 | **[@allonfire/content-generator](packages/content-generator/)** | AI content generation (Anthropic, Gemini, Groq, OpenRouter) |
| 📤 | **[@allonfire/social-publisher](packages/social-publisher/)** | Platform adapters, OAuth flows, image processing |
| 🔐 | **[@allonfire/auth](packages/auth/)** | Shared BetterAuth config, session guards, login UI |
| 📁 | **[@allonfire/storage](packages/storage/)** | S3/MinIO file uploads, image processing (Sharp + blurhash) |
| 🎨 | **[@allonfire/ui](packages/ui/)** | Shared UI components (shadcn/ui + Radix + Tailwind) |
| 🪝 | **[@allonfire/hooks](packages/hooks/)** | Responsive breakpoint hooks |
| 🔧 | **[@allonfire/utils](packages/utils/)** | Type-safe utility functions |
| ⚙️ | **[@allonfire/config](packages/config/)** | Shared TypeScript configuration |

## 🗂️ Project Structure

<p>
  <img src="https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/n8n-2.10-EA4B71?logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Husky-hooks-000?logo=git&logoColor=white" alt="Husky" />
</p>

Apps, shared packages, infrastructure, and CI/CD — all managed through pnpm workspaces and Turborepo.

```
allonfire/
  apps/
    social/               Next.js social media dashboard
    laura/                Next.js photo gallery app
  packages/
    auth/                 Shared BetterAuth config
    content-generator/    AI content generation
    database/             Prisma ORM + services
    social-publisher/     Platform adapters + OAuth
    storage/              S3/MinIO uploads + image processing
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

Production deployment stack powering all apps and services.

| | Component | Stack |
|-|-----------|-------|
| 🖥️ | **VPS** | Hetzner |
| 🚀 | **Orchestrator** | Dokploy |
| 🐘 | **Database** | PostgreSQL 16 |
| 🔒 | **Proxy** | Traefik + Let's Encrypt SSL |
| ⚡ | **Automation** | n8n (self-hosted) |
| 🔄 | **CI** | GitHub Actions |

---

<p align="center">
  Made with ❤️ and way too much ☕
</p>

