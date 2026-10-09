# Images in Several Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store an Image once and place it in any number of Apps (`image."ImageApp"`), each placement public or private; let anyone read what they can see without a Session, and let each App's Admins manage only their own App's placements.

**Status:** implemented (uncommitted) @ 2026-10-08T17:26:24Z

**Architecture:** `packages/database` owns the data (`Image` without `app`, the new `ImageApp` table, `0003` rewritten in place), the visibility rules (`ImageLink`, `canSeeImageIn`, `canSeeImage`, `canManageEverywhere`, `enterableApps` in `access.ts`) and the service (`listImages` by `app` and `enterable`, `linksOfImages`, `removeImagesFromApp`, `updateImages` replacing placements). `packages/storage`'s Image module swaps `app` for `apps: { app, public }[]`, drops `requireSession()` from both reads, splits its handlers into `read-handlers.ts` and `write-handlers.ts`, and authorises writes through `hono/utils/access.ts` (404 across the batch, then 403). The API wires the new deps and documents the new rules.

**Tech Stack:** Prisma 6, Liquibase (Docker), Hono 4, `hono-openapi`, zod 4, Vitest 4 (globals).

**Spec:** `docs/superpowers/specs/2026-10-08-images-in-several-apps-design.md` (ADR 0020 written; ADR 0013, ADR 0019 and `CONTEXT.md` already point to it)

## Global Constraints

- Never commit or stage: leave every change in the working tree; the user commits with `/iso-commit`.
- No `as` casts except `as const`; no `biome-ignore`; no `Object.keys/values/entries/fromEntries` (use `objectKeys`, `objectValues`, `objectEntries`, `objectFromEntries` from `@allonfire/core/shared/utils/object`); no `JSON.parse/stringify` (use `parseJson`, `stringifyJson`, `jsonFrom`).
- Every test file starts with `// @module-tag unit` or `// @module-tag integration`; integration files are named `*.integration.test.ts`; Vitest globals, no `from "vitest"`. Type tests (`*.test-d.ts`) take no tag and are checked by `tsc`.
- A constant's type comes from zod (`z.enum(X)`); lookup tables are `as const satisfies Record<K, V>`, never annotated `: Record<K, V>`.
- Package exports mirror the file path without `src/` and `.ts`, one line per file.
- Every non-test file stays at or under 300 lines (Biome `noExcessiveLinesPerFile`; `*.test.ts` files are exempt). `noAwaitInLoops` is on: sequential awaits use a `reduce` chain, as `prepareAll` does.
- `exactOptionalPropertyTypes` is on: an optional field that may hold `undefined` is typed `x?: T | undefined`, and object literals spread a field in (`...(alt && { alt })`) instead of setting it to `undefined`.
- `ImageLink` is `{ app: App; public: boolean }` everywhere: the access rules, `ImageRecord.apps`, the Image body. A request's `public` is optional; the route fills it in (upload: `false`; PATCH: the existing placement's, else `false`).
- The Image body carries every placement of the Image, not only the ones the caller sees: a PATCH sends the full new list, so an Admin of one App must see the other Apps' placements to keep them. Files were already public by key (ADR 0020).
- Rewriting `0003-image-schema.sql` changes its checksum: the Local database is dropped and rebuilt in Task 1 (approved in the spec; `origin/dev` stops at `0002`). Image files already in the Local MinIO stay; their rows go. The Back office sign-in page reads its Image by key, so it still shows.
- Between Tasks 3 and 7, `@allonfire/storage` and `@allonfire/api` fail `check-types`: the services change shape first. Each task's own `Run:` lines are its gate; the packages are green again at the end of Task 6 (storage) and Task 7 (API).
- End of every task: `pnpm exec biome check --write <files the task touched>` (per file if a multi-file call fails with "No such file or directory": exFAT `._*` sidecars). End of the plan: `pnpm check-types`, `pnpm lint`, `pnpm test` (Postgres up), all green.
- `apps/back-office/src/features/auth/constants/sign-in-image.ts` (its "until the page can look an Image up by name without a session" comment) is out of scope: leave it.

## Review Focus

- A write batch mixing an Image the User cannot see with one they see but cannot manage must answer 404 and write nothing, never 403: a 403 would tell them which ids exist. Pinned in Task 6 (`"answers 404 before 403 across the batch"`, recap rows `PATCH R` and `DELETE { [Q, R] }`).
- A PATCH that leaves `public` out must keep an existing public placement public, and a placement it adds starts private; flipping P's Laura placement private would hide a share page. Pinned in Task 6 (`"keeps a public placement public when public is left out"`).
- Removing an Image's last placement must delete its row and its file; removing one placement of several must keep both. Pinned in Task 3 (`removeImagesFromApp` integration) and Task 6 (recap `DELETE { [P], LAURA }` / `DELETE { [Q], LAURA }`, the orphan's key reaching `deleteObjects`).
- An anonymous list (with or without `app`) must return only Images with a public placement in the App asked for: the `app` filter and the public/enterable test must hold on the same placement, or P (public in Laura, private in the Back office) leaks into `?app=BACK_OFFICE` for a visitor. Pinned in Task 3 (`"lists the Images visible in an App, or in any"`) and Task 6 (recap `GET ?app=BACK_OFFICE`).
- A list naming the same App twice must answer 400 before any write; let through, `createMany` hits the `ImageApp` primary key and answers 500 after the files are stored. Pinned in Task 4 (schema tests) and Task 6 (upload and PATCH 400 tests).

---

### Task 1: `ImageApp` table, `Image` without `app`, `0003` rewritten

**Files:**
- Modify: `packages/database/prisma/schema/image.prisma`
- Modify: `packages/database/changelog/changesets/0003-image-schema.sql`
- Test: `packages/database/liquibase/tests/changelog.integration.test.ts`

`auth.prisma` needs no change: `User.images Image[]` is the `uploadedBy` relation, untouched.

**Interfaces:**
- Produces: Prisma model `ImageApp { imageId, app: App, public: Boolean @default(false), createdAt }` with compound id `imageId_app`, cascade on Image delete, index `(app, imageId)`; `Image.apps: ImageApp[]`; `Image` has no `app` and an index `(createdAt, id)`. The Prisma client gains `prisma.imageApp`.

- [x] **Step 1: Write the failing changelog tests**

In `changelog.integration.test.ts` change the Image tables constant:

```ts
const IMAGE_TABLES = ["Image", "ImageApp"];
```

In `describe("changelog on an empty database")`, rename `"puts the Image table in image"` to `"puts the Image tables in image"` and add after it:

```ts
  it("places an Image in each App once, private by default, gone with the Image", async () => {
    await client.$executeRaw`
      INSERT INTO image."Image" (id, key, width, height, bytes, "blurDataUrl", alt)
      VALUES ('placed', 'placed.avif', 1, 1, 1, '', '{}')
    `;
    await client.$executeRaw`
      INSERT INTO image."ImageApp" ("imageId", app) VALUES ('placed', 'laura')
    `;
    // The key is (imageId, app): the same App twice is refused.
    await expect(
      client.$executeRaw`
        INSERT INTO image."ImageApp" ("imageId", app) VALUES ('placed', 'laura')
      `
    ).rejects.toThrow();
    expect(
      await client.$queryRaw<{ public: boolean }[]>`
        SELECT public FROM image."ImageApp"
      `
    ).toEqual([{ public: false }]);
    await client.$executeRaw`DELETE FROM image."Image" WHERE id = 'placed'`;
    expect(
      await client.$queryRaw<{ imageId: string }[]>`
        SELECT "imageId" FROM image."ImageApp"
      `
    ).toEqual([]);
  });

  it("keeps no App on Image itself", async () => {
    const columns = await client.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'image' AND table_name = 'Image'
        AND column_name = 'app'
    `;
    expect(columns).toEqual([]);
  });
```

In `describe("rolling back the schema move")`, inside `"puts every table back in public and drops the App schemas"`, after the `rollback-count` line add:

```ts
      // 0003's rollback drops ImageApp before Image, which it references.
      expect(await tablesIn(client, "image")).toEqual([]);
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
Expected: FAIL — `image` holds only `Image`; `relation "image.ImageApp" does not exist`.

- [x] **Step 3: Rewrite the Prisma schema**

`image.prisma`:

```prisma
// Images, each placed in one or more Apps (ADR 0013, ADR 0020).

model Image {
  id          String     @id @default(cuid(2))
  /// `<uuid>.avif` in the image bucket; carries no App, so placing it is an ImageApp row.
  key         String     @unique
  width       Int
  height      Int
  bytes       Int
  blurDataUrl String
  /// One alt per Language, `{ en, it }`; shape checked by imageAltSchema.
  alt         Json
  uploadedBy  String?
  user        User?      @relation(fields: [uploadedBy], references: [id], onDelete: SetNull)
  /// Every App the Image is in; never empty (the API refuses an empty list,
  /// and removing the last placement deletes the Image).
  apps        ImageApp[]
  createdAt   DateTime   @default(now())

  @@index([createdAt, id])
  @@schema("image")
}

/// One App an Image is placed in (ADR 0020).
model ImageApp {
  imageId   String
  app       App
  /// Shown to anyone in this App, signed in or not.
  public    Boolean  @default(false)
  createdAt DateTime @default(now())
  image     Image    @relation(fields: [imageId], references: [id], onDelete: Cascade)

  @@id([imageId, app])
  @@index([app, imageId])
  @@schema("image")
}
```

- [x] **Step 4: Rewrite `0003-image-schema.sql` in place**

Replace the whole file (the Laura drops and the Laura rollback lines are unchanged):

```sql
--liquibase formatted sql logicalFilePath:changesets/0003-image-schema.sql

--changeset isaia:0003-image-schema
--comment: Images move to a shared image schema (ADR 0013); Laura's Photo, Favorite, QuizQuestion and QuizAnswer are dropped with the code that used them. Rollback recreates them empty: the data is gone by design. An Image is placed in one or more Apps through ImageApp, public or private in each (ADR 0020).
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "image";

-- DropForeignKey
ALTER TABLE "laura"."Favorite" DROP CONSTRAINT "Favorite_photoId_fkey";

-- DropForeignKey
ALTER TABLE "laura"."Photo" DROP CONSTRAINT "Photo_uploadedBy_fkey";

-- DropForeignKey
ALTER TABLE "laura"."QuizAnswer" DROP CONSTRAINT "QuizAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "laura"."QuizQuestion" DROP CONSTRAINT "QuizQuestion_createdBy_fkey";

-- DropTable
DROP TABLE "laura"."Favorite";

-- DropTable
DROP TABLE "laura"."Photo";

-- DropTable
DROP TABLE "laura"."QuizAnswer";

-- DropTable
DROP TABLE "laura"."QuizQuestion";

-- CreateTable
CREATE TABLE "image"."Image" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "blurDataUrl" TEXT NOT NULL,
    "alt" JSONB NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image"."ImageApp" (
    "imageId" TEXT NOT NULL,
    "app" "auth"."App" NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageApp_pkey" PRIMARY KEY ("imageId","app")
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_key_key" ON "image"."Image"("key");

-- CreateIndex
CREATE INDEX "Image_createdAt_id_idx" ON "image"."Image"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ImageApp_app_imageId_idx" ON "image"."ImageApp"("app", "imageId");

-- AddForeignKey
ALTER TABLE "image"."Image" ADD CONSTRAINT "Image_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "auth"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image"."ImageApp" ADD CONSTRAINT "ImageApp_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "image"."Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback DROP TABLE "image"."ImageApp";
--rollback ALTER TABLE "image"."Image" DROP CONSTRAINT "Image_uploadedBy_fkey";
--rollback DROP TABLE "image"."Image";
--rollback DROP SCHEMA "image";
--rollback CREATE TABLE "laura"."Favorite" (
--rollback     "id" TEXT NOT NULL,
--rollback     "photoId" TEXT NOT NULL,
--rollback     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--rollback     CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE TABLE "laura"."Photo" (
--rollback     "id" TEXT NOT NULL,
--rollback     "url" TEXT NOT NULL,
--rollback     "thumbnailUrl" TEXT NOT NULL,
--rollback     "width" INTEGER NOT NULL,
--rollback     "height" INTEGER NOT NULL,
--rollback     "blurHash" TEXT NOT NULL,
--rollback     "caption" TEXT,
--rollback     "uploadedBy" TEXT NOT NULL,
--rollback     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--rollback     CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE TABLE "laura"."QuizAnswer" (
--rollback     "id" TEXT NOT NULL,
--rollback     "questionId" TEXT NOT NULL,
--rollback     "text" TEXT NOT NULL,
--rollback     "isCorrect" BOOLEAN NOT NULL DEFAULT false,
--rollback     "sortOrder" INTEGER NOT NULL,
--rollback     "imageBlurHash" TEXT,
--rollback     "imageThumbnailUrl" TEXT,
--rollback     "imageUrl" TEXT,
--rollback     CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE TABLE "laura"."QuizQuestion" (
--rollback     "id" TEXT NOT NULL,
--rollback     "text" TEXT NOT NULL,
--rollback     "createdBy" TEXT NOT NULL,
--rollback     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--rollback     "imageBlurHash" TEXT,
--rollback     "imageThumbnailUrl" TEXT,
--rollback     "imageUrl" TEXT,
--rollback     CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
--rollback );
--rollback CREATE UNIQUE INDEX "Favorite_photoId_key" ON "laura"."Favorite"("photoId" ASC);
--rollback CREATE INDEX "Photo_createdAt_idx" ON "laura"."Photo"("createdAt" ASC);
--rollback CREATE INDEX "Photo_uploadedBy_idx" ON "laura"."Photo"("uploadedBy" ASC);
--rollback CREATE INDEX "QuizQuestion_createdBy_idx" ON "laura"."QuizQuestion"("createdBy" ASC);
--rollback ALTER TABLE "laura"."Favorite" ADD CONSTRAINT "Favorite_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "laura"."Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback ALTER TABLE "laura"."Photo" ADD CONSTRAINT "Photo_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback ALTER TABLE "laura"."QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "laura"."QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--rollback ALTER TABLE "laura"."QuizQuestion" ADD CONSTRAINT "QuizQuestion_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

The names (`ImageApp_pkey`, `Image_createdAt_id_idx`, `ImageApp_app_imageId_idx`, `ImageApp_imageId_fkey`) are Prisma's defaults, so `db:drift` finds nothing to change.

- [x] **Step 5: Regenerate and rebuild the Local database**

The Local database recorded the old `0003` checksum, so it is rebuilt from zero (approved in the spec). The integration tests of Task 3 run against it, which is why this happens here and not at the end. `WITH (FORCE)` closes open connections; if a dev server you did not start is holding the database, leave it running.

```bash
pnpm db:generate
docker exec allonfire-postgres psql -U allonfire -d postgres \
  -c 'DROP DATABASE IF EXISTS allonfire WITH (FORCE)' -c 'CREATE DATABASE allonfire'
