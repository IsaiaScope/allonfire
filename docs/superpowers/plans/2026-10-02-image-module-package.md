# Images Module Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Images HTTP routes from `@allonfire/storage` as a module any backend mounts with one line, errors reported through a shared `CodedError` that each host renders.

**Status:** implemented (uncommitted) @ 2026-10-02T15:06:48Z

**Architecture:** `CodedError` (in `@allonfire/utils`) carries status, code, ICU values and field errors; the module throws it and never builds a response body. The routes move from `apps/api/src/routes/images` to `packages/storage/src/routes/images`, typed on `AuthEnv`, with a logger injected. To break the package cycle this creates, the Next image wiring moves from `utils` into `storage` as `withStorageImages`, and `utils` stops depending on `storage`.

**Tech Stack:** Hono 4, hono-openapi, @hono/standard-validator, zod 4, Next 16, Vitest, pnpm workspaces + turbo.

**Spec:** `docs/superpowers/specs/2026-10-02-image-module-package-design.md`

## Global Constraints

- Builds on the uncommitted work on `feat/design-package`; never commit (iso-write).
- Laura is out of scope.
- No `as` casts; `objectFromEntries` & co from `@allonfire/utils/helpers/object`.
- Every test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals.
- Never add `biome-ignore`; end with `pnpm biome check --write <touched files>`.
- A thrown error built inside a `catch` passes the caught one as `{ cause }` in the **second** constructor argument (Biome `useErrorCause`).
- Export keys mirror paths: `"./routes/images"` for `routes/images/index.ts`, one line per file.
- Another session edits the tree concurrently: never rewrite a whole file you did not read in this task; edit by exact replacement.

## Review Focus

1. A `CodedError` whose code the host does not know, or whose status is not an `ERROR_STATUS`: must become a logged 500, never a crash or a 200. (Task 3 test.)
2. `bodyLimit`'s `onError` throwing instead of returning a Response: the 413 must still reach the host's `onError`. (Task 4 test "refuses a body over the upload limit".)
3. The host's global body limit and timeout must still skip `POST /v1/images` after `isImageUpload` moves into the module. (Task 5 keeps the timeout test.)
4. `withStorageImages` must keep an App's own `images` keys and both rewrite shapes (array and `{ afterFiles }`). (Task 2 tests.)
5. turbo must see no package cycle: `pnpm turbo run check-types` fails loudly on one. (Task 5 Step 6.)

---

### Task 1: `CodedError` in utils

**Files:**
- Create: `packages/utils/src/helpers/coded-error.ts`
- Create: `packages/utils/src/helpers/tests/coded-error.test.ts`
- Modify: `packages/utils/package.json` (export key)

**Interfaces:**
- Produces: `class CodedError extends Error` with `readonly status: number`, `readonly code: string`, `readonly values: Readonly<Record<string, number | string>>`, `readonly errors: readonly CodedErrorDetail[]`; `type CodedErrorDetail = { message: string; path: string }`; constructor `(fields: { status: number; code: string; values?: ...; errors?: ... }, options?: ErrorOptions)`.

- [x] **Step 1: Write the failing test**

`packages/utils/src/helpers/tests/coded-error.test.ts`:

```ts
// @module-tag unit
import { CodedError } from "../coded-error";

describe("CodedError", () => {
  it("carries what a host needs to render it", () => {
    const cause = new Error("sharp failed");
    const error = new CodedError(
      {
        code: "PAYLOAD_TOO_LARGE",
        errors: [{ message: "Too big", path: "file" }],
        status: 413,
        values: { limit: 100 },
      },
      { cause }
    );
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CodedError");
    expect(error.message).toBe("PAYLOAD_TOO_LARGE");
    expect(error.status).toBe(413);
    expect(error.values).toEqual({ limit: 100 });
    expect(error.errors).toEqual([{ message: "Too big", path: "file" }]);
    expect(error.cause).toBe(cause);
  });

  it("defaults to no values and no field errors", () => {
    const error = new CodedError({ code: "NOT_FOUND", status: 404 });
    expect(error.values).toEqual({});
    expect(error.errors).toEqual([]);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/utils exec vitest run src/helpers/tests/coded-error.test.ts`
Expected: FAIL — cannot find `../coded-error`.

- [x] **Step 3: Implement**

`packages/utils/src/helpers/coded-error.ts`:

```ts
/** One field that failed validation: where, and why. */
export type CodedErrorDetail = { message: string; path: string };

type CodedErrorFields = {
  /** An HTTP error status. */
  status: number;
  /** The host's error code; the host owns its message and translation. */
  code: string;
  /** The ICU values the code's message interpolates. */
  values?: Readonly<Record<string, number | string>>;
  /** Per-field failures, for a validation error. */
  errors?: readonly CodedErrorDetail[];
};

/**
 * What a shared HTTP module throws instead of building a response: the host's
 * error handler renders it in its own format and language (ADR 0015). Plain
 * `Error`, not Hono's `HTTPException`, so it needs no web framework.
 */
export class CodedError extends Error {
  readonly status: number;
  readonly code: string;
  readonly values: Readonly<Record<string, number | string>>;
  readonly errors: readonly CodedErrorDetail[];

  constructor(
    { status, code, values = {}, errors = [] }: CodedErrorFields,
    options?: ErrorOptions
  ) {
    super(code, options);
    this.name = "CodedError";
    this.status = status;
    this.code = code;
    this.values = values;
    this.errors = errors;
  }
}
```

Add to `packages/utils/package.json` `exports`, at its alphabetical place among `./helpers/*`:
`"./helpers/coded-error": "./src/helpers/coded-error.ts",`

