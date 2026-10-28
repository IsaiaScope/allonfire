<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# AllOnFire — agent guide

pnpm + Turbo monorepo. Apps: `apps/api` (Hono, 3300), `apps/back-office`
(Next 16, 3400), `apps/laura` (old Next, until rebuilt). Packages under
`packages/`, one per concept. Domain words: `CONTEXT.md`; decisions:
`docs/adr/`.

## Always

- Before touching an area, read its guide below. The guides hold the full
  rules; this file holds only what every edit needs.
- Next.js: read `packages/core/node_modules/next/dist/docs/` first (it matches
  the installed `next`), then Context7; check the Framework skills
  (`docs/agents/tooling.md`).
- Server Components by default; `"use client"` only for hooks, event
  handlers, browser APIs or client libraries.
- Tests first. A test file's first line is `// @module-tag unit` or
  `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`. A constant's type comes from zod
  (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table
  is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`,
  `localStorage`/`sessionStorage`: use core's helpers.
- Constants are one nested object per owner (`API`, `AUTH`, `IMAGE`, …). A
  path or an error code is never a string literal, tests included.
- An env var starts with its owner: `STORAGE_`, `DATABASE_`, `AUTH_`, `API_`.
- A package never imports an App. Files go in `src/{environment,shared,features}`.
- Every form with fields is an AOF form (`useAOFForm`), never bare `useForm`.
- Components shared by Apps live in `packages/ui`, named `AOF…`.
  `packages/shadcn` is written only by the shadcn CLI. Pages are built through
  `/aof-design`, never plain `/impeccable`.
- Database changes are Liquibase changesets (`pnpm db:changeset`), never
  `prisma db push` or `prisma migrate`.
- exFAT drive: macOS writes `._*` sidecars; a new tool that scans folders
  ignores `**/._*`.

## Guides (`docs/agents/`, read on demand)

| When you work on | Read |
|---|---|
| helpers, constants, error codes | `conventions.md` |
| where a file or package goes, exports, env names | `package-layout.md` |
| any Next App: SSR, server actions, TanStack, errors, providers | `next-apps.md` |
| Back Office pages: metadata, signed-in pages, caching, frame, PWA | `back-office.md` |
| a form | `forms.md` |
| schemas, services, Roles and access, Liquibase | `database.md` |
| the API: structure, routes, problem documents, guards, i18n | `api.md` |
| tests of any layer, the pre-commit hook, oxlint | `testing.md` |
| Images, Avatars, the image server, signed links | `images.md` |
| `packages/design`, `packages/ui`, shadcn, Tailwind rewrite | `design-system.md` |
| VPS, Docker services, CI | `deployment.md` |
| Laura | `laura.md` |
| docs lookup, skills, MCP, exFAT | `tooling.md` |
| issues (GitHub, `gh`) | `issue-tracker.md` |
| triage labels | `triage-labels.md` |
| reading `CONTEXT.md` and ADRs | `domain.md` |

A new rule goes in its guide; this file gains a line only when every edit
needs it.
