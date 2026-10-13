<p align="center">
  <img src="docs/assets/allonfire.png" width="80" alt="AllOnFire logo" />
</p>

<h3 align="center">AllOnFire 🔥</h3>

<br />

<p align="center">
  <img src="https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/Turborepo-2-EF4444?logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Biome-linter-60A5FA?logo=biome&logoColor=white" alt="Biome" />
  <img src="https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white" alt="Node" />
</p>

---

## 🔥 About

AllOnFire is a Turborepo-powered monorepo with shared packages, apps, and infrastructure managed through pnpm workspaces. It provides a unified development experience with shared TypeScript config, UI components, database services, and CI/CD pipelines across all projects.

## 📱 Apps

<!-- Add a screenshot for each app as it's built -->

<p align="center">
  <img src="docs/assets/allonfire-laura-horizontal.svg" width="200" alt="AllOnFire Laura" />
</p>

<h3 align="center">Photos & Games</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/BetterAuth-1.2-8B5CF6?logoColor=white" alt="BetterAuth" />
  <img src="https://img.shields.io/badge/next--intl-i18n-007ACC?logoColor=white" alt="next-intl" />
  <img src="https://img.shields.io/badge/Framer_Motion-12-FF0055?logo=framer&logoColor=white" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
</p>

<p align="center">
  Private photo gallery and games app with i18n support, S3/MinIO storage, and blurhash placeholders.
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
| 🔐 | **[@allonfire/auth](packages/auth/)** | Shared BetterAuth config, session guards, login UI |
| 📁 | **[@allonfire/storage](packages/storage/)** | S3/MinIO file uploads, image processing (Sharp + blurhash) |
| 🎨 | **[@allonfire/ui](packages/ui/)** | Shared UI components (shadcn/ui + Radix + Tailwind) |
| 🪝 | **[@allonfire/hooks](packages/hooks/)** | Responsive breakpoint hooks |
| 🔧 | **[@allonfire/core](packages/core/)** | Shared constants, helpers and the Next scaffolding |
| ⚙️ | **[@allonfire/config](packages/config/)** | Shared TypeScript configuration |

## 🗂️ Project Structure

<p>
  <img src="https://img.shields.io/badge/Docker-compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/GitHub_Actions-CI-2088FF?logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Husky-hooks-000?logo=git&logoColor=white" alt="Husky" />
</p>

Apps, shared packages, infrastructure, and CI/CD — all managed through pnpm workspaces and Turborepo.

```
allonfire/
  apps/
    laura/                Next.js photos & games app
  packages/
    auth/                 Shared BetterAuth config
    database/             Prisma ORM + services
    storage/              S3/MinIO uploads + image processing
    ui/                   Shared UI components
    hooks/                React hooks
    core/                 Shared constants, helpers, Next scaffolding
    config/               TypeScript config
  docker/                 Docker Compose + Dockerfile
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
| 🔄 | **CI** | GitHub Actions |

### 🚢 Deploy

A push to `prod` runs `.github/workflows/deploy.yml`: it builds an image only
for each Deploy unit (`api`, `back-office`, `db-migrate`) affected since the
last deploy (the `deployed/prod` tag), pushes it to GHCR as `:<sha>`, tags
every one `:prod` once all are built, and asks Dokploy to redeploy the one
compose project, which recreates only the services whose image changed (ADR 0018).

One-time setup:

1. GitHub, environment `prod`: secrets `DOKPLOY_API_KEY`, `PROD_STORAGE_ENDPOINT`, `PROD_NEXT_PUBLIC_API_URL`; variables `DOKPLOY_URL`, `DOKPLOY_COMPOSE_ID`.
2. Dokploy: a registry entry for `ghcr.io` with a GitHub token that has only `read:packages`.
3. Dokploy compose project `allonfire` (`docker/docker-compose.prod.yml`): auto-deploy off; env holds `DATABASE_URL`, `API_REDIS_URL`, `AUTH_SECRET`, `AUTH_COOKIE_DOMAIN`, `API_HOST`, `BACK_OFFICE_HOST`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`.
4. First deploy: with no `deployed/prod` tag yet, the workflow builds every unit; a manual run (`workflow_dispatch`) does the same later.

Before the API starts, the one-shot `storage-setup` service creates the `image` bucket with its read-only policy and uploads the sign-in photo as AVIF, each only when missing; nothing is uploaded by hand.

Rollback: `docker buildx imagetools create -t ghcr.io/isaiascope/allonfire-<unit>:prod ghcr.io/isaiascope/allonfire-<unit>:<sha>`, then redeploy the compose project in Dokploy.

Laura is out of Production until its rebuild.

### 💻 Local

`pnpm dev:setup` starts the Local stack, applies the changelog, seeds the
database and uploads the Image Fixtures' files. `packages/database/.env` sets
`DATABASE_SEED_MODE="local"` so the seed adds every Fixture User (password
`FIXTURE.PASSWORD`); a `.env` from before the Fixtures drops
`DATABASE_SEED_TEST_PASSWORD` and changes `dev` to `local`.
`packages/storage/.env` (from its `.env.example`) holds the Local MinIO
login the upload and the e2e run's bucket use.

---

<p align="center">
  Made with ❤️ and way too much ☕
</p>

