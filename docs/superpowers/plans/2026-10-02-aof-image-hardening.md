# AOF Image Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve storage under `/storage/images`, add `AllowedApp.BACK_OFFICE`, and fix the seven minors deferred from the AOF image plan.

**Status:** implemented (uncommitted) @ 2026-10-02T10:23:16Z

**Architecture:** The path constants move to `@allonfire/utils/constants/storage` and every consumer reads `IMAGE_BASE_PATH`. `BACK_OFFICE` is a Prisma enum value plus Liquibase changeset 0004. The minors are local fixes in `prepareImage` (storage), `image.service` (database), the Images routes (api) and the build wiring (back office, Dockerfile, turbo, CI).

**Tech Stack:** Next 16.3.6, Hono, zod 4.3.6, Prisma + Liquibase, sharp 0.34.5, Vitest, Turborepo.

**Spec:** `docs/superpowers/specs/2026-10-02-aof-image-hardening-design.md`

## Global Constraints

- Builds on the uncommitted AOF image work on `feat/design-package`; never commit (iso-write).
- Laura is out of scope: do not touch `apps/laura`.
- No `as` casts; `objectKeys`/`objectValues`/`objectEntries`/`objectFromEntries` from `@allonfire/utils/helpers/object`, never `Object.*`.
- Every test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- Never add `biome-ignore`; fix the code. End with `pnpm biome check --write <touched files>` only.
- Database changes: edit `.prisma`, `pnpm db:changeset <name>`, review, `pnpm db:update`, `pnpm db:drift`, `pnpm db:generate`. Never `prisma db push`/`migrate`. Delete exFAT `._*` sidecars under `packages/database/prisma` before each Prisma command: `find packages/database/prisma -name '._*' -delete`.
- Wire values are the Prisma enum names (`ALL`, `LAURA`, `BACK_OFFICE`); the database stores `all`, `laura`, `back-office`.
- `MAX_INPUT_MEGAPIXELS = 100`; error copy, verbatim:
  - en: `"Image too large. Send at most {limit, number} megapixels"`
  - it: `"Immagine troppo grande. Invia al massimo {limit, number} megapixel"`
- A concurrent `vitest --ui --watch` from another session can drop the Liquibase test databases mid-run; rerun once before debugging a Liquibase failure.

## Review Focus

1. A stored alt with an extra key (a Language later removed) must still read, not throw: covered by the `looseObject` in Task 4; reviewer checks no `z.record`/strict object slipped in.
2. A cursor whose `createdAt` ties with other rows (one `createImages` batch shares a timestamp) must not skip or repeat rows: Task 4's deletion test creates its rows in one batch.
3. A cursor that is valid base64url but not the expected JSON (`{}`, a number, a bad date) must be a 400, never a 500: Task 5 tests one malformed and one wrong-shape cursor.
4. An upload where a put fails and another is slow must not delete before the slow one lands: Task 5's gated test.
5. `STORAGE_ENDPOINT` with a trailing slash in a production build must not yield `//images`: Task 1's test.

---

### Task 1: Storage paths under `/storage`

**Files:**
- Create: `packages/utils/src/constants/storage.ts`
- Delete: `packages/utils/src/constants/images.ts`
- Modify: `packages/utils/package.json` (export key)
- Modify: `packages/utils/src/next/config/aof-create-next-config.ts`
- Modify: `packages/storage/src/features/image/image-objects.ts:1-4`
- Modify: `packages/ui/src/components/aof-image.tsx:1,56`
- Modify: `packages/storage/README.md:10,46`, `apps/api/README.md:55,78`
- Test: `packages/utils/src/next/config/tests/aof-create-next-config.test.ts`, `packages/ui/src/components/tests/aof-image.test.tsx`

**Interfaces:**
- Produces: `STORAGE_PATH = "/storage"`, `IMAGE_PATH = "/images"`, `IMAGE_BASE_PATH = "/storage/images"`, `IMAGE_BUCKET`, `IMAGE_CACHE_TTL_SECONDS` from `@allonfire/utils/constants/storage`.

- [x] **Step 1: Write the failing tests**

In `aof-create-next-config.test.ts`, replace the three Image tests ("serves Images from MinIO when given an origin", "keeps the App's own rewrites after the Image one", "proxies one key, never the bucket root, so nobody can list it") with:

```ts
  const IMAGE_REWRITE = {
    destination: "http://minio:9000/images/:key",
    source: "/storage/images/:key",
  };

  it("serves Images from MinIO under /storage when given an origin", async () => {
    const config = AOFCreateNextConfig(
      {},
      { images: { origin: "http://minio:9000" } }
    );
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE]);
    expect(config.images).toEqual({
      formats: ["image/avif", "image/webp"],
      localPatterns: [{ pathname: "/storage/images/**", search: "" }],
      minimumCacheTTL: 31_536_000,
    });
  });

  it("keeps the App's own rewrites after the Image one", async () => {
    const own = { destination: "/b", source: "/a" };
    const config = AOFCreateNextConfig(
      { rewrites: async () => [own] },
      { images: { origin: "http://minio:9000" } }
    );
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE, own]);
  });

  it("proxies one key, never the bucket root, so nobody can list it", async () => {
    const config = AOFCreateNextConfig(
      {},
      { images: { origin: "http://minio:9000" } }
    );
    const rewrites = await config.rewrites?.();
    expect(Array.isArray(rewrites) && rewrites[0]?.source).toBe(
      "/storage/images/:key"
    );
  });

  it("ignores trailing slashes on the origin", async () => {
    const config = AOFCreateNextConfig(
      {},
      { images: { origin: "http://minio:9000//" } }
    );
    expect(await config.rewrites?.()).toEqual([IMAGE_REWRITE]);
  });
```