pnpm db:update
pnpm db:drift
pnpm db:seed
```

Expected: `db:update` applies `0000`–`0003`; `db:drift` exits 0 (`No difference detected.`); the seed prints its `Seeded: ...` lines (it sources `packages/database/.env`; never print that file's values).

- [x] **Step 6: Run the changelog tests to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
Expected: PASS, including the rollback describe (`CHANGESETS_AFTER_BASELINE` is still 3).

- [x] **Step 7: Format**

Run: `pnpm exec biome check --write packages/database/liquibase/tests/changelog.integration.test.ts`

---

### Task 2: Visibility rules

**Files:**
- Modify: `packages/database/src/features/auth/access/access.ts`
- Test: `packages/database/src/features/auth/access/tests/access.test.ts`

**Interfaces:**
- Consumes: `App` (runtime enum), `canEnterApp`, `canManageImage` (unchanged).
- Produces:
  - `type ImageLink = { app: App; public: boolean }`
  - `canSeeImageIn(user: AccessUser | null, link: ImageLink): boolean`
  - `canSeeImage(user: AccessUser | null, links: readonly ImageLink[]): boolean`
  - `canManageEverywhere(user: AccessUser, links: readonly ImageLink[]): boolean`
  - `enterableApps(user: AccessUser | null): App[]`

- [x] **Step 1: Write the failing tests**

In `access.test.ts` extend the import from `../access`:

```ts
import {
  accessUserFrom,
  canEnterApp,
  canManageEverywhere,
  canManageImage,
  canSeeImage,
  canSeeImageIn,
  enterableApps,
  hasRole,
  type ImageLink,
  roleIn,
} from "../access";
```

Add below `member`:

```ts
const LAURA_PRIVATE: ImageLink = { app: App.LAURA, public: false };
const LAURA_PUBLIC: ImageLink = { app: App.LAURA, public: true };
const OFFICE_PRIVATE: ImageLink = { app: App.BACK_OFFICE, public: false };
const everywhereAdmin = {
  memberships: [
    { app: App.LAURA, role: Role.ADMIN },
    { app: App.BACK_OFFICE, role: Role.ADMIN },
  ],
};
```

Add after the `canManageImage` describe:

```ts
describe("canSeeImageIn", () => {
  it("shows a public placement to anyone, signed in or not", () => {
    expect(canSeeImageIn(null, LAURA_PUBLIC)).toBe(true);
    expect(canSeeImageIn({ memberships: [] }, LAURA_PUBLIC)).toBe(true);
  });

  it("shows a private placement only to a User who enters its App", () => {
    expect(canSeeImageIn(member(App.LAURA, Role.VIEWER), LAURA_PRIVATE)).toBe(
      true
    );
    expect(
      canSeeImageIn(member(App.BACK_OFFICE, Role.ADMIN), LAURA_PRIVATE)
    ).toBe(false);
    expect(canSeeImageIn(null, LAURA_PRIVATE)).toBe(false);
  });

  it("hides a private placement from a User under the App's floor", () => {
    expect(
      canSeeImageIn(member(App.BACK_OFFICE, Role.USER), OFFICE_PRIVATE)
    ).toBe(false);
  });
});

describe("canSeeImage", () => {
  it("is true when any placement shows the Image", () => {
    const visitor = null;
    expect(canSeeImage(visitor, [OFFICE_PRIVATE, LAURA_PUBLIC])).toBe(true);
    expect(canSeeImage(visitor, [OFFICE_PRIVATE, LAURA_PRIVATE])).toBe(false);
    expect(
      canSeeImage(member(App.LAURA, Role.VIEWER), [
        OFFICE_PRIVATE,
        LAURA_PRIVATE,
      ])
    ).toBe(true);
  });
});

describe("canManageEverywhere", () => {
  it("needs the Admin Role in every App the Image is in", () => {
    const lauraAdmin = member(App.LAURA, Role.ADMIN);
    expect(canManageEverywhere(lauraAdmin, [LAURA_PUBLIC])).toBe(true);
    expect(canManageEverywhere(lauraAdmin, [LAURA_PUBLIC, OFFICE_PRIVATE])).toBe(
      false
    );
    expect(
      canManageEverywhere(everywhereAdmin, [LAURA_PUBLIC, OFFICE_PRIVATE])
    ).toBe(true);
  });
});