- [x] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @allonfire/utils exec vitest run src/helpers/tests/coded-error.test.ts`
Expected: PASS, 2 tests.

- [x] **Step 5: Format**

Run: `pnpm biome check --write packages/utils/src/helpers/coded-error.ts packages/utils/src/helpers/tests/coded-error.test.ts packages/utils/package.json`
Expected: exit 0.

---

### Task 2: `withStorageImages` in storage; utils drops storage

**Files:**
- Create: `packages/storage/src/next/with-storage-images.ts`
- Create: `packages/storage/src/next/tests/with-storage-images.test.ts`
- Create: `packages/storage/src/features/image/constants/limits.ts`
- Modify: `packages/storage/src/features/image/prepare-image.ts` (import the limits)
- Modify: `packages/storage/package.json` (exports, `@allonfire/utils` dependency, `next` dev + peer)
- Modify: `packages/utils/src/next/config/aof-create-next-config.ts` (drop the `images` option)
- Modify: `packages/utils/src/next/config/tests/aof-create-next-config.test.ts` (drop the image tests)
- Modify: `packages/utils/package.json` (drop `@allonfire/storage`)
- Modify: `apps/back-office/next.config.ts`

**Interfaces:**
- Produces: `withStorageImages(config: NextConfig, { origin }: { origin: string }): NextConfig` from `@allonfire/storage/next/with-storage-images`; `MAX_INPUT_MEGAPIXELS`, `MAX_INPUT_PIXELS` from `@allonfire/storage/features/image/constants/limits` (still re-exported by `prepare-image`).

- [x] **Step 1: Write the failing test**

`packages/storage/src/next/tests/with-storage-images.test.ts`:

```ts
// @module-tag unit
import { withStorageImages } from "../with-storage-images";

const ORIGIN = { origin: "http://minio:9000" };
const IMAGE_REWRITE = {
  destination: "http://minio:9000/images/:key",
  source: "/storage/images/:key",
};

describe("withStorageImages", () => {
  it("proxies one key under /storage and lets next/image optimize only that", async () => {
    const config = withStorageImages({}, ORIGIN);
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE]);
    expect(config.images).toEqual({
      formats: ["image/avif", "image/webp"],
      localPatterns: [{ pathname: "/storage/images/**", search: "" }],
      minimumCacheTTL: 31_536_000,
    });
  });

  it("keeps the App's own rewrites after the Image one", async () => {
    const own = { destination: "/b", source: "/a" };
    const config = withStorageImages({ rewrites: async () => [own] }, ORIGIN);
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE, own]);
  });

  it("puts the Image rewrite first in an App's afterFiles", async () => {
    const own = { destination: "/b", source: "/a" };
    const config = withStorageImages(
      { rewrites: async () => ({ afterFiles: [own], beforeFiles: [], fallback: [] }) },
      ORIGIN
    );
    expect(await config.rewrites?.()).toEqual({
      afterFiles: [IMAGE_REWRITE, own],
      beforeFiles: [],
      fallback: [],
    });
  });

  it("ignores trailing slashes on the origin", async () => {
    const config = withStorageImages({}, { origin: "http://minio:9000//" });
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE]);
  });

  it("keeps the App's own config and image settings", () => {
    const config = withStorageImages(
      { images: { qualities: [60, 75] }, typedRoutes: false },
      ORIGIN
    );
    expect(config.typedRoutes).toBe(false);
    expect(config.images?.qualities).toEqual([60, 75]);
  });
});
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/storage exec vitest run src/next`
Expected: FAIL — cannot find `../with-storage-images`.

- [x] **Step 3: Implement**

`packages/storage/src/features/image/constants/limits.ts`:

```ts
/**
 * Width times height past which an upload is refused before it is decoded:
 * 100 MP is about 300 MB of RGB, and the VPS has no swap.
 */
export const MAX_INPUT_MEGAPIXELS = 100;
export const MAX_INPUT_PIXELS = MAX_INPUT_MEGAPIXELS * 1_000_000;
```

In `prepare-image.ts`, delete the two `MAX_INPUT_*` declarations (and their JSDoc) and add
`import { MAX_INPUT_MEGAPIXELS, MAX_INPUT_PIXELS } from "./constants/limits";` plus
`export { MAX_INPUT_MEGAPIXELS, MAX_INPUT_PIXELS } from "./constants/limits";` so existing importers keep working.

`packages/storage/src/next/with-storage-images.ts`:

```ts
import { TRAILING_SLASHES } from "@allonfire/utils/constants/patterns";
import type { NextConfig } from "next";
import {
  IMAGE_BUCKET,
  IMAGE_CACHE_TTL_SECONDS,
} from "../features/image/constants/bucket";
import { IMAGE_BASE_PATH } from "../shared/constants/paths";

/**
 * An App's Next config, able to show Images from storage: `/storage/images/:key`
 * proxied to the bucket, and next/image allowed to optimize only that path.
 * `origin` is MinIO as the App's server reaches it; rewrites are baked in at
 * build, so it must be set when building. A relative `src` is fetched
 * in-process, so Next 16's block on private-IP upstreams never applies.
 */
