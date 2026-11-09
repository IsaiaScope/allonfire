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

## Local and repo tools

- Before proposing or adding an npm dependency, check that it has at least 200,000 weekly downloads.
- Store documentation screenshots in `docs/screenshots/` and temporary debug captures in the gitignored `screenshots/`; follow `.claude/skills/aof-documentation/SKILL.md` for README conventions.
- Use plain indentation and arrows in text diagrams; box-drawing characters can misalign across editors.
- Local stack: `pnpm docker:up` starts `docker/docker-compose.dev.yml` (database, Redis, database console, storage, image server, `cdn`, telemetry, analytics, workflow); `pnpm dev:setup` fills a fresh one (Prisma client, changelog, seed, image bucket); every Local address: `packages/config/local/addresses.ts`.
- `pnpm dev`: the Local stack, the Tailscale Services, then turbo's `dev`, `test` and the Vitest UI in one TUI: `package.json`.
- Opening the dev Apps on a phone over Tailscale (setup, a Service stuck pending, `BACK_OFFICE_URL` for link previews): `README.md` (Local); why: `docs/adr/0021-dev-apps-reach-devices-as-tailscale-services.md`.
- Turbo's remote cache is Vercel's: `turbo login` and `turbo link` locally, `TURBO_TOKEN` and `TURBO_TEAM` in CI; without them turbo runs uncached and still passes: `.github/workflows/ci.yml`.
- `pnpm static:dupes` (jscpd; `.jscpd.json`) runs in the `static` Stage, locally and in CI (`testing.md`). It scans the Apps, the packages, `.github/` and `docker/` (YAML too), prints absolute paths and exits 1 on any clone. A clone is merged (a test's copy into its file's helper or the area's shared tests); one kept on purpose sits between `jscpd:ignore-start` and `jscpd:ignore-end` comments (`//`, or `#` in YAML) whose first line says why, never around a whole file.
- `gh` and `git push` act as the repo owner's GitHub account (`IsaiaScope`, the `origin` remote); on a machine with several accounts, a refused push needs `gh auth switch --user IsaiaScope`.

## knip

`pnpm static:knip` reports unused files, exports, dependencies and binaries across the workspace, tests included; `pnpm static:knip-production` (`knip --production`) reads only production code, so it also finds what only tests use: an export only a test imports, a file only tests reach, a runtime import of a devDependency. Both exit 0 on a clean tree, and CI's `quality` job runs both (`testing.md`). Config: `knip.jsonc`.

- **Production code** is every entry marked `!` (`src/index.ts!`, the CLIs, `print-affected.ts!`) plus what knip finds itself (Next pages, package `exports`, `start` scripts), over each workspace's `project` minus its `!…!` negations: `tests/`, `*.test*.ts(x)`, `vitest.*.ts` and the Back Office's `e2e/`. A new CLI a script runs gets its `!` entry.
- **Read a hit** by finding its readers before anything else (`git grep -w <name> -- apps packages`, Laura included): an export with none is deleted; one read only in its own file loses `export` (a zod schema per the Schemas rule in `conventions.md`); a dependency an import needs at runtime moves from `devDependencies` to `dependencies`; a binary or dependency that a package uses without listing it gets listed.
- **Accept a hit** only when it is not dead code: a Laura-only export ("held only by Laura"), a shadcn component, an export kept for a page not built yet, a test helper or test setup other packages' tests import, a config file's import (production mode leaves `next.config.ts`, Vitest and Playwright configs out). The accept is an entry in `knip.jsonc` (`ignoreIssues` for one file and only the issue types it has, `ignoreDependencies`, `ignoreBinaries`, `ignoreUnresolved`) with a `//` reason right above it or above the run of entries it joins. Never a whole folder (`dir/**`): `packages/config/local/tests/knip-config.test.ts` fails on one.
- **An export only tests read** (a unit test, a type test, a test helper that parses with it), used or not in its own file, is tagged `/** @internal */`, never accepted file-wide in `knip.jsonc`: production mode skips an `@internal` export, `pnpm static:knip` still reports it once no test reads it, and the knip-config test fails on an `ignoreIssues` reason that says only tests read it. The tag goes in the export's JSDoc as its own line (` * @internal`), or in a short new JSDoc saying what the export is.
- knip honours `.gitignore`, which already drops the exFAT `._*` sidecars, so the config needs no `**/._*`; the root workspace reads only its own root files (`project: ["*.{js,ts}"]`), leaving `.claude/` out.
