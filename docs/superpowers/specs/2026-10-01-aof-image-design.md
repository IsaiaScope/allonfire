# AOFImage and the image API — design

Date: 2026-10-01
Status: approved in chat and grilled, ready for planning
Decision record: `docs/adr/0013-images-live-in-a-shared-image-schema.md`

## Intent

Every App shows Images the same fast, layout-stable way, and the Back office is
the one place they are managed. Admins upload, edit and delete Images through
the API, in batches; an App lists them from the API and renders them with
`AOFImage`, which hands `next/image` everything it needs to serve the right
size, in AVIF or WebP, with a blur placeholder and no layout shift.

Success means: a phone downloads an Image sized for its viewport, not the
source; the LCP Image is fetched first; CLS from Images is zero; a second visit
loads Images from the browser cache without touching the server.

## Decisions

| Question | Decision |
|---|---|
| Who uploads | The Back office manages every App's Images; Apps only read and render them |
| Ownership | An Image belongs to one App or to `ALL` (every App). An admin can move it |
| Where rows live | Shared Postgres schema `image`, table `image."Image"` (ADR 0013) |
| Files | MinIO bucket `image` (ADR 0013), public read, keys `<uuid>.webp` with no App in them |
| Alt text | One per language, `jsonb` `{ en, it }`, every `Language` required, empty means decorative |
| Who resizes | Next's built-in optimizer, per App, reading MinIO through an `/images/*` rewrite |
| Optimizer cache | `minimumCacheTTL` one year; Next's default `maximumDiskCacheSize`; no purge |
| Writes | Batch only, all-or-nothing |
| Uploader deleted | `uploadedBy` optional, `onDelete: SetNull` |
| Laura's Photo and quiz | Tables and database code dropped (Photo, Favorite, QuizQuestion, QuizAnswer); `apps/laura` itself is left untouched (user, 2026-10-02) |
| MinIO | The existing service; new `image` bucket; `laura-photos` deleted by hand |

Out of scope: the Back office upload screen (it needs `/aof-design`, its own
plan), rebuilding Laura's gallery or memory game on Image, a CDN, private
Images, duplicate detection.

## Architecture

```
Back office --POST /v1/images (multipart, up to 20 files)--> API
  API: validate all -> prepareImage each (sharp, one at a time)
       -> MinIO images/<uuid>.webp -> one transaction of image."Image" rows

App page (Server Component) --GET /v1/images?app=laura--> API -> rows (laura + ALL)
  <AOFImage image={row} language="it" sizes="..."/>
    browser -> /_next/image?url=/images/<uuid>.webp&w=828&q=75
      App's Next optimizer (sharp, cache in .next/cache/images on a volume)
        -> /images/:path* rewrite -> MinIO bucket image (public read)
```

## Units

### 1. `packages/storage` — preparing and storing

- `features/image/prepare-image.ts`: `prepareImage(buffer)` runs sharp once:
  `.rotate()` (auto-orient), metadata dropped (sharp's default, so EXIF and GPS
  never ship), resize `fit: "inside"` to at most 2560px without enlargement,
  encode WebP quality 90. Returns `{ buffer, width, height, bytes,
  blurDataUrl }`. `blurDataUrl` is the Image resized to 16px wide, WebP, as a
  base64 `data:` URL (a few hundred bytes), usable directly as `next/image`'s
  `blurDataURL`.
- Accepted formats: JPEG, PNG, WebP, AVIF, read from the bytes by sharp's
  metadata, never from the declared content type. Anything else, or bytes sharp
  cannot decode, is rejected. HEIC is rejected (sharp's prebuilt binaries
  cannot read it).
- `features/image/image-objects.ts`: put and delete objects in the `image`
  bucket (`IMAGE_BUCKET` constant), reusing the existing `s3` client.
- Removed: `processPhoto`, `blurHashToDataURL`, `uploadFile`/`getPublicUrl`
  (`/storage/` URLs), the `blurhash` dependency, `MINIO_BUCKET` from the env
  schema, and their lines in the root `index.ts`. New files get their own
  export keys.

