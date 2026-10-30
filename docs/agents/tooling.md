# Tooling

Docs lookup, agent skills, MCP servers, the exFAT drive.

## Context7 Usage

Always use Context7 MCP tools when generating code involving:

- Next.js, React, Prisma, BetterAuth, shadcn/ui, TanStack Query, Zustand
- Resolve library ID first, then query docs

For Next.js, read the docs that ship with the installed version first:
`packages/core/node_modules/next/dist/docs/` (`01-app`, `02-pages`,
`03-architecture`, `index.md`). They match the exact `next` in the lockfile,
so they never describe an option this version lacks. Use Context7 when they
do not cover the question.

Before implementing anything in Next.js, React or shadcn, check the Framework
skills (below) for a guide that covers it and follow it: `shadcn` for
components, `vercel-react-best-practices` and `vercel-composition-patterns` for
React, the `next-*` skills for caching, prefetching and the dev loop.

## Framework skills

Pinned in `skills-lock.json`, restored with `npx skills experimental_install`:

- Vercel: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `vercel-react-view-transitions`, `writing-guidelines`.
- Next.js: `next-dev-loop`, `next-cache-components-adoption`, `next-cache-components-optimizer`, `next-partial-prefetching-adoption`, `next-partial-prefetching-optimizer`.
- shadcn: `shadcn`, `migrate-radix-to-base`.
- impeccable: installed with `npx impeccable install --providers=claude --scope=project`, not in `skills-lock.json`; its engine binary is gitignored and downloaded on first run. Reach it only through `/aof-design`.
- Repo's own: `aof-design` (every page, ADR 0011 and 0014) and `aof-documentation` (READMEs, docs, screenshots).

MCP servers in `.mcp.json`: `shadcn` (browse and add registry components) and `next-devtools` (errors, routes and logs from a running `next dev`).

## exFAT volume

The repo lives on an exFAT drive, where macOS writes a `._<name>` sidecar next to every file it touches. Turbopack's file cache stays on: a Next app's `dev` and `build` scripts delete `._*` under `.next` before starting, since Turbopack fails to open a cache folder holding them (laura still turns its dev cache off until it is migrated). Next keeps no optimized image on disk on macOS (`AOFCreateNextConfig`): its image cache serves a folder's first file, which on exFAT is the `._` sidecar. The vitest and Playwright presets ignore `**/._*`; a new tool that scans directories needs the same exclusion.