describe("enterableApps", () => {
  it("lists the Apps the User enters, none for a visitor", () => {
    expect(enterableApps(null)).toEqual([]);
    expect(enterableApps(member(App.LAURA, Role.VIEWER))).toEqual([App.LAURA]);
    expect(enterableApps(member(App.BACK_OFFICE, Role.USER))).toEqual([]);
    expect(enterableApps(everywhereAdmin)).toEqual([
      App.LAURA,
      App.BACK_OFFICE,
    ]);
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/auth/access`
Expected: FAIL — `canSeeImageIn is not a function` (none of the four exist yet).

- [x] **Step 3: Implement**

`access.ts`: the imports become

```ts
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../generated/prisma/enums";
import { APP_SETTINGS, type AppSettingsTable } from "./constants/app-settings";
import { ROLE_RANK } from "./constants/roles";
import { appSchema, roleSchema } from "./constants/schemas";
```

(`App` now comes from the enums as a value and a type; `./constants/schemas` keeps re-exporting the type for other readers.) Add after `canManageImage`:

```ts
/** One App an Image is placed in, and whether it shows there to anyone (ADR 0020). */
export type ImageLink = { app: App; public: boolean };

/**
 * Whether someone sees an Image through one placement: it is public, or they
 * enter its App. `null` is a visitor, not signed in.
 */
export const canSeeImageIn = (
  user: AccessUser | null,
  link: ImageLink
): boolean => link.public || (user !== null && canEnterApp(user, link.app));

/** Whether someone sees an Image anywhere: through any of its placements. */
export const canSeeImage = (
  user: AccessUser | null,
  links: readonly ImageLink[]
): boolean => links.some((link) => canSeeImageIn(user, link));

/**
 * Whether a User changes what every App of an Image sees (its alt, or
 * deleting it everywhere): Admin in every App it is placed in.
 */
export const canManageEverywhere = (
  user: AccessUser,
  links: readonly ImageLink[]
): boolean => links.every(({ app }) => canManageImage(user, app));

/** The Apps someone enters (`canEnterApp`); none for a visitor. */
export const enterableApps = (user: AccessUser | null): App[] =>
  user ? objectValues(App).filter((app) => canEnterApp(user, app)) : [];
```

`canManageImage`'s doc comment becomes `/** Whether a User places Images in \`app\`, takes them out or switches them public there: Admin in that App. */`.

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/auth/access`
Expected: PASS.

- [x] **Step 5: Format**

Run: `pnpm exec biome check --write packages/database/src/features/auth/access/access.ts packages/database/src/features/auth/access/tests/access.test.ts`

---

### Task 3: Image service on placements

**Files:**
- Modify: `packages/database/src/features/image/image.service.ts`
- Test: `packages/database/src/features/image/tests/image.integration.test.ts`

**Interfaces:**
- Consumes: `ImageLink` (Task 2); Prisma `ImageApp` (Task 1).
- Produces:
  - `ImageRecord = Omit<Image, "alt"> & { alt: ImageAlt; apps: ImageLink[] }` (apps ordered by App: `LAURA`, then `BACK_OFFICE`, the enum's declaration order); `NewImage` carries `apps`; `ImageChange = { id; apps?: ImageLink[] | undefined; alt?: ImageAlt | undefined }`.
  - `listImages({ app?: App | undefined; enterable: readonly App[]; cursor?; limit })`.
  - `linksOfImages(ids: readonly string[]): Promise<Map<string, ImageLink[]>>` (replaces `appsOfImages`).
  - `removeImagesFromApp(ids: readonly string[], app: App): Promise<string[]>`.
  - `createImages`, `getImage`, `updateImages`, `deleteImages` keep their names.

- [x] **Step 1: Write the failing tests**

Replace `image.integration.test.ts`:

```ts
// @module-tag integration
import { App } from "../../../../generated/prisma/enums";
import type { ImageLink } from "../../auth/access/access";
import { prisma } from "../../prisma/client";
import {
  createImages,
  deleteImages,
  getImage,
  type ImageCursor,
  ImageNotFoundError,
  linksOfImages,
  listImages,
  type NewImage,
  removeImagesFromApp,
  updateImages,
} from "../image.service";

// Runs against DATABASE_URL. Rows are keyed by KEY_PREFIX and removed after.
const USER_ID = "image-test-user";
const KEY_PREFIX = "image-test-";
const LAURA_PRIVATE: ImageLink = { app: App.LAURA, public: false };
const LAURA_PUBLIC: ImageLink = { app: App.LAURA, public: true };
const OFFICE_PRIVATE: ImageLink = { app: App.BACK_OFFICE, public: false };
const IN_LAURA: App[] = [App.LAURA];

const image = (
  key: string,
  apps: ImageLink[] = [LAURA_PRIVATE]
): NewImage => ({
  alt: { en: `${key} en`, it: `${key} it` },
  apps,
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1000,
  height: 600,
  key: `${KEY_PREFIX}${key}.avif`,
  uploadedBy: USER_ID,
  width: 800,
});

/** This file's Images among what a listing returned, in its order. */
const oursIn = (listed: readonly { id: string; key: string }[]) =>
  listed.filter(({ key }) => key.startsWith(KEY_PREFIX)).map(({ id }) => id);

const cleanUp = () =>
  prisma.image.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });

beforeEach(async () => {
  await cleanUp();
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: { email: "image-test@allonfire.test", id: USER_ID },
  });
});

afterAll(async () => {
  await cleanUp();
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("image.service", () => {
  it("creates each Image with its placements, ordered by App", async () => {
    const [both] = await createImages([
      image("both", [OFFICE_PRIVATE, LAURA_PUBLIC]),
    ]);
    expect(both?.apps).toEqual([LAURA_PUBLIC, OFFICE_PRIVATE]);
    expect((await getImage(both?.id ?? ""))?.apps).toEqual([
      LAURA_PUBLIC,
      OFFICE_PRIVATE,
    ]);
  });

  it("lists the Images visible in an App, or in any, newest first", async () => {
    // One call each, oldest first: Q (Laura, private), P (Laura public and
    // Back office private), R (Back office, private).
    const [q] = await createImages([image("q", [LAURA_PRIVATE])]);
    const [p] = await createImages([image("p", [LAURA_PUBLIC, OFFICE_PRIVATE])]);
    const [r] = await createImages([image("r", [OFFICE_PRIVATE])]);
    const seen = async (app: App | undefined, enterable: App[]) =>
      oursIn(await listImages({ app, enterable, limit: 100 }));

    expect(await seen(App.LAURA, [])).toEqual([p?.id]);
    expect(await seen(App.LAURA, IN_LAURA)).toEqual([p?.id, q?.id]);
    // P is public in Laura, not in the Back office: the filter and the
    // public test hold on the same placement.
    expect(await seen(App.BACK_OFFICE, [])).toEqual([]);
    expect(await seen(App.BACK_OFFICE, IN_LAURA)).toEqual([]);
    expect(await seen(App.BACK_OFFICE, [App.LAURA, App.BACK_OFFICE])).toEqual([
      r?.id,
      p?.id,
    ]);
    expect(await seen(undefined, [])).toEqual([p?.id]);
    expect(await seen(undefined, IN_LAURA)).toEqual([p?.id, q?.id]);
    expect(await seen(undefined, [App.LAURA, App.BACK_OFFICE])).toEqual([
      r?.id,
      p?.id,
      q?.id,
    ]);
  });

  it("pages with the last Image as the cursor", async () => {
    const created = await createImages([image("a"), image("b")]);
    const [last] = await listImages({
      app: App.LAURA,
      enterable: IN_LAURA,
      limit: 1,
    });
    if (!last) {
      throw new Error("nothing listed");
    }
    const [next] = await listImages({
      app: App.LAURA,
      cursor: { createdAt: last.createdAt, id: last.id },
      enterable: IN_LAURA,
      limit: 1,
    });
    expect(next?.id).not.toBe(last.id);
    expect(created.map(({ id }) => id)).toContain(next?.id);
  });

  it("keeps paging after the cursor's Image is deleted", async () => {
    // One batch: the rows may share createdAt, so the id breaks the tie.
    await createImages([image("p1"), image("p2"), image("p3")]);
    const ours = async (cursor?: ImageCursor) =>
      (
        await listImages({
          app: App.LAURA,
          cursor,
          enterable: IN_LAURA,
          limit: 100,
        })
      ).filter(({ key }) => key.startsWith(KEY_PREFIX));
    const [first, ...rest] = await ours();
    if (!first) {
      throw new Error("nothing listed");
    }
    await deleteImages([first.id]);
    const after = await ours({ createdAt: first.createdAt, id: first.id });
    expect(after.map(({ id }) => id)).toEqual(rest.map(({ id }) => id));
  });

  it("fills a Language missing from a stored alt with another's text", async () => {
    const [one] = await createImages([image("old")]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", fr: "La mer" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "The sea" });
  });

  it("keeps a stored empty alt empty, since it marks a decorative Image", async () => {
    const [one] = await createImages([image("deco")]);
    const id = one?.id ?? "";
    await prisma.image.update({
      data: { alt: { en: "The sea", it: "" } },
      where: { id },
    });
    expect((await getImage(id))?.alt).toEqual({ en: "The sea", it: "" });
  });

  it("replaces every placement on update, all or nothing", async () => {
    const [one] = await createImages([image("one", [LAURA_PRIVATE])]);
    const id = one?.id ?? "";
    await expect(
      updateImages([
        { apps: [OFFICE_PRIVATE], id },
        { apps: [OFFICE_PRIVATE], id: "missing" },
      ])
    ).rejects.toBeInstanceOf(ImageNotFoundError);
    expect((await getImage(id))?.apps).toEqual([LAURA_PRIVATE]);

    const [moved] = await updateImages([
      { apps: [OFFICE_PRIVATE, LAURA_PUBLIC], id },
    ]);
    expect(moved?.apps).toEqual([LAURA_PUBLIC, OFFICE_PRIVATE]);
  });

  it("keeps the placements when a change leaves apps out", async () => {
    const [one] = await createImages([image("kept", [LAURA_PUBLIC])]);
    const alt = { en: "new en", it: "new it" };
    const [changed] = await updateImages([{ alt, id: one?.id ?? "" }]);
    expect(changed?.apps).toEqual([LAURA_PUBLIC]);
    expect(changed?.alt).toEqual(alt);
  });

  it("names each Image's placements, or every id it does not know", async () => {
    const [one] = await createImages([
      image("links-of", [OFFICE_PRIVATE, LAURA_PUBLIC]),
    ]);
    const id = one?.id ?? "";
    expect(await linksOfImages([id, id])).toEqual(
      new Map([[id, [LAURA_PUBLIC, OFFICE_PRIVATE]]])
    );
    await expect(linksOfImages([id, "missing"])).rejects.toMatchObject({
      ids: ["missing"],
    });
  });

  it("applies a batch naming one Image twice in order, the last list winning", async () => {
    const [one] = await createImages([image("twice")]);
    const id = one?.id ?? "";
    const alt = { en: "new en", it: "new it" };
    await expect(
      updateImages([
        { apps: [LAURA_PUBLIC], id },
        { alt, apps: [OFFICE_PRIVATE], id },
      ])
    ).resolves.toHaveLength(2);
    expect((await getImage(id))?.apps).toEqual([OFFICE_PRIVATE]);
    expect(await deleteImages([id, id])).toEqual([one?.key]);
  });

  it("takes Images out of an App, deleting only those left in none", async () => {
    const [shared, alone] = await createImages([
      image("shared", [LAURA_PUBLIC, OFFICE_PRIVATE]),
      image("alone", [LAURA_PRIVATE]),
    ]);
    const sharedId = shared?.id ?? "";
    const aloneId = alone?.id ?? "";
    expect(await removeImagesFromApp([sharedId, aloneId], App.LAURA)).toEqual([
      alone?.key,
    ]);
    expect((await getImage(sharedId))?.apps).toEqual([OFFICE_PRIVATE]);
    expect(await getImage(aloneId)).toBeNull();
  });

  it("takes nothing out when one id is unknown", async () => {
    const [one] = await createImages([
      image("stays", [LAURA_PUBLIC, OFFICE_PRIVATE]),
    ]);
    const id = one?.id ?? "";
    await expect(
      removeImagesFromApp([id, "missing"], App.LAURA)
    ).rejects.toBeInstanceOf(ImageNotFoundError);
    expect((await getImage(id))?.apps).toEqual([LAURA_PUBLIC, OFFICE_PRIVATE]);
  });

  it("deletes every id or none, placements included, returning the keys", async () => {
    const [one] = await createImages([image("gone", [LAURA_PUBLIC, OFFICE_PRIVATE])]);
    const id = one?.id ?? "";
    await expect(deleteImages([id, "missing"])).rejects.toBeInstanceOf(
      ImageNotFoundError
    );
    expect(await getImage(id)).not.toBeNull();
    expect(await deleteImages([id])).toEqual([one?.key]);
    expect(await getImage(id)).toBeNull();
    expect(await prisma.imageApp.count({ where: { imageId: id } })).toBe(0);
  });

  it("keeps an Image when its uploader is deleted", async () => {
    const [one] = await createImages([image("orphan")]);
    await prisma.user.delete({ where: { id: USER_ID } });
    expect((await getImage(one?.id ?? ""))?.uploadedBy).toBeNull();
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/image`
Expected: FAIL — `linksOfImages` and `removeImagesFromApp` are not exported; `createImages` passes `apps` to Prisma as a plain list (`Invalid prisma.image.create() invocation`).

- [x] **Step 3: Implement**

Replace `image.service.ts`:

```ts
import type { Image, Prisma } from "../../../generated/prisma/client";
import type { App } from "../../../generated/prisma/enums";
import type { ImageLink } from "../auth/access/access";
import { prisma } from "../prisma/client";
import { type ImageAlt, readAlt } from "./alt";

/** Where the last page ended: its last Image's sort key, not a row reference. */
export type ImageCursor = { createdAt: Date; id: string };

/** An Image and every App it is placed in, ordered by App (ADR 0020). */
export type ImageRecord = Omit<Image, "alt"> & {
  alt: ImageAlt;
  apps: ImageLink[];
};
export type NewImage = Omit<ImageRecord, "id" | "createdAt">;
export type ImageChange = {
  id: string;
  /** Every placement the Image keeps, replacing the ones it has; never empty. */
  apps?: ImageLink[] | undefined;
  alt?: ImageAlt | undefined;
};

export class ImageNotFoundError extends Error {
  readonly ids: string[];
  constructor(ids: string[]) {
    super(`Unknown Image ids: ${ids.join(", ")}`);
    this.name = "ImageNotFoundError";
    this.ids = ids;
  }
}

/** Every read brings the Image's placements, ordered by App. */
const withLinks = {
  apps: { orderBy: { app: "asc" }, select: { app: true, public: true } },
} as const satisfies Prisma.ImageInclude;

type ImageRow = Prisma.ImageGetPayload<{ include: typeof withLinks }>;

// `alt` is a Json column; parsing narrows it instead of casting.
const toRecord = (row: ImageRow): ImageRecord => ({
  ...row,
  alt: readAlt(row.alt),
});

/** Throws unless every id exists; duplicates in `ids` count once. */
async function assertAllExist(
  tx: Prisma.TransactionClient,
  ids: readonly string[]
) {
  const unique = [...new Set(ids)];
  const found = await tx.image.findMany({
    select: { apps: withLinks.apps, id: true, key: true },
    where: { id: { in: unique } },
  });
  const foundIds = new Set(found.map(({ id }) => id));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ImageNotFoundError(missing);
  }
  return found;
}

/** Each Image with its placements, all in one transaction. */
export async function createImages(images: NewImage[]): Promise<ImageRecord[]> {
  const rows = await prisma.$transaction(
    images.map(({ apps, ...data }) =>
      prisma.image.create({
        data: { ...data, apps: { create: apps } },
        include: withLinks,
      })
    )
  );
  return rows.map(toRecord);
}

/**
 * The Images visible in `app` (in any App when it is left out) to someone
 * who enters `enterable`: placed there, and that same placement public or in
 * an App they enter. Newest upload first, not the date it entered the App, so
 * the cursor keeps one shape; the cursor holds values, not a row, so
 * deleting the Image it came from does not end the paging.
 */
export async function listImages({
  app,
  cursor,
  enterable,
  limit,
}: {
  app?: App | undefined;
  cursor?: ImageCursor | undefined;
  enterable: readonly App[];
  limit: number;
}): Promise<ImageRecord[]> {
  const rows = await prisma.image.findMany({
    include: withLinks,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    where: {
      apps: {
        some: {
          ...(app && { app }),
          OR: [{ public: true }, { app: { in: [...enterable] } }],
        },
      },
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

/** Each Image's placements, by id; throws `ImageNotFoundError` unless every id exists. */
export async function linksOfImages(
  ids: readonly string[]
): Promise<Map<string, ImageLink[]>> {
  const found = await assertAllExist(prisma, ids);
  return new Map(found.map(({ apps, id }) => [id, apps]));
}

export async function getImage(id: string): Promise<ImageRecord | null> {
  const row = await prisma.image.findUnique({
    include: withLinks,
    where: { id },
  });
  return row && toRecord(row);
}

/** One change, its statements in order: `apps` replaces every placement. */
const applyChange = async (
  tx: Prisma.TransactionClient,
  { alt, apps, id }: ImageChange
) => {
  if (apps) {
    await tx.imageApp.deleteMany({ where: { imageId: id } });
    await tx.imageApp.createMany({
      data: apps.map((link) => ({ ...link, imageId: id })),
    });
  }
  return tx.image.update({
    data: { ...(alt && { alt }) },
    include: withLinks,
    where: { id },
  });
};

/**
 * All or nothing: an unknown id rolls the whole batch back. One change at a
 * time (a reduce chain): a batch may name the same Image twice, and two
 * placement rewrites of one Image at once would collide on its key.
 */
export function updateImages(changes: ImageChange[]): Promise<ImageRecord[]> {
  return prisma.$transaction(async (tx) => {
    await assertAllExist(
      tx,
      changes.map(({ id }) => id)
    );
    const rows = await changes.reduce<Promise<ImageRow[]>>(
      async (done, change) => {
        const list = await done;
        list.push(await applyChange(tx, change));
        return list;
      },
      Promise.resolve([])
    );
    return rows.map(toRecord);
  });
}

/**
 * Takes the Images out of `app`, all or nothing, and deletes those left in no
 * App; returns their keys so the caller removes the files. An Image still
 * placed elsewhere keeps its row and its file.
 */
export function removeImagesFromApp(
  ids: readonly string[],
  app: App
): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    await assertAllExist(tx, ids);
    await tx.imageApp.deleteMany({ where: { app, imageId: { in: [...ids] } } });
    const orphans = await tx.image.findMany({
      select: { id: true, key: true },
      where: { apps: { none: {} }, id: { in: [...ids] } },
    });
    await tx.image.deleteMany({
      where: { id: { in: orphans.map(({ id }) => id) } },
    });
    return orphans.map(({ key }) => key);
  });
}

/** All or nothing, everywhere; returns the deleted keys so the caller removes the files. */
export function deleteImages(ids: string[]): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    const found = await assertAllExist(tx, ids);
    await tx.image.deleteMany({ where: { id: { in: ids } } });
    return found.map(({ key }) => key);
  });
}
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/database exec vitest run src/features/image && pnpm --filter @allonfire/database test && pnpm --filter @allonfire/database check-types`
Expected: PASS, no type errors in `packages/database`.

- [x] **Step 5: Format**

Run: `pnpm exec biome check --write packages/database/src/features/image/image.service.ts packages/database/src/features/image/tests/image.integration.test.ts`

---

### Task 4: Image body, request schemas, module deps

**Files:**
- Modify: `packages/storage/src/features/image/constants/schemas.ts`
- Modify: `packages/storage/src/features/image/hono/constants/schemas.ts`
- Modify: `packages/storage/src/features/image/hono/utils/deps.ts`
- Modify: `packages/storage/src/features/image/hono/tests/stub-image-deps.ts`
- Test: `packages/storage/src/features/image/tests/image-body.test-d.ts`
- Test: `packages/storage/src/features/image/hono/tests/schemas.test.ts` (new)

`packages/ui/src/components/aof-image.tsx` needs no change: `AOFStorageImageSource` picks `alt`, `blurDataUrl`, `height`, `key` and `width`, never `app`.

**Interfaces:**
- Consumes: `ImageRecord`, `linksOfImages`, `removeImagesFromApp` (Task 3); `ImageLink` (Task 2).
- Produces:
  - `imageLinkSchema = z.object({ app: appSchema, public: z.boolean() })`; `imageBodySchema.apps: z.array(imageLinkSchema)` replaces `app`.
  - `listQuerySchema.app` optional; `uploadItemSchema.apps` (min 1, each App once, `public` defaulting to `false`); `patchBodySchema` items `{ id, alt?, apps? }` (`apps` min 1, each App once, `public` optional); `deleteBodySchema = { ids, app? }`; `type PatchChange`.
  - `ImageDeps.linksOf: typeof linksOfImages`, `ImageDeps.removeImagesFromApp: typeof removeImagesFromApp`; `appsOf` gone.
  - `imageRecord()` defaults to `apps: [{ app: App.LAURA, public: false }]`; `stubImageDeps` stubs `linksOf` and `removeImagesFromApp`.

- [x] **Step 1: Write the failing tests**

`image-body.test-d.ts`, add the import and a second test:

```ts
import type { ImageLink } from "@allonfire/database/features/auth/access/access";
```

```ts
test("a placement travels as the access rules read it", () => {
  expectTypeOf<ImageBody["apps"][number]>().toEqualTypeOf<ImageLink>();
});
```

Create `hono/tests/schemas.test.ts`:

```ts
// @module-tag unit
import { App } from "@allonfire/database/enums";
import {
  deleteBodySchema,
  listQuerySchema,
  patchBodySchema,
  uploadItemSchema,
} from "../constants/schemas";

const ALT = { en: "The sea", it: "Il mare" };
const LAURA_TWICE = [{ app: App.LAURA }, { app: App.LAURA, public: true }];

describe("uploadItemSchema", () => {
  it("makes a placement sent without `public` private, and keeps one sent public", () => {
    expect(
      uploadItemSchema.parse({
        alt: ALT,
        apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE, public: true }],
      }).apps
    ).toEqual([
      { app: App.LAURA, public: false },
      { app: App.BACK_OFFICE, public: true },
    ]);
  });

  it("refuses an Image in no App, or in one App twice", () => {
    expect(uploadItemSchema.safeParse({ alt: ALT, apps: [] }).success).toBe(
      false
    );
    expect(
      uploadItemSchema.safeParse({ alt: ALT, apps: LAURA_TWICE }).success
    ).toBe(false);
  });

  it("no longer takes a single `app`", () => {
    expect(
      uploadItemSchema.safeParse({ alt: ALT, app: App.LAURA }).success
    ).toBe(false);
  });
});

describe("patchBodySchema", () => {
  it("leaves a `public` that was not sent out, for the route to resolve", () => {
    expect(
      patchBodySchema.parse([{ apps: [{ app: App.LAURA }], id: "image-1" }])
    ).toEqual([{ apps: [{ app: App.LAURA }], id: "image-1" }]);
  });

  it("takes a change without apps, but refuses an empty list or an App twice", () => {
    expect(patchBodySchema.safeParse([{ alt: ALT, id: "image-1" }]).success).toBe(
      true
    );
    expect(
      patchBodySchema.safeParse([{ apps: [], id: "image-1" }]).success
    ).toBe(false);
    expect(
      patchBodySchema.safeParse([{ apps: LAURA_TWICE, id: "image-1" }]).success
    ).toBe(false);
  });
});

describe("deleteBodySchema", () => {
  it("names an App to take the Images out of, or none to delete them everywhere", () => {
    expect(
      deleteBodySchema.parse({ app: App.LAURA, ids: ["image-1"] })
    ).toEqual({ app: App.LAURA, ids: ["image-1"] });
    expect(deleteBodySchema.parse({ ids: ["image-1"] })).toEqual({
      ids: ["image-1"],
    });
    expect(
      deleteBodySchema.safeParse({ app: "back-office", ids: ["image-1"] })
        .success
    ).toBe(false);
  });
});

describe("listQuerySchema", () => {
  it("lists every App's visible Images when no App is named", () => {
    expect(listQuerySchema.parse({})).toEqual({ limit: 30 });
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono/tests/schemas.test.ts`
Expected: FAIL — `uploadItemSchema` still wants `app`; `listQuerySchema` requires `app`; `deleteBodySchema` strips the unknown `app` and `patchBodySchema` the unknown `apps`, so the `toEqual`s miss them.

- [x] **Step 3: Implement the Image body**

`constants/schemas.ts` (module root):

```ts
import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { imageAltSchema } from "@allonfire/database/features/image/alt";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import { z } from "zod";

/** One App an Image is placed in, and whether it shows there to anyone (ADR 0020). */
export const imageLinkSchema = z.object({
  app: appSchema,
  public: z.boolean(),
});

/**
 * One Image as it travels: the stored record, minus what only the server
 * reads (`bytes`, `uploadedBy`), with `createdAt` as ISO text. `apps` lists
 * every placement, the ones the caller cannot see too: a PATCH sends the
 * full new list, so an Admin of one App needs the others to keep them. The
 * Image module answers it; a UI picks its props from it.
 */
export const imageBodySchema = z.object({
  alt: imageAltSchema,
  apps: z.array(imageLinkSchema),
  blurDataUrl: z.string(),
  createdAt: z.iso.datetime(),
  height: z.number().int(),
  id: z.string(),
  key: z.string(),
  width: z.number().int(),
});
export type ImageBody = z.infer<typeof imageBodySchema>;

export const toImageBody = (image: ImageRecord): ImageBody => ({
  alt: image.alt,
  apps: image.apps,
  blurDataUrl: image.blurDataUrl,
  createdAt: image.createdAt.toISOString(),
  height: image.height,
  id: image.id,
  key: image.key,
  width: image.width,
});
```

- [x] **Step 4: Implement the request schemas**

`hono/constants/schemas.ts`:

```ts
import { jsonFrom } from "@allonfire/core/shared/utils/json";
import type { App } from "@allonfire/database/enums";
import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import { imageAltSchema } from "@allonfire/database/features/image/alt";
import { z } from "zod";
import { imageBodySchema } from "../../constants/schemas";
import { cursorSchema } from "../utils/cursor";
import {
  DEFAULT_LIST_LIMIT,
  MAX_BATCH,
  MAX_FILES_PER_UPLOAD,
  MAX_LIST_LIMIT,
} from "./limits";

export const imageListBodySchema = z.object({
  images: z.array(imageBodySchema),
  /** Pass as `cursor` for the next page; null on the last page. */
  nextCursor: z.string().nullable(),
});
export type ImageListBody = z.infer<typeof imageListBodySchema>;

/** The Images visible in `app`, or in any App when it is left out. */
export const listQuerySchema = z.object({
  app: appSchema.optional(),
  cursor: cursorSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_LIST_LIMIT)
    .default(DEFAULT_LIST_LIMIT),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

/** An Image is placed in an App once: a repeat is the client's 400, not a key clash. */
const eachAppOnce = (links: readonly { app: App }[]) =>
  new Set(links.map(({ app }) => app)).size === links.length;
const EACH_APP_ONCE = "names an App more than once";

/** Upload: at least one App, each once; a placement sent without `public` is private. */
const uploadLinksSchema = z
  .array(z.object({ app: appSchema, public: z.boolean().default(false) }))
  .min(1)
  .refine(eachAppOnce, EACH_APP_ONCE);

/**
 * PATCH: the Image's full new list, at least one App, each once. A `public`
 * left out is the route's to resolve against the current placements.
 */
const patchLinksSchema = z
  .array(z.object({ app: appSchema, public: z.boolean().optional() }))
  .min(1)
  .refine(eachAppOnce, EACH_APP_ONCE);

/** One entry per uploaded file, in the same order. */
export const uploadItemSchema = z.object({
  alt: imageAltSchema,
  apps: uploadLinksSchema,
});

/**
 * The form as one list: each file with its own entry. A count mismatch is the
 * client's 400, so no later code needs a fallback for a missing entry.
 */
export const uploadFormSchema = z
  .object({
    file: z.array(z.instanceof(File)).min(1).max(MAX_FILES_PER_UPLOAD),
    meta: jsonFrom("meta must be JSON").pipe(z.array(uploadItemSchema)),
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

export const patchBodySchema = z
  .array(
    z.object({
      alt: imageAltSchema.optional(),
      apps: patchLinksSchema.optional(),
      id: z.string().min(1),
    })
  )
  .min(1)
  .max(MAX_BATCH);
export type PatchChange = z.output<typeof patchBodySchema>[number];

export const deleteBodySchema = z.object({
  /** Takes the Images out of this App only; left out, deletes them everywhere. */
  app: appSchema.optional(),
  ids: z.array(z.string().min(1)).min(1).max(MAX_BATCH),
});
```

- [x] **Step 5: Implement the deps and the stubs**

`hono/utils/deps.ts`:

```ts
import type {
  createImages,
  deleteImages,
  getImage,
  linksOfImages,
  listImages,
  removeImagesFromApp,
  updateImages,
} from "@allonfire/database/features/image/image.service";
import type {
  deleteImageObjects,
  putImageObject,
} from "../../objects/image-objects";
import type { prepareImage } from "../../prepare/prepare-image";

/** What the Image module needs; the host passes the real ones, tests stubs. */
export type ImageDeps = {
  prepare: typeof prepareImage;
  putObject: typeof putImageObject;
  deleteObjects: typeof deleteImageObjects;
  createImages: typeof createImages;
  listImages: typeof listImages;
  getImage: typeof getImage;
  updateImages: typeof updateImages;
  deleteImages: typeof deleteImages;
  /** Takes Images out of one App, deleting those left in none; returns their keys. */
  removeImagesFromApp: typeof removeImagesFromApp;
  /** Each Image's placements, to check the caller sees and manages it before writing. */
  linksOf: typeof linksOfImages;
  /** Where best-effort cleanup failures go; pino's shape. */
  log: { warn: (details: object, message: string) => void };
};
```

`hono/tests/stub-image-deps.ts`: in `imageRecord` replace `app: App.LAURA,` with

```ts
  apps: [{ app: App.LAURA, public: false }],
```

and `stubImageDeps` becomes:

```ts
export const stubImageDeps = (
  overrides: Partial<ImageDeps> = {}
): ImageDeps => ({
  createImages: unexpected("createImages"),
  deleteImages: unexpected("deleteImages"),
  deleteObjects: unexpected("deleteObjects"),
  getImage: unexpected("getImage"),
  linksOf: unexpected("linksOf"),
  listImages: unexpected("listImages"),
  log: { warn: () => undefined },
  prepare: unexpected("prepare"),
  putObject: unexpected("putObject"),
  removeImagesFromApp: unexpected("removeImagesFromApp"),
  updateImages: unexpected("updateImages"),
  ...overrides,
});
```

- [x] **Step 6: Run them to verify they pass**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono/tests/schemas.test.ts`
Expected: PASS.

Run: `pnpm --filter @allonfire/storage exec tsc --noEmit 2>&1 | rg "image-body|constants/schemas|stub-image-deps|utils/deps"`
Expected: no output. (`tsc` still reports `routes/handlers.ts` and the read and write tests: Tasks 5 and 6 rewrite them.)

- [x] **Step 7: Format**

Run: `pnpm exec biome check --write packages/storage/src/features/image/constants/schemas.ts packages/storage/src/features/image/hono/constants/schemas.ts packages/storage/src/features/image/hono/utils/deps.ts packages/storage/src/features/image/hono/tests/stub-image-deps.ts packages/storage/src/features/image/tests/image-body.test-d.ts packages/storage/src/features/image/hono/tests/schemas.test.ts`

---

### Task 5: Reads need no Session

**Files:**
- Create: `packages/storage/src/features/image/hono/routes/read-handlers.ts`
- Modify: `packages/storage/src/features/image/hono/routes/handlers.ts` (reads cut out; the file goes in Task 6)
- Modify: `packages/storage/src/features/image/hono/routes/index.ts`
- Modify: `packages/storage/package.json` (exports)
- Test: `packages/storage/src/features/image/hono/tests/read.test.ts`

**Interfaces:**
- Consumes: `enterableApps`, `canSeeImage` (Task 2); `listQuerySchema` with optional `app`, `ImageRecord.apps` (Tasks 3, 4).
- Produces: `listHandlers(deps)`, `getHandlers(deps)` in `read-handlers.ts`, unguarded; the list calls `deps.listImages({ ...query, enterable })`.

- [x] **Step 1: Write the failing tests**

Replace `read.test.ts`:

```ts
// @module-tag unit
import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { App, Role } from "@allonfire/database/enums";
import { IMAGE_PATH } from "../../constants/paths";
import { imageBodySchema } from "../../constants/schemas";
import { imageListBodySchema } from "../constants/schemas";
import { encodeCursor } from "../utils/cursor";
import type { ImageDeps } from "../utils/deps";
import { imageRecord } from "./stub-image-deps";
import { errorOf, testHost } from "./test-host";

const app = testHost;
const lauraUser = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.VIEWER }],
});
const otherAppUser = sessionFor({ memberships: [] });
const visitor = null;
const LAURA_PRIVATE = { app: App.LAURA, public: false };
const LAURA_PUBLIC = { app: App.LAURA, public: true };
const noImages = () => vi.fn<ImageDeps["listImages"]>(async () => []);

describe("GET /v1/images", () => {
  it("lists the Images visible in the App with the next cursor", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => [
      imageRecord(),
    ]);
    const res = await app(lauraUser, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}&limit=1`
    );
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [App.LAURA],
      limit: 1,
    });
    expect(await res.json()).toEqual({
      images: [
        {
          alt: { en: "The sea", it: "Il mare" },
          apps: [LAURA_PRIVATE],
          blurDataUrl: "data:image/webp;base64,AAAA",
          createdAt: "2026-10-01T10:00:00.000Z",
          height: 600,
          id: "image-1",
          key: "0b9a0c3e-0000-4000-8000-000000000001.webp",
          width: 800,
        },
      ],
      nextCursor: encodeCursor({
        createdAt: new Date("2026-10-01T10:00:00.000Z"),
        id: "image-1",
      }),
    });
  });

  it("has no next cursor on a short page", async () => {
    const res = await app(lauraUser, {
      listImages: async () => [imageRecord()],
    }).request(`${IMAGE_PATH}?app=${App.LAURA}`);
    expect(imageListBodySchema.parse(await res.json()).nextCursor).toBeNull();
  });

  it("asks for the Images visible in any App when none is named", async () => {
    const listImages = noImages();
    const res = await app(lauraUser, { listImages }).request(IMAGE_PATH);
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      enterable: [App.LAURA],
      limit: 30,
    });
  });

  it("passes every App an Admin of every App enters", async () => {
    const listImages = noImages();
    await app(sessionFor({ memberships: membershipsIn(Role.ADMIN) }), {
      listImages,
    }).request(`${IMAGE_PATH}?app=${App.BACK_OFFICE}`);
    expect(listImages).toHaveBeenCalledWith({
      app: App.BACK_OFFICE,
      enterable: [App.LAURA, App.BACK_OFFICE],
      limit: 30,
    });
  });

  it("leaves out an App whose floor the User's Role is under", async () => {
    const listImages = noImages();
    await app(
      sessionFor({ memberships: [{ app: App.BACK_OFFICE, role: Role.USER }] }),
      { listImages }
    ).request(`${IMAGE_PATH}?app=${App.BACK_OFFICE}`);
    expect(listImages).toHaveBeenCalledWith({
      app: App.BACK_OFFICE,
      enterable: [],
      limit: 30,
    });
  });

  it("lists for a visitor without a Session, who enters no App", async () => {
    const listImages = noImages();
    const res = await app(visitor, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}`
    );
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [],
      limit: 30,
    });
  });

  it("never answers 403: a User who cannot enter the App gets its public Images", async () => {
    const listImages = noImages();
    const res = await app(otherAppUser, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}`
    );
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [],
      limit: 30,
    });
  });

  it("passes the decoded cursor to the service", async () => {
    const listImages = noImages();
    const cursor = {
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
      id: "image-1",
    };
    await app(lauraUser, { listImages }).request(
      `${IMAGE_PATH}?app=${App.LAURA}&cursor=${encodeCursor(cursor)}`
    );
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      cursor,
      enterable: [App.LAURA],
      limit: 30,
    });
  });

  it.each([
    ["not base64url JSON", "%%%"],
    ["JSON of the wrong shape", Buffer.from("{}").toString("base64url")],
  ])("refuses a cursor that is %s", async (_, cursor) => {
    const res = await app(lauraUser, {}).request(
      `${IMAGE_PATH}?app=${App.LAURA}&cursor=${cursor}`
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });

  it("refuses app=ALL with a validation problem", async () => {
    const res = await app(lauraUser, {}).request(`${IMAGE_PATH}?app=ALL`);
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });

  it("reports each invalid field", async () => {
    const res = await app(lauraUser, {}).request(
      `${IMAGE_PATH}?app=ALL&limit=0`
    );
    expect(res.status).toBe(400);
    const body = await errorOf(res);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors?.map(({ path }) => path).sort()).toEqual([
      "app",
      "limit",
    ]);
    expect(body.values).toEqual({ count: 2 });
  });
});

describe("GET /v1/images/:id", () => {
  it("returns an Image of an App the User enters", async () => {
    const res = await app(lauraUser, {
      getImage: async () => imageRecord(),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(200);
    expect(imageBodySchema.parse(await res.json()).apps).toEqual([
      LAURA_PRIVATE,
    ]);
  });

  it("returns a public Image to a visitor without a Session", async () => {
    const res = await app(visitor, {
      getImage: async () => imageRecord({ apps: [LAURA_PUBLIC] }),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(200);
  });

  it("answers 404 to a visitor for an Image public nowhere", async () => {
    const res = await app(visitor, {
      getImage: async () => imageRecord(),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("NOT_FOUND");
  });

  it("answers 404 for another App's Image, as if it did not exist", async () => {
    const res = await app(otherAppUser, {
      getImage: async () => imageRecord(),
    }).request(`${IMAGE_PATH}/image-1`);
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("NOT_FOUND");
  });

  it("answers 404 for an unknown id", async () => {
    const res = await app(lauraUser, { getImage: async () => null }).request(
      `${IMAGE_PATH}/missing`
    );
    expect(res.status).toBe(404);
    expect((await errorOf(res)).code).toBe("NOT_FOUND");
  });
});
```

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono/tests/read.test.ts`
Expected: FAIL — a visitor gets 401; `listImages` is called without `enterable`; the 403 to `otherAppUser` is still sent.

- [x] **Step 3: Implement the read handlers**

Create `routes/read-handlers.ts`:

```ts
import { AUTH_VAR } from "@allonfire/auth/features/hono/constants/variables";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import {
  canSeeImage,
  enterableApps,
} from "@allonfire/database/features/auth/access/access";
import { sValidator } from "@hono/standard-validator";
import { createFactory } from "hono/factory";
import { toImageBody } from "../../constants/schemas";
import {
  type ImageListBody,
  idParamSchema,
  listQuerySchema,
} from "../constants/schemas";
import { encodeCursor } from "../utils/cursor";
import type { ImageDeps } from "../utils/deps";
import { notFound } from "../utils/errors";
import { throwOnInvalid } from "../utils/validation";
import { getRoute, listRoute } from "./routes";

const factory = createFactory<AuthEnv>();

/**
 * The Images visible in `app`, or in any App when it is left out (ADR 0020).
 * No Session needed and nobody is refused: a visitor, or a User who cannot
 * enter `app`, gets its public Images, so an App can have public pages.
 */
export const listHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    listRoute,
    sValidator("query", listQuerySchema, throwOnInvalid),
    async (c) => {
      const query = c.req.valid("query");
      const images = await deps.listImages({
        ...query,
        enterable: enterableApps(c.get(AUTH_VAR.SESSION)?.user ?? null),
      });
      const last = images.at(-1);
      const body = {
        images: images.map(toImageBody),
        nextCursor:
          images.length === query.limit && last ? encodeCursor(last) : null,
      } satisfies ImageListBody;
      return c.json(body, HTTP_STATUS.OK);
    }
  );

/** One Image, when it is visible in any App; no Session needed. */
export const getHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    getRoute,
    sValidator("param", idParamSchema, throwOnInvalid),
    async (c) => {
      const image = await deps.getImage(c.req.valid("param").id);
      const user = c.get(AUTH_VAR.SESSION)?.user ?? null;
      // Hidden is missing: a 403 would tell someone who cannot see it that the id exists.
      if (!(image && canSeeImage(user, image.apps))) {
        throw notFound();
      }
      return c.json(toImageBody(image), HTTP_STATUS.OK);
    }
  );