In `aof-image.test.tsx`, change the first test's URL assertion:

```ts
    expect(html).toContain("url=%2fstorage%2fimages%2fabc.webp");
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/utils exec vitest run src/next/config && pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-image.test.tsx`
Expected: FAIL — rewrites still have `source: "/images/:key"`, the trailing-slash test gets `http://minio:9000///images/:key`, the AOFImage URL is `%2fimages%2fabc.webp`.

- [x] **Step 3: Implement**

Create `packages/utils/src/constants/storage.ts`:

```ts
/** Where an App serves every storage, under its own origin; one folder per storage. */
export const STORAGE_PATH = "/storage";

/** Images, under `STORAGE_PATH`. */
export const IMAGE_PATH = "/images";

/** `/storage/images`: what `AOFImage` requests and each App rewrites to the bucket. */
export const IMAGE_BASE_PATH = `${STORAGE_PATH}${IMAGE_PATH}` as const;

/** The MinIO bucket every Image lives in (ADR 0013). */
export const IMAGE_BUCKET = "images";

/**
 * One year. An Image's key never changes content (a new upload gets a new
 * key), so its optimized copies can never go stale.
 */
export const IMAGE_CACHE_TTL_SECONDS = 31_536_000;
```

Delete `packages/utils/src/constants/images.ts`. In `packages/utils/package.json` replace the export line
`"./constants/images": "./src/constants/images.ts",` with
`"./constants/storage": "./src/constants/storage.ts",`, at its alphabetical place among the `./constants/*` keys.

In `aof-create-next-config.ts`, replace the imports from `../../constants/images` with:

```ts
import { TRAILING_SLASHES } from "../../constants/patterns";
import {
  IMAGE_BASE_PATH,
  IMAGE_BUCKET,
  IMAGE_CACHE_TTL_SECONDS,
} from "../../constants/storage";
```

and the body of `imageConfig` up to `return {` with:

```ts
const imageConfig = (origin: string, config: NextConfig): NextConfig => {
  // One segment, never `:path*`: that also matches the bare prefix, and a
  // request for the bucket root would list every key in it. The origin loses
  // any trailing slash first, or the destination would read `//images`.
  const imageRewrite = {
    destination: `${origin.replace(TRAILING_SLASHES, "")}/${IMAGE_BUCKET}/:key`,
    source: `${IMAGE_BASE_PATH}/:key`,
  };
  return {
    images: {
      formats: ["image/avif", "image/webp"],
      localPatterns: [{ pathname: `${IMAGE_BASE_PATH}/**`, search: "" }],
```

(the rest of `imageConfig` is unchanged). Update the JSDoc above `imageConfig` to say `` `/storage/images/*` proxied to the bucket ``.

In `packages/storage/src/features/image/image-objects.ts` change the import source to `@allonfire/utils/constants/storage`.

In `packages/ui/src/components/aof-image.tsx`:

```ts
import { IMAGE_BASE_PATH } from "@allonfire/utils/constants/storage";
```

and `src={`${IMAGE_BASE_PATH}/${image.key}`}`.

Docs: in `packages/storage/README.md` line 10 `<code>/images/*</code>` becomes `<code>/storage/images/*</code>`, line 46 `@allonfire/utils/constants/images` becomes `@allonfire/utils/constants/storage`. In `apps/api/README.md` line 55 `/images/*` becomes `/storage/images/*` and line 78 `/images/:key` becomes `/storage/images/:key`.

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/utils exec vitest run && pnpm --filter @allonfire/ui exec vitest run && grep -rn "constants/images" apps packages --include='*.ts' --include='*.tsx' --include='*.json' | grep -v node_modules`
Expected: both suites PASS; the grep prints nothing.

- [x] **Step 5: Type-check and format**

Run: `pnpm turbo run check-types --filter=@allonfire/utils --filter=@allonfire/ui --filter=@allonfire/storage --filter=@allonfire/back-office && pnpm biome check --write packages/utils/src/constants/storage.ts packages/utils/package.json packages/utils/src/next/config/aof-create-next-config.ts packages/utils/src/next/config/tests/aof-create-next-config.test.ts packages/storage/src/features/image/image-objects.ts packages/ui/src/components/aof-image.tsx packages/ui/src/components/tests/aof-image.test.tsx`
Expected: exit 0.

---

### Task 2: `AllowedApp.BACK_OFFICE`

**Files:**
- Modify: `packages/database/prisma/schema/auth.prisma:14-19`
- Create: `packages/database/changelog/changesets/0004-allowed-app-back-office.sql` (drafted by `pnpm db:changeset`)
- Test: `apps/api/src/routes/images/tests/read.test.ts`

**Interfaces:**
- Produces: `AllowedApp.BACK_OFFICE` (`"BACK_OFFICE"`) from `@allonfire/database/enums`, stored as `back-office`.

- [x] **Step 1: Write the failing test**

Add to the `describe("GET /v1/images")` block in `read.test.ts`:

```ts
  it("lists the Back office's Images", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => []);
    const res = await app(sessionFor({ allowedApps: [AllowedApp.ALL] }), {
      listImages,
    }).request(`/v1/images?app=${AllowedApp.BACK_OFFICE}`);
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: AllowedApp.BACK_OFFICE,
      limit: 30,
    });
  });
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/api exec vitest run src/routes/images/tests/read.test.ts`
Expected: FAIL — status 400 (`app=undefined` is not an `AllowedApp`).

- [x] **Step 3: Add the enum value and draft the changeset**

`auth.prisma`:

```prisma
enum AllowedApp {
  ALL         @map("all")
  LAURA       @map("laura")
  BACK_OFFICE @map("back-office")

  @@schema("auth")
}
```

Run: `find packages/database/prisma -name '._*' -delete && pnpm db:changeset allowed-app-back-office`
Expected: `Wrote .../0004-allowed-app-back-office.sql`.

- [x] **Step 4: Review the changeset**

The file must read exactly as below. Add the `--comment:` line; replace Prisma's drafted rollback with this one if it differs (Prisma wraps its own in `BEGIN`/`COMMIT`, which Liquibase must not get):

```sql
--liquibase formatted sql logicalFilePath:changesets/0004-allowed-app-back-office.sql

--changeset isaia:0004-allowed-app-back-office
--comment: The Back office becomes an Allowed app, so Images and Users can name it. Postgres cannot drop an enum value, so the rollback rebuilds the type; it fails while any row still uses back-office, which is the safe outcome.
-- AlterEnum
ALTER TYPE "auth"."AllowedApp" ADD VALUE 'back-office';
--rollback ALTER TYPE "auth"."AllowedApp" RENAME TO "AllowedApp_old";
--rollback CREATE TYPE "auth"."AllowedApp" AS ENUM ('all', 'laura');
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" DROP DEFAULT;
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" TYPE "auth"."AllowedApp"[] USING "allowedApps"::TEXT[]::"auth"."AllowedApp"[];
--rollback ALTER TABLE "auth"."User" ALTER COLUMN "allowedApps" SET DEFAULT ARRAY['all']::"auth"."AllowedApp"[];
--rollback ALTER TABLE "image"."Image" ALTER COLUMN "app" TYPE "auth"."AllowedApp" USING "app"::TEXT::"auth"."AllowedApp";
--rollback DROP TYPE "auth"."AllowedApp_old";
```

- [x] **Step 5: Apply, check drift, generate**

Run: `pnpm db:update && pnpm db:drift && find packages/database/prisma -name '._*' -delete && pnpm db:generate`
Expected: update applies 0004; drift reports no difference; generate succeeds.

- [x] **Step 6: Run the test to verify it passes, plus the rollback test**

Run: `pnpm --filter @allonfire/api exec vitest run src/routes/images && pnpm --filter @allonfire/database exec vitest run liquibase`
Expected: PASS, including the changelog test that rolls back every changeset after the baseline (it now rolls back 0004 too).

- [x] **Step 7: Format**

Run: `pnpm biome check --write apps/api/src/routes/images/tests/read.test.ts`
Expected: exit 0.

---

### Task 3: `prepareImage` caps pixels and decodes once

**Files:**
- Modify: `packages/storage/src/features/image/prepare-image.ts`
- Test: `packages/storage/src/features/image/tests/prepare-image.test.ts`

**Interfaces:**
- Produces: `MAX_INPUT_MEGAPIXELS = 100`, `MAX_INPUT_PIXELS = 100_000_000`, `class ImageTooLargeError extends Error` from `@allonfire/storage/features/image/prepare-image`. `prepareImage(input: Buffer): Promise<PreparedImage>` keeps its signature.

- [x] **Step 1: Write the failing test**

In `prepare-image.test.ts`, add `import { crc32, deflateSync } from "node:zlib";` at the top, add `ImageTooLargeError` to the `../prepare-image` import, and add above `describe`:

```ts
const pngChunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** A 66-byte PNG whose header claims `width` x `height`: nothing to decode. */
const pngHeader = (width: number, height: number) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.alloc(1))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
};
```

and inside `describe`:

```ts
  it("refuses an image over 100 megapixels from its header alone", async () => {
    await expect(prepareImage(pngHeader(12_000, 9000))).rejects.toBeInstanceOf(
      ImageTooLargeError
    );
  });
```

- [x] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/tests/prepare-image.test.ts`
Expected: FAIL — `ImageTooLargeError` is not exported (the received error is `UnsupportedImageError` or a TypeError on `instanceof undefined`).

- [x] **Step 3: Implement**

In `prepare-image.ts`, add below `BLUR_QUALITY`:

```ts
/**
 * Width times height past which an upload is refused before it is decoded:
 * 100 MP is about 300 MB of RGB, and the VPS has no swap.
 */
export const MAX_INPUT_MEGAPIXELS = 100;
export const MAX_INPUT_PIXELS = MAX_INPUT_MEGAPIXELS * 1_000_000;
```

below `UnsupportedImageError`:

```ts
/** More than `MAX_INPUT_PIXELS`, read from the header before any decode. */
export class ImageTooLargeError extends Error {
  constructor() {
    super(`Image over ${MAX_INPUT_MEGAPIXELS} megapixels`);
    this.name = "ImageTooLargeError";
  }
}
```

and replace `prepareImage` with:

```ts
/** The header only; bytes sharp cannot read at all are the client's error. */
async function readMetadata(input: Buffer): Promise<Metadata> {
  try {
    return await sharp(input).metadata();
  } catch (error) {
    throw new UnsupportedImageError(error);
  }
}

/**
 * Upright, metadata-free WebP capped at `MAX_IMAGE_DIMENSION`, plus its blur.
 * `.rotate()` applies the EXIF orientation first; sharp then writes no
 * metadata unless asked, so GPS and camera data never reach the bucket.
 */
export async function prepareImage(input: Buffer): Promise<PreparedImage> {
  const metadata = await readMetadata(input);
  if (!isAccepted(metadata)) {
    throw new UnsupportedImageError();
  }
  if ((metadata.width ?? 0) * (metadata.height ?? 0) > MAX_INPUT_PIXELS) {
    throw new ImageTooLargeError();
  }
  try {
    // The source is decoded once. The blur comes from the stored WebP, at
    // most 2560px, instead of a second full decode of the original.
    const { data, info } = await sharp(input, {
      failOn: "truncated",
      limitInputPixels: MAX_INPUT_PIXELS,
    })
      .rotate()
      .resize({
        fit: "inside",
        height: MAX_IMAGE_DIMENSION,
        width: MAX_IMAGE_DIMENSION,
        withoutEnlargement: true,
      })
      .webp({ quality: SOURCE_QUALITY })
      .toBuffer({ resolveWithObject: true });
    const blur = await sharp(data)
      .resize({ width: BLUR_WIDTH })
      .webp({ quality: BLUR_QUALITY })
      .toBuffer();
    return {
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      buffer: data,
      bytes: info.size,
      height: info.height,
      width: info.width,
    };
  } catch (error) {
    throw new UnsupportedImageError(error);
  }
}
```

- [x] **Step 4: Run the suite to verify it passes**

Run: `pnpm --filter @allonfire/storage exec vitest run`
Expected: PASS, 9 tests (the 8 existing ones cover the refactor: size cap, no enlarge, WebP without EXIF, upright, blur, GIF, garbage, truncated).

- [x] **Step 5: Format**

Run: `pnpm biome check --write packages/storage/src/features/image/prepare-image.ts packages/storage/src/features/image/tests/prepare-image.test.ts`
Expected: exit 0.

---

### Task 4: `image.service`: tolerant alt reads and a keyset cursor

**Files:**
- Modify: `packages/database/src/features/image/image.service.ts`
- Test: `packages/database/src/features/image/tests/image.integration.test.ts`

**Interfaces:**
- Produces: `export type ImageCursor = { createdAt: Date; id: string }`; `listImages({ app, cursor, limit }: { app: AllowedApp; cursor?: ImageCursor | undefined; limit: number }): Promise<ImageRecord[]>`. `imageAltSchema` (strict, for writes) unchanged.

- [x] **Step 1: Write the failing tests**

In `image.integration.test.ts` add `type ImageCursor` to the `../image.service` import. Replace the test "pages with the last id as the cursor" with:

```ts
  it("pages with the last Image as the cursor", async () => {
    const created = await createImages([
      image("a", AllowedApp.LAURA),
      image("b", AllowedApp.LAURA),
    ]);
    const [last] = await listImages({ app: AllowedApp.LAURA, limit: 1 });
    if (!last) {
      throw new Error("nothing listed");
    }
    const [next] = await listImages({
      app: AllowedApp.LAURA,
      cursor: { createdAt: last.createdAt, id: last.id },
      limit: 1,
    });
    expect(next?.id).not.toBe(last.id);
    expect(created.map(({ id }) => id)).toContain(next?.id);
  });

  it("keeps paging after the cursor's Image is deleted", async () => {
    // One batch: the rows may share createdAt, so the id breaks the tie.
    await createImages([
      image("p1", AllowedApp.LAURA),
      image("p2", AllowedApp.LAURA),
      image("p3", AllowedApp.LAURA),
    ]);
    const ours = async (cursor?: ImageCursor) =>
      (await listImages({ app: AllowedApp.LAURA, cursor, limit: 100 })).filter(
        ({ key }) => key.startsWith(KEY_PREFIX)
      );
    const [first, ...rest] = await ours();
    if (!first) {
      throw new Error("nothing listed");
    }
    await deleteImages([first.id]);
    const after = await ours({ createdAt: first.createdAt, id: first.id });
    expect(after.map(({ id }) => id)).toEqual(rest.map(({ id }) => id));
  });

  it("fills a Language missing from a stored alt with another's text", async () => {
    const [one] = await createImages([image("old", AllowedApp.LAURA)]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", fr: "La mer" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "The sea" });
  });

  it("keeps a stored empty alt empty, since it marks a decorative Image", async () => {
    const [one] = await createImages([image("deco", AllowedApp.LAURA)]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", it: "" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "" });
  });
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/image`
Expected: FAIL — the cursor tests error in Prisma (`cursor.id` gets an object), the missing-Language test throws a zod error (`it` required). The decorative test may already pass; it pins the rule.

- [x] **Step 3: Implement**

In `image.service.ts`, below `ImageAlt`:

```ts
/**
 * How alt reads back: every Language optional, unknown keys kept, so a row
 * saved before a Language was added (or after one was removed) still parses.
 */
const storedAltSchema = z.looseObject(
  objectFromEntries(
    LANGUAGES.map((language) => [language, z.string().optional()] as const)
  )
);

/**
 * A Language missing from the stored alt reads as the first Language that has
 * text, else "". A stored "" stays "": it marks a decorative Image.
 */
const readAlt = (stored: unknown): ImageAlt => {
  const known = storedAltSchema.parse(stored);
  const fallback =
    LANGUAGES.map((language) => known[language]).find(Boolean) ?? "";
  return objectFromEntries(
    LANGUAGES.map((language) => [language, known[language] ?? fallback] as const)
  );
};

/** Where the last page ended: its last Image's sort key, not a row reference. */
export type ImageCursor = { createdAt: Date; id: string };
```