export const withStorageImages = (
  config: NextConfig,
  { origin }: { origin: string }
): NextConfig => {
  // One segment, never `:path*`: that also matches the bare prefix, and a
  // request for the bucket root would list every key in it. The origin loses
  // any trailing slash first, or the destination would read `//images`.
  const imageRewrite = {
    destination: `${origin.replace(TRAILING_SLASHES, "")}/${IMAGE_BUCKET}/:key`,
    source: `${IMAGE_BASE_PATH}/:key`,
  };
  return {
    ...config,
    images: {
      formats: ["image/avif", "image/webp"],
      localPatterns: [{ pathname: `${IMAGE_BASE_PATH}/**`, search: "" }],
      minimumCacheTTL: IMAGE_CACHE_TTL_SECONDS,
      ...config.images,
    },
    rewrites: async () => {
      const own = (await config.rewrites?.()) ?? [];
      return Array.isArray(own)
        ? [imageRewrite, ...own]
        : { ...own, afterFiles: [imageRewrite, ...(own.afterFiles ?? [])] };
    },
  };
};
```

`packages/storage/package.json`:
- `exports` add `"./features/image/constants/limits": "./src/features/image/constants/limits.ts",` and `"./next/with-storage-images": "./src/next/with-storage-images.ts",`
- `dependencies` add `"@allonfire/utils": "workspace:*"`
- `devDependencies` add `"next": "^16.3.6"`; `peerDependencies` add `"next": "^16.0.0"` (create the block if missing).

In `aof-create-next-config.ts`: delete the `images` member of `Options` and its JSDoc, the whole `imageConfig` function and its JSDoc, the `images` destructured parameter, the `...(images && imageConfig(images.origin, config)),` line with its comment, and the three imports from `@allonfire/storage/...` and `TRAILING_SLASHES` (keep `SECURITY_HEADERS`).

In `aof-create-next-config.test.ts`: delete `IMAGE_REWRITE` and the five tests "serves Images from MinIO under /storage when given an origin", "keeps the App's own rewrites after the Image one", "proxies one key, never the bucket root, so nobody can list it", "ignores trailing slashes on the origin", "adds no Image wiring without an origin".

`packages/utils/package.json`: remove `"@allonfire/storage": "workspace:*"` from `dependencies`.

`apps/back-office/next.config.ts`: add `import { withStorageImages } from "@allonfire/storage/next/with-storage-images";`, change the first argument from `{}` to `withStorageImages({}, { origin: buildEnv.STORAGE_ENDPOINT })`, and delete the `images: { origin: buildEnv.STORAGE_ENDPOINT },` option line.

Run: `pnpm install`
Expected: lockfile updated, exit 0.

- [x] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @allonfire/storage exec vitest run && pnpm --filter @allonfire/utils exec vitest run && grep -rn "@allonfire/storage" packages/utils/src packages/utils/package.json`
Expected: both suites PASS; the grep prints nothing.

- [x] **Step 5: Type-check and build the Back office**

Run: `pnpm turbo run check-types --filter=@allonfire/storage --filter=@allonfire/utils --filter=@allonfire/back-office && cd apps/back-office && STORAGE_ENDPOINT=http://minio:9000/ pnpm build && node -e 'const m=require("./.next/routes-manifest.json");const r=m.rewrites;console.log([...(Array.isArray(r)?r:[...r.beforeFiles,...r.afterFiles,...r.fallback])].map(x=>x.source+" -> "+x.destination))'`
Expected: exit 0; prints `[ '/storage/images/:key -> http://minio:9000/images/:key' ]`.

- [x] **Step 6: Format**

Run: `pnpm biome check --write packages/storage/src/next packages/storage/src/features/image packages/storage/package.json packages/utils/src/next/config packages/utils/package.json apps/back-office/next.config.ts`
Expected: exit 0.

---

### Task 3: The API renders `CodedError`

**Files:**
- Modify: `apps/api/src/features/i18n/translate.ts`
- Modify: `apps/api/src/features/errors/middleware/error-handler.ts`
- Test: `apps/api/src/features/errors/tests/coded-error.test.ts` (create)

**Interfaces:**
- Consumes: `CodedError` (Task 1).
- Produces: `translateCode(key: TranslationKey, locale: Locale, values: Readonly<Record<string, number | string>>): string`; `onError` renders a `CodedError`.

- [x] **Step 1: Write the failing test**

`apps/api/src/features/errors/tests/coded-error.test.ts`:

```ts
// @module-tag unit
import { LOCALE } from "@allonfire/utils/constants/locales";
import { CodedError } from "@allonfire/utils/helpers/coded-error";
import { Hono } from "hono";
import { translate } from "../../i18n/translate";
import { onError } from "../middleware/error-handler";
import { problemOf } from "./problem-of";

const appThrowing = (error: Error) =>
  new Hono()
    .get("/", () => {
      throw error;
    })
    .onError(onError);

describe("onError with a CodedError", () => {
  it("renders the code with its values in the request's language", async () => {
    const res = await appThrowing(
      new CodedError({
        code: "PAYLOAD_TOO_LARGE",
        status: 413,
        values: { limit: 2048 },
      })
    ).request("/", { headers: { "accept-language": "en-US" } });
    expect(res.status).toBe(413);
    const body = await problemOf(res);
    expect(body.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.detail).toBe(
      translate("PAYLOAD_TOO_LARGE", LOCALE.EN_US, { limit: 2048 })
    );
  });

  it("passes field errors through", async () => {
    const res = await appThrowing(
      new CodedError({
        code: "VALIDATION_FAILED",
        errors: [{ message: "Required", path: "app" }],
        status: 400,
        values: { count: 1 },
      })
    ).request("/");
    expect((await problemOf(res)).errors).toEqual([
      { message: "Required", path: "app" },
    ]);
  });

  it.each([
    ["an unknown code", { code: "NOPE", status: 400 }],
    ["an undocumented status", { code: "NOT_FOUND", status: 418 }],
  ])("answers 500 for %s", async (_, fields) => {
    const res = await appThrowing(new CodedError(fields)).request("/");
    expect(res.status).toBe(500);
    expect((await problemOf(res)).code).toBe("INTERNAL_ERROR");
  });
});
```

