# AllOnFire — Claude Code Rules

Read AGENTS.md first for universal conventions. This file adds Claude Code-specific guidance.

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

## Dashboard Routes

- `/` — Overview with stats
- `/discover` — Browse discovered topics
- `/generate` — Trigger + monitor generation
- `/drafts` — Review + approve generated posts
- `/schedule` — Calendar of scheduled posts
- `/settings` — n8n webhook URLs, platform config

## Deployment

- VPS: Hetzner CAX11 at 188.245.174.30 (ssh main-vps)
- Orchestrator: Dokploy
- DB: Shared PostgreSQL 16 (database: allonfire)
- Proxy: Traefik with Let's Encrypt SSL
