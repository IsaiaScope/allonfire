<h1 align="center">@allonfire/core</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">The framework-free constants and helpers every Host shares, plus the Next App scaffolding in <code>features/next</code> (ADR 0012, ADR 0016).</p>

## 📦 API Reference

Every constant follows one pattern: an `as const` object is the source,
`z.enum(OBJECT)` (or `z.literal(TUPLE)`) builds the schema, and the type is
`z.infer` of that schema — never a hand-written union, never `ValueOf`.
Number values work too (`z.enum(HTTP.STATUS)`).

### `./features/mail/*` and `./environment/mail-environment`

Transactional mail through a Service's providers, any host. Core reaches no
database: the host hands `sendMail` a `MailStore` (the API's is
`features/mail/database-store`).

| Export | Type | Description |
|--------|------|-------------|
| `MAIL` (`constants/mail`) | Constant | The drivers (`DRIVER`, named for the API's shape), what a driver's send made of a handoff (`ATTEMPT`), the outcomes (`accepted`, `rejected`, `uncertain`, `unavailable`), the purposes (`PURPOSE`, a log field), the environment's names (`ENV`), the driver paths and timeouts, the usage window (`USAGE.MONTH_DAYS`) |
| `sendMail(message, { purpose, only }, deps)` (`utils/send-mail`) | Function | Enabled providers in slot order, each handed the message by its driver; one with no room or that refuses is skipped for the next; an uncertain outcome stops the send; `only` sends through one provider, never failing over |
| `MAIL_DRIVERS` (`utils/drivers`) | `Record<MailDriver, MailDriverImpl>` | Each driver's `send` (an attempt: accepted, quota, rejected, uncertain) and `usage` (what the provider's API says it sent today and in 31 days, and the limits it reports) over `fetch`, https only |
| `MailStore`, `MailDeps`, `MailUsage`, `SendResult` (`types/mail`) | Types | What a host provides: the providers and a last-acceptance stamp, the endpoint of a slot, `fetch` |
| `providerEndpoint(slot)` (`environment/mail-environment`) | Function | `API_MAIL_PROVIDER_<slot>_URL`, `_KEY` and `_DRIVER`, read when sending; anything missing or invalid (a URL that is not https, an unknown driver) reads as no endpoint |

### `./features/errors/coded-error`

| Export | Type | Description |
|--------|------|-------------|
| `CodedError` | Class | What a shared HTTP module throws (ADR 0015): `status`, `code`, ICU `values`, field `errors`; each host's `onError` renders it |
| `CodedErrorDetail` | Type | `{ message, path }`, one field that failed validation |
| `validationError(issues)` | Function | Standard Schema issues as a 400 `CodedError` coded `ERROR.CODE.VALIDATION_FAILED`, paths joined with `.` |
| `invalidHook` | Function | A validator hook (`sValidator`, hono-openapi) that throws `validationError` on a failed parse |
| `StandardIssue` | Type | The part of a Standard Schema issue those read |

### `./features/errors/utils/openapi`

| Export | Type | Description |
|--------|------|-------------|
| `problemResponseName(status)` | Function | The OpenAPI response name of an error status (`Problem<status>`) |
| `problemResponses(...statuses)` | Function | A route's error responses, one `$ref` per status |

### `./features/errors/constants/error-codes`

| Export | Type | Description |
|--------|------|-------------|
| `ERROR` | Constant | `ERROR.CODE`, the error codes every Host and module shares: `BAD_REQUEST`, `FORBIDDEN`, `INTERNAL_ERROR`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `TIMEOUT`, `UNAUTHORIZED`, `VALIDATION_FAILED`. A module adds only its own; a Host answers with these plus its modules' and owns each code's message and status |

### `./features/version/*` (ADR 0028)

| Export | Type | Description |
|--------|------|-------------|
| `versionOf(...parts)` (`utils/version-of`) | Function | A resource's Version: a hash of the parts a save could overwrite; server only |
| `VERSION`, `versionSchema` (`constants/version`) | Constant, schema | How a Version is made; the `version` a save sends (non-empty) |
| `checkVersion(expected, actual)` (`utils/resource-changed-error`) | Function | The one Version check every versioned save runs under its row lock, before any write: throws `ResourceChangedError` on a mismatch |
| `ResourceChangedError` (`utils/resource-changed-error`) | Class | A `CodedError`, 409 `ERROR.CODE.RESOURCE_CHANGED`, with the `ids` that changed when known; a service throws it and every host's `onError` answers it, so no module maps it |