(`problemOf` already exists in `apps/api/src/features/errors/tests/problem-of.ts`. If `onError` needs `localeResolver` to have run, the test app falls back to the default locale; the first test then asserts against the default-locale message: replace `LOCALE.EN_US` with the `DEFAULT_LOCALE` from `features/i18n/constants/locales` if it fails only on language.)

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/errors/tests/coded-error.test.ts`
Expected: FAIL — status 500 for the first two (a `CodedError` is not an `HTTPException` yet).

- [x] **Step 3: Implement**

`translate.ts`: move the body of `translate` (the `try { ... } catch { ... }`) into a private function

```ts
function render(
  key: TranslationKey,
  locale: Locale,
  values: Readonly<Record<string, number | string>> | undefined
): string {
  // the former body of translate, unchanged
}
```

make `translate` call `return render(key, locale, values);`, and add:

```ts
/**
 * For a code whose values arrive at runtime, a module's `CodedError`:
 * unchecked against `TranslationValues`, so a value the module forgot renders
 * ICU's fallback instead of failing the build.
 */
export const translateCode = (
  key: TranslationKey,
  locale: Locale,
  values: Readonly<Record<string, number | string>>
): string => render(key, locale, values);
```

`error-handler.ts`: add `import { CodedError } from "@allonfire/utils/helpers/coded-error";`, add `translateCode` to the `../../i18n/translate` import, add `errorCodeSchema` to the `../constants/error-codes` import, and insert at the top of `onError`, after `const requestId = requestIdOf(context);`:

```ts
  // A shared module's error (ADR 0015): its code and values, our format and
  // language. A code or status this API does not document is a bug below.
  if (err instanceof CodedError) {
    const code = errorCodeSchema.safeParse(err.code);
    if (code.success && isErrorStatus(err.status)) {
      return problemResponse(context, {
        code: code.data,
        detail: translateCode(code.data, localeOf(context), err.values),
        status: err.status,
        ...(err.errors.length > 0 && { errors: [...err.errors] }),
      });
    }
  }
```

In `fallbackMessage`, change the `IMAGE_TOO_LARGE` case's import source: `MAX_INPUT_MEGAPIXELS` now comes from `@allonfire/storage/features/image/constants/limits` (no sharp load).

- [x] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/errors src/features/i18n`
Expected: PASS.

- [x] **Step 5: Type-check and format**

Run: `pnpm turbo run check-types --filter=@allonfire/api && pnpm biome check --write apps/api/src/features/i18n/translate.ts apps/api/src/features/errors`
Expected: exit 0.

---

### Task 4: The Images module in storage

**Files:**
- Move (git mv): `apps/api/src/routes/images/{index,routes,handlers}.ts`, `constants/{limits,schemas}.ts`, `utils/{access,cursor,deps}.ts`, `tests/{read.test,write.test,stub-image-deps}.ts` to `packages/storage/src/routes/images/` (same relative paths)
- Create: `packages/storage/src/routes/images/constants/errors.ts`, `constants/openapi.ts`, `utils/upload.ts`, `utils/validation.ts`, `tests/test-host.ts`, `tests/upload.test.ts`
- Modify: every moved file's imports (below), `packages/storage/package.json`

**Interfaces:**
- Consumes: `CodedError` (Task 1); `MAX_INPUT_MEGAPIXELS` (Task 2).
- Produces: `imageRoutes(deps: ImageDeps)` from `@allonfire/storage/routes/images`; `ImageDeps` (now with `log`) from `./routes/images/utils/deps`; `IMAGE_ERROR_CODE` from `./routes/images/constants/errors`; `isImageUpload(method: string, path: string, basePath: string): boolean` from `./routes/images/utils/upload`; `stubImageDeps`, `imageRecord` from `./routes/images/tests/stub-image-deps`.

- [x] **Step 1: Move the files and write the new contract tests**

Run: `mkdir -p packages/storage/src/routes/images && git mv apps/api/src/routes/images/* packages/storage/src/routes/images/ && find packages/storage/src/routes -name '._*' -delete`

`packages/storage/src/routes/images/tests/test-host.ts`:

```ts
import { AUTH_VAR } from "@allonfire/auth/shared/constants/variables";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import type { AuthEnv } from "@allonfire/auth/shared/types/variables";
import { CodedError } from "@allonfire/utils/helpers/coded-error";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { imageRoutes } from "../index";
import type { ImageDeps } from "../utils/deps";
import { stubImageDeps } from "./stub-image-deps";

/** Where the test host mounts the module. */
export const IMAGES_PATH = "/images";

/**
 * The smallest host: a Session, the module, and an `onError` that answers the
 * module's contract as plain JSON, so these tests check what the module throws
 * and not any host's problem format.
 */
export const testHost = (
  session: AuthSession | null,
  images: Partial<ImageDeps> = {}
) =>
  new Hono<AuthEnv>()
    .use((c, next) => {
      c.set(AUTH_VAR.SESSION, session);
      return next();
    })
    .route(IMAGES_PATH, imageRoutes(stubImageDeps(images)))
    .onError((err) => {
      if (err instanceof CodedError) {
        return Response.json(
          { code: err.code, errors: err.errors, values: err.values },
          { status: err.status }
        );
      }
      const status = err instanceof HTTPException ? err.status : 500;
      return Response.json({ code: "HOST" }, { status });
    });

const contractSchema = z.object({
  code: z.string(),
  errors: z.array(z.object({ message: z.string(), path: z.string() })).optional(),
  values: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
});

/** The module's error, as the test host answered it. */
export const errorOf = async (res: Response) =>
  contractSchema.parse(await res.json());
```

