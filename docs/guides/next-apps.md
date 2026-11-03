# Next.js Apps

Rules for every Next App (Back Office now, Laura once rebuilt). Back Office specifics: `back-office.md`.

## Server-Side Rendering First

Default to Server Components. Only add `"use client"` when the component actually needs:

- React hooks (`useState`, `useEffect`, `useTransition`, `useForm`, etc.)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `localStorage`, `navigator`)
- Third-party client libraries (`useTheme`, `usePathname`, context providers)

**Do not** add `"use client"` to pure presentational components that just receive props and render JSX — they work as Server Components with zero client JS cost.

**Pragmatic rule**: if making something server-side requires significantly more complexity (extra data-fetching layers, prop-drilling through many levels, splitting one simple component into server/client pairs), just use `"use client"`. Simplicity wins over purity.

### Patterns

- Fetch data in Server Components (pages, layouts), pass as props to client components
- Use Server Actions for mutations — keep form logic in client components but action definitions server-side
- Use `initialData` pattern with TanStack Query: server-fetch in page, hydrate in client component
- A failed query or mutation is told in one place: an App mounts ui's `AOFQueryProvider` (`components/aof-query-provider`: core's `AOFQueryClientProvider` with `aofErrorCaches`, `features/next/query/aof-query-errors`, telling through `aofToast`). A mutation always toasts; a query only when refreshing what is on screen fails, since a first load shows its own error state (a table's). `meta: aofErrorMeta(t("…"))` gives the toast its own words, `aofErrorMeta(false)` silences it where the component shows the error; the default words are core's `Common.Request.failed`. Never an `aofToast` in a query's or mutation's own `onError`. A mutation's options live in its feature's `utils/<feature>-mutations.ts`, apart from `<feature>-queries.ts`, which the server reads too
- Providers must be client: an App composes the AOF providers from `@allonfire/core/features/next/providers/*` one by one in its `[locale]/layout.tsx` (ADR 0012), never a single all-in-one `Providers` component

## Instrumentation and server logs

Every Next App has a `src/instrumentation.ts` (Next looks for it in the App)
that only exports core's `register` and `onRequestError`
(`features/next/instrumentation/instrumentation`), imported and re-bound, since
an `export … from` trips Biome's `noBarrelFile`. The OpenTelemetry packages are
core's dependencies, not the App's. On the Node runtime only, `register`
imports core's `instrumentation.node.ts`, which
starts the OpenTelemetry NodeSDK (Next's own spans and the server's log
lines, to `TELEMETRY_ENDPOINT`) and does nothing without an endpoint.
`onRequestError` logs every error the server catches answering a request
(page, route, action, proxy) with its path and route type. Server code logs
through core's `serverLogger()` (`features/next/logger/server-logger`): one
lazy pino logger built from core's `telemetryEnv`
(`environment/telemetry-environment`), which the App's env `extends`. It
writes JSON lines to stdout and, when `TELEMETRY_ENDPOINT` is set, emits each
line in the process to the OpenTelemetry logs API under
`TELEMETRY_SERVICE_NAME`, which the SDK's log processor exports with the
line's trace. Never a pino worker transport (OTLP or pretty): pino's worker
loads its target by name at runtime, which a Next build does not trace. Every
`TELEMETRY_*` is optional, so `next build`, Local and tests run with none set
and ship nothing.

## Pointers

- robots.txt is core's `AOFRobots` (`Allow: /`, plus a sitemap line when indexed), never `Disallow: /`, which would hide an unindexed App's `noindex` from search engines and block link-preview bots: `packages/core/src/features/next/metadata/aof-indexed.ts`. (`docs/superpowers/specs/2026-10-08-back-office-special-pages-design.md`)
- The App scaffolding (providers, i18n, PWA, the Next config), export by export: `packages/core/README.md`.
- A Next App's side of auth (sign-in and sign-out actions, the Session, the proxy wrappers): `packages/auth/README.md`.