### `./features/ci/affected`

| Export | Type | Description |
|--------|------|-------------|
| `affectedFrom(turboQueryJson, turboPackagesJson, changedFiles)` | Function | `turbo query affected --packages` read as `{ apps, deploy }`: the Apps CI tests end to end and the Deploy units to ship, `db-migrate` first. A changed image file Turbo does not read (`docker/`, `.dockerignore`, `.npmrc`, `pnpm-workspace.yaml`) reaches every unit (`turboPackagesJson`, a `turbo query` of every package) |
| `everything(turboPackagesJson)` | Function | Every App and every Deploy unit |
| `Affected` | Type | `{ apps, deploy }`: an App is a package under `apps/`, named by its folder (the API included); a Deploy unit is an App or `db-migrate` |

CI runs it as `pnpm -s ci:affected <base>`, from the repo root, and it prints `apps=` and `deploy=` for `$GITHUB_OUTPUT`. What counts as affected is Turbo's (`futureFlags.affectedUsingTaskInputs` in `turbo.json`): a package whose task inputs changed, and its dependents. Every task excludes its package's `**/*.md`, so a Markdown-only change deploys nothing. A new `packageManager` in the root `package.json` (the pnpm every image installs with) affects everything, though Turbo lists nothing for it. A lockfile change affects the packages whose resolved dependencies changed (all of them when the root's did), and a `turbo.json` change affects everything; a Release's own edit of the root `package.json` version and `VERSION` affects no Deploy unit. A root task input that reaches another package's folder names its package (`@allonfire/laura#tailwind:check`): left on every package, a `ui` change deployed the database migration. A Deploy unit's own `turbo.json` reads nothing outside the unit: Turbo lists the unit without its dependents, the Release bumps it, and its manifest then redeploys the dependents under their old numbers (a test that reads a file elsewhere lives in `packages/config`). No base, or one that does not resolve (no deploy yet), prints every unit. `affectedSince(root, base)` (`turbo-affected.ts`) is the one place Turbo is asked.

### Release versions (`features/ci`, run from the repo root)

Not imported by an App: `/iso-push`'s release hook (`.iso/release-hook`) runs it so every workspace package's `package.json` `version` moves in the `chore(release)` commit, and the Apps' account menus show their own (`CONTEXT.md`, **Release**).

**A Deploy unit's number moves exactly when it redeploys**: both ask `affectedSince`. A library's moves when a file under its own folder changed, Markdown aside.

| File | Role |
|---|---|
| `release-versions.ts` | Pure: `bumpVersion`, `releaseKind(previous, next)`, `setVersion` (only the top-level `"version"` line), `changedPackages(packages, changedFiles, deployed)` |
| `release-workspace.ts` | Reads the workspace (the `packages:` globs of `pnpm-workspace.yaml` minus its `!` entries; a manifest it cannot read, or an entry it cannot expand, stops the Release) and writes the versions: `applyRelease`, `alignVersions` |
| `apply-release-versions.ts` | The CLI: `pnpm -s ci:release-versions --root <dir> --previous <x.y.z> --next <x.y.z> --from <sha>` prints the manifests it changed; `--align <x.y.z>` sets every package; an empty `--from` counts every file and every unit |

The hook runs it from the main checkout, which has the install, against the release worktree (`--root`). It first compares `features/ci` and `shared` (what those rules import) in both, tests aside, and stops the Release when they differ (a checkout behind the base, or uncommitted rules), so old rules never number a Release. `tests/deploy-selection.integration.test.ts` runs real Turbo on a copy of this workspace's manifests, lockfile and Turbo configs to hold which units a change redeploys.

### `./shared/utils/json`

| Export | Type | Description |
|--------|------|-------------|
| `parseJson(text)` | Function | `JSON.parse`, never `any`: the `T` of a `JsonText<T>`, otherwise `unknown` or the `T` passed as `parseJson<T>` (unchecked) |
| `parseJsonWith(text, schema)` | Function | Parsed and validated in one call, typed by the zod schema |
| `stringifyJson(value)` | Function | `JSON.stringify` whose argument must be JSON at every depth (`value: T & Json<T>`); returns `JsonText<T>` |
| `JsonText<T>` | Type | A string written from a `T`; `parseJson` reads the `T` back |
| `Json<T>` | Type | `T` when all of it is JSON; the parts that are not become `never` |
| `jsonFrom<T>(message)` | Function | zod step for text that must be JSON; one issue with `message` when it is not |

### `./shared/utils/route-path`

| Export | Type | Description |
|--------|------|-------------|
| `fillPath(path, params)` | Function | A Hono route path with its `:params` filled, each URI-encoded; throws on a param left out. never filled by hand |
| `openApiPath(path)` | Function | A Hono route path as OpenAPI writes it: `/users/:id` → `/users/{id}` |

### `./shared/utils/url`

| Export | Type | Description |
|--------|------|-------------|
| `hostOf(address)` | Function | An address's host, `undefined` when the text is not an address. `new URL` in a `try`, never `URL.parse` (Chrome 126, Safari 18): safe in the browser on an older phone |

### `./shared/utils/storage`

| Export | Type | Description |
|--------|------|-------------|
| `storageItem(key, schema, area?)` | Function | One value in `localStorage` (or `sessionStorage`, `area`) as JSON, typed by the zod schema: `read()` the checked value or `null`, `write(value)` the schema's type only, `remove()`. Never throws: no storage, storage that refuses or is out of reach (blocked site data), and text the schema refuses read as `null` |
| `STORAGE_AREA`, `StorageArea` | Constant, Type | `LOCAL` and `SESSION`, the two Web Storage globals |

### `./shared/utils/object` and `./features/errors/format-error-message`

| Export | Type | Description |
|--------|------|-------------|
| `objectKeys(obj)` | Function | Type-safe `Object.keys()` — returns `(keyof T & string)[]` |
| `objectEntries(obj)` | Function | Type-safe `Object.entries()` — returns `[keyof T & string, T[keyof T]][]` |
| `objectHas(obj, key)` | Function | Whether `obj` holds `key` itself, never one it inherits (`constructor`): a guard for a lookup keyed by outside text, as `aofRefusal`'s `known` |
| `formatErrorMessage(error, fallback)` | Function | Extracts message from `Error` instances, returns fallback for unknown errors |

### `./environment/environment`

| Export | Type | Description |
|--------|------|-------------|
| `env` | Validated env | `NODE_ENV` read from `process.env`, default `development`. Extend it: `createEnv({ extends: [env], ... })` |
| `runtimeEnvSchema` | Zod shape | The same schema, to spread into `server` when an env is built from a record rather than `process.env` |

### `./features/http/constants/http`

| Export | Type | Description |
|--------|------|-------------|
| `HTTP.STATUS`, `httpStatusSchema` | const / zod | RFC 9110 statuses a web app can send (1xx–5xx), as numeric literals: `http-status-codes` enums break Hono's typed responses |
| `HTTP.METHOD`, `HttpMethod` | const / type | Every RFC 9110 method plus `PATCH` |
| `HTTP.CONTENT_TYPE` | const | JSON, `application/problem+json` (RFC 9457), HTML, text, form, multipart, octet-stream, event-stream |
| `HTTP.HEADER`, `httpHeaderSchema` | const / zod | Common request, response and security header names, lower-case |

### `./shared/constants/env`

| Export | Type | Description |
|--------|------|-------------|
| `ENV.BOOLEAN`, `booleanEnvSchema` | const / zod | `"true"` / `"false"`, the only accepted spellings of an env flag |
| `NODE_ENV`, `nodeEnvSchema`, `NodeEnv` | const / zod / type | `development`, `production`, `test`: compare against these, not bare strings; `nodeEnvSchema.default(...)` in each env module |

### `./shared/constants/separators`

| Export | Type | Description |
|--------|------|-------------|
| `SEPARATOR` | const | `LIST` (`,`), `PAIR` (`=`), `PATH` (`.`) |

### `./shared/constants/patterns`

| Export | Type | Description |
|--------|------|-------------|
| `PATTERN.CHANGESET.FILE`, `PATTERN.CHANGESET.NAME` | RegExp | A Liquibase changeset's numbered `.sql` file, and the kebab-case name `pnpm db:changeset` takes |
| `PATTERN.TRAILING_SLASHES` | RegExp | `/\/+$/`, stripped from a URL or path before comparing or appending |

### `./features/logger/constants/logger`

| Export | Type | Description |
|--------|------|-------------|
| `LOG.LEVEL`, `logLevelSchema`, `LogLevel` | const / zod / type | pino's levels plus `silent` |
| `LOG.REDACT.PATHS`, `LOG.REDACT.CENSOR` | const | What pino scrubs before a transport sees it, and what it writes instead |
| `LOG.FD.STDOUT` | const | The file descriptor a Host writes its lines to |

### `./shared/constants/units`

| Export | Type | Description |
|--------|------|-------------|
| `UNIT.MS_PER_SECOND`, `UNIT.SECONDS_PER_MINUTE`, `UNIT.MS_PER_MINUTE`, `UNIT.SECONDS_PER_HOUR`, `UNIT.MS_PER_HOUR`, `UNIT.SECONDS_PER_DAY`, `UNIT.MS_PER_DAY`, `UNIT.DAYS_PER_YEAR` | number | Time conversions, so no bare `1000`, `60_000` or `60 * 60 * 1000` |
| `UNIT.BYTES_PER_KIB`, `UNIT.BYTES_PER_MIB` | number | Size conversions |

### `./features/http/constants/http` (security headers)

| Export | Type | Description |
|--------|------|-------------|
| `HTTP.SECURITY_HEADERS` | `{ key, value }[]` (a header name and its value) | Headers every allonfire app sends: `X-Frame-Options` (DENY), `X-Content-Type-Options` (nosniff), `Referrer-Policy` (strict-origin-when-cross-origin), `X-DNS-Prefetch-Control` (on), `Strict-Transport-Security` (two years, includeSubDomains). Mutable, as Next's `headers()` wants |

### `./features/i18n/constants/locales`

| Export | Type | Description |
|--------|------|-------------|
| `I18N.LOCALE` | `as const` object | `EN_GB`, `EN_US`, `IT_CH`, `IT_IT`: full BCP 47 tags, shared by the API and the Apps (ADR 0012) |
| `localeSchema` | Zod enum | Validates a `Locale` |
| `Locale` | Type | `"en-GB" \| "en-US" \| "it-CH" \| "it-IT"` |
| `I18N.SUPPORTED_LOCALES` | `readonly Locale[]` | Preference order the API's matcher sees, main variant of each language first |
| `I18N.BASE_LANGUAGES` | `readonly ["en", "it"]` | The Base languages: every Host speaks them; a type test checks every locale speaks one |
| `Language` | Type | `"en" \| "it"`, from `I18N.BASE_LANGUAGES` |
| `I18N.DEFAULT_LANGUAGE` | `"en"` | `I18N.BASE_LANGUAGES[0]`: where an unknown language lands and what content falls back to; never write `"en"` |
| `languageSchema` | Zod enum | Narrows a string to a base `Language` |
| `I18N.EXTRA_LANGUAGES` | `readonly []` | Languages a Host can add beyond the base ones; a language goes here before any Host routes it |
| `I18N.HOST_LANGUAGES`, `HostLanguage`, `hostLanguageSchema` | | The languages a Host can route: base plus extras |
| `I18N.CONTENT_LANGUAGES`, `I18N.OPTIONAL_LANGUAGES`, `ContentLanguage`, `contentLanguageSchema` | | The Content languages: the ISO 639-1 catalogue (`iso-639-1`), base first; the optional ones are all but the base languages |
| `HostLanguages`, `defineLanguages` | | A Host's own list, `defineLanguages([...BASE_LANGUAGES, "fr"])`: dropping a base language, or adding one not in `I18N.EXTRA_LANGUAGES`, fails to compile |

### App scaffolding (`./features/next/*`)

The wiring every Next App composes, one piece per file (ADR 0012). React, Next
and the provider libraries are optional peer dependencies: the API never
imports these.

| Export | Wraps | Notes |
|--------|-------|-------|
| `./features/next/providers/components/aof-query-client-provider` | `QueryClientProvider` | client from `AOFGetQueryClient`; `staleTime` prop |
| `./features/next/providers/components/aof-react-query-devtools` | `ReactQueryDevtools` | lazy; `enabled` from the App's env (development); inside the Query provider |
| `./features/next/providers/components/aof-theme-provider` | next-themes `ThemeProvider` | `class`, `system`; every prop overrides |
| `./features/next/providers/components/aof-nuqs-adapter` | `NuqsAdapter` | App Router adapter |
| `./features/next/query/utils/aof-get-query-client` | `getQueryClient` | per request on the server, one in the browser |
| `./features/next/query/components/aof-hydrated-boundary` | `HydrationBoundary` | a Server Component: `hydration` is a private-cache read (ADR 0028) and a read that throws is left to the view, never thrown past it |
| `./features/next/query/utils/optimistic-mutation` | `mutationOptions` | `optimisticMutation({ action, invalidates, keeps?, mutationKey, patchCache?, scope? })`: the cache is patched first, the action runs, a refusal rolls back; once saved, `invalidateAll` reads `invalidates` again, except an active read under a `keeps(variables)` key, which the patch already made exact (an infinite feed reads one request per loaded page) |
| `./features/next/query/utils/invalidate-static` | `invalidateQueries` | `invalidateStatic(client, key, { keep? })`: TanStack never reads an active `staleTime: "static"` query on an invalidation, so each observer reads it again (every loaded page of an infinite one, in order) and an inactive one is removed; `keep` skips the active ones it names (`static-stale-time.test.ts`, `invalidate-static.test.ts`) |
| `./features/search/keyset-cursor` | — | `keysetCursor`: `encode({ at, id })` and `schema` for a list paged by keyset (time, then id), such as an infinite feed: stays exact when a row is added or removed between two pages, and refuses a hand-edited cursor |
| `./features/next/query/components/aof-resource-view` | `AOFResourceView` | a page of one resource (an edit form) from its `useQuery`: the form once read, `notFound()` for a 404, the host's `failed` (with a retry) for any other failure, the host's `loading` while it waits; a read that fails after the form was drawn leaves it |
| `./features/next/i18n/utils/aof-get-request-config` | `getRequestConfig` | root-param locale, 404 on one not routed, shared translations merged; `translations` is one loader per routed language, and a Host routing an extra language must pass `shared` text in it |
| `./features/next/i18n/tests/proxy-matcher-suite` | — | tests only: `proxyMatcherSuite({ config, pages })` registers the matcher cases every App's proxy answers the same way (its pages routed, with and without a language; Next's metadata routes, files with a dot, each language's Offline page and the API skipped); an App's `proxy.test.ts` is one call |
| `./features/next/metadata/utils/aof-app-metadata` | — | `aofAppMetadata({ name, indexing, shareImageAlt, routing, getPathname, translations, startupImage })` returns `{ baseMetadata, layoutMetadata({ locale, origin }), metadataText, pageMetadata, pageOpenGraph }`: the App's whole head from its own values; `metadataText` falls back to the default language for Next's build-time `[locale]` placeholder |
| `./features/next/metadata/utils/aof-manifest` | — | `aofManifest({ name, description, ground })`: the App's `MetadataRoute.Manifest`, `display: "standalone"` (ADR 0025), icons from `AOFManifestIcons()` |
| `./features/next/i18n/utils/aof-create-middleware` | next-intl `createMiddleware`, re-exported | a step before it wraps the returned proxy (`withSessionRefresh`) |
| `./features/next/api/utils/visitor-headers` | — | `forwardedHeaders(headers)`, the visitor's `origin` and `x-forwarded-for`; `visitorHeaders(cookie, headers)`, their cookies, address and origin for a call to the API; `readVisitorHeaders()`, the same read from the request being answered |
| `./features/next/i18n/utils/aof-define-routing` | `defineRouting` | `AOFDefineRouting(languages, options?)`: the Host's languages (`I18N.BASE_LANGUAGES` or its `defineLanguages` list), `as-needed`, default the first; the App overrides the default and other options |
| `./features/next/i18n/utils/aof-create-navigation` | `createNavigation` | `Link` and helpers typed from the App's routing, plus `languageLinks(href, locale)`: one always-prefixed link per language, the current one marked |
| `./features/next/i18n/utils/aof-translators` | next-intl `createTranslator` | tests only: `aofTranslators({ en, it })`, one translator per base language over an App's messages with the shared `Common` text under them (`t.en("Users.copy.label", { email })` fills placeholders as the page does); `aofMessages(language, messages)`, the same merge for a test's `NextIntlClientProvider` |
| `./features/next/i18n/translations/shared-translations` | — | `SHARED_TRANSLATIONS` and `SharedTranslations`: the `Common` namespace every App gets, merged under its own translations; an App never defines `Common`, and `global-error.tsx` reads it in `I18N.DEFAULT_LANGUAGE` |
| `./features/next/pwa/components/aof-pwa` | — | `AOFPwa({ children, hint, banner, enabled })`: the page, then the App's own Install hint and offline banner, then the service worker (ADR 0023) |
| `./features/next/pwa/components/aof-service-worker` | `workbox-window` | `AOFServiceWorker({ enabled })` registers `/sw.js`; the layout passes `enabled` for production only (ADR 0023) |
| `./features/next/pwa/components/aof-dev-resume` | — | `AOFDevResume()`, mounted by `AOFPwa` in every build but production: a page back after `PWA.DEV_RESUME.HIDDEN_MS` hidden reloads (a phone freezes the HMR socket and Next never sees it close), and a leftover service worker is unregistered |
| `./features/next/pwa/utils/build-service-worker` | `workbox-build` `generateSW` | `buildServiceWorker`, run by the `pwa:build` script after `next build` (`pnpm --filter @allonfire/core pwa:build --app <App folder> [--languages en,it]`): writes `public/sw.js`, precaching `.next/static` and each language's Offline page, page loads network only with the Offline page as fallback, navigation preload on |
| `./features/next/pwa/utils/offline-fallback` | — | the worker's `handlerDidError` plugin: the URL's language's Offline page, else the default's; reads only `globalThis.AOF_PWA`, since Workbox copies its source |
| `./features/next/pwa/utils/install-platform` | — | `installPlatform({ installable, standalone, touch, userAgent })`: `installable` where the browser offered its install dialog, `ios` or `mac-safari` for steps, or null |
| `./features/next/pwa/utils/install-prompt` | — | holds Chrome's `beforeinstallprompt` from module load (`installPrompt`, `subscribeInstallPrompt`, for `useSyncExternalStore`), cleared on `appinstalled` |
| `./features/next/pwa/hooks/use-install-hint` | — | `useInstallHint()`: after mount, `{ dismiss, install: { onInstall, installing, failed } }` where the browser offers its dialog, else `{ dismiss, steps }`, or null; never on a first visit, a year away once dismissed (`install-hint-state`, kept through `storageItem`) |
| `./features/next/pwa/constants/pwa` | — | `PWA` (`PATH.OFFLINE`, `PATH.SERVICE_WORKER`, `OUTPUT`, `INSTALL_HINT` with each platform's `STEPS`, `PLATFORM`, `TOAST` ids) |
| `./features/next/pwa/constants/pwa-schema` | `zod` | `InstallPlatform`, `InstallStep`, `InstallStatus` (the hook's own), each the `z.infer` of a `PWA` group |
| `./features/next/config/utils/aof-create-next-config` | `NextConfig` | base config, security headers, next-intl plugin |

An App composes the providers in its `[locale]/layout.tsx` and drops any it does
not need:

```tsx
<AOFQueryClientProvider>
  <AOFThemeProvider>
    <AOFNuqsAdapter>{children}</AOFNuqsAdapter>
  </AOFThemeProvider>
  <AOFReactQueryDevtools enabled={env.NODE_ENV === ENV.NODE.DEVELOPMENT} />
</AOFQueryClientProvider>
```

## 🔧 Usage

```ts
import { formatErrorMessage } from "@allonfire/core/features/errors/format-error-message";
import { objectKeys } from "@allonfire/core/shared/utils/object";

// Type-safe iteration
const config = { TWITTER: "...", LINKEDIN: "..." };
const platforms = objectKeys(config); // ("TWITTER" | "LINKEDIN")[]

// Error handling in catch blocks
try { ... } catch (error) {
  return { error: formatErrorMessage(error, "Something went wrong") };
}
```

```ts
import { HTTP } from "@allonfire/core/features/http/constants/http";

// In next.config.ts
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: HTTP.SECURITY_HEADERS }];
  },
};
```