`packages/storage/src/routes/images/tests/upload.test.ts`:

```ts
// @module-tag unit
import { isImageUpload } from "../utils/upload";

describe("isImageUpload", () => {
  it("is the POST to the module's base path, nothing else", () => {
    expect(isImageUpload("POST", "/v1/images", "/v1/images")).toBe(true);
    expect(isImageUpload("PATCH", "/v1/images", "/v1/images")).toBe(false);
    expect(isImageUpload("POST", "/v1/images/x", "/v1/images")).toBe(false);
  });
});
```

Rewrite the moved route tests to run against the test host. In both `tests/read.test.ts` and `tests/write.test.ts`:
- Replace the imports of `createApp`, `problemOf`, `apiAuth`, `appDeps` (and in `write.test.ts` also `translate`, `LOCALE`, `REQUEST_TIMEOUT_MS`) with `import { errorOf, IMAGES_PATH, testHost } from "./test-host";`.
- Replace the local `const app = (session, images) => createApp(...)` with `const app = testHost;`.
- Replace every request path `"/v1/images` with `` `${IMAGES_PATH}`` `` (template literal) — e.g. `` `${IMAGES_PATH}?app=${AllowedApp.LAURA}` ``, `` `${IMAGES_PATH}/image-1` ``.
- Replace `problemOf(res)` with `errorOf(res)`.
- In `write.test.ts`, delete the test "is not cut off by the API-wide request timeout" (it tests the host; Task 5 moves it to the API).
- In "refuses a file over the per-file limit, naming that limit", replace the `detail` assertion with `expect(body.values).toEqual({ limit: MAX_FILE_BYTES });`.
- In "refuses an image over the pixel limit with its own 413", replace the `detail` assertion with `expect(body.values).toEqual({ limit: MAX_INPUT_MEGAPIXELS });`.
- Add to `describe("POST /v1/images refusals and failures")`:

```ts
  it("refuses a body over the upload limit through the host's onError", async () => {
    const res = await app(admin, {}).request(IMAGES_PATH, {
      body: "x",
      headers: { "content-length": String(MAX_UPLOAD_BYTES + 1) },
      method: "POST",
    });
    expect(res.status).toBe(413);
    const body = await errorOf(res);
    expect(body.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.values).toEqual({ limit: MAX_UPLOAD_BYTES });
  });
```

  with `MAX_UPLOAD_BYTES` added to the `../constants/limits` import.
  If the request arrives without that `content-length` (undici can drop a hand-set one), send a real stream instead: `body: new Blob([new Uint8Array(MAX_UPLOAD_BYTES + 1)])` and drop the header; bodyLimit then counts the bytes as they arrive.
- In `read.test.ts` add to `describe("GET /v1/images")`:

```ts
  it("reports each invalid field", async () => {
    const res = await app(lauraUser, {}).request(`${IMAGES_PATH}?limit=0`);
    expect(res.status).toBe(400);
    const body = await errorOf(res);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors?.map(({ path }) => path).sort()).toEqual(["app", "limit"]);
    expect(body.values).toEqual({ count: 2 });
  });
```

In `tests/stub-image-deps.ts` add `log: { warn: () => undefined },` to the object `stubImageDeps` returns.

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/storage exec vitest run src/routes`
Expected: FAIL — imports resolve to the API (`../../shared/types/bindings`, `../../features/errors/...`) that no longer exist next to the module, and `../utils/upload` is missing.

- [x] **Step 3: Write the module's own pieces**

`constants/errors.ts`:

```ts
/**
 * Every code this module throws (ADR 0015). A host renders and translates
 * them; its type test checks this list against its own codes, so a new one
 * fails the host's build until the host gives it a message.
 */
export const IMAGE_ERROR_CODE = {
  IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",
  NOT_FOUND: "NOT_FOUND",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  UNSUPPORTED_IMAGE: "UNSUPPORTED_IMAGE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
} as const;
```

`constants/openapi.ts`:

```ts
/** The tag the Images routes appear under. */
export const IMAGES_OPENAPI_TAG = "Images";

/** A host publishing docs registers this response component (the API does). */
export const PROBLEM_RESPONSE_REF = "#/components/responses/Problem";
```

`utils/upload.ts`:

```ts
import { HTTP_METHOD } from "@allonfire/utils/constants/http";

/**
 * The upload brings its own body limit and time budget (100 MiB, 5 minutes),
 * so a host skips its global ones for it. `basePath` is where it mounted the
 * module.
 */
export const isImageUpload = (
  method: string,
  path: string,
  basePath: string
): boolean => method === HTTP_METHOD.POST && path === basePath;
```

`utils/validation.ts`:

```ts
import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { SEPARATOR } from "@allonfire/utils/constants/separators";
import {
  CodedError,
  type CodedErrorDetail,
} from "@allonfire/utils/helpers/coded-error";
import { IMAGE_ERROR_CODE } from "../constants/errors";

/** The part of a Standard Schema issue this module reads. */
type StandardIssue = {
  readonly message: string;
  readonly path?:
    | readonly (PropertyKey | { readonly key: PropertyKey })[]
    | undefined;
};

type ValidationResult =
  | { success: true }
  | { success: false; error?: readonly StandardIssue[] };

const pathOf = (issue: StandardIssue): string =>
  (issue.path ?? [])
    .map((segment) =>
      typeof segment === "object" && segment !== null && "key" in segment
        ? String(segment.key)
        : String(segment)
    )
    .join(SEPARATOR.PATH);

/** `sValidator`'s hook: a failed parse becomes the host's 400. */
export function throwOnInvalid(result: ValidationResult): void {
  if (result.success) {
    return;
  }
  const errors: CodedErrorDetail[] = (result.error ?? []).map((issue) => ({
    message: issue.message,
    path: pathOf(issue),
  }));
  throw new CodedError({
    code: IMAGE_ERROR_CODE.VALIDATION_FAILED,
    errors,
    status: HTTP_STATUS.BAD_REQUEST,
    values: { count: errors.length },
  });
}
```