```

In `routes/handlers.ts` delete `listHandlers` and `getHandlers` (the two exports between `const factory` and `const LOG_MESSAGE`) and the imports only they used: `canEnterApp`; `forbidden` and `notFound` from `../utils/errors`; `type ImageListBody`, `idParamSchema`, `listQuerySchema` from `../constants/schemas`; the whole `../utils/cursor` import; `getRoute`, `listRoute` from `./routes`.

`routes/index.ts`:

```ts
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import type { ImageDeps } from "../utils/deps";
import { deleteHandlers, patchHandlers, uploadHandlers } from "./handlers";
import { getHandlers, listHandlers } from "./read-handlers";

/**
 * The Image module (ADR 0015): mount it where the host wants Images. It
 * reads the Session the host's sessionLoader set: reads work without one,
 * writes answer 401 (ADR 0020).
 */
export const imageRoutes = (deps: ImageDeps) =>
  new Hono<AuthEnv>()
    .get("/", ...listHandlers(deps))
    .get("/:id", ...getHandlers(deps))
    .post("/", ...uploadHandlers(deps))
    .patch("/", ...patchHandlers(deps))
    .delete("/", ...deleteHandlers(deps));
```

`packages/storage/package.json` exports, after the `routes/handlers` line:

```json
    "./features/image/hono/routes/read-handlers": "./src/features/image/hono/routes/read-handlers.ts",
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono/tests/read.test.ts`
Expected: PASS.

- [x] **Step 5: Format**

Run: `pnpm exec biome check --write packages/storage/src/features/image/hono/routes/read-handlers.ts packages/storage/src/features/image/hono/routes/handlers.ts packages/storage/src/features/image/hono/routes/index.ts packages/storage/package.json packages/storage/src/features/image/hono/tests/read.test.ts`

---

### Task 6: Writes per placement, and the recap

**Files:**
- Create: `packages/storage/src/features/image/hono/utils/access.ts`
- Create: `packages/storage/src/features/image/hono/utils/upload-batch.ts`
- Create: `packages/storage/src/features/image/hono/routes/write-handlers.ts`
- Delete: `packages/storage/src/features/image/hono/routes/handlers.ts`
- Modify: `packages/storage/src/features/image/hono/utils/errors.ts`
- Modify: `packages/storage/src/features/image/hono/routes/index.ts`
- Modify: `packages/storage/package.json` (exports)
- Test: `packages/storage/src/features/image/hono/tests/write.test.ts`
- Test: `packages/storage/src/features/image/hono/tests/recap.test.ts` (new)

**Interfaces:**
- Consumes: `canSeeImage`, `canManageImage`, `canManageEverywhere`, `ImageLink` (Task 2); `PatchChange`, `deleteBodySchema`, `ImageDeps.linksOf`, `ImageDeps.removeImagesFromApp` (Task 4); `ImageChange` (Task 3).
- Produces:
  - `utils/access.ts`: `assertVisible(user, links, app?)` (404), `assertManages(user, apps)` (403), `assertManagesEverywhere(user, links)` (403), `authorisePatch(user, current, changes): ImageChange[]`.
  - `utils/upload-batch.ts`: `prepareAll`, `storeAll`, `UPLOAD_BUDGET`, `uploadTimeout`, moved unchanged from `handlers.ts`.
  - `routes/write-handlers.ts`: `uploadHandlers`, `patchHandlers`, `deleteHandlers`.
  - `utils/errors.ts` keeps `notFound`, `forbidden`, `tooLarge`, `notFoundOnUnknownIds`; its old `assertManages` is gone.

- [x] **Step 1: Write the failing write tests**

In `write.test.ts` replace everything from the first line through the end of `describe("POST /v1/images", ...)` (the describe that ends before `describe("POST /v1/images refusals and failures"`) with:

```ts
// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import type { ImageLink } from "@allonfire/database/features/auth/access/access";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { z } from "zod";
import { IMAGE_PATH } from "../../constants/paths";
import { imageBodySchema } from "../../constants/schemas";
import { MAX_INPUT_MEGAPIXELS } from "../../prepare/constants/limits";
import {
  ImageTooLargeError,
  UnsupportedImageError,
} from "../../prepare/prepare-image";
import {
  MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  UPLOAD_TIMEOUT_MS,
} from "../constants/limits";
import type { ImageDeps } from "../utils/deps";
import { imageRecord } from "./stub-image-deps";
import { errorOf, testHost } from "./test-host";

const admin = sessionFor({ memberships: membershipsIn(Role.ADMIN) });
const user = sessionFor({ memberships: membershipsIn(Role.USER) });
/** An Admin of Laura only. */
const lauraAdmin = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
});
/** A User of Laura, below Admin. */
const lauraUser = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.USER }],
});
/** An Admin of the Back office only. */
const officeAdmin = sessionFor({
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
});
const LAURA_PRIVATE: ImageLink = { app: App.LAURA, public: false };
const LAURA_PUBLIC: ImageLink = { app: App.LAURA, public: true };
const OFFICE_PRIVATE: ImageLink = { app: App.BACK_OFFICE, public: false };
const OFFICE_PUBLIC: ImageLink = { app: App.BACK_OFFICE, public: true };

