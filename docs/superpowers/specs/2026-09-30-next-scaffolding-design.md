# Shared Next.js scaffolding in `@allonfire/utils`

## Why

Every Next App repeats the same wiring: TanStack Query's client and provider,
next-themes, nuqs, the dev-only Query Devtools, next-intl's request config and
proxy, and the same `next.config` base. Back office and Laura already carry two
drifting copies. A new App should compose shared pieces instead of rewriting
them, and drop any piece it does not need.

The API and the Apps also keep separate ideas of which languages exist. The
locale list moves to utils so both read one file.

## Decisions (from brainstorming)

- The scaffolding lives in `packages/utils`, under `src/next/`. Its framework
  libraries are optional `peerDependencies` of utils, so the API, which never
  imports `src/next/`, gains nothing at runtime.
- Only Back office adopts it now. Laura adopts it in its own refactor (it runs
  `auth-old`, `requestLocale`, webpack, a session guard, and `messages/`).
- Visible UI stays in `packages/design` (ADR 0011): no root layout shell, no
  `global-error`. `env.ts` stays per App (`createEnv` + `extends` already share).
- Every piece is its own file and export. No all-in-one provider: an App adds or
  removes providers one line at a time in its layout.
- Naming: `AOF` is always uppercase and goes in front of the original name —
  `AOFThemeProvider` for `ThemeProvider`, `AOFGetQueryClient` for
  `getQueryClient`.
- `LOCALE` moves from the API into `@allonfire/utils/constants/locales`; the
  Apps' `Language` type is derived from it.

## Layout

```
packages/utils/src/
  constants/locales.ts                 LOCALE, localeSchema, Locale,
                                       SUPPORTED_LOCALES, Language, LANGUAGES
  constants/tests/locales.test-d.ts
  next/
    config/aof-create-next-config.ts   AOFCreateNextConfig
    config/tests/
    i18n/aof-get-request-config.ts     AOFGetRequestConfig
    i18n/aof-create-middleware.ts      AOFCreateMiddleware
    i18n/tests/
    query/aof-get-query-client.ts      AOFGetQueryClient
    query/tests/
    providers/aof-query-client-provider.tsx
    providers/aof-react-query-devtools.tsx
    providers/aof-theme-provider.tsx
    providers/aof-nuqs-adapter.tsx
    providers/tests/
```

Export keys mirror paths, one line per file:
`"./next/providers/aof-theme-provider": "./src/next/providers/aof-theme-provider.tsx"`.

## Pieces

| Original | Shared | Behaviour |
|---|---|---|
| `getQueryClient` | `AOFGetQueryClient(options?)` | New client per server request, one browser client. Default `staleTime` 60 s; pending queries dehydrate. `options.staleTime` overrides. |
| `QueryClientProvider` | `AOFQueryClientProvider({ children, staleTime? })` | `"use client"`; client from `AOFGetQueryClient`. |
| `ReactQueryDevtools` | `AOFReactQueryDevtools({ enabled })` | `"use client"`; lazy import; `null` unless `enabled`. The App passes `env.NODE_ENV === NODE_ENV.DEVELOPMENT`: a package reading `process.env` in the browser would see it empty. Must sit inside `AOFQueryClientProvider`. |
| `ThemeProvider` (next-themes) | `AOFThemeProvider(props)` | `"use client"`; defaults `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`; any prop overrides. |
| `NuqsAdapter` | `AOFNuqsAdapter({ children })` | `"use client"`; the App Router adapter. |
| `getRequestConfig` | `AOFGetRequestConfig({ routing, locale, messages })` | `locale` is the App's `next/root-params` getter (its exports are generated per App, so utils cannot import it); `notFound()` when `routing` does not list it; `messages(locale)` loads the messages. |
| `createMiddleware` (next-intl) | `AOFCreateMiddleware(routing)` | Returns next-intl's proxy function. A step before it (`withSessionRefresh` from `@allonfire/auth`) wraps the returned proxy; there is no `guard` option. |
| `NextConfig` | `AOFCreateNextConfig(config, { transpile?, intl? })` | Base: `cacheComponents`, `reactCompiler`, `output: "standalone"`, `typedRoutes`, `SECURITY_HEADERS` on `/(.*)`. `transpilePackages` = `["@allonfire/utils", ...transpile]`, deduplicated. The App's `headers()` is appended after the security headers: when two rules match a path and set the same key, Next sends the last one, so the App's value wins with no merge code. App values override the base. `intl.requestConfig` wraps the result in next-intl's plugin; no `intl`, no plugin. |

The proxy's `config.matcher` stays a literal in each App's `proxy.ts`: Next
reads it statically and ignores an imported value.

### Shared routing, navigation and messages

Added after the first implementation. An App's `features/i18n/` keeps one line
per file: `routing.ts`, `navigation.ts`, `request.ts` (next-intl's plugin wants
a file inside the App) and `translations/` with only the App's own text.