`utils/deps.ts`: change the storage imports to the package's own relative paths (`../../../features/image/image-objects`, `../../../features/image/prepare-image`) and add to `ImageDeps`:

```ts
  /** Where best-effort cleanup failures go; pino's shape. */
  log: { warn(details: object, message: string): void };
```

- [x] **Step 4: Convert the moved files**

`index.ts`: replace `import type { AppBindings } from "../../shared/types/bindings";` with `import type { AuthEnv } from "@allonfire/auth/shared/types/variables";` and `new Hono<AppBindings>()` with `new Hono<AuthEnv>()`. Add a JSDoc above `imageRoutes`: `/** The Images module (ADR 0015): mount it where the host wants Images; it reads the Session the host's sessionLoader set. */`

`routes.ts`: replace `import { OPENAPI_RESPONSE, OPENAPI_TAG } from "../docs/constants/openapi";` with `import { IMAGES_OPENAPI_TAG, PROBLEM_RESPONSE_REF } from "./constants/openapi";`, `` const problem = { $ref: `#/components/responses/${OPENAPI_RESPONSE.PROBLEM}` }; `` with `const problem = { $ref: PROBLEM_RESPONSE_REF };`, and every `OPENAPI_TAG.IMAGES` with `IMAGES_OPENAPI_TAG`.

`constants/schemas.ts`, `constants/limits.ts`, `utils/access.ts`, `utils/cursor.ts`: imports already point at packages; no change.

`handlers.ts`, the import block becomes:

```ts
import { randomUUID } from "node:crypto";
import { requireRole } from "@allonfire/auth/features/guards/middleware/require-role";
import { requireSession } from "@allonfire/auth/features/guards/middleware/require-session";
import { AUTH_VAR } from "@allonfire/auth/shared/constants/variables";
import type { AuthEnv } from "@allonfire/auth/shared/types/variables";
import { Role } from "@allonfire/database/enums";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { CodedError } from "@allonfire/utils/helpers/coded-error";
import { sValidator } from "@hono/standard-validator";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { timeout } from "hono/timeout";
import { MAX_INPUT_MEGAPIXELS } from "../../features/image/constants/limits";
import {
  ImageTooLargeError,
  type PreparedImage,
  UnsupportedImageError,
} from "../../features/image/prepare-image";
import { IMAGE_ERROR_CODE } from "./constants/errors";
import {
  MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  UPLOAD_TIMEOUT_MS,
} from "./constants/limits";
```

followed by the unchanged `./constants/schemas`, `./routes`, `./utils/access`, `./utils/cursor`, `./utils/deps` imports and `import { throwOnInvalid } from "./utils/validation";`. Then:

- `const factory = createFactory<AuthEnv>();`
- every `sValidator(<target>, <schema>, validationHook)` becomes `sValidator(<target>, <schema>, throwOnInvalid)`.
- `getHandlers`: `throw new HTTPException(HTTP_STATUS.NOT_FOUND);` becomes `throw notFound();`
- Replace `tooLarge`, `imageTooLarge` and `notFoundOnUnknownIds` with:

```ts
const notFound = (options?: ErrorOptions) =>
  new CodedError(
    { code: IMAGE_ERROR_CODE.NOT_FOUND, status: HTTP_STATUS.NOT_FOUND },
    options
  );

/** 413 naming the limit that was actually crossed, not a host-wide one. */
const tooLarge = (limit: number) =>
  new CodedError({
    code: IMAGE_ERROR_CODE.PAYLOAD_TOO_LARGE,
    status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
    values: { limit },
  });

/** The service's unknown-id error, as the 404 every other route answers. */
const notFoundOnUnknownIds = (error: unknown): never => {
  if (error instanceof ImageNotFoundError) {
    throw notFound({ cause: error });
  }
  throw error;
};
```

- `prepareFile`'s `catch` becomes:

```ts
  } catch (error) {
    if (error instanceof ImageTooLargeError) {
      throw new CodedError(
        {
          code: IMAGE_ERROR_CODE.IMAGE_TOO_LARGE,
          status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
          values: { limit: MAX_INPUT_MEGAPIXELS },
        },
        { cause: error }
      );
    }
    if (error instanceof UnsupportedImageError) {
      throw new CodedError(
        {
          code: IMAGE_ERROR_CODE.UNSUPPORTED_IMAGE,
          status: HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
        },
        { cause: error }
      );
    }
    throw error;
  }
```

- `uploadHandlers`: `bodyLimit`'s `onError: (c) => tooLarge(c, MAX_UPLOAD_BYTES)` becomes `onError: () => { throw tooLarge(MAX_UPLOAD_BYTES); }`; in the handler, `return validationHook({ error: parsed.error.issues, success: false }, c);` becomes `throwOnInvalid({ error: parsed.error.issues, success: false });` (the `if` stays, as an early exit), `return tooLarge(c, MAX_FILE_BYTES);` becomes `throw tooLarge(MAX_FILE_BYTES);`, and the `prepareAll(...).catch(...)` / `if (!prepared) return imageTooLarge(c);` block becomes `const prepared = await prepareAll(deps, items);`.
- Both `logger.warn(` calls become `deps.log.warn(`.
- Remove the now-unused `Context` import.