`toRecord` becomes:

```ts
// `alt` is a Json column; parsing narrows it instead of casting.
const toRecord = (row: Image): ImageRecord => ({
  ...row,
  alt: readAlt(row.alt),
});
```

`listImages` becomes:

```ts
/**
 * The App's Images and the ALL ones, newest first. The cursor holds values,
 * not a row: deleting the Image it came from does not end the paging.
 */
export async function listImages({
  app,
  cursor,
  limit,
}: {
  app: AllowedApp;
  cursor?: ImageCursor | undefined;
  limit: number;
}): Promise<ImageRecord[]> {
  const rows = await prisma.image.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    where: {
      app: { in: [app, AllowedApp.ALL] },
      ...(cursor && {
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      }),
    },
  });
  return rows.map(toRecord);
}
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/image`
Expected: PASS, 9 tests.

- [x] **Step 5: Type-check and format**

Run: `pnpm turbo run check-types --filter=@allonfire/database && pnpm biome check --write packages/database/src/features/image/image.service.ts packages/database/src/features/image/tests/image.integration.test.ts`
Expected: exit 0. (`apps/api` fails type-check until Task 5: its `listQuerySchema` still passes a string cursor.)

---

### Task 5: Images routes: 413 over 100 MP, settled cleanup, paired items, opaque cursor, hidden is missing

**Files:**
- Create: `apps/api/src/routes/images/utils/cursor.ts`
- Modify: `apps/api/src/routes/images/constants/schemas.ts`
- Modify: `apps/api/src/routes/images/handlers.ts`
- Modify: `apps/api/src/routes/images/utils/access.ts`
- Modify: `apps/api/src/routes/images/routes.ts` (get: drop 403; upload docs unchanged)
- Modify: `apps/api/src/features/errors/constants/error-codes.ts`, `apps/api/src/features/errors/middleware/error-handler.ts` (`fallbackMessage`)
- Modify: `apps/api/src/features/i18n/translations/en.json`, `it.json`, `apps/api/src/features/i18n/translation-values.ts`
- Modify: `apps/api/README.md` (Images table: `GET /v1/images/:id` row, cursor note)
- Test: `apps/api/src/routes/images/tests/read.test.ts`, `write.test.ts`

**Interfaces:**
- Consumes: `ImageTooLargeError`, `MAX_INPUT_MEGAPIXELS` (Task 3); `ImageCursor`, `listImages({ cursor?: ImageCursor })` (Task 4).
- Produces: `encodeCursor(cursor: ImageCursor): string`, `cursorSchema` (string to `ImageCursor`) in `routes/images/utils/cursor.ts`; `canSee(session, app): boolean` in `utils/access.ts`; `ERROR_CODE.IMAGE_TOO_LARGE`.

- [x] **Step 1: Write the failing tests**

`read.test.ts`: add `import { encodeCursor } from "../utils/cursor";`. In "lists the App's Images with the next cursor" replace `nextCursor: "image-1",` with:

```ts
      nextCursor: encodeCursor({
        createdAt: new Date("2026-10-01T10:00:00.000Z"),
        id: "image-1",
      }),
```

Add to `describe("GET /v1/images")`:

```ts
  it("passes the decoded cursor to the service", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => []);
    const cursor = {
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      id: "image-1",
    };
    await app(lauraUser, { listImages }).request(
      `/v1/images?app=${AllowedApp.LAURA}&cursor=${encodeCursor(cursor)}`
    );
    expect(listImages).toHaveBeenCalledWith({
      app: AllowedApp.LAURA,
      cursor,
      limit: 30,
    });
  });

  it.each([
    ["not base64url JSON", "%%%"],
    ["JSON of the wrong shape", Buffer.from("{}").toString("base64url")],
  ])("refuses a cursor that is %s", async (_, cursor) => {
    const res = await app(lauraUser, {}).request(
      `/v1/images?app=${AllowedApp.LAURA}&cursor=${cursor}`
    );
    expect(res.status).toBe(400);
    expect((await problemOf(res)).code).toBe("VALIDATION_FAILED");
  });
```

Replace "answers 403 for another App's Image" in `describe("GET /v1/images/:id")` with:

```ts
  it("answers 404 for another App's Image, as if it did not exist", async () => {
    const res = await app(otherAppUser, {
      getImage: async () => imageRecord(),
    }).request("/v1/images/image-1");
    expect(res.status).toBe(404);
    expect((await problemOf(res)).code).toBe("NOT_FOUND");
  });
```

`write.test.ts`: add `ImageTooLargeError, MAX_INPUT_MEGAPIXELS` to the `@allonfire/storage/features/image/prepare-image` import, and add to `describe("POST /v1/images")`:

```ts
  it("refuses an image over the pixel limit with its own 413", async () => {
    const res = await app(admin, {
      prepare: () => Promise.reject(new ImageTooLargeError()),
    }).request("/v1/images", upload(1));
    expect(res.status).toBe(413);
    const body = await problemOf(res);
    expect(body.code).toBe("IMAGE_TOO_LARGE");
    expect(body.detail).toBe(
      translate("IMAGE_TOO_LARGE", LOCALE.EN_US, {
        limit: MAX_INPUT_MEGAPIXELS,
      })
    );
  });

  it("cleans up only after every put has settled", async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let puts = 0;
    const pending = app(admin, {
      deleteObjects: () => {
        order.push("cleanup");
        return Promise.resolve();
      },
      prepare: async () => PREPARED,
      putObject: async () => {
        puts += 1;
        if (puts === 1) {
          throw new Error("storage down");
        }
        await gate;
        order.push("late put");
      },
    }).request("/v1/images", upload(2));
    await vi.waitFor(() => expect(puts).toBe(2));
    // With Promise.all the cleanup has already run here, before the slow put.
    release();
    expect((await pending).status).toBe(500);
    expect(order).toEqual(["late put", "cleanup"]);
  });
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/api exec vitest run src/routes/images`
Expected: FAIL — `read.test.ts` cannot import `../utils/cursor` (that is the cursor tests' RED). In `write.test.ts`: the 413 test gets 500 (`ImageTooLargeError` is not exported yet if Task 3 is skipped, else an unhandled error), the cleanup test gets `["cleanup", "late put"]` or `["cleanup"]`. After Step 3 creates the codec, rerun once: the 404 test now fails on its own (403).

- [x] **Step 3: Implement the cursor codec**

Create `apps/api/src/routes/images/utils/cursor.ts`:

```ts
import type { ImageCursor } from "@allonfire/database/features/image/image.service";
import { z } from "zod";

const cursorFieldsSchema = z.object({
  createdAt: z.iso.datetime().transform((value) => new Date(value)),
  id: z.string().min(1),
});

/** Opaque to the client: base64url JSON of the last Image's sort key. */
export const encodeCursor = ({ createdAt, id }: ImageCursor): string =>
  Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id })
  ).toString("base64url");

/** The query's `cursor`, decoded; anything else is the client's 400. */
export const cursorSchema = z
  .string()
  .transform((text, context) => {
    try {
      return JSON.parse(Buffer.from(text, "base64url").toString("utf8"));
    } catch {
      context.addIssue({ code: "custom", message: "cursor is malformed" });
      return z.NEVER;
    }
  })
  .pipe(cursorFieldsSchema);
```

- [x] **Step 4: Implement the schemas**

In `constants/schemas.ts` add `import { cursorSchema } from "../utils/cursor";`. In `imageListBodySchema` change the comment to `/** Pass as \`cursor\` for the next page; null on the last page. */`. In `listQuerySchema` replace `cursor: z.string().min(1).optional(),` with `cursor: cursorSchema.optional(),`.

Replace `uploadFormSchema` with:

```ts
/**
 * The form as one list: each file with its own entry. A count mismatch is the
 * client's 400, so no later code needs a fallback for a missing entry.
 */
export const uploadFormSchema = z
  .object({
    file: z.array(z.instanceof(File)).min(1).max(MAX_FILES_PER_UPLOAD),
    meta: jsonText.pipe(z.array(uploadItemSchema)),
  })
  .transform(({ file, meta }, context) => {
    const items = meta.flatMap((entry, index) => {
      const one = file[index];
      return one ? [{ ...entry, file: one }] : [];
    });
    if (items.length !== file.length || items.length !== meta.length) {
      context.addIssue({
        code: "custom",
        message: "meta needs one entry per file",
        path: ["meta"],
      });
      return z.NEVER;
    }
    return items;
  });
export type UploadItem = z.output<typeof uploadFormSchema>[number];
```

- [x] **Step 5: Implement access and the error code**

`utils/access.ts` becomes:

```ts
import { canEnterApp } from "@allonfire/auth/features/access/access";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { AllowedApp } from "@allonfire/database/enums";
import { HTTP_STATUS } from "@allonfire/utils/constants/http";
import { HTTPException } from "hono/http-exception";

/** An ALL Image is for every signed-in User; any other, for that App's Users. */
export const canSee = (session: AuthSession, app: AllowedApp): boolean =>
  app === AllowedApp.ALL || canEnterApp(session.user.allowedApps, app);

/**
 * `requireApp` is fixed when mounted; here the App comes from the query, so
 * the same check runs per request and throws the guards' 403.
 */
export function assertCanSee(session: AuthSession, app: AllowedApp): void {
  if (!canSee(session, app)) {
    throw new HTTPException(HTTP_STATUS.FORBIDDEN);
  }
}
```

`error-codes.ts`: add `IMAGE_TOO_LARGE: "IMAGE_TOO_LARGE",` to `ERROR_CODE` (alphabetical, after `FORBIDDEN`). `STATUS_TO_ERROR_CODE` is unchanged: 413 stays `PAYLOAD_TOO_LARGE`; the upload handler sends `IMAGE_TOO_LARGE` explicitly.

`en.json`: `"IMAGE_TOO_LARGE": "Image too large. Send at most {limit, number} megapixels",`
`it.json`: `"IMAGE_TOO_LARGE": "Immagine troppo grande. Invia al massimo {limit, number} megapixel",`
`translation-values.ts`: `IMAGE_TOO_LARGE: { limit: number };`

`error-handler.ts` `fallbackMessage`: add `import { MAX_INPUT_MEGAPIXELS } from "@allonfire/storage/features/image/prepare-image";` and a case before `default`:

```ts
    case ERROR_CODE.IMAGE_TOO_LARGE:
      return translate(code, locale, { limit: MAX_INPUT_MEGAPIXELS });
```

- [x] **Step 6: Implement the handlers**

In `handlers.ts`:

- Imports: drop `AllowedApp` (keep `Role`) from `@allonfire/database/enums`; import `ImageTooLargeError, MAX_INPUT_MEGAPIXELS, type PreparedImage, UnsupportedImageError` from the storage module; add `type UploadItem` to the `./constants/schemas` import; `import { assertCanSee, canSee } from "./utils/access";`; `import { encodeCursor } from "./utils/cursor";`.
- `listHandlers`: `nextCursor: images.length === query.limit && last ? encodeCursor(last) : null,`
- `getHandlers` body:

```ts
    async (c) => {
      const image = await deps.getImage(c.req.valid("param").id);
      // Hidden is missing: a 403 would tell someone outside the App the id exists.
      if (!(image && canSee(c.get(AUTH_VAR.SESSION), image.app))) {
        throw new HTTPException(HTTP_STATUS.NOT_FOUND);
      }
      return c.json(toImageBody(image), HTTP_STATUS.OK);
    }
```

- Below `tooLarge` add:

```ts
/** 413 for an Image over the pixel limit, which no byte limit catches. */
const imageTooLarge = (c: Context) =>
  problemResponse(c, {
    code: ERROR_CODE.IMAGE_TOO_LARGE,
    detail: translate(ERROR_CODE.IMAGE_TOO_LARGE, localeOf(c), {
      limit: MAX_INPUT_MEGAPIXELS,
    }),
    status: HTTP_STATUS.PAYLOAD_TOO_LARGE,
  });

type PreparedItem = UploadItem & { image: PreparedImage; key: string };

/**
 * One at a time: sharp decodes the whole image, and the VPS has no swap. A
 * reduce chain, so each file waits for the one before it.
 */
const prepareAll = (deps: ImageDeps, items: UploadItem[]) =>
  items.reduce<Promise<PreparedItem[]>>(async (done, item) => {
    const list = await done;
    list.push({
      ...item,
      image: await prepareFile(deps, item.file),
      key: `${randomUUID()}${IMAGE_EXTENSION}`,
    });
    return list;
  }, Promise.resolve([]));

/**
 * Every put settles before anything is cleaned up: with `Promise.all` the
 * first failure cleaned up while other puts were still in flight, and those
 * landed after the delete.
 */
const storeAll = async (deps: ImageDeps, prepared: PreparedItem[]) => {
  const puts = await Promise.allSettled(
    prepared.map(({ image, key }) => deps.putObject(key, image.buffer))
  );
  const failed = puts.find(
    (put): put is PromiseRejectedResult => put.status === "rejected"
  );
  if (failed) {
    throw failed.reason;
  }
};
```

- The upload handler's final middleware becomes:

```ts
    async (c) => {
      const form = await c.req.parseBody({ all: true });
      // One `file` part parses to a File, several to an array.
      const parsed = uploadFormSchema.safeParse({
        file: [form.file].flat(),
        meta: form.meta,
      });
      if (!parsed.success) {
        return validationHook(
          { error: parsed.error.issues, success: false },
          c
        );
      }
      const items = parsed.data;
      if (items.some(({ file }) => file.size > MAX_FILE_BYTES)) {
        return tooLarge(c, MAX_FILE_BYTES);
      }
      const prepared = await prepareAll(deps, items).catch(
        (error: unknown) => {
          if (error instanceof ImageTooLargeError) {
            return null;
          }
          throw error;
        }
      );
      if (!prepared) {
        return imageTooLarge(c);
      }

      const uploadedBy = c.get(AUTH_VAR.SESSION).user.id;
      try {
        await storeAll(deps, prepared);
        const images = await deps.createImages(
          prepared.map(({ alt, app, image, key }) => ({
            alt,
            app,
            blurDataUrl: image.blurDataUrl,
            bytes: image.bytes,
            height: image.height,
            key,
            uploadedBy,
            width: image.width,
          }))
        );
        return c.json(images.map(toImageBody), HTTP_STATUS.CREATED);
      } catch (error) {
        // ponytail: best effort. An object left behind is invisible (no row
        // points at it); a failed cleanup must not hide the original error.
        const keys = prepared.map(({ key }) => key);
        await deps
          .deleteObjects(keys)
          .catch((cleanup: unknown) =>
            logger.warn({ err: cleanup, keys }, LOG_MESSAGE.CLEANUP_FAILED)
          );
        throw error;
      }
    }
```

`routes.ts` `getRoute`: remove the `[HTTP_STATUS.FORBIDDEN]: problem,` line (the route no longer answers 403).

`apps/api/README.md` Images table: the `GET /v1/images/:id` row's access column becomes `Session; 404 unless it may enter its App (\`ALL\`: anyone signed in)`, and the list row's note `\`nextCursor\` pages` becomes `\`nextCursor\` (opaque) pages`.

- [x] **Step 7: Run them to verify they pass**

Run: `pnpm --filter @allonfire/api exec vitest run src/routes/images src/features/errors`
Expected: PASS. Then the whole API suite and i18n:
Run: `pnpm --filter @allonfire/api exec vitest run && pnpm i18n:check`
Expected: all pass (156 before this plan, plus the new tests).

- [x] **Step 8: Type-check and format**

Run: `pnpm turbo run check-types --filter=@allonfire/api && pnpm biome check --write apps/api/src/routes/images apps/api/src/features/errors/constants/error-codes.ts apps/api/src/features/errors/middleware/error-handler.ts apps/api/src/features/i18n/translations/en.json apps/api/src/features/i18n/translations/it.json apps/api/src/features/i18n/translation-values.ts`
Expected: exit 0. If Biome flags `throw failed.reason` (`useThrowOnlyError`), wrap it: `throw failed.reason instanceof Error ? failed.reason : new Error(String(failed.reason));` — never an ignore comment.

---

### Task 6: `STORAGE_ENDPOINT` is required at build time

**Files:**
- Modify: `apps/back-office/src/environment/environment.ts`
- Create: `apps/back-office/.env.development`
- Modify: `docker/Dockerfile:29-39`
- Modify: `turbo.json`
- Modify: `.github/workflows/ci.yml:106-113`
- Modify: `apps/back-office/.env.example`

**Interfaces:**
- Consumes: Task 1's trailing-slash stripping in `imageConfig`.

No unit test: this is build configuration. The checks are the builds in Steps 2 and 4.

- [x] **Step 1: Make the env required, with a dev file**

`environment.ts` `server` block:

```ts
  server: {
    /**
     * MinIO as this App's server reaches it; read at build for the
     * `/storage/images` rewrite. No default: a production build without it
     * must fail, not proxy to localhost. Dev reads `.env.development`.
     */
    STORAGE_ENDPOINT: z.url(),
  },
```

Create `apps/back-office/.env.development` (committed; Next loads it for `next dev` only; no secrets):

```
# Dev only. Production passes STORAGE_ENDPOINT at build (docker/Dockerfile ARG).
STORAGE_ENDPOINT="http://localhost:9000"
```

In `apps/back-office/.env.example` change the comment above `STORAGE_ENDPOINT` to:
`# MinIO as the Next server reaches it; required at build, the /storage/images rewrite is baked in. Dev reads .env.development.`

- [x] **Step 2: Verify a build without it fails and one with it passes**

Run: `cd apps/back-office && env -u STORAGE_ENDPOINT pnpm build; echo "exit $?"`
Expected: non-zero exit, env validation naming `STORAGE_ENDPOINT` (production builds do not read `.env.development`).
Run: `STORAGE_ENDPOINT=http://minio:9000/ pnpm build && grep -o '"destination":"[^"]*images/:key"' .next/routes-manifest.json`
Expected: build succeeds; the grep prints `"destination":"http://minio:9000/images/:key"` (one slash: Task 1 stripped it).

- [x] **Step 3: Dockerfile, turbo, CI**

`docker/Dockerfile`, the builder stage env block becomes:

```dockerfile
# Build-time env stubs: satisfy @t3-oss/env validation during Next.js page data
# collection. STORAGE_ENDPOINT and BETTER_AUTH_URL must match runtime values:
# Next.js bakes them in at build (STORAGE_ENDPOINT is the /storage/images
# rewrite target). The Back office's build fails without STORAGE_ENDPOINT.
# Other values are placeholders that never reach the runner stage.
ARG BETTER_AUTH_URL="http://localhost:3000"
ARG STORAGE_ENDPOINT
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    BETTER_AUTH_SECRET="build-placeholder-secret-not-used-at-runtime" \
    BETTER_AUTH_URL=${BETTER_AUTH_URL} \
    STORAGE_ENDPOINT=${STORAGE_ENDPOINT} \
    STORAGE_ACCESS_KEY="build" \
    STORAGE_SECRET_KEY="build-placeholder"
```

`turbo.json`: in `globalPassThroughEnv` replace `"MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET"` with `"STORAGE_ENDPOINT", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"`; in `tasks.build.env` replace `"MINIO_ENDPOINT", "MINIO_BUCKET"` with `"STORAGE_ENDPOINT"`.

`.github/workflows/ci.yml` `build.env`: replace the four `MINIO_*` lines with:

```yaml
      STORAGE_ENDPOINT: ${{ secrets.STORAGE_ENDPOINT }}
      STORAGE_ACCESS_KEY: ${{ secrets.STORAGE_ACCESS_KEY }}
      STORAGE_SECRET_KEY: ${{ secrets.STORAGE_SECRET_KEY }}
```

- [x] **Step 4: Verify through turbo and the Dockerfile check**

Run: `STORAGE_ENDPOINT=http://minio:9000 pnpm turbo run build --filter=@allonfire/back-office --force && docker build --check -f docker/Dockerfile .`
Expected: the turbo build passes (turbo now passes `STORAGE_ENDPOINT` through); `docker build --check` reports no warnings. Then confirm no stale names: `grep -rn "MINIO_ENDPOINT\|MINIO_BUCKET" turbo.json .github docker/Dockerfile` prints nothing.

- [x] **Step 5: Docs**

In `CLAUDE.md` Deployment section, add one line:
`- Back office build needs \`STORAGE_ENDPOINT\` (Docker build arg, CI secret); it is baked into the \`/storage/images\` rewrite.`

- [x] **Step 6: Whole workspace**

Run: `pnpm check-types && pnpm turbo run test`
Expected: exit 0, every task passes.

---

## Watch out (outside the repo)

- GitHub environment `dev`: add `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` secrets before pushing, or the CI build fails on env validation.
- Dokploy: pass `STORAGE_ENDPOINT` as a build arg to the Back office image.
- Changeset 0004's rollback only works while no row uses `back-office`.

## Implementation Log
- Implemented: 2026-10-02T10:23:16Z
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
