# AOF Image hardening — design

Follow-up to `2026-10-01-aof-image-design.md` (implemented, uncommitted, on
`feat/design-package`). Three things: storage paths grouped under one prefix,
`AllowedApp` gains the Back office, and the seven minors the final review of
that plan deferred.

## 1. Storage paths

Apps serve storage under one prefix, the way the API mounts auth under
`AUTH_PATH`. More storages than Images may come (documents, video), each under
`/storage/<name>`.

The constants live in `@allonfire/storage`, the package that owns storage, the
way `AUTH_PATH` lives in `@allonfire/auth` (`packages/utils/src/constants/images.ts` goes):

| Constant | File | Value |
|---|---|---|
| `STORAGE_PATH` | `shared/constants/paths.ts` | `"/storage"`, where an App serves every storage |
| `IMAGE_PATH` | `shared/constants/paths.ts` | `"/images"`, Images under `STORAGE_PATH` |
| `IMAGE_BASE_PATH` | `shared/constants/paths.ts` | `/storage/images`, what `AOFImage` and the rewrite use |
| `IMAGE_BUCKET` | `features/image/constants/bucket.ts` | `"image"`, singular like the schema (ADR 0013) |
| `IMAGE_CACHE_TTL_SECONDS` | `features/image/constants/bucket.ts` | `31_536_000`, unchanged |

`@allonfire/storage` stops depending on `@allonfire/utils` (it only read these
constants), so `@allonfire/utils` (the Next config) and `@allonfire/ui`
(`AOFImage`) can depend on it without a cycle. Apps showing Images transpile
`@allonfire/storage`, since it ships TypeScript source.

The rewrite becomes `/storage/images/:key` to `<origin>/images/:key`; still one
segment, so the bucket root is never proxied. `localPatterns` becomes
`/storage/images/**`. `AOFImage` renders `src="/storage/images/<key>"`.

## 2. `AllowedApp.BACK_OFFICE`

`enum AllowedApp { ALL, LAURA, BACK_OFFICE @map("back-office") }`. Changeset
`0004` adds the value; Prisma drafts the rollback, which rebuilds the type (Postgres
has no `DROP VALUE`) and therefore only works while no row uses `back-office`.
The Liquibase rollback test already rolls back every changeset after the baseline.

`canEnterApp` is unchanged: `ALL` still passes every App. New Users default to
`[ALL]`, so the Back office's guard, when it lands, is `requireRole(ADMIN)` plus
`requireApp(BACK_OFFICE)`; Allowed apps alone never let anyone in. The Images API
takes `BACK_OFFICE` anywhere it takes an App, `ALL` still excluded from the
list query.

## 3. The seven minors

1. **Pixel cap, one decode.** `prepareImage` reads the header (`metadata()`),
   and over `MAX_INPUT_PIXELS = 100_000_000` (width times height) throws
   `ImageTooLargeError` before decoding. sharp also gets
   `limitInputPixels: MAX_INPUT_PIXELS`. The blur is made from the stored
   2560px WebP, not from the source, so the source is decoded once.
   The API answers `413` with a new code `IMAGE_TOO_LARGE`:
   "Image too large. Send at most {limit, number} megapixels" /
   "Immagine troppo grande. Invia al massimo {limit, number} megapixel".
2. **Cleanup waits for every put.** The puts run under `Promise.allSettled`;
   only when all have settled, and one failed, are the keys deleted and the
   first failure thrown. A put still in flight can no longer land after the
   cleanup.
3. **No fallbacks.** `uploadFormSchema` transforms `{ file, meta }` into one
   `items: { file, alt, app }[]`, adding a validation issue when the counts
   differ. The handler walks `items`; `?? ""` and `?? AllowedApp.ALL` are gone.
4. **Alt survives a new language.** Writes stay strict (`imageAltSchema`).
   Reads fill a language missing from the stored JSON with the text of the first
   language in `LANGUAGES` that has a non-empty one, else `""`. A language
   stored as `""` (decorative) stays `""`.
5. **Keyset cursor.** `listImages` takes `cursor?: { createdAt: Date; id: string }`
   and filters `createdAt < c OR (createdAt = c AND id < i)`, matching the
   `createdAt desc, id desc` order. The API sends `nextCursor` as base64url JSON
   of `{ createdAt, id }` and decodes it in `listQuerySchema`; a malformed cursor
   is `400 VALIDATION_FAILED`. Deleting the Image a cursor came from no longer
   ends paging.
6. **Hidden is missing.** `GET /v1/images/:id` answers `404` both when the id is
   unknown and when the caller may not see its App. The list keeps `403`: there
   the caller names the App.
7. **`STORAGE_ENDPOINT` is required at build.**
   - Back office env: `STORAGE_ENDPOINT: z.url()`, no default.
     `apps/back-office/.env.development` (committed, dev only, no secrets) holds
     `http://localhost:9000`, so `pnpm dev` needs no setup.
   - `imageConfig` strips trailing slashes from `origin` (`TRAILING_SLASHES`).
   - Dockerfile: `ARG STORAGE_ENDPOINT`, `ENV STORAGE_ENDPOINT=${STORAGE_ENDPOINT}`;
     the hard-coded `http://minio:9000` goes. A Back office build without the arg
     fails env validation; Laura's never reads it.
   - `turbo.json`: `STORAGE_*` replace `MINIO_*` in `globalPassThroughEnv`, and
     `STORAGE_ENDPOINT` replaces `MINIO_ENDPOINT`/`MINIO_BUCKET` in `build.env`, so it
     reaches the build and is part of its cache key. Today strict env mode strips
     it and the build silently falls back to localhost.
   - CI `build` job: `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
     from secrets, replacing the four `MINIO_*`.

## Out of scope

Laura (paused). Production compose (no API or Back office service yet). The
Back office's own guard.

## Prerequisites outside the repo

- GitHub environment `dev`: add secrets `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`,
  `STORAGE_SECRET_KEY`, or the CI build fails.
- Dokploy: pass `STORAGE_ENDPOINT` as a build arg to the Back office image.