/** Every Image of the batch placed as given, as `linksOf` answers. */
const placedIn =
  (...links: ImageLink[]): ImageDeps["linksOf"] =>
  (ids) =>
    Promise.resolve(new Map(ids.map((id) => [id, links])));
/** Every Image in these tests is private in Laura unless a test says otherwise. */
const inLaura = placedIn(LAURA_PRIVATE);

const ALT = { en: "The sea", it: "Il mare" };
const PREPARED = {
  blurDataUrl: "data:image/webp;base64,AAAA",
  buffer: Buffer.from("webp"),
  bytes: 4,
  height: 600,
  width: 800,
};
const imagesBody = z.array(imageBodySchema);
const IMAGE_KEY = /^[0-9a-f-]{36}\.avif$/;

/** A placement as upload meta and PATCH send it: `public` may be left out. */
type LinkInput = { app: App; public?: boolean };
const NO_APPS: LinkInput[] = [];
const LAURA_TWICE: LinkInput[] = [
  { app: App.LAURA },
  { app: App.LAURA, public: true },
];

const app = testHost;
const upload = (
  count: number,
  metaCount = count,
  size = 10,
  apps: LinkInput[] = [{ app: App.LAURA }]
) => {
  const form = new FormData();
  for (let index = 0; index < count; index += 1) {
    form.append("file", new File([new Uint8Array(size)], `${index}.jpg`));
  }
  form.append(
    "meta",
    stringifyJson(
      Array.from({ length: metaCount }, () => ({ alt: ALT, apps }))
    )
  );
  return { body: form, method: "POST" };
};

const json = <T>(method: string, body: T & Json<T>) => ({
  body: stringifyJson(body),
  headers: { "content-type": "application/json" },
  method,
});

describe("POST /v1/images", () => {
  it("prepares, stores and records a batch of one", async () => {
    const putObject = vi.fn<ImageDeps["putObject"]>(async () => undefined);
    const createImages = vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((row, index) => imageRecord({ ...row, id: `image-${index}` }))
    );
    const res = await app(admin, {
      createImages,
      prepare: async () => PREPARED,
      putObject,
    }).request(IMAGE_PATH, upload(1));

    expect(res.status).toBe(201);
    const [key] = putObject.mock.calls[0] ?? [];
    expect(key).toMatch(IMAGE_KEY);
    expect(createImages).toHaveBeenCalledWith([
      {
        alt: ALT,
        apps: [LAURA_PRIVATE],
        blurDataUrl: PREPARED.blurDataUrl,
        bytes: 4,
        height: 600,
        key,
        uploadedBy: admin.user.id,
        width: 800,
      },
    ]);
    expect(imagesBody.parse(await res.json())).toHaveLength(1);
  });

  it("keeps a placement uploaded public, and makes one sent without `public` private", async () => {
    const createImages = vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((row) => imageRecord(row))
    );
    const res = await app(admin, {
      createImages,
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(
      IMAGE_PATH,
      upload(1, 1, 10, [
        { app: App.LAURA, public: true },
        { app: App.BACK_OFFICE },
      ])
    );
    expect(res.status).toBe(201);
    expect(createImages.mock.calls[0]?.[0][0]?.apps).toEqual([
      LAURA_PUBLIC,
      OFFICE_PRIVATE,
    ]);
  });

  it("refuses a USER", async () => {
    const res = await app(user, {}).request(IMAGE_PATH, upload(1));
    expect(res.status).toBe(403);
  });

  it("lets an Admin of the Image's App upload it", async () => {
    const res = await app(lauraAdmin, {
      createImages: async (images) => images.map((image) => imageRecord(image)),
      prepare: async () => PREPARED,
      putObject: async () => undefined,
    }).request(IMAGE_PATH, upload(1));
    expect(res.status).toBe(201);
  });

  it("refuses an upload to an App the User is no Admin of, preparing nothing", async () => {
    const prepare = vi.fn();
    const res = await app(lauraAdmin, { prepare }).request(
      IMAGE_PATH,
      upload(1, 1, 10, [{ app: App.LAURA }, { app: App.BACK_OFFICE }])
    );
    expect(res.status).toBe(403);
    expect(prepare).not.toHaveBeenCalled();
  });

  it.each([
    ["no App", NO_APPS],
    ["one App twice", LAURA_TWICE],
  ])("refuses meta placing an Image in %s, preparing nothing", async (_, apps) => {
    const prepare = vi.fn();
    const res = await app(admin, { prepare }).request(
      IMAGE_PATH,
      upload(1, 1, 10, apps)
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
    expect(prepare).not.toHaveBeenCalled();
  });

  it("refuses meta that does not match the files", async () => {
    const res = await app(admin, {}).request(IMAGE_PATH, upload(2, 1));
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });
});
```

Leave `describe("POST /v1/images refusals and failures", ...)` as it is (its `upload(...)` calls keep their meaning). Replace `describe("PATCH /v1/images", ...)` and `describe("DELETE /v1/images", ...)` (to the end of the file) with:

```ts
describe("PATCH /v1/images", () => {
  it("replaces the placements of a batch", async () => {
    const updateImages = vi.fn<ImageDeps["updateImages"]>(async (changes) =>
      changes.map(({ apps, id }) => imageRecord({ apps: apps ?? [], id }))
    );
    const res = await app(admin, { linksOf: inLaura, updateImages }).request(
      IMAGE_PATH,
      json("PATCH", [{ apps: [{ app: App.BACK_OFFICE }], id: "image-1" }])
    );
    expect(res.status).toBe(200);
    expect(updateImages).toHaveBeenCalledWith([
      { apps: [OFFICE_PRIVATE], id: "image-1" },
    ]);
    expect(imagesBody.parse(await res.json())[0]?.apps).toEqual([
      OFFICE_PRIVATE,
    ]);
  });

  it("keeps a public placement public when `public` is left out, and starts a new one private", async () => {
    const updateImages = vi.fn<ImageDeps["updateImages"]>(async () => []);
    const res = await app(admin, {
      linksOf: placedIn(LAURA_PUBLIC),
      updateImages,
    }).request(
      IMAGE_PATH,
      json("PATCH", [
        { apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE }], id: "image-1" },
      ])
    );
    expect(res.status).toBe(200);
    expect(updateImages).toHaveBeenCalledWith([
      { apps: [LAURA_PUBLIC, OFFICE_PRIVATE], id: "image-1" },
    ]);
  });

  it("needs no Admin in an App whose placement stays as it is", async () => {
    // Public in Laura, private in the Back office: a Back office Admin
    // switches only the Back office placement, and Laura's stays.
    const updateImages = vi.fn<ImageDeps["updateImages"]>(async () => []);
    const res = await app(officeAdmin, {
      linksOf: placedIn(LAURA_PUBLIC, OFFICE_PRIVATE),
      updateImages,
    }).request(
      IMAGE_PATH,
      json("PATCH", [
        {
          apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE, public: true }],
          id: "image-1",
        },
      ])
    );
    expect(res.status).toBe(200);
    expect(updateImages).toHaveBeenCalledWith([
      { apps: [LAURA_PUBLIC, OFFICE_PUBLIC], id: "image-1" },
    ]);
  });

  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      linksOf: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(IMAGE_PATH, json("PATCH", [{ id: "missing" }]));
    expect(res.status).toBe(404);
  });

  it("refuses an alt-only edit by a User below Admin in the Image's App", async () => {
    const updateImages = vi.fn();
    const res = await app(lauraUser, { linksOf: inLaura, updateImages }).request(
      IMAGE_PATH,
      json("PATCH", [{ alt: ALT, id: "image-1" }])
    );
    expect(res.status).toBe(403);
    expect(updateImages).not.toHaveBeenCalled();
  });

  it("answers 404 for an Image in an App the User cannot enter", async () => {
    const updateImages = vi.fn();
    const res = await app(lauraAdmin, {
      linksOf: placedIn(OFFICE_PRIVATE),
      updateImages,
    }).request(IMAGE_PATH, json("PATCH", [{ alt: ALT, id: "image-1" }]));
    expect(res.status).toBe(404);
    expect(updateImages).not.toHaveBeenCalled();
  });

  it("answers 404 before 403 across the batch, so a refusal never tells which ids exist", async () => {
    // image-1 the User sees but cannot manage (403); image-2 they cannot see (404).
    const updateImages = vi.fn();
    const res = await app(lauraUser, {
      linksOf: async () =>
        new Map([
          ["image-1", [LAURA_PRIVATE]],
          ["image-2", [OFFICE_PRIVATE]],
        ]),
      updateImages,
    }).request(
      IMAGE_PATH,
      json("PATCH", [
        { alt: ALT, id: "image-1" },
        { alt: ALT, id: "image-2" },
      ])
    );
    expect(res.status).toBe(404);
    expect(updateImages).not.toHaveBeenCalled();
  });

  it.each([
    ["no App", NO_APPS],
    ["one App twice", LAURA_TWICE],
  ])("refuses apps naming %s", async (_, apps) => {
    const res = await app(admin, {}).request(
      IMAGE_PATH,
      json("PATCH", [{ apps, id: "image-1" }])
    );
    expect(res.status).toBe(400);
    expect((await errorOf(res)).code).toBe("VALIDATION_FAILED");
  });

  it("refuses alt missing a language", async () => {
    const res = await app(admin, {}).request(
      IMAGE_PATH,
      json("PATCH", [{ alt: { en: "only English" }, id: "image-1" }])
    );
    expect(res.status).toBe(400);
  });
});