`packages/storage/package.json`:
- `dependencies` add `"@allonfire/auth": "workspace:*"`, `"@allonfire/database": "workspace:*"`, `"@hono/standard-validator": "^0.2.0"`, `"hono-openapi": "^1.1.0"`.
- `devDependencies` add `"hono": "^4.9.0"`; `peerDependencies` add `"hono": "^4.9.0"`.
- `exports` add, one line each: `"./routes/images"` → `./src/routes/images/index.ts`, `"./routes/images/constants/errors"`, `"./routes/images/utils/deps"`, `"./routes/images/utils/upload"`, `"./routes/images/tests/stub-image-deps"`.

Run: `pnpm install`
Expected: exit 0, no cycle reported.

- [x] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @allonfire/storage exec vitest run`
Expected: PASS: the moved read/write tests (minus the host-timeout test), the new validation, body-limit and `isImageUpload` tests, `withStorageImages`, `prepareImage`.

- [x] **Step 6: Type-check storage and format**

Run: `pnpm turbo run check-types --filter=@allonfire/storage && pnpm biome check --write packages/storage/src/routes packages/storage/package.json`
Expected: exit 0. (`apps/api` does not compile until Task 5.)

---

### Task 5: The API mounts the module

**Files:**
- Modify: `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/src/shared/tests/app-deps.ts`, `apps/api/src/shared/constants/routes.ts` (only if an import breaks)
- Create: `apps/api/src/features/errors/tests/images-module.test.ts`, `apps/api/src/features/errors/tests/image-error-codes.test-d.ts`

**Interfaces:**
- Consumes: `imageRoutes`, `ImageDeps`, `isImageUpload`, `IMAGE_ERROR_CODE`, `stubImageDeps`, `imageRecord` (Task 4); `CodedError` rendering (Task 3).

- [x] **Step 1: Write the failing tests**

`apps/api/src/features/errors/tests/image-error-codes.test-d.ts`:

```ts
import { IMAGE_ERROR_CODE } from "@allonfire/storage/routes/images/constants/errors";
import type { ErrorCode } from "../constants/error-codes";

// The API documents and translates every code the Images module can throw.
export const covered = IMAGE_ERROR_CODE satisfies Record<string, ErrorCode>;
```

`apps/api/src/features/errors/tests/images-module.test.ts`:

```ts
// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { Role } from "@allonfire/database/enums";
import { ImageTooLargeError, MAX_INPUT_MEGAPIXELS } from "@allonfire/storage/features/image/prepare-image";
import { imageRecord, stubImageDeps } from "@allonfire/storage/routes/images/tests/stub-image-deps";
import type { ImageDeps } from "@allonfire/storage/routes/images/utils/deps";
import { LOCALE } from "@allonfire/utils/constants/locales";
import { createApp } from "../../../app";
import { REQUEST_TIMEOUT_MS } from "../../../shared/constants/limits";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { translate } from "../../i18n/translate";
import { problemOf } from "./problem-of";

const admin = sessionFor({ role: Role.ADMIN });
const PREPARED = {
  blurDataUrl: "data:image/webp;base64,AAAA",
  buffer: Buffer.from("webp"),
  bytes: 4,
  height: 600,
  width: 800,
};

const app = (images: Partial<ImageDeps>) =>
  createApp(
    appDeps({
      auth: apiAuth({ getSession: () => Promise.resolve(admin) }),
      images: stubImageDeps(images),
    })
  );

const upload = () => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(10)], "a.jpg"));
  form.append("meta", JSON.stringify([{ alt: { en: "", it: "" }, app: "LAURA" }]));
  return { body: form, headers: { "accept-language": "en-US" }, method: "POST" };
};