| Original | Shared | Behaviour |
|---|---|---|
| `defineRouting` | `AOFDefineRouting(options?)` | `locales: LANGUAGES`, `localePrefix: "as-needed"`, `defaultLocale` `"en"` unless the App passes another `Language`; other next-intl options (`localeCookie`, `alternateLinks`, `localeDetection`) pass through. Localized `pathnames` and `domains` are left out until an App needs them. |
| `createNavigation` | `AOFCreateNavigation` | next-intl's own, so `Link` is typed from the App's routing. |
| — | `SHARED_MESSAGES` | Text every App shows, under the reserved `Common` namespace (`Common.NotFound`, `Common.Error`), `satisfies Record<Language, …>`. `AOFGetRequestConfig` merges the App's messages on top; a utils test fails if an App's translations define `Common`. utils runs its own `i18n:check`. |

### Locales

```ts
export const LOCALE = { EN_GB: "en-GB", EN_US: "en-US", IT_CH: "it-CH", IT_IT: "it-IT" } as const;
export const localeSchema = z.enum(LOCALE);
export type Locale = z.infer<typeof localeSchema>;
export const SUPPORTED_LOCALES = [LOCALE.EN_US, LOCALE.EN_GB, LOCALE.IT_IT, LOCALE.IT_CH] as const satisfies readonly Locale[];
export type Language = Locale extends `${infer L}-${string}` ? L : never; // "en" | "it"
export const LANGUAGES = ["en", "it"] as const satisfies readonly Language[];
```

The comments on `LOCALE` and `SUPPORTED_LOCALES` move with them. The API's
`features/i18n/constants/locales.ts` keeps `DEFAULT_LOCALE` (where an
unsupported `Accept-Language` lands is the API's call), `CATALOGUE`,
`Translations` and `TranslationKey` (they import its JSON), and imports the
rest from utils. Its ten importers of `LOCALE`/`Locale`/`SUPPORTED_LOCALES`
switch to `@allonfire/utils/constants/locales`. The type test moves to utils
and gains a second assertion: every `Language` is in `LANGUAGES`.

## Docs

- `CONTEXT.md`: **AOF** (the prefix) and **App scaffolding** added; **AOF component** is "the only Design system component an App imports".
- `packages/utils/README.md`: a section listing the App scaffolding pieces and the layout that composes them.
- ADR 0012: Next scaffolding lives in utils behind optional peer dependencies.

## Package changes

- `packages/utils/package.json`: `peerDependencies` (each marked optional in
  `peerDependenciesMeta`) `next`, `react`, `react-dom`, `next-intl`,
  `next-themes`, `nuqs`, `@tanstack/react-query`,
  `@tanstack/react-query-devtools`; the same in `devDependencies` at Back
  office's versions, plus `@types/react`, `@types/react-dom`.
- `packages/utils/tsconfig.json`: `jsx: "react-jsx"`, `lib` gains `dom`.
  The API's `check-types` must stay green.
- `packages/utils` joins every Next App's `transpilePackages` (through the base).
- `CLAUDE.md`: the API's "Locales and the catalogue live in
  `features/i18n/constants/locales.ts`" line says `LOCALE` now lives in utils;
  a line under Package Layout names `src/next/` as utils' Next scaffolding.

## Back office after

- `next.config.ts`:
  `export default AOFCreateNextConfig({}, { transpile: ["@allonfire/design", "@allonfire/shadcn", "@allonfire/ui"], intl: { requestConfig: "./src/features/i18n/request.ts" } })`.
  New behaviour: it now sends `SECURITY_HEADERS`.
- `features/i18n/routing.ts`: `locales: LANGUAGES`, `defaultLocale: "en"`.
- `features/i18n/request.ts`:
  `export default AOFGetRequestConfig({ locale, messages: async (l) => (await import(\`./translations/${l}.json\`)).default, routing })`, with `locale` from `next/root-params`.
- `proxy.ts`: `export default AOFCreateMiddleware(routing)`; `config` literal stays.
- `[locale]/layout.tsx` composes the four providers directly; deleted:
  `src/components/providers.tsx`, `src/lib/get-query-client.ts`.
- Adds `"@allonfire/utils": "workspace:*"`.

## Testing

TDD in utils, `// @module-tag unit`, rendering with `renderToStaticMarkup`
like the design package (no DOM):

- `AOFCreateNextConfig`: base present; `transpilePackages` merged and
  deduplicated; `headers()` returns the security-header rule first and the App's rules after it; App values
  win; no `intl`, no plugin.
- `AOFGetQueryClient`: a new client per server call; one client in the browser;
  `staleTime` default and override; a pending query dehydrates.
- `AOFCreateMiddleware`: next-intl's middleware answers every request.
- `AOFGetRequestConfig`: unknown locale calls `notFound()`; known locale loads
  its messages (the locale getter is passed in, no mock).
- Providers: each renders its children; `AOFThemeProvider` props override its
  defaults; `AOFReactQueryDevtools` renders nothing unless `enabled`.
- Locales: both type assertions.

Then the API's suite, `pnpm lint`, `check-types`, `test`, Back office's build
and its e2e (3/3).