describe("DELETE /v1/images", () => {
  it("deletes the rows, then the objects", async () => {
    const order: string[] = [];
    const res = await app(admin, {
      deleteImages: () => {
        order.push("rows");
        return Promise.resolve(["a.avif"]);
      },
      deleteObjects: (keys) => {
        order.push(`objects:${keys.join()}`);
        return Promise.resolve();
      },
      linksOf: inLaura,
    }).request(IMAGE_PATH, json("DELETE", { ids: ["image-1"] }));
    expect(res.status).toBe(204);
    expect(order).toEqual(["rows", "objects:a.avif"]);
  });

  it("still answers 204 when storage fails after the rows are gone", async () => {
    const res = await app(admin, {
      deleteImages: async () => ["a.avif"],
      deleteObjects: () => Promise.reject(new Error("storage down")),
      linksOf: inLaura,
    }).request(IMAGE_PATH, json("DELETE", { ids: ["image-1"] }));
    expect(res.status).toBe(204);
  });

  it("answers 404 when an id is unknown", async () => {
    const res = await app(admin, {
      linksOf: () => Promise.reject(new ImageNotFoundError(["missing"])),
    }).request(IMAGE_PATH, json("DELETE", { ids: ["missing"] }));
    expect(res.status).toBe(404);
  });

  it("takes the Images out of one App and removes the files of those left in none", async () => {
    const removeImagesFromApp = vi.fn<ImageDeps["removeImagesFromApp"]>(
      async () => ["a.avif"]
    );
    const deleteObjects = vi.fn<ImageDeps["deleteObjects"]>(
      async () => undefined
    );
    const res = await app(lauraAdmin, {
      deleteObjects,
      linksOf: inLaura,
      removeImagesFromApp,
    }).request(
      IMAGE_PATH,
      json("DELETE", { app: App.LAURA, ids: ["image-1"] })
    );
    expect(res.status).toBe(204);
    expect(removeImagesFromApp).toHaveBeenCalledWith(["image-1"], App.LAURA);
    expect(deleteObjects).toHaveBeenCalledWith(["a.avif"]);
  });

  it("answers 404 for an Image not placed in the App named", async () => {
    const removeImagesFromApp = vi.fn();
    const res = await app(admin, {
      linksOf: placedIn(OFFICE_PRIVATE),
      removeImagesFromApp,
    }).request(
      IMAGE_PATH,
      json("DELETE", { app: App.LAURA, ids: ["image-1"] })
    );
    expect(res.status).toBe(404);
    expect(removeImagesFromApp).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Write the recap test**

Create `hono/tests/recap.test.ts`:

```ts
// @module-tag unit

import {
  membershipsIn,
  sessionFor,
} from "@allonfire/auth/shared/tests/stub-auth";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { type Json, stringifyJson } from "@allonfire/core/shared/utils/json";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";
import { ImageNotFoundError } from "@allonfire/database/features/image/image.service";
import { IMAGE_PATH } from "../../constants/paths";
import { imageListBodySchema } from "../constants/schemas";
import type { ImageDeps } from "../utils/deps";
import { imageRecord } from "./stub-image-deps";
import { testHost } from "./test-host";

/**
 * The recap agreed for ADR 0020, one test per row. P is public in Laura and
 * private in the Back office, Q private in Laura, R private in the Back
 * office. Giulia is a Laura Viewer, Mario a Laura Admin outside the Back
 * office, Admin an Admin in every App.
 */
const P = imageRecord({
  apps: [
    { app: App.LAURA, public: true },
    { app: App.BACK_OFFICE, public: false },
  ],
  id: "P",
  key: "p.avif",
});
const Q = imageRecord({
  apps: [{ app: App.LAURA, public: false }],
  id: "Q",
  key: "q.avif",
});
const R = imageRecord({
  apps: [{ app: App.BACK_OFFICE, public: false }],
  id: "R",
  key: "r.avif",
});
const IMAGES = [P, Q, R];

const visitor = null;
const giulia = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.VIEWER }],
});
const mario = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.ADMIN }],
});
const admin = sessionFor({ memberships: membershipsIn(Role.ADMIN) });

/** One recap row: what each of the four callers gets. */
const row = (
  forVisitor: number,
  forGiulia: number,
  forMario: number,
  forAdmin: number
): [string, AuthSession | null, number][] => [
  ["a visitor", visitor, forVisitor],
  ["Giulia", giulia, forGiulia],
  ["Mario", mario, forMario],
  ["an Admin", admin, forAdmin],
];

/**
 * The service's query over P, Q and R: placed in `app` (any App when it is
 * left out), and that placement public or in an App the caller enters.
 */
const listImages: ImageDeps["listImages"] = async ({ app, enterable }) =>
  IMAGES.filter(({ apps }) =>
    apps.some(
      (link) =>
        (app === undefined || link.app === app) &&
        (link.public || enterable.includes(link.app))
    )
  );

const linksOf: ImageDeps["linksOf"] = async (ids) => {
  const missing = ids.filter((id) => !IMAGES.some((image) => image.id === id));
  if (missing.length > 0) {
    throw new ImageNotFoundError(missing);
  }
  return new Map(
    IMAGES.filter(({ id }) => ids.includes(id)).map(({ apps, id }) => [
      id,
      apps,
    ])
  );
};

const keysOf = (ids: readonly string[]) =>
  IMAGES.filter(({ id }) => ids.includes(id)).map(({ key }) => key);

/** Reads answer from P, Q and R; every write is recorded and succeeds. */
const host = (session: AuthSession | null) => {
  const writes = {
    createImages: vi.fn<ImageDeps["createImages"]>(async (rows) =>
      rows.map((one) => imageRecord(one))
    ),
    deleteImages: vi.fn<ImageDeps["deleteImages"]>(async (ids) => keysOf(ids)),
    deleteObjects: vi.fn<ImageDeps["deleteObjects"]>(async () => undefined),
    putObject: vi.fn<ImageDeps["putObject"]>(async () => undefined),
    // An Image goes when the App it leaves was its only one.
    removeImagesFromApp: vi.fn<ImageDeps["removeImagesFromApp"]>(
      async (ids, app) =>
        IMAGES.filter(
          ({ apps, id }) =>
            ids.includes(id) && apps.every((link) => link.app === app)
        ).map(({ key }) => key)
    ),
    updateImages: vi.fn<ImageDeps["updateImages"]>(async (changes) =>
      changes.map(({ id }) => imageRecord({ id }))
    ),
  };
  const app = testHost(session, {
    ...writes,
    getImage: async (id) => IMAGES.find((image) => image.id === id) ?? null,
    linksOf,
    listImages,
    prepare: async () => ({
      blurDataUrl: "data:image/webp;base64,AAAA",
      buffer: Buffer.from("avif"),
      bytes: 4,
      height: 600,
      width: 800,
    }),
  });
  const wrote = () =>
    objectValues(writes).some((write) => write.mock.calls.length > 0);
  return { app, wrote, writes };
};

const ALT = { en: "The sea", it: "Il mare" };
const json = <T>(method: string, body: T & Json<T>) => ({
  body: stringifyJson(body),
  headers: { "content-type": "application/json" },
  method,
});
const uploadToLauraAndBackOffice = () => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(10)], "a.jpg"));
  form.append(
    "meta",
    stringifyJson([
      { alt: ALT, apps: [{ app: App.LAURA }, { app: App.BACK_OFFICE }] },
    ])
  );
  return { body: form, method: "POST" };
};

const listed = async (session: AuthSession | null, query: string) => {
  const res = await host(session).app.request(`${IMAGE_PATH}${query}`);
  return imageListBodySchema.parse(await res.json()).images.map(({ id }) => id);
};

describe("recap: reads", () => {
  it.each([
    ["a visitor", visitor, ["P"]],
    ["Giulia", giulia, ["P", "Q"]],
    ["Mario", mario, ["P", "Q"]],
    ["an Admin", admin, ["P", "Q"]],
  ])("GET ?app=LAURA shows %s %j", async (_, session, expected) => {
    expect(await listed(session, `?app=${App.LAURA}`)).toEqual(expected);
  });

  it.each([
    ["a visitor", visitor, []],
    ["Giulia", giulia, []],
    ["Mario", mario, []],
    ["an Admin", admin, ["P", "R"]],
  ])("GET ?app=BACK_OFFICE shows %s %j", async (_, session, expected) => {
    expect(await listed(session, `?app=${App.BACK_OFFICE}`)).toEqual(expected);
  });

  it.each([
    ["a visitor", visitor, ["P"]],
    ["Giulia", giulia, ["P", "Q"]],
    ["Mario", mario, ["P", "Q"]],
    ["an Admin", admin, ["P", "Q", "R"]],
  ])("GET with no app shows %s %j", async (_, session, expected) => {
    expect(await listed(session, "")).toEqual(expected);
  });

  it.each([
    ["a visitor", visitor, 404, 404],
    ["Giulia", giulia, 200, 404],
    ["Mario", mario, 200, 404],
    ["an Admin", admin, 200, 200],
  ])("GET {Q} / GET {R} answer %s %i / %i", async (_, session, q, r) => {
    const { app } = host(session);
    expect((await app.request(`${IMAGE_PATH}/Q`)).status).toBe(q);
    expect((await app.request(`${IMAGE_PATH}/R`)).status).toBe(r);
  });
});

describe("recap: writes", () => {
  /** Each write row: its request, and what a visitor, Giulia, Mario and an Admin get. */
  const writes: [string, () => RequestInit, [number, number, number, number]][] = [
    ["Upload to Laura + Back office", uploadToLauraAndBackOffice, [401, 403, 403, 201]],
    [
      "PATCH Q switch public in Laura",
      () => json("PATCH", [{ apps: [{ app: App.LAURA, public: true }], id: "Q" }]),
      [401, 403, 200, 200],
    ],
    [
      "PATCH P apps: [BACK_OFFICE]",
      () => json("PATCH", [{ apps: [{ app: App.BACK_OFFICE }], id: "P" }]),
      [401, 403, 200, 200],
    ],
    ["PATCH P alt", () => json("PATCH", [{ alt: ALT, id: "P" }]), [401, 403, 403, 200]],
    ["PATCH R", () => json("PATCH", [{ alt: ALT, id: "R" }]), [401, 404, 404, 200]],
    [
      "DELETE { [P], LAURA }",
      () => json("DELETE", { app: App.LAURA, ids: ["P"] }),
      [401, 403, 204, 204],
    ],
    [
      "DELETE { [Q], LAURA }",
      () => json("DELETE", { app: App.LAURA, ids: ["Q"] }),
      [401, 403, 204, 204],
    ],
    ["DELETE { [P] }", () => json("DELETE", { ids: ["P"] }), [401, 403, 403, 204]],
    ["DELETE { [Q, R] }", () => json("DELETE", { ids: ["Q", "R"] }), [401, 404, 404, 204]],
  ];

  describe.each(writes)("%s", (_, request, [v, g, m, a]) => {
    it.each(row(v, g, m, a))(
      "answers %s %i, writing only when it succeeds",
      async (__, session, status) => {
        const { app, wrote } = host(session);
        const res = await app.request(IMAGE_PATH, request());
        expect({ status: res.status, wrote: wrote() }).toEqual({
          status,
          wrote: status < 400,
        });
      }
    );
  });

  it("PATCH P apps: [BACK_OFFICE] by Mario keeps the Back office placement private", async () => {
    const { app, writes: done } = host(mario);
    await app.request(
      IMAGE_PATH,
      json("PATCH", [{ apps: [{ app: App.BACK_OFFICE }], id: "P" }])
    );
    expect(done.updateImages).toHaveBeenCalledWith([
      { apps: [{ app: App.BACK_OFFICE, public: false }], id: "P" },
    ]);
  });

  it("DELETE { [P], LAURA } by Mario leaves P stored: it is still in the Back office", async () => {
    const { app, writes: done } = host(mario);
    await app.request(IMAGE_PATH, json("DELETE", { app: App.LAURA, ids: ["P"] }));
    expect(done.removeImagesFromApp).toHaveBeenCalledWith(["P"], App.LAURA);
    expect(done.deleteImages).not.toHaveBeenCalled();
    expect(done.deleteObjects).toHaveBeenCalledWith([]);
  });

  it("DELETE { [Q], LAURA } by Mario deletes Q and its file: Laura was its only App", async () => {
    const { app, writes: done } = host(mario);
    await app.request(IMAGE_PATH, json("DELETE", { app: App.LAURA, ids: ["Q"] }));
    expect(done.deleteObjects).toHaveBeenCalledWith(["q.avif"]);
  });

  it("DELETE { [Q, R] } by Mario deletes nothing, not even Q", async () => {
    const { app, wrote } = host(mario);
    const res = await app.request(IMAGE_PATH, json("DELETE", { ids: ["Q", "R"] }));
    expect(res.status).toBe(404);
    expect(wrote()).toBe(false);
  });
});
```

- [x] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono/tests/write.test.ts src/features/image/hono/tests/recap.test.ts`
Expected: FAIL — `deps.appsOf is not a function` on PATCH and DELETE; upload reads `app` from items that carry `apps` (every upload 403s); `DELETE { app }` deletes everywhere.

- [x] **Step 4: Implement the authorisation helpers**

Create `hono/utils/access.ts`:

```ts
import type { App } from "@allonfire/database/enums";
import {
  type AccessUser,
  canManageEverywhere,
  canManageImage,
  canSeeImage,
  type ImageLink,
} from "@allonfire/database/features/auth/access/access";
import type { ImageChange } from "@allonfire/database/features/image/image.service";
import type { PatchChange } from "../constants/schemas";
import { forbidden, notFound } from "./errors";

/**
 * How the Image module authorises a write (ADR 0020). Every check over a
 * batch runs to its end before the next kind starts: 404 across the whole
 * batch first, then 403, so a refused batch never tells which ids exist.
 */

/** 404 unless the User sees every Image somewhere, and each is placed in `app` when one is named. */
export const assertVisible = (
  user: AccessUser,
  links: Iterable<readonly ImageLink[]>,
  app?: App
) => {
  for (const placements of links) {
    const inApp =
      app === undefined || placements.some((link) => link.app === app);
    if (!(inApp && canSeeImage(user, placements))) {
      throw notFound();
    }
  }
};

/** 403 unless the User is an Admin in every App named. */
export const assertManages = (user: AccessUser, apps: Iterable<App>) => {
  for (const app of apps) {
    if (!canManageImage(user, app)) {
      throw forbidden();
    }
  }
};

/** 403 unless the User is an Admin in every App each Image is placed in. */
export const assertManagesEverywhere = (
  user: AccessUser,
  links: Iterable<readonly ImageLink[]>
) => {
  for (const placements of links) {
    if (!canManageEverywhere(user, placements)) {
      throw forbidden();
    }
  }
};

/** The new placements, `public` filled in: left out, an existing placement keeps its own and a new one starts private. */
const resolveLinks = (
  current: readonly ImageLink[],
  next: NonNullable<PatchChange["apps"]>
): ImageLink[] =>
  next.map((link) => ({
    app: link.app,
    public:
      link.public ??
      current.find(({ app }) => app === link.app)?.public ??
      false,
  }));

/** The Apps whose placement is added, removed or switched public. */
const changedApps = (
  current: readonly ImageLink[],
  next: readonly ImageLink[]
): App[] => {
  const before = new Map(current.map((link) => [link.app, link.public]));
  const after = new Map(next.map((link) => [link.app, link.public]));
  return [...new Set([...before.keys(), ...after.keys()])].filter(
    (app) => before.get(app) !== after.get(app)
  );
};

/**
 * A PATCH batch checked against each Image's current placements, and
 * resolved: 404 unless every Image is visible; then 403 unless the User is
 * an Admin in every App whose placement changes and, for `alt` (every App
 * shows it), in every App the Image is in now.
 */
export const authorisePatch = (
  user: AccessUser,
  current: ReadonlyMap<string, readonly ImageLink[]>,
  changes: readonly PatchChange[]
): ImageChange[] => {
  assertVisible(user, current.values());
  return changes.map(({ alt, apps, id }) => {
    const links = current.get(id) ?? [];
    const next = apps && resolveLinks(links, apps);
    assertManages(user, next ? changedApps(links, next) : []);
    if (alt) {
      assertManagesEverywhere(user, [links]);
    }
    return { id, ...(alt && { alt }), ...(next && { apps: next }) };
  });
};
```

`hono/utils/errors.ts`: delete `assertManages` and the imports only it used (`type App`, `type AccessUser`, `canEnterApp`, `canManageImage`). `notFound`, `forbidden`, `tooLarge` and `notFoundOnUnknownIds` stay.

- [x] **Step 5: Move the upload helpers out of the handlers**

Create `hono/utils/upload-batch.ts` with the code that was in `handlers.ts`, unchanged except for `export`:

```ts
import { randomUUID } from "node:crypto";
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { MS_PER_SECOND } from "@allonfire/core/shared/constants/units";
import { createMiddleware } from "hono/factory";
import { IMAGE_FORMAT } from "../../constants/format";
import { MAX_INPUT_MEGAPIXELS } from "../../prepare/constants/limits";
import {
  ImageTooLargeError,
  type PreparedImage,
  UnsupportedImageError,
} from "../../prepare/prepare-image";
import { IMAGE_ERROR_CODE } from "../constants/errors";
import { UPLOAD_TIMEOUT_MS } from "../constants/limits";
import type { UploadItem } from "../constants/schemas";
import type { ImageDeps } from "./deps";

/** The file bytes as sharp reads them; a decode failure is the client's 415, too many pixels a 413. */
const prepareFile = async (deps: ImageDeps, file: File) => {
  try {
    return await deps.prepare(Buffer.from(await file.arrayBuffer()));
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
};

type PreparedItem = UploadItem & { image: PreparedImage; key: string };

/**
 * One at a time: sharp decodes the whole image, and the VPS has no swap. A
 * reduce chain, so each file waits for the one before it.
 */
export const prepareAll = (deps: ImageDeps, items: UploadItem[]) =>
  items.reduce<Promise<PreparedItem[]>>(async (done, item) => {
    const list = await done;
    list.push({
      ...item,
      image: await prepareFile(deps, item.file),
      key: `${randomUUID()}${IMAGE_FORMAT.EXTENSION}`,
    });
    return list;
  }, Promise.resolve([]));

/**
 * Every put settles before anything is cleaned up: with `Promise.all` the
 * first failure cleaned up while other puts were still in flight, and those
 * landed after the delete.
 */
export const storeAll = async (deps: ImageDeps, prepared: PreparedItem[]) => {
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

/** Where the upload's handler reads whether its time budget has run out. */
export const UPLOAD_BUDGET = "uploadBudget";

/**
 * The upload's own time budget. Hono's `timeout` only races the handler, which
 * then stores and records the batch after the client has its 503, so a retry
 * stores it twice. This one also aborts a signal the handler checks before it
 * stores and before it records; its reason is the 503 naming this budget.
 */
export const uploadTimeout = createMiddleware<{
  Variables: { [UPLOAD_BUDGET]: AbortSignal };
}>(async (c, next) => {
  const budget = new AbortController();
  c.set(UPLOAD_BUDGET, budget.signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      budget.abort(
        new CodedError({
          code: IMAGE_ERROR_CODE.TIMEOUT,
          status: HTTP_STATUS.SERVICE_UNAVAILABLE,
          values: { seconds: UPLOAD_TIMEOUT_MS / MS_PER_SECOND },
        })
      );
      reject(budget.signal.reason);
    }, UPLOAD_TIMEOUT_MS);
  });
  try {
    await Promise.race([next(), expired]);
  } finally {
    clearTimeout(timer);
  }
});
```

- [x] **Step 6: Implement the write handlers**

Delete `routes/handlers.ts`. Create `routes/write-handlers.ts`:

```ts
import { AUTH_VAR } from "@allonfire/auth/features/hono/constants/variables";
import { requireSession } from "@allonfire/auth/features/hono/guards/middleware/require-session";
import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { HTTP_STATUS } from "@allonfire/core/features/http/constants/http";
import { sValidator } from "@hono/standard-validator";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { toImageBody } from "../../constants/schemas";
import { MAX_FILE_BYTES, MAX_UPLOAD_BYTES } from "../constants/limits";
import {
  deleteBodySchema,
  patchBodySchema,
  uploadFormSchema,
} from "../constants/schemas";
import {
  assertManages,
  assertManagesEverywhere,
  assertVisible,
  authorisePatch,
} from "../utils/access";
import type { ImageDeps } from "../utils/deps";
import { notFoundOnUnknownIds, tooLarge } from "../utils/errors";
import {
  prepareAll,
  storeAll,
  UPLOAD_BUDGET,
  uploadTimeout,
} from "../utils/upload-batch";
import { invalid, throwOnInvalid } from "../utils/validation";
import { deleteRoute, patchRoute, uploadRoute } from "./routes";

/**
 * Every write needs a Session (401 without) and is checked per Image and
 * per App (ADR 0020, `../utils/access`): a parse, a check and a call.
 */
const factory = createFactory<AuthEnv>();

const LOG_MESSAGE = {
  CLEANUP_FAILED: "image cleanup failed",
  OBJECT_DELETE_FAILED: "image object delete failed",
} as const;

export const uploadHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    uploadRoute,
    requireSession(),
    uploadTimeout,
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: () => {
        throw tooLarge(MAX_UPLOAD_BYTES);
      },
    }),
    async (c) => {
      const form = await c.req.parseBody({ all: true });
      // One `file` part parses to a File, several to an array.
      const parsed = uploadFormSchema.safeParse({
        file: [form.file].flat(),
        meta: form.meta,
      });
      if (!parsed.success) {
        throw invalid(parsed.error.issues);
      }
      const items = parsed.data;
      // Admin in every App each Image goes to, before a single file is read.
      assertManages(
        c.get(AUTH_VAR.SESSION).user,
        items.flatMap(({ apps }) => apps.map(({ app }) => app))
      );
      if (items.some(({ file }) => file.size > MAX_FILE_BYTES)) {
        throw tooLarge(MAX_FILE_BYTES);
      }
      const prepared = await prepareAll(deps, items);

      const budget = c.get(UPLOAD_BUDGET);
      budget.throwIfAborted();
      const uploadedBy = c.get(AUTH_VAR.SESSION).user.id;
      try {
        await storeAll(deps, prepared);
        // Past the budget, the objects just stored are cleaned up below.
        budget.throwIfAborted();
        const images = await deps.createImages(
          prepared.map(({ alt, apps, image, key }) => ({
            alt,
            apps,
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
            deps.log.warn({ err: cleanup, keys }, LOG_MESSAGE.CLEANUP_FAILED)
          );
        throw error;
      }
    }
  );

export const patchHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    patchRoute,
    requireSession(),
    sValidator("json", patchBodySchema, throwOnInvalid),
    async (c) => {
      const changes = c.req.valid("json");
      const current = await deps
        .linksOf(changes.map(({ id }) => id))
        .catch(notFoundOnUnknownIds);
      const resolved = authorisePatch(
        c.get(AUTH_VAR.SESSION).user,
        current,
        changes
      );
      const images = await deps
        .updateImages(resolved)
        .catch(notFoundOnUnknownIds);
      return c.json(images.map(toImageBody), HTTP_STATUS.OK);
    }
  );

export const deleteHandlers = (deps: ImageDeps) =>
  factory.createHandlers(
    deleteRoute,
    requireSession(),
    sValidator("json", deleteBodySchema, throwOnInvalid),
    async (c) => {
      const { app, ids } = c.req.valid("json");
      const { user } = c.get(AUTH_VAR.SESSION);
      const current = await deps.linksOf(ids).catch(notFoundOnUnknownIds);
      assertVisible(user, current.values(), app);
      if (app) {
        // Out of one App: Admin there is enough; other Apps keep the Image.
        assertManages(user, [app]);
      } else {
        // Gone everywhere: Admin in every App each Image is in.
        assertManagesEverywhere(user, current.values());
      }
      const keys = await (app
        ? deps.removeImagesFromApp(ids, app)
        : deps.deleteImages(ids)
      ).catch(notFoundOnUnknownIds);
      // Rows first: a leftover object is harmless, a row without its file is
      // a broken Image. So a storage failure here is logged, not answered.
      await deps
        .deleteObjects(keys)
        .catch((error: unknown) =>
          deps.log.warn({ err: error, keys }, LOG_MESSAGE.OBJECT_DELETE_FAILED)
        );
      return c.body(null, HTTP_STATUS.NO_CONTENT);
    }
  );
```

`routes/index.ts`: the `./handlers` import becomes

```ts
import { getHandlers, listHandlers } from "./read-handlers";
import {
  deleteHandlers,
  patchHandlers,
  uploadHandlers,
} from "./write-handlers";
```

`packages/storage/package.json` exports: replace the `"./features/image/hono/routes/handlers"` line with

```json
    "./features/image/hono/routes/write-handlers": "./src/features/image/hono/routes/write-handlers.ts",
```

(keeping the `read-handlers` line from Task 5 above it).

- [x] **Step 7: Run them to verify they pass**

Run: `pnpm --filter @allonfire/storage exec vitest run src/features/image/hono`
Expected: PASS, every recap row included.

Run: `pnpm --filter @allonfire/storage test && pnpm --filter @allonfire/storage check-types`
Expected: PASS, no type errors (the type test of Task 4 included).

Run: `wc -l packages/storage/src/features/image/hono/routes/*.ts packages/storage/src/features/image/hono/utils/*.ts`
Expected: every file at or under 300 lines.

- [x] **Step 8: Format**

Run: `pnpm exec biome check --write packages/storage/src/features/image/hono/utils/access.ts packages/storage/src/features/image/hono/utils/upload-batch.ts packages/storage/src/features/image/hono/utils/errors.ts packages/storage/src/features/image/hono/routes/write-handlers.ts packages/storage/src/features/image/hono/routes/index.ts packages/storage/package.json packages/storage/src/features/image/hono/tests/write.test.ts packages/storage/src/features/image/hono/tests/recap.test.ts`

---

### Task 7: API wiring and the OpenAPI texts

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `packages/storage/src/features/image/hono/constants/openapi.ts`
- Modify: `packages/storage/src/features/image/hono/routes/routes.ts`
- Test: `apps/api/src/features/errors/tests/image-module.test.ts`
- Test: `apps/api/src/features/docs/tests/spec.test.ts`

**Interfaces:**
- Consumes: `linksOfImages`, `removeImagesFromApp` (Task 3); `ImageDeps` (Task 4).
- Produces: the API's `images` deps with `linksOf` and `removeImagesFromApp`; the list route documents only 400, the get route only 404.

- [x] **Step 1: Write the failing tests**

`image-module.test.ts`: in `upload()`, the meta becomes

```ts
    stringifyJson([{ alt: { en: "", it: "" }, apps: [{ app: App.LAURA }] }])
```

Add at the end (`App`, `stringifyJson`, `stubImageDeps`, `ImageDeps`, `createApp`, `appDeps` and `problemOf` are already imported):

```ts
describe("the Image module's reads and writes inside the API", () => {
  it("lists for a visitor: no Session, no App entered", async () => {
    const listImages = vi.fn<ImageDeps["listImages"]>(async () => []);
    const res = await createApp(
      appDeps({ images: stubImageDeps({ listImages }) })
    ).request(`/v1/images?app=${App.LAURA}`);
    expect(res.status).toBe(200);
    expect(listImages).toHaveBeenCalledWith({
      app: App.LAURA,
      enterable: [],
      limit: 30,
    });
  });

  it("asks a visitor to sign in before a write, as a problem document", async () => {
    const res = await createApp(appDeps()).request("/v1/images", {
      body: stringifyJson({ ids: ["image-1"] }),
      headers: { "content-type": "application/json" },
      method: "DELETE",
    });
    expect(res.status).toBe(401);
    expect((await problemOf(res)).status).toBe(401);
  });
});
```

`spec.test.ts`: in `describe("GET /openapi.json error responses")` add:

```ts
  it("documents the Image reads with no sign-in errors, the writes with them", async () => {
    const { paths } = await document();
    expect(paths["/v1/images"]).not.toHaveProperty(["get", "responses", "401"]);
    expect(paths["/v1/images"]).not.toHaveProperty(["get", "responses", "403"]);
    expect(paths["/v1/images/{id}"]).not.toHaveProperty([
      "get",
      "responses",
      "401",
    ]);
    expect(paths["/v1/images"]).toHaveProperty(
      ["patch", "responses", "401", "$ref"],
      "#/components/responses/Problem401"
    );
  });
```

(`hono-openapi` writes `/:id` as `/{id}`.)

- [x] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/errors/tests/image-module.test.ts src/features/docs/tests/spec.test.ts`
Expected: FAIL — the list route still documents 401 and 403. (`image-module.test.ts` passes already: Tasks 5 and 6 changed the module it mounts.)

- [x] **Step 3: Implement**

`apps/api/src/index.ts`: the service import becomes

```ts
import {
  createImages,
  deleteImages,
  getImage,
  linksOfImages,
  listImages,
  removeImagesFromApp,
  updateImages,
} from "@allonfire/database/features/image/image.service";
```

and the `images` deps:

```ts
  images: {
    createImages,
    deleteImages,
    deleteObjects: deleteImageObjects,
    getImage,
    linksOf: linksOfImages,
    listImages,
    log: logger,
    prepare: prepareImage,
    putObject: putImageObject,
    removeImagesFromApp,
    updateImages,
  },
```

`routes.ts`: `listRoute`'s problems become `...problems(HTTP_STATUS.BAD_REQUEST),`; `getRoute`'s become `...problems(HTTP_STATUS.NOT_FOUND),`. The write routes keep theirs.

`openapi.ts`, `IMAGE_ROUTE_DOC`:

```ts
export const IMAGE_ROUTE_DOC = {
  DELETE_204: "Taken out of `app`, or deleted",
  DELETE_DESCRIPTION: `Signed in. Up to ${MAX_BATCH} ids. With \`app\`: takes the Images out of that App (Admin there; each must be in it) and deletes the ones left in no App. Without: deletes them everywhere (Admin in every App each is in). An Image the User cannot see answers 404, checked across the whole batch before any 403. All or nothing; the stored files go after the rows.`,
  DELETE_SUMMARY: "Take Images out of an App, or delete them",
  GET_200: "The Image",
  GET_DESCRIPTION:
    "No sign-in needed. An Image public in some App, or in an App the User enters; any other answers 404, not 403, so its id stays hidden.",
  GET_SUMMARY: "Get an Image",
  LIST_200: "One page of Images; `nextCursor` is null on the last page",
  LIST_DESCRIPTION: `No sign-in needed. The Images visible in \`app\` (in any App when it is left out): placed there, and public or in an App the User enters. Never 403: someone who cannot enter \`app\` gets its public Images. Newest upload first, ${DEFAULT_LIST_LIMIT} per page (\`limit\` up to ${MAX_LIST_LIMIT}). Send \`nextCursor\` back as \`cursor\` for the next page.`,
  LIST_SUMMARY: "List Images",
  PATCH_200: "The updated Images",
  PATCH_DESCRIPTION: `Signed in. Up to ${MAX_BATCH} changes, each an \`id\` with \`apps\` (the full new list, each App once), \`alt\` or both. A placement added, removed or switched public needs the Admin Role in its App; \`alt\`, which every App shows, needs it in every App the Image is in. A \`public\` left out keeps a placement's own and makes a new one private; \`alt\` needs every language. An Image the User cannot see answers 404, checked across the whole batch before any 403. All or nothing.`,
  PATCH_SUMMARY: "Place Images in Apps or change their alt",
  UPLOAD_201: "The new Images, in file order",
  UPLOAD_DESCRIPTION: `Signed in, Admin in every App named. multipart/form-data: up to ${MAX_FILES_PER_UPLOAD} \`file\` parts and one \`meta\` JSON part, \`[{ apps: [{ app, public? }], alt }]\` in file order, at least one App each, each App once, \`public\` false when left out. JPEG, PNG, WebP, AVIF or HEIC in; each file is stored as AVIF with a blur placeholder. Limits: ${MAX_FILE_BYTES / BYTES_PER_MIB} MiB a file, ${MAX_UPLOAD_BYTES / BYTES_PER_MIB} MiB a request, ${MAX_INPUT_MEGAPIXELS} megapixels, ${UPLOAD_TIMEOUT_MS / MS_PER_MINUTE} minutes. All or nothing: one bad file rejects the batch.`,
  UPLOAD_SUMMARY: "Upload Images",
} as const;
```

- [x] **Step 4: Run them to verify they pass**

Run: `pnpm --filter @allonfire/api exec vitest run src/features/errors/tests/image-module.test.ts src/features/docs/tests/spec.test.ts && pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types && pnpm --filter @allonfire/storage test`
Expected: PASS.

- [x] **Step 5: Format**

Run: `pnpm exec biome check --write apps/api/src/index.ts apps/api/src/features/errors/tests/image-module.test.ts apps/api/src/features/docs/tests/spec.test.ts packages/storage/src/features/image/hono/constants/openapi.ts packages/storage/src/features/image/hono/routes/routes.ts`

---

### Task 8: Docs and repo-wide gates

**Files:**
- Modify: `CLAUDE.md`
- Modify: `packages/storage/README.md`
- Modify: `packages/database/README.md`
- Modify: `apps/api/README.md`

- [x] **Step 1: Find every stale reference**

Run: `rg -n "appsOf|appsOfImages|ADMIN only|Image_app_createdAt|image\.app\b|routes/handlers|the Image's App|each shown by one App" --glob '!**/node_modules/**' --glob '!**/._*' --glob '!docs/superpowers/**' --glob '!docs/adr/**' --glob '!apps/laura/**' --glob '!packages/*-old/**' .`
Expected: hits only in the four docs below (`apps/back-office/.../sign-in-image.ts` is out of scope). A hit in code means a task above missed it: fix it there.

- [x] **Step 2: Rewrite the docs**

`CLAUDE.md`, Database Schema Quick Reference. The `image` bullet becomes:

```markdown
- **`image` schema (shared):** `Image` and `ImageApp`: the Images every App shows, each placed in one or more Apps, public or private in each (ADR 0013, ADR 0020)
```

In the access bullet, this text:

```markdown
`canManageImage(user, app)` (Admin in the Image's App),
```

becomes:

```markdown
`ImageLink`, `canSeeImage(user, links)` (a placement public, or in an App the User enters; `user` null for a visitor), `canManageImage(user, app)` (Admin in that App), `canManageEverywhere(user, links)` (Admin in every App the Image is in), `enterableApps(user)`,
```

`packages/database/README.md`, the `image` row and the `image.service` row become:

```markdown
| `image` | the Images, each placed in one or more Apps, public or private in each ([ADR 0013](../../docs/adr/0013-images-live-in-a-shared-image-schema.md), [ADR 0020](../../docs/adr/0020-an-image-is-in-one-or-more-apps.md)) | `Image`, `ImageApp` |
```

```markdown
| `@allonfire/database/features/image/image.service` | `createImages`, `listImages` (the Images visible in one App or any, for the Apps the caller enters), `getImage`, `linksOfImages`, `updateImages` (`apps` replaces the placements), `removeImagesFromApp` (deletes the Images left in no App), `deleteImages` (batches all or nothing), `imageAltSchema`, `ImageNotFoundError`, types `ImageRecord`, `NewImage`, `ImageChange`, `ImageCursor` |
```

and in the `access` row, after `` `canManageImage(user, app)`, `` insert:

```markdown
`ImageLink`, `canSeeImageIn`, `canSeeImage`, `canManageEverywhere`, `enterableApps` (ADR 0020),
```

`packages/storage/README.md`. The `ImageDeps` paragraph becomes:

```markdown
`ImageDeps` is everything it touches: the `image.service` functions from `@allonfire/database` (`createImages`, `listImages`, `getImage`, `updateImages`, `deleteImages`, `removeImagesFromApp`, and `linksOf`, which is `linksOfImages`), `putObject` and `deleteObjects` from `./features/image/objects/image-objects`, `prepare` (`prepareImage`) and `log` (`{ warn }`, pino's shape).
```

First in the bullet list under it:

```markdown
- **Access** (ADR 0020): an Image is in one or more Apps, public or private in each. Reads need no Session: a visitor sees public placements, a User also the Apps they enter, and an Image they cannot see answers 404. Writes need one: placing an Image in an App, taking it out or switching it public needs the Admin Role there; its alt or deleting it everywhere needs it in every App it is in. A batch answers 404 for any Image the User cannot see before any 403. `hono/utils/access.ts` holds these checks; `hono/tests/recap.test.ts` is the agreed table, one test per row.
```

The Directory Structure lines for `hono/` become:

```
        hono/                    the Image module: routes/ (index, routes, read-handlers,
                                 write-handlers), constants/, utils/ (access, upload-batch, ...),
                                 tests/ (stubImageDeps for hosts, recap)
```

And after the `./features/image/hono/routes` row of the export table:

```markdown
| `./features/image/hono/routes/read-handlers` | `listHandlers`, `getHandlers` |
| `./features/image/hono/routes/write-handlers` | `uploadHandlers`, `patchHandlers`, `deleteHandlers` |
```

`apps/api/README.md`, the Images section: "rows live in `image."Image"`" becomes "rows live in `image."Image"`, placements in `image."ImageApp"`"; the table becomes

```markdown
| Endpoint | Guard | Does |
|---|---|---|
| `GET /v1/images?app=&cursor=&limit=` | none | the Images visible in `app` (any App when left out): placed there, and public or in an App the User enters; newest upload first; `nextCursor` (opaque) pages; never 403 |
| `GET /v1/images/:id` | none; 404 unless visible in some App | one Image |
| `POST /v1/images` | Session; `ADMIN` in every App named | multipart: repeated `file` parts plus one `meta` JSON part, `[{ apps: [{ app, public? }], alt: { en, it } }]` in file order |
| `PATCH /v1/images` | Session; `ADMIN` in each App whose placement is added, removed or switched public; for `alt`, in every App the Image is in | `[{ id, apps?, alt? }]`: `apps` is the full new list; a `public` left out keeps the placement's own |
| `DELETE /v1/images` | Session; with `app`, `ADMIN` there; without, in every App the Image is in | `{ ids, app? }`: with `app`, takes the Images out of it and deletes those left in none; without, deletes them everywhere; rows first, then files |
```

and the "App values are the enum names" bullet ends: "An App appears once in a list (400 otherwise). A batch with one Image the User cannot see answers 404, before any 403, and writes nothing."

- [x] **Step 3: Format and run every gate**

```bash
pnpm exec biome check --write CLAUDE.md packages/storage/README.md packages/database/README.md apps/api/README.md
pnpm db:drift
pnpm check-types
pnpm lint
pnpm test
```

Expected: `db:drift` says `No difference detected.`; all green (Postgres up and rebuilt in Task 1). Biome may report that it does not handle `.md`: that is fine, it skips them.

- [x] **Step 4: Check the public read on the Local stack**

Only if the API is already running on `:3300` (never start or kill a server you did not start): `curl -s 'http://localhost:3300/v1/images?app=LAURA'`.
Expected: `200` with `{"images":[],"nextCursor":null}` (the rebuilt database holds no Images), no cookie needed.

## Implementation Log
- Implemented: 2026-10-08T17:26:24Z
- Workspace: current-branch — feat/design-package
- Committed: no — awaiting user review
