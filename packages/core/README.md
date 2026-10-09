<h1 align="center">@allonfire/core</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">The framework-free constants and helpers every Host shares, plus the Next App scaffolding in <code>features/next</code> (ADR 0012, ADR 0016).</p>

## 📦 API Reference

Every constant follows one pattern: an `as const` object is the source,
`z.enum(OBJECT)` (or `z.literal(TUPLE)`) builds the schema, and the type is
`z.infer` of that schema — never a hand-written union, never `ValueOf`.
Number values work too (`z.enum(HTTP_STATUS)`).

### `./features/errors/coded-error`

| Export | Type | Description |
|--------|------|-------------|
| `CodedError` | Class | What a shared HTTP module throws (ADR 0015): `status`, `code`, ICU `values`, field `errors`; each host's `onError` renders it |
| `CodedErrorDetail` | Type | `{ message, path }`, one field that failed validation |
| `validationError(code, issues)` | Function | Standard Schema issues as a 400 `CodedError` under the host's validation `code`, paths joined with `.` |
| `invalidHook(code)` | Function | A validator hook (`sValidator`, hono-openapi) that throws `validationError` on a failed parse |
| `StandardIssue` | Type | The part of a Standard Schema issue those read |

### `./shared/utils/json`

| Export | Type | Description |
|--------|------|-------------|
| `parseJson(text)` | Function | `JSON.parse`, never `any`: the `T` of a `JsonText<T>`, otherwise `unknown` or the `T` passed as `parseJson<T>` (unchecked) |
| `parseJsonWith(text, schema)` | Function | Parsed and validated in one call, typed by the zod schema |
| `stringifyJson(value)` | Function | `JSON.stringify` whose argument must be JSON at every depth (`value: T & Json<T>`); returns `JsonText<T>` |
| `JsonText<T>` | Type | A string written from a `T`; `parseJson` reads the `T` back |
| `Json<T>` | Type | `T` when all of it is JSON; the parts that are not become `never` |
| `jsonFrom<T>(message)` | Function | zod step for text that must be JSON; one issue with `message` when it is not |

### `./shared/utils/object` and `./features/errors/format-error-message`

| Export | Type | Description |
|--------|------|-------------|
| `objectKeys(obj)` | Function | Type-safe `Object.keys()` — returns `(keyof T & string)[]` |
| `objectEntries(obj)` | Function | Type-safe `Object.entries()` — returns `[keyof T & string, T[keyof T]][]` |
| `formatErrorMessage(error, fallback)` | Function | Extracts message from `Error` instances, returns fallback for unknown errors |

### `./environment/environment`

| Export | Type | Description |
|--------|------|-------------|
| `env` | Validated env | `NODE_ENV` read from `process.env`, default `development`. Extend it: `createEnv({ extends: [env], ... })` |
| `runtimeEnvSchema` | Zod shape | The same schema, to spread into `server` when an env is built from a record rather than `process.env` |

### `./features/http/constants/http`

| Export | Type | Description |
|--------|------|-------------|
| `HTTP_STATUS`, `httpStatusSchema`, `HttpStatus` | const / zod / type | RFC 9110 statuses a web app can send (1xx–5xx), as numeric literals: `http-status-codes` enums break Hono's typed responses |
| `HTTP_METHOD`, `httpMethodSchema`, `HttpMethod` | const / zod / type | Every RFC 9110 method plus `PATCH` |
| `CONTENT_TYPE`, `contentTypeSchema`, `ContentType` | const / zod / type | JSON, `application/problem+json` (RFC 9457), HTML, text, form, multipart, octet-stream, event-stream |
| `HTTP_HEADER`, `httpHeaderSchema`, `HttpHeader` | const / zod / type | Common request, response and security header names, lower-case |

### `./shared/constants/env`

| Export | Type | Description |
|--------|------|-------------|
| `BOOLEAN_ENV`, `booleanEnvSchema`, `BooleanEnv` | const / zod / type | `"true"` / `"false"`, the only accepted spellings of an env flag |
| `NODE_ENV`, `nodeEnvSchema`, `NodeEnv` | const / zod / type | `development`, `production`, `test`: compare against these, not bare strings; `nodeEnvSchema.default(...)` in each env module |

### `./shared/constants/separators`

| Export | Type | Description |
|--------|------|-------------|
| `SEPARATOR`, `separatorSchema`, `Separator` | const / zod / type | `LIST` (`,`), `PAIR` (`=`), `PATH` (`.`) |

### `./shared/constants/patterns`

| Export | Type | Description |
|--------|------|-------------|
| `TRAILING_SLASHES` | RegExp | `/\/+$/`, stripped from a URL or path before comparing or appending |

### `./features/logger/constants/logger`

| Export | Type | Description |
|--------|------|-------------|
| `LOG_LEVEL`, `logLevelSchema`, `LogLevel` | const / zod / type | pino's levels plus `silent` |
| `REDACT_PATHS`, `REDACT_CENSOR` | const | What pino scrubs before a transport sees it, and what it writes instead |

### `./shared/constants/units`