describe("the Images module inside the API", () => {
  it("answers a module error as this API's localized problem document", async () => {
    const res = await app({
      prepare: () => Promise.reject(new ImageTooLargeError()),
    }).request("/v1/images", upload());
    expect(res.status).toBe(413);
    const body = await problemOf(res);
    expect(body.code).toBe("IMAGE_TOO_LARGE");
    expect(body.detail).toBe(
      translate("IMAGE_TOO_LARGE", LOCALE.EN_US, { limit: MAX_INPUT_MEGAPIXELS })
    );
  });

  it("is not cut off by the API-wide request timeout", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      let reach: () => void = () => undefined;
      const reached = new Promise<void>((resolve) => {
        reach = resolve;
      });
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const pending = app({
        createImages: (rows) =>
          Promise.resolve(rows.map((row) => imageRecord({ ...row }))),
        prepare: async () => {
          reach();
          await gate;
          return PREPARED;
        },
        putObject: () => Promise.resolve(),
      }).request("/v1/images", upload());
      // The handler is inside prepare; a 30 s timeout would fire now.
      await reached;
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1000);
      release();
      expect((await pending).status).toBe(201);
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/errors/tests/images-module.test.ts`
Expected: FAIL — `app.ts` still imports `./routes/images/index`, which Task 4 moved.

- [x] **Step 3: Implement**

`app.ts`:
- Replace `import { imageRoutes } from "./routes/images/index";` with `import { imageRoutes } from "@allonfire/storage/routes/images";`, and `import type { ImageDeps } from "./routes/images/utils/deps";` with `import type { ImageDeps } from "@allonfire/storage/routes/images/utils/deps";`; add `import { isImageUpload as isImagesUpload } from "@allonfire/storage/routes/images/utils/upload";`.
- The local `isImageUpload` becomes:

```ts
  // The Images module brings its own, larger body limit and time budget:
  // 100 MiB and up to 20 sharp passes outlast both defaults.
  const isImageUpload = (c: Context) =>
    isImagesUpload(c.req.method, c.req.path, IMAGES_BASE_PATH);
```

  (drop `HTTP_METHOD` from the imports if nothing else uses it).

`index.ts`: in the object passed as `images`, add `log: logger,` (the pino instance already imported there; if it is not, import `logger` from `./features/logger/logger`).

`shared/tests/app-deps.ts`: `import { stubImageDeps } from "../../routes/images/tests/stub-image-deps";` becomes `import { stubImageDeps } from "@allonfire/storage/routes/images/tests/stub-image-deps";`.

Run: `rmdir apps/api/src/routes/images 2>/dev/null; find apps/api/src/routes/images -name '._*' -delete 2>/dev/null; ls apps/api/src/routes`
Expected: `docs` and `health` only.

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/api exec vitest run`
Expected: PASS; the suite's count drops by the image route tests that moved to storage, plus the 2 new ones.

- [x] **Step 5: Whole workspace**

Run: `pnpm check-types && pnpm turbo run test`
Expected: exit 0, no "cyclic dependency" from turbo. (If the other session's unfinished files fail, name them and check this plan's packages with `--filter`.)

- [x] **Step 6: Format**

Run: `pnpm biome check --write apps/api/src/app.ts apps/api/src/index.ts apps/api/src/shared/tests/app-deps.ts apps/api/src/features/errors/tests`
Expected: exit 0.

---

### Task 6: Docs and ADR 0015

**Files:**
- Create: `docs/adr/0015-http-modules-ship-as-packages-and-throw-coded-errors.md`
- Modify: `CLAUDE.md`, `apps/api/README.md`, `packages/storage/README.md`, `packages/utils/README.md`

No test: documentation.

- [x] **Step 1: ADR**

`docs/adr/0015-http-modules-ship-as-packages-and-throw-coded-errors.md`:

```markdown
# HTTP modules ship as packages and throw CodedError

A feature with its own endpoints (Auth, Images) ships as a package any
backend mounts, not as routes inside the API: the Images module is
`imageRoutes(deps)` from `@allonfire/storage/routes/images`, mounted with one
`.route()`. A module never builds an error response or translates a message.
It throws `CodedError` (`@allonfire/utils/helpers/coded-error`: status, code,
ICU values, field errors), and each host's `onError` renders it in that
host's format and language. The module exports the codes it can throw; the
host's type test checks them against its own codes.

## Considered Options

- **Routes inside the API** (before): a second backend would copy them, and
  their errors were the API's problem documents.
- **The module renders problems itself:** every host would answer in the
  module's format and language, not its own.
- **Hooks injected by the host** (a `problem(c, ...)` callback): one more
  dependency per module for what a thrown value already carries.

## Consequences

- `@allonfire/storage` depends on `@allonfire/auth` and `@allonfire/database`;
  the Next image wiring moved from `utils` into it (`withStorageImages`) so
  `utils` depends on no workspace package and no cycle forms.
- A module adding an error code breaks every host's type check until the host
  gives the code a message.
```

- [x] **Step 2: CLAUDE.md**

- In the API tree (`apps/api/src/routes/`), delete the `images/` entry (three lines) and append to the `routes/` comment: `; the Images module mounts from @allonfire/storage (ADR 0015)`.
- In `## Package Layout`, after the export-keys paragraph, add: `A package that serves HTTP for any host (the Auth and Images modules) exports its router from routes/<name>/index.ts, takes its dependencies as arguments, and throws CodedError from @allonfire/utils/helpers/coded-error instead of building responses (ADR 0015).`

- [x] **Step 3: READMEs**

- `apps/api/README.md`: in the Images section, replace the sentence naming `routes/images/` with `The Images module from @allonfire/storage, mounted at /v1/images (ADR 0013, ADR 0015).`
- `packages/storage/README.md`: drop "Apps never import it" from the intro; add a "Images module" section: `imageRoutes(deps)` from `./routes/images`, what `ImageDeps` needs (database service functions, `putObject`, `deleteObjects`, `prepare`, `log`), `isImageUpload` for host limits, `IMAGE_ERROR_CODE` for host codes, the `#/components/responses/Problem` docs contract; add `./next/with-storage-images` and `./routes/images*` rows to its exports table; replace the dependency list line with `@allonfire/auth, @allonfire/database, @allonfire/utils, hono (peer), next (peer, types only)`.
- `packages/utils/README.md`: add a row for `./helpers/coded-error` (`CodedError`, `CodedErrorDetail`) and remove any mention of the `images` option of `AOFCreateNextConfig`.

- [x] **Step 4: Verify links**

Run: `grep -rn "routes/images" CLAUDE.md apps/api/README.md packages/storage/README.md docs/adr/0015-*.md`
Expected: only the new `@allonfire/storage/routes/images` references.

## Implementation Log
- Implemented: 2026-10-02T15:06:48Z
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
- Rulings:
  - Task 2: `next build` skipped (the user's `next dev` on :3400 shares `.next`); the rewrite was checked by loading `next.config.ts` with jiti instead.
  - Task 2: `apps/back-office` gained a direct `@allonfire/storage` dependency (it only had it through utils).
  - Task 2: `next` is an optional peer of storage, as in `@allonfire/auth`.
  - Task 2: `prepare-image` does not re-export the limits (Biome `noBarrelFile`); importers use `features/image/constants/limits`.
  - Task 4: `utils/validation.ts` also exports `invalid(issues)`, so the upload handler can `throw` (a returned `void` would leak into the response type).
  - Task 4: storage got a `vitest.setup.ts` setting `DATABASE_URL`, as auth has (`image.service` validates env at import).
  - Task 4: route files were untracked, so `mv`, not `git mv`.
