<h1 align="center">@allonfire/utils</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">Type-safe utility functions and security headers shared across all packages.</p>

## 📦 API Reference

Every constant follows one pattern: an `as const` object is the source,
`z.enum(OBJECT)` (or `z.literal(TUPLE)`) builds the schema, and the type is
`z.infer` of that schema — never a hand-written union, never `ValueOf`.
Number values work too (`z.enum(HTTP_STATUS)`).

### `./helpers/object` and `./helpers/error`

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

### `./constants/http`

| Export | Type | Description |
|--------|------|-------------|
| `HTTP_STATUS`, `httpStatusSchema`, `HttpStatus` | const / zod / type | RFC 9110 statuses a web app can send (1xx–5xx), as numeric literals: `http-status-codes` enums break Hono's typed responses |
| `HTTP_METHOD`, `httpMethodSchema`, `HttpMethod` | const / zod / type | Every RFC 9110 method plus `PATCH` |
| `CONTENT_TYPE`, `contentTypeSchema`, `ContentType` | const / zod / type | JSON, `application/problem+json` (RFC 9457), HTML, text, form, multipart, octet-stream, event-stream |
| `HTTP_HEADER`, `httpHeaderSchema`, `HttpHeader` | const / zod / type | Common request, response and security header names, lower-case |

### `./constants/env`

| Export | Type | Description |
|--------|------|-------------|
| `BOOLEAN_ENV`, `booleanEnvSchema`, `BooleanEnv` | const / zod / type | `"true"` / `"false"`, the only accepted spellings of an env flag |

### `./constants/separators`

| Export | Type | Description |
|--------|------|-------------|
| `SEPARATOR`, `separatorSchema`, `Separator` | const / zod / type | `LIST` (`,`), `PAIR` (`=`), `PATH` (`.`) |

### `./constants/patterns`

| Export | Type | Description |
|--------|------|-------------|
| `TRAILING_SLASHES` | RegExp | `/\/+$/`, stripped from a URL or path before comparing or appending |

### `./constants/logger`

| Export | Type | Description |
|--------|------|-------------|
| `LOG_LEVEL`, `logLevelSchema`, `LogLevel` | const / zod / type | pino's levels plus `silent` |
| `REDACT_PATHS`, `REDACT_CENSOR` | const | What pino scrubs before a transport sees it, and what it writes instead |

### `./constants/units`

| Export | Type | Description |
|--------|------|-------------|
| `MS_PER_SECOND`, `SECONDS_PER_MINUTE`, `MS_PER_MINUTE` | number | Time conversions, so no bare `1000` or `60_000` |
| `BYTES_PER_KIB`, `BYTES_PER_MIB` | number | Size conversions |

### `./constants/security-headers`

| Export | Type | Description |
|--------|------|-------------|
| `SECURITY_HEADERS` | `{ key: HttpHeader; value: string }[]` | Headers every allonfire app sends: `X-Frame-Options` (DENY), `X-Content-Type-Options` (nosniff), `Referrer-Policy` (strict-origin-when-cross-origin), `X-DNS-Prefetch-Control` (on), `Strict-Transport-Security` (two years, includeSubDomains). Mutable, as Next's `headers()` wants |

### `./constants/node-env`

| Export | Type | Description |
|--------|------|-------------|
| `NODE_ENV` | `as const` object | `DEVELOPMENT`, `PRODUCTION`, `TEST`: compare against these, not bare strings |
| `nodeEnvSchema` | Zod enum | Validates `NODE_ENV` |
| `NodeEnv` | Type | `"development" \| "production" \| "test"` |

## 🔧 Usage

```ts
import { formatErrorMessage } from "@allonfire/utils/helpers/error";
import { objectKeys } from "@allonfire/utils/helpers/object";

// Type-safe iteration
const config = { TWITTER: "...", LINKEDIN: "..." };
const platforms = objectKeys(config); // ("TWITTER" | "LINKEDIN")[]

// Error handling in catch blocks
try { ... } catch (error) {
  return { error: formatErrorMessage(error, "Something went wrong") };
}
```

```ts
import { SECURITY_HEADERS } from "@allonfire/utils/constants/security-headers";

// In next.config.ts
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};
```