| Export | Type | Description |
|--------|------|-------------|
| `MS_PER_SECOND`, `SECONDS_PER_MINUTE`, `MS_PER_MINUTE` | number | Time conversions, so no bare `1000` or `60_000` |
| `BYTES_PER_KIB`, `BYTES_PER_MIB` | number | Size conversions |

### `./features/http/constants/security-headers`

| Export | Type | Description |
|--------|------|-------------|
| `SECURITY_HEADERS` | `{ key: HttpHeader; value: string }[]` | Headers every allonfire app sends: `X-Frame-Options` (DENY), `X-Content-Type-Options` (nosniff), `Referrer-Policy` (strict-origin-when-cross-origin), `X-DNS-Prefetch-Control` (on), `Strict-Transport-Security` (two years, includeSubDomains). Mutable, as Next's `headers()` wants |

### `./features/i18n/constants/locales`

| Export | Type | Description |
|--------|------|-------------|
| `LOCALE` | `as const` object | `EN_GB`, `EN_US`, `IT_CH`, `IT_IT`: full BCP 47 tags, shared by the API and the Apps (ADR 0012) |
| `localeSchema` | Zod enum | Validates a `Locale` |
| `Locale` | Type | `"en-GB" \| "en-US" \| "it-CH" \| "it-IT"` |
| `SUPPORTED_LOCALES` | `readonly Locale[]` | Preference order the API's matcher sees, main variant of each language first |
| `BASE_LANGUAGES` | `readonly ["en", "it"]` | The Base languages: every Host speaks them; a type test checks every locale speaks one |
| `Language` | Type | `"en" \| "it"`, from `BASE_LANGUAGES` |
| `DEFAULT_LANGUAGE` | `"en"` | `BASE_LANGUAGES[0]`: where an unknown language lands and what content falls back to; never write `"en"` |
| `languageSchema` | Zod enum | Narrows a string to a base `Language` |
| `EXTRA_LANGUAGES` | `readonly []` | Languages a Host can add; a language goes here before any Host routes it |
| `CONTENT_LANGUAGES`, `ContentLanguage`, `contentLanguageSchema` | | The Content languages: base plus extras |
| `HostLanguages`, `defineLanguages` | | A Host's own list, `defineLanguages([...BASE_LANGUAGES, "fr"])`: dropping a base language, or adding one not in `CONTENT_LANGUAGES`, fails to compile |

### App scaffolding (`./features/next/*`)

The wiring every Next App composes, one piece per file (ADR 0012). React, Next
and the provider libraries are optional peer dependencies: the API never
imports these.

| Export | Wraps | Notes |
|--------|-------|-------|
| `./features/next/providers/aof-query-client-provider` | `QueryClientProvider` | client from `AOFGetQueryClient`; `staleTime` prop |
| `./features/next/providers/aof-react-query-devtools` | `ReactQueryDevtools` | lazy; `enabled` from the App's env (development); inside the Query provider |
| `./features/next/providers/aof-theme-provider` | next-themes `ThemeProvider` | `class`, `system`; every prop overrides |
| `./features/next/providers/aof-nuqs-adapter` | `NuqsAdapter` | App Router adapter |
| `./features/next/query/aof-get-query-client` | `getQueryClient` | per request on the server, one in the browser |
| `./features/next/i18n/aof-get-request-config` | `getRequestConfig` | root-param locale, 404 on one not routed, shared translations merged; `translations` is one loader per routed language, and a Host routing an extra language must pass `shared` text in it |
| `./features/next/i18n/aof-create-middleware` | next-intl `createMiddleware`, re-exported | a step before it wraps the returned proxy (`withSessionRefresh`) |
| `./features/next/api/forwarded-for` | — | `forwardedHeaders(headers)`, the visitor's `origin` and `x-forwarded-for`; `visitorHeaders(cookie, headers)`, their cookies, address and origin for a call to the API |
| `./features/next/i18n/aof-define-routing` | `defineRouting` | `AOFDefineRouting(languages, options?)`: the Host's languages (`BASE_LANGUAGES` or its `defineLanguages` list), `as-needed`, default the first; the App overrides the default and other options |
| `./features/next/i18n/aof-create-navigation` | `createNavigation` | `Link` and helpers typed from the App's routing |
| `./features/next/i18n/shared-translations` | — | `SHARED_TRANSLATIONS` and `SharedTranslations`: the `Common` namespace every App gets, merged under its own translations; an App never defines `Common`, and `global-error.tsx` reads it in `DEFAULT_LANGUAGE` |
| `./features/next/config/aof-create-next-config` | `NextConfig` | base config, security headers, next-intl plugin |

An App composes the providers in its `[locale]/layout.tsx` and drops any it does
not need:

```tsx
<AOFQueryClientProvider>
  <AOFThemeProvider>
    <AOFNuqsAdapter>{children}</AOFNuqsAdapter>
  </AOFThemeProvider>
  <AOFReactQueryDevtools enabled={env.NODE_ENV === NODE_ENV.DEVELOPMENT} />
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
import { SECURITY_HEADERS } from "@allonfire/core/features/http/constants/security-headers";

// In next.config.ts
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};
```