### 2. `packages/database` — the `Image` model, and Photo dropped

`prisma/schema/image.prisma`, schema `image`:

| Field | Type | Note |
|---|---|---|
| `id` | `String @id @default(cuid(2))` | |
| `app` | `AllowedApp` | `ALL` means every App |
| `key` | `String @unique` | `<uuid>.webp`, named before the row exists |
| `width`, `height` | `Int` | after the 2560px cap |
| `bytes` | `Int` | stored size |
| `blurDataUrl` | `String` | |
| `alt` | `Json` | `{ en, it }`, shape enforced by a zod schema in the service |
| `uploadedBy` | `String?` -> `auth."User"`, `onDelete: SetNull` | |
| `createdAt` | `DateTime @default(now())` | |

Index `(app, createdAt)`. The `image` schema is added to the datasource's
`schemas`; `User` gets the back-relation.

Service `@allonfire/database/features/image/image.service`:
`createImages(rows)` (one transaction), `listImages({ app, cursor, limit })`
(rows where `app` is the App or `ALL`, newest first), `getImage(id)`,
`updateImages([{ id, app?, alt? }])` (one transaction), `deleteImages(ids)`
(one transaction, returns the deleted keys).

Dropped in the same Liquibase changeset: `laura."Favorite"`, `laura."Photo"`,
`laura."QuizQuestion"` and `laura."QuizAnswer"`. Deleted: `photo.service`,
`favorite.service`, `quiz.service`, their tests, the quiz seed and its
`db:seed-quiz` script, and the `photos` and `quizQuestions` back-relations on
`User`.

### 3. `apps/api` — `routes/images/`

Mounted at `API_VERSION_PREFIX + "/images"`, after the Session loader.

| Method and path | Guard | Behaviour |
|---|---|---|
| `POST /` multipart | `requireRole(Role.ADMIN)` | up to 20 files, each with its `app` and `alt`; 201 with the created Images |
| `GET /?app=&cursor=&limit=` | Session + the User may enter `app` | the App's and `ALL` Images, newest first |
| `GET /:id` | Session + may enter the Image's App | one Image |
| `PATCH /` `[{ id, app?, alt? }]` | ADMIN | up to 100; the updated Images |
| `DELETE /` `{ ids }` | ADMIN | up to 100; 204 |

- Multipart shape: repeated `file` parts plus one `meta` JSON part,
  `[{ app, alt }]`, in the same order as the files; the counts must match.
- All-or-nothing:
  - `POST` validates and prepares every file before uploading any; one bad
    file rejects the batch. It then uploads all objects and inserts all rows in
    one transaction; if the insert fails, it deletes the uploaded objects.
  - `PATCH` runs in one transaction; an unknown id rejects the batch (404).
  - `DELETE` deletes the rows in one transaction, then the objects. A leftover
    object is harmless; a row pointing at a missing object is a broken Image.
    An unknown id rejects the batch (404).
- `ALL` in `GET ?app=` is rejected (400): a caller lists for its own App.
  `canEnterApp(user.allowedApps, app)` runs per request because the App comes
  from the query or the row, and throws a `CodedError` 403 (`FORBIDDEN`). An
  `ALL` Image is readable by any signed-in User.
- Limits: 20 MiB per file, 100 MiB per request, files prepared one at a time.
  The global 1 MiB `bodyLimit` skips `POST /v1/images`, which applies its own.
- Response body: `{ id, app, key, width, height, alt, blurDataUrl, createdAt }`,
  one zod schema used by the handlers (`satisfies`) and `describeRoute`.
- New `ERROR_CODE` `UNSUPPORTED_IMAGE` (415), with messages in `en.json` and
  `it.json` and a line in `translation-values.ts`. A file over 20 MiB reuses
  `PAYLOAD_TOO_LARGE` (413) with the per-file limit as its value.
