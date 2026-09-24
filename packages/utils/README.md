<h1 align="center">@allonfire/utils</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

<p align="center">Type-safe utility functions and security headers shared across all packages.</p>

## 📦 API Reference

| Export | Type | Description |
|--------|------|-------------|
| `objectKeys(obj)` | Function | Type-safe `Object.keys()` — returns `(keyof T & string)[]` |
| `objectEntries(obj)` | Function | Type-safe `Object.entries()` — returns `[keyof T & string, T[keyof T]][]` |
| `formatErrorMessage(error, fallback)` | Function | Extracts message from `Error` instances, returns fallback for unknown errors |

### `./environment`

| Export | Type | Description |
|--------|------|-------------|
| `env` | Validated env | `NODE_ENV` read from `process.env`, default `development`. Extend it: `createEnv({ extends: [env], ... })` |
| `runtimeEnvSchema` | Zod shape | The same schema, to spread into `server` when an env is built from a record rather than `process.env` |

### `./constants/node-env`

| Export | Type | Description |
|--------|------|-------------|
| `NODE_ENV` | `as const` object | `DEVELOPMENT`, `PRODUCTION`, `TEST`: compare against these, not bare strings |
| `nodeEnvSchema` | Zod enum | Validates `NODE_ENV` |
| `NodeEnv` | Type | `"development" \| "production" \| "test"` |

### `./security-headers`

| Export | Type | Description |
|--------|------|-------------|
| `securityHeaders` | `Array<{ key: string; value: string }>` | Pre-configured HTTP security headers: `X-Frame-Options` (DENY), `X-Content-Type-Options` (nosniff), `Referrer-Policy` (strict-origin-when-cross-origin), `X-DNS-Prefetch-Control` (on), `Strict-Transport-Security` (HSTS with includeSubDomains) |

## 🔧 Usage

```ts
import { objectKeys, formatErrorMessage } from "@allonfire/utils";

// Type-safe iteration
const config = { TWITTER: "...", LINKEDIN: "..." };
const platforms = objectKeys(config); // ("TWITTER" | "LINKEDIN")[]

// Error handling in catch blocks
try { ... } catch (error) {
  return { error: formatErrorMessage(error, "Something went wrong") };
}
```

```ts
import { securityHeaders } from "@allonfire/utils/security-headers";

// In next.config.ts
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```