- Storage and the Image service come in through `createApp(deps)`, so route
  tests stub them and open no socket.
- The API's environment gains `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`,
  `STORAGE_SECRET_KEY`.

### 4. `packages/ui` — `AOFImage`

`src/components/aof-image.tsx`, no `"use client"`.

```tsx
<AOFImage image={img} language={language} sizes="(min-width: 768px) 33vw, 100vw" />
<AOFImage image={hero} language={language} sizes="100vw" lcp />
```

- `image`: `{ key, width, height, alt, blurDataUrl }`, the API's Image, so
  dimensions can never be forgotten. `src` is `${IMAGE_PATH}/${key}`, with
  `IMAGE_PATH = "/images"` in `@allonfire/utils/constants/images`.
- `language`: a `Language`; alt is `image.alt[language]`.
- `sizes`: required.
- `lcp?: boolean`: sets `fetchPriority="high"` and `loading="eager"`. Next 16
  deprecates `priority` and its docs prefer these over `preload`.
- Placeholder `blur` with `blurDataUrl`.
- Other `next/image` props (`className`, `quality` within `qualities`) pass
  through; `src`, `width`, `height`, `alt`, `placeholder`, `blurDataURL`,
  `priority` and `preload` are not accepted.

### 5. `packages/utils` — `AOFCreateNextConfig`

New option `images: { origin: string }`. When given:

- rewrite `/images/:path*` to `${origin}/images/:path*` (the internal MinIO
  URL; a relative `src` is fetched in-process, so Next 16's private-IP block
  does not apply);
- `images` config: `formats: ["image/avif", "image/webp"]`,
  `minimumCacheTTL: 31_536_000`, `localPatterns: [{ pathname: "/images/**",
  search: "" }]`. `qualities` stays Next's default `[75]`.

The Back office passes `images: { origin: env.STORAGE_ENDPOINT }`.

### 6. `apps/laura` — left untouched

The user asked to ignore Laura (2026-10-02). It is paused and outside the pnpm
workspace; its code still reads the dropped tables and the removed storage
exports, and is rebuilt on Images later.

### 7. Infrastructure

- `docker/docker-compose.dev.yml`: a one-shot `mc` service creates the `image`
  bucket with a read-only anonymous policy (`s3:GetObject` on `image/*`, nothing else; `mc anonymous set download` would also allow listing every key).
- Production: create `image` with the same policy (`mc anonymous set-json`), delete
  `laura-photos` by hand, add a Dokploy volume on each App at its
  `.next/cache/images`.

## Caching and deletion

- An optimized variant is keyed by `hash(href, width, quality, format)`, so all
  users share one file per variant. Only widths in `deviceSizes`/`imageSizes`
  and qualities in `qualities` are accepted; others get 400.
- Browsers keep an Image for one year (`Cache-Control: public,
  max-age=31536000, must-revalidate`). A key never changes content, so nothing
  stale can be served.
- Deleting removes the Image from every API response at once. Optimized copies
  stay in the Apps' caches until LRU evicts them, and browsers that loaded one
  keep it up to a year; anyone holding the URL may load it until then.

## Testing

- `prepareImage`: unit test on sharp-generated fixtures — EXIF stripped, capped
  at 2560px, aspect ratio kept, `blurDataUrl` a WebP data URL under 1 KB; an
  undecodable buffer and a GIF rejected.
- Image service: integration test against Postgres — `ALL` rows listed for
  every App, cursor order, transactions roll back on an unknown id.
- Routes: unit tests through `createApp(appDeps())` with stubbed storage and
  service — 401/403 per guard, 413, 415, mismatched `meta` count, happy paths,
  upload cleanup when the insert fails, delete order (rows before objects).
- `AOFImage`: render test (`src`, alt by language, blur placeholder, `lcp`);
  `test-d` file proving `sizes` and `language` are required and `priority` is
  rejected.
- `AOFCreateNextConfig`: the `images` option's rewrite and config.
