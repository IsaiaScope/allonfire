# Avatars and Signed Picture Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every stored picture sits in a closed bucket and reaches the browser only through links the API signed for an image server (imgproxy); on that base, an Admin adding a User can give them an Avatar, and an Image becomes public or private as a whole.

**Status:** implemented (uncommitted) @ 2026-10-28T14:04:39+01:00

**Architecture:** Part 1 closes storage (the `image` bucket loses its anonymous read policy), adds the `image-server` container and one signing function in the storage package. Part 2 builds Avatars: processing, the User module's `PUT`/`DELETE /users/:id/avatar`, and the Add a User field (DiceUI File Upload and Cropper, cropped in the browser). Part 3 moves Images to ADR 0027: `Image.access` replaces `ImageApp.public`, the API returns signed `srcSet`s, and `AOFStorageImage` loads them through a `next/image` loader.

**Tech Stack:** imgproxy (Docker), MinIO, sharp, Hono + hono-openapi, Prisma + Liquibase, Next 16 (`next/image` custom loader, Server Actions), TanStack Form (AOF), DiceUI (shadcn CLI, base-nova), Vitest (unit, integration, browser), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-user-avatar-design.md` (the access tables are there), ADR `docs/adr/0027-an-image-is-public-or-private-and-served-through-signed-links.md`, survey `docs/superpowers/specs/2026-10-27-avatar-upload-library-survey.md`, glossary `CONTEXT.md` (**Image**, **Avatar**).

## Global Constraints

- No bucket is readable anonymously. The one bucket, `image` (`env.STORAGE_BUCKET`, default `IMAGE.BUCKET.DEFAULT`, both unchanged), holds Images (`<uuid>.avif`) and Avatars (`avatar-<userId>-<uuid>.avif`).
- Every stored picture reaches a browser only as an image-server link signed by the API (HMAC-SHA256 over salt + path, imgproxy's scheme). Public Images: no expiry. Private Images and Avatars: `expires` = the end of the hour after the next full hour starts (`ceil(now / 1h) * 1h + 1h`, so a link stays the same within an hour and lasts at least an hour).
- `User.image` holds an Avatar's file name (`avatar-<userId>-<uuid>.avif`) or a provider's `https://` picture, never a signed link: the API signs on every read (the User module's list and `PUT` answer, the Session's `customSession`) for those who share an App with the User, manage Users, or are the User.
- A provider's `https://` picture in `User.image` (Google's, `lh3.googleusercontent.com`) goes through Next's optimizer: the auth package's `withProviderPictures(config)` (`features/next/utils/with-provider-pictures`) adds `AUTH.PICTURE_HOSTS` to `images.remotePatterns` (https only, added to the App's own); `UserAvatar` never sets `unoptimized` or `referrerPolicy` for it. A stored picture never goes through the optimizer. What the tile shows in each case is the spec's "What a User's tile shows" table.
- A cache holding signed links never outlives them: the Users list's `USERS.CACHE.LIFE` becomes `{ stale: 300, revalidate: 1800, expire: 3600 }`.
- Image widths: `640, 1080, 1920, 2560`. Avatar: one link at `256`; the stored Avatar is 256x256 AVIF; the browser crop is 512x512.
- An Image is `access: "public" | "private"` as a whole (ADR 0027): public, anyone; private, those who enter at least one of its Apps (`canEnterApp`). Changing it: Admin in every App it is in (`canManageEverywhere`). Default at upload: private. Public to private renames the file.
- Avatar `PUT`/`DELETE`: `canManageUsers`, read fresh. Avatar errors: `IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE` (415), `IMAGE_TOO_LARGE` (413), core `NOT_FOUND` (404), `PAYLOAD_TOO_LARGE` (413). Never a string-literal code.
- Docker service `image-server` (`allonfire-image-server`), image `ghcr.io/imgproxy/imgproxy:<pinned>`; the storage package's variables `STORAGE_IMAGE_SERVER_URL`, `STORAGE_IMAGE_SERVER_KEY`, `STORAGE_IMAGE_SERVER_SALT`; compose passes the key and salt to imgproxy as `IMGPROXY_KEY`, `IMGPROXY_SALT`.
- Repo rules (`CLAUDE.md`): tests first; `// @module-tag` on every test file; no `as` casts; constants one object per owner; paths never literals; AOF forms and components; vendor code only through `npx shadcn@4.21.0 add` then `pnpm --filter @allonfire/shadcn canonicalize`; translations en + it with `pnpm i18n:check`; Japan Design corners (`rounded-lg`, never `rounded-full`); Liquibase changesets only (`pnpm db:changeset`), never `prisma db push`.
- Never commit: each "Checkpoint" runs the checks and leaves the tree uncommitted (the owner commits with `/iso-commit`).

## Review Focus

1. A link signed for one key used for another, or a width changed by hand: imgproxy must answer 403 (Task 3 integration test "a tampered link is refused").
2. A private Image's link after its hour: 404 (Task 3 "an expired link answers 404"); a public-turned-private Image's old link: 404 at once (Task 12 "making it private kills its public links").
3. A User deleted while their Avatar upload is in flight: the stored file is deleted and the answer is 404 (Task 6 "an unknown User answers 404 and leaves no file").
4. A provider's picture in `User.image` (`https://lh3…`): replacing, removing or deleting the User never tries to delete a storage key (Task 4 `avatarKeyOf`, Task 6 test).
5. A HEIC picked in Chrome: refused in the field with the translated message, the form still submits (Task 9 browser test).

---

## Part 1: Closed storage and the image server

### Task 1: Storage: close the `image` bucket

**Files:**
- Modify: `packages/storage/src/features/image/setup/setup-bucket.ts` and `cli.ts` (create `image` when missing with **no** bucket policy; remove a policy if one is set), `docker/docker-compose.dev.yml` and `docker-compose.prod.yml` (`storage-init`: keep `mc mb --ignore-existing local/image`, drop the `mc anonymous set-json` lines)
- Delete: the `/storage/images/:key` rewrite path (`withStorageImages`, `STORAGE.PATH.IMAGE_PROXY`) and its readers: `apps/back-office/next.config.ts`, `packages/ui/src/components/aof-image.tsx` (`AOFStorageImage` gets its new source in Task 13; until then it is not rendered by any page), `apps/back-office/e2e/smoke.spec.ts` ("serves a stored Image through the App…", replaced by Task 3's test), `apps/back-office/e2e/head.spec.ts` and `src/features/auth/components/tests/sign-in.test.tsx` lines naming `IMAGE_PROXY`
- Test: `packages/storage/src/features/image/setup/tests/setup-bucket.integration.test.ts`, `packages/config/local/tests/service-names.test.ts` (unchanged names still pass)

**Interfaces:**
- Produces: `setupBucket(bucket)` creating a closed bucket.

- [x] **Step 1: Write the failing test:** "creates `image` with no policy: an anonymous `GET` of an object answers 403"; "a bucket left with an old read-only policy loses it".
- [x] **Step 2:** `pnpm docker:up`, then `pnpm --filter @allonfire/storage exec vitest run src/features/image/setup` → FAIL.
- [x] **Step 3:** Implement; remove the rewrite and its readers listed above.
- [x] **Step 4:** `pnpm --filter @allonfire/storage test`, `pnpm check-types`, `pnpm --filter @allonfire/back-office test` → PASS.
- [x] **Step 5: Checkpoint.**

### Task 2: The `image-server` container

**Files:**
- Modify: `docker/docker-compose.dev.yml`, `docker/docker-compose.prod.yml` (service `image-server`, container `allonfire-image-server`, `ghcr.io/imgproxy/imgproxy:<pinned>`; `IMGPROXY_USE_S3=true`, `IMGPROXY_S3_ENDPOINT=http://storage:9000`, `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from the storage keys, `IMGPROXY_KEY`/`IMGPROXY_SALT` from `STORAGE_IMAGE_SERVER_KEY`/`_SALT`, `IMGPROXY_ENABLE_AVIF_DETECTION=true`, `IMGPROXY_ENABLE_WEBP_DETECTION=true`, `IMGPROXY_MAX_SRC_RESOLUTION` matching `IMAGE.LIMIT.INPUT_MEGAPIXELS`; healthcheck `imgproxy health`; prod behind Traefik on its own host)
- Modify: `packages/config/local/addresses.ts` (`LOCAL.PORT.IMAGE_SERVER`, `LOCAL.URL.IMAGE_SERVER`), the `.env.example` files (`STORAGE_IMAGE_SERVER_URL`, `_KEY`, `_SALT`; dev key and salt are throwaway hex in the example), `package.json` root `docker:up` wait list if it waits per service
- Test: `packages/config/local/tests/local-files.test.ts` and `service-names.test.ts` (the guard tests read compose and the env examples)

- [x] **Step 1: Write the failing test:** the guards expect `image-server` in both compose files and `LOCAL.URL.IMAGE_SERVER` in the env examples.
- [x] **Step 2:** `pnpm --filter @allonfire/config test` → FAIL.
- [x] **Step 3:** Add the service and the addresses; `pnpm docker:up` starts it healthy.
- [x] **Step 4:** `pnpm --filter @allonfire/config test` → PASS; `curl -s -o /dev/null -w '%{http_code}' $LOCAL_IMAGE_SERVER/health` → `200`.
- [x] **Step 5: Checkpoint.**

### Task 3: Storage: signed image-server links

**Files:**
- Create: `packages/storage/src/features/image-server/constants/image-server.ts`, `packages/storage/src/features/image-server/sign.ts`
- Modify: `packages/storage/src/environment/environment.ts` (the three `STORAGE_IMAGE_SERVER_*`, key and salt hex), `packages/storage/package.json` (exports)
- Test: `packages/storage/src/features/image-server/tests/sign.test.ts` (unit), `packages/storage/src/features/image-server/tests/sign.integration.test.ts` (against the running `image-server` and the run bucket)

**Interfaces:**
- Produces:
  - `IMAGE_SERVER = { WIDTHS: [640, 1080, 1920, 2560], AVATAR_WIDTH: 256, PRIVATE_LINK_HOURS: 1 } as const`
  - `pictureLink({ bucket?, key, width, expiresAt? }: { bucket?: string; key: string; width: number; expiresAt?: Date }): string` → `${STORAGE_IMAGE_SERVER_URL}/<signature>/rs:fit:<width>:0[/exp:<unix>]/plain/s3://<bucket>/<key>`; `bucket` defaults to `env.STORAGE_BUCKET` (`image`)
  - `privateLinkExpiry(now: Date): Date` → `ceil(now / 1h) * 1h + 1h`
  - `pictureSrcSet(key: string, expiresAt?: Date): { width: number; url: string }[]` (one per `IMAGE_SERVER.WIDTHS`)

- [x] **Step 1: Write the failing tests:**

```ts
// sign.test.ts (unit): imgproxy's documented signing example
it("signs as imgproxy expects", () => {
  // docs.imgproxy.net/usage/signing_url: key 736563726574 ("secret"),
  // salt 68656C6C6F ("hello"),
  // path /rs:fill:300:400:0/g:sm/aHR0cDovL2V4YW1w/bGUuY29tL2ltYWdl/cy9jdXJpb3NpdHku/anBn.png
  // signature oKfUtW34Dvo2BGQehJFR4Nr0_rIjOtdtzJ3QFsUcXH8 (checked with Node's crypto, 2026-10-28)
  expect(signPath(path, { key, salt })).toBe("oKfUtW34Dvo2BGQehJFR4Nr0_rIjOtdtzJ3QFsUcXH8");
});
it("adds the expiry only when given", ...);
it("keeps a private link the same within the hour and at least an hour long", () => {
  expect(privateLinkExpiry(new Date("2026-10-28T10:05:00Z"))).toEqual(new Date("2026-10-28T12:00:00Z"));
  expect(privateLinkExpiry(new Date("2026-10-28T10:55:00Z"))).toEqual(new Date("2026-10-28T12:00:00Z"));
});
// sign.integration.test.ts: a Fixture file put in the run bucket
it("serves a signed link at its width, as AVIF for a browser that takes it", ...);
it("refuses an unsigned or tampered link (403)", ...);
it("answers 404 once the link has expired", /* expiresAt in the past */);
it("never serves the bucket directly: an anonymous storage GET answers 403", ...);
```

- [x] **Step 2:** `pnpm --filter @allonfire/storage exec vitest run src/features/image-server` → FAIL.
- [x] **Step 3:** Implement `signPath` (internal), `pictureLink`, `privateLinkExpiry`, `pictureSrcSet` with Node's `crypto` (`createHmac("sha256", Buffer.from(key, "hex")).update(Buffer.from(salt, "hex")).update(path).digest("base64url")`).
- [x] **Step 4:** Same command → PASS.
- [x] **Step 5: Checkpoint.**

## Part 2: Avatars

### Task 4: Storage: Avatar processing and keys

**Files:**
- Modify: `packages/storage/src/features/image/prepare/prepare-image.ts` (extract `decodeUpright`), `packages/storage/src/features/image/hono/utils/errors.ts` (add `asImageError`), `packages/storage/src/features/image/hono/utils/upload-batch.ts` (use it)
- Create: `packages/storage/src/features/avatar/constants/avatar.ts`, `packages/storage/src/features/avatar/prepare-avatar.ts`, `packages/storage/src/features/avatar/utils/avatar-key.ts`, `packages/storage/src/features/avatar/objects/avatar-objects.ts`
- Test: `packages/storage/src/features/avatar/tests/prepare-avatar.test.ts`, `avatar-key.test.ts`

**Interfaces:**
- Consumes: Task 3's `pictureLink`, `IMAGE_SERVER.AVATAR_WIDTH`.
- Produces:
  - `AVATAR = { KEY_PREFIX: "avatar-", SIZE: 256, CROP_SIZE: 512, INPUT_BYTES: IMAGE.LIMIT.FILE_BYTES, QUALITY: <number> } as const`
  - `decodeUpright(input: Buffer): Promise<Sharp>` (header, accepted formats, megapixel cap, HEIC, EXIF rotation; throws `UnsupportedImageError`/`ImageTooLargeError`)
  - `asImageError(error: unknown): never` (413 `IMAGE_TOO_LARGE` with `{ limit: IMAGE.LIMIT.INPUT_MEGAPIXELS }`, 415 `UNSUPPORTED_IMAGE`, else rethrow)
  - `prepareAvatar(input: Buffer): Promise<Buffer>` → centre square 256x256 AVIF (`resize({ width: 256, height: 256, fit: "cover", position: "centre" })`)
  - `avatarKey(userId: string): string` → `avatar-<userId>-<crypto.randomUUID()>.avif`
  - `avatarKeyOf(image: string | null): string | null` → `image` when it starts with `AVATAR.KEY_PREFIX` (our file's name), else null (a provider's `https://` picture, or none)
  - `avatarLink(image: string | null, now: Date): string | null` → our file's name signed as `pictureLink({ key, width: IMAGE_SERVER.AVATAR_WIDTH, expiresAt: privateLinkExpiry(now) })`; a provider's picture unchanged; `null` stays `null`
  - `putAvatarObject(key: string, body: Buffer): Promise<void>`, `deleteAvatarObjects(keys: readonly string[]): Promise<void>` (the `image` bucket)

- [x] **Step 1: Write the failing tests:** 256x256 AVIF from `photo.jpg` and from `colors-no-alpha.heic`; `animation.gif` and text bytes → `UNSUPPORTED_IMAGE` (415); `avatarKey` new each call and `/^avatar-u1-[0-9a-f-]{36}\.avif$/`; `avatarKeyOf(k) === k` for `k = avatarKey("u1")`; `avatarKeyOf("https://lh3.googleusercontent.com/a/x")`, `avatarKeyOf("<uuid>.avif")` (an Image) and `avatarKeyOf(null)` are `null`; `avatarLink(k, now)` is a 256-wide link expiring at `privateLinkExpiry(now)`; `avatarLink("https://lh3…", now)` returns it unchanged.
- [x] **Step 2:** `pnpm --filter @allonfire/storage exec vitest run src/features/avatar` → FAIL.
- [x] **Step 3:** Implement; the Image module's tests stay green untouched.
- [x] **Step 4:** `pnpm --filter @allonfire/storage test && pnpm --filter @allonfire/storage check-types` → PASS.
- [x] **Step 5: Checkpoint.**

### Task 5: Database: a User's picture

**Files:**
- Modify: `packages/database/src/features/auth/user.service.ts`
- Test: `packages/database/src/features/auth/tests/user.integration.test.ts`

**Interfaces:**
- Produces: `setUserImage(id: string, image: string | null): Promise<{ previous: string | null } | null>` (one transaction; `null` when no User has `id`); `userImages(ids: readonly string[]): Promise<string[]>` (their non-null `image`).

- [x] **Step 1: Write the failing tests:** set then replace answers `{ previous: null }` then `{ previous: A }`; unknown id answers `null`; `userImages` skips none-set and unknown ids.
- [x] **Step 2:** `pnpm --filter @allonfire/database exec vitest run src/features/auth/tests/user.integration.test.ts` → FAIL.
- [x] **Step 3:** Implement; list both in `CLAUDE.md`'s services line.
- [x] **Step 4:** Same command → PASS.
- [x] **Step 5: Checkpoint.**

### Task 6: User module: Avatar routes and cleanup on delete

**Files:**
- Modify: `packages/auth/src/features/users/constants/users.ts` (`USER.PATH.AVATAR: "/:id/avatar"`, `USER.DOC.AVATAR_PUT_*`, `USER.DOC.AVATAR_DELETE_*`), `hono/utils/deps.ts`, `hono/constants/schemas.ts`, `hono/routes/routes.ts`, `hono/routes/handlers.ts`, `hono/routes/index.ts`
- Test: `packages/auth/src/features/users/hono/tests/avatar.test.ts`, `delete.test.ts`, `test-host.ts`

**Interfaces:**
- Consumes: Task 5 (types).
- Produces, `UserDeps` additions: `setUserImage`, `userImages`; `saveAvatar(userId: string, file: Buffer): Promise<string>` (processes and stores; answers the file's name for `User.image`; throws `CodedError` for a bad picture); `avatarLink(image: string | null): string | null` (signs for now); `toUserBody(user, avatarLink)` signs every listed User's `image`; `deleteAvatars(images: readonly (string | null)[]): Promise<void>` (deletes the stored files among them, ignores anything else); `avatarMaxBytes: number`.
- Routes (chained):
  - `PUT USER.PATH.AVATAR`: `canManage(deps)`, `bodyLimit({ maxSize: deps.avatarMaxBytes })` → 413 `PAYLOAD_TOO_LARGE`, form `{ file: z.instanceof(File) }`, param `{ id }`. `saveAvatar` → `setUserImage(id, name)`; `null` → `deleteAvatars([name])`, 404; else `deleteAvatars([previous])`, 200 `{ image: deps.avatarLink(name) }`.
  - `DELETE USER.PATH.AVATAR`: `canManage(deps)`; `setUserImage(id, null)`; `null` → 404; else `deleteAvatars([previous])`, 204.
  - `DELETE USER.PATH.DELETE`: `userImages(ids)` before `deleteUsers`, `deleteAvatars(images)` after.
  - Documented through `describeRoute`, bodies from zod, errors as `problemResponseRef` (401, 403, 404, 413, 415).

- [x] **Step 1: Write the failing tests** (`testHost` with stub deps): stores the name and answers its signed link; the list answers each User's `image` through `avatarLink`; deletes the picture it replaced; "an unknown User answers 404 and leaves no file"; "a provider's picture is replaced but never deleted from storage" (`deleteAvatars` receives it; Task 7's real dep ignores it); 403 and 401; 413 over the limit; `saveAvatar`'s 415 passes through; `DELETE` 204 and 404; Users deleted → `userImages`, `deleteUsers`, `deleteAvatars` in that order.
- [x] **Step 2:** `pnpm --filter @allonfire/auth exec vitest run src/features/users` → FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** `pnpm --filter @allonfire/auth test && pnpm --filter @allonfire/auth check-types` → PASS.
- [x] **Step 5: Checkpoint.**

### Task 7: API: wire the Avatar dependencies

**Files:**
- Modify: `apps/api/src/features/users/user-deps.ts`, `apps/api/src/features/auth/auth.ts`, `packages/auth/src/features/server/auth.ts` (`avatarLink` option, used in `customSession`), `apps/api/src/shared/tests/app-deps.ts`, `apps/api/src/features/docs/tests/spec.test.ts`
- Test: `apps/api/src/features/users/tests/user-deps.test.ts`, `users.integration.test.ts`

**Interfaces:**
- Consumes: Tasks 4, 5, 6.
- Produces: `saveAvatar = async (userId, file) => { const key = avatarKey(userId); await putAvatarObject(key, await prepareAvatar(file)); return key; }`; `avatarLink = (image) => avatarLink(image, new Date())` for the module; `createAuth({ …, avatarLink })` (a new option in `packages/auth/src/features/server/auth.ts`) whose existing `customSession` returns `user.image` through it; `deleteAvatars` → `deleteAvatarObjects` of the non-null `avatarKeyOf`s, nothing when none; `avatarMaxBytes: AVATAR.INPUT_BYTES`.

- [x] **Step 1: Write the failing tests:** `deleteAvatars` passes only our keys, none for `[null, "https://…"]`; integration (Admin Fixture, run bucket, running `image-server`): `PUT` with `photo.jpg` → 200, its link loads a 256-wide picture and carries an expiry; `get-session` for that User answers a signed link, never the file's name; a second `PUT` deletes the first key; `DELETE` empties `User.image` and deletes the key; deleting the User deletes the key; the OpenAPI document lists `put` and `delete` on `${API.PATH.USERS}/{id}/avatar` under `Users`.
- [x] **Step 2:** `pnpm --filter @allonfire/api exec vitest run src/features/users src/features/docs` → FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types` → PASS.
- [x] **Step 5: Checkpoint.**

### Task 8: Vendor components: DiceUI File Upload and Cropper

**Files:**
- Create (by the CLI only): `packages/shadcn/src/components/file-upload.tsx`, `cropper.tsx` (and any item they pull in)
- Modify if a file is not strict TypeScript: `packages/shadcn/src/components/tsconfig.json` (`"files"`), `packages/shadcn/tsconfig.json` (`"exclude"`), then `pnpm --filter @allonfire/shadcn vendor:types`

- [x] **Step 1:** From `apps/back-office`: `npx shadcn@4.21.0 add https://diceui.com/r/base-nova/file-upload.json https://diceui.com/r/base-nova/cropper.json`, then `pnpm --filter @allonfire/shadcn canonicalize`.
- [x] **Step 2:** `pnpm --filter @allonfire/shadcn check-types`; a file failing strict mode goes in the lenient list as `GooeyNav.tsx` does. Never edit vendor files.
- [x] **Step 3:** `pnpm --filter @allonfire/ui test` → `shadcn-compat` PASS.
- [x] **Step 4: Checkpoint.**

### Task 9: ui: the Avatar field, and pictures through the image server

**Files:**
- Create: `packages/ui/src/components/aof-dialog.tsx`, `packages/ui/src/lib/crop-image.ts`, `packages/ui/src/lib/image-server-loader.ts`, `packages/ui/src/components/aof-avatar-crop-dialog.tsx`, `packages/ui/src/components/aof-avatar-field.tsx`
- Create: `packages/auth/src/features/next/utils/with-provider-pictures.ts` (and its `package.json` export)
- Modify: `packages/ui/src/lib/form.ts` (register `AvatarField`), `packages/ui/src/components/aof-image.tsx` (accept a `loader`), `apps/back-office/src/shared/components/user-avatar.tsx` (a stored Avatar's picture through the image-server link, not the optimizer; a provider's through the optimizer, `unoptimized` and `referrerPolicy` dropped), `packages/auth/src/shared/constants/auth.ts` (`AUTH.PICTURE_HOSTS: ["lh3.googleusercontent.com"]`), `apps/back-office/next.config.ts` (wraps `withStorageImages(...)` in `withProviderPictures`)
- Test: `packages/ui/src/components/tests/aof-dialog.test.tsx`, `aof-avatar-field.test.tsx`, `packages/ui/src/lib/tests/image-server-loader.test.ts`, `packages/auth/src/features/next/tests/with-provider-pictures.test.ts`; `apps/back-office/src/features/users/components/tests/avatar-field.browser.test.tsx`; the existing `user-avatar` tests

**Interfaces:**
- Consumes: Task 8; Task 4's `AVATAR.CROP_SIZE`, `AVATAR.INPUT_BYTES`.
- Produces:
  - `cropToSquare(source: CanvasImageSource, area: { x: number; y: number; width: number; height: number }, size: number): Promise<Blob>` (canvas, `toBlob("image/webp")`); `canDraw(file: File): Promise<boolean>` (`createImageBitmap`)
  - `srcSetLoader(srcSet: readonly { width: number; url: string }[]): ImageLoader` → the link with the smallest width ≥ the one asked, else the largest; `fixedLoader: ImageLoader` → `src` unchanged (an Avatar's single link)
  - `AOFAvatarCropDialog({ open, src, labels, onCancel, onUse(file: File) })`: Cropper `aspectRatio={1}`, `shape="rectangle"`, a zoom slider, Cancel and Use; Use hands a `File` named `avatar.webp` cropped at `AVATAR.CROP_SIZE`
  - `AOFAvatarField({ label, labels })` through `useFieldContext<File | null>()`: a 96px `rounded-lg` tile with the preview or empty, "Choose a picture" beside it; click, drop or paste opens the dialog; Use sets the value and DiceUI's synced hidden input (named as the field); Change / Crop again (the original kept in memory); an X removes it; refuses a file over `AVATAR.INPUT_BYTES` (`labels.tooLarge`) or one `canDraw` rejects (`labels.unreadable`) in the field's error line
  - `labels`: `{ choose, change, cropAgain, remove, dialogTitle, zoom, use, cancel, tooLarge, unreadable }`, each `string`
  - `withProviderPictures(config: NextConfig): NextConfig`: `images.remotePatterns` gains `{ protocol: "https", hostname }` per `AUTH.PICTURE_HOSTS`, before the App's own; every other image option kept

- [x] **Step 1: Write the failing tests:** unit: `srcSetLoader` picks 1080 for 900 and 2560 for 4000; `fixedLoader` returns `src`; the field renders its label, a `rounded-lg` tile, no `rounded-full`, a file input named as the field. Browser: picking a photo opens the dialog; Use shows a 512x512 preview and the hidden input holds one `image/webp`; "refuses a file the browser cannot draw" (Chromium) and the form still submits; removing the picture clears the field and its hidden input; Crop again reopens on the same original; `UserAvatar` with an image-server link renders an `img` whose `src` is that link; `UserAvatar` with a Google picture renders an `img` whose `src` is `/_next/image?url=` that address, and with `null` only the initial. Unit: `withProviderPictures({})` allows each `AUTH.PICTURE_HOSTS` over https only; given the App's own `localPatterns` and `remotePatterns`, it keeps both and adds its own.
- [x] **Step 2:** `pnpm --filter @allonfire/ui test`; `pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/users/components/tests/avatar-field.browser.test.tsx` → FAIL.
- [x] **Step 3:** Implement (cva for states, `cn` for joins, Design tokens only).
- [x] **Step 4:** Both again, plus `pnpm --filter @allonfire/back-office tailwind:check` → PASS.
- [x] **Step 5: Checkpoint.**

### Task 10: Back Office: Add a User sends the Avatar

**Files:**
- Modify: `apps/back-office/src/features/users/components/add-user.tsx` (the field, first block of the left column), `actions/add-user.ts`, `utils/add-user-schema.ts` (`avatar: z.instanceof(File).nullable()` client-side only, never in the action's returned `values`), `constants/users.ts` (`USERS.ADD_NOTICE.AVATAR_FAILED`; `USERS.CACHE.LIFE` = `{ expire: 3600, revalidate: 1800, stale: 300 }`, its comment saying why: the rows hold hour-long links), `utils/tests/read-users.test.ts` (asserts the new life), `features/i18n/translations/en.json` and `it.json` (`Users.add.avatar.*`: `label` "Picture" / "Foto", the ten labels, `failed` "User added; the picture was not saved." / "Utente aggiunto; la foto non è stata salvata.")
- Test: `apps/back-office/src/features/users/components/tests/add-user.browser.test.tsx`, `apps/back-office/e2e/users.spec.ts`

**Interfaces:**
- Consumes: Task 9's `field.AvatarField`; Task 6's route through the typed client (`client[API.VERSION.CURRENT].users[":id"].avatar.$put({ form: { file }, param: { id } })`).
- Produces: `addUser` reads `form.get("avatar")` (a non-empty `File` or nothing); after a 201 it `PUT`s it when present; a non-200 returns `{ notice: USERS.ADD_NOTICE.AVATAR_FAILED }` instead of redirecting; `updateTag(USERS.CACHE.TAG)` before either outcome. `AddUser` on that notice toasts `failed` (`useAOFToast`) and `router.replace`s to the list.

- [x] **Step 1: Write the failing tests:** browser (action mocked): the field is the form's first block; a failed-picture notice toasts and goes to the list. e2e: "adds a User with a picture: the list shows it" (`setInputFiles` `photo.jpg`, Use, submit; the row's avatar `img` loads from `LOCAL.URL.IMAGE_SERVER` with natural width > 0); "deleting that User removes the picture" (the link answers 404 after the deletion, via `page.request`).
- [x] **Step 2:** The browser test and `pnpm exec playwright test e2e/users.spec.ts --project=chromium` → FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** The App's unit, browser and full Users e2e (four projects), `pnpm i18n:check`, `tailwind:check` → PASS.
- [x] **Step 5: Checkpoint.**

## Part 3: Images, public or private (ADR 0027)

### Task 11: Database: `Image.access` replaces `ImageApp.public`

**Files:**
- Modify: `packages/database/prisma/schema/image.prisma` (`enum ImageAccess { PUBLIC, PRIVATE }` mapped `public`/`private`, `Image.access ImageAccess @default(PRIVATE)`, `ImageApp.public` removed), a new changeset via `pnpm db:changeset image-access`, `packages/database/src/features/auth/access/access.ts` (`ImageLink` removed: `canSeeImage(user: AccessUser | null, image: { access: ImageAccess; apps: readonly App[] }): boolean`; `canManageEverywhere(user, apps: readonly App[])`), `packages/database/src/features/image/image.service.ts` (records carry `access` and `apps: App[]`; `updateImages` takes an `access` change; a `renameImageKey(id, key)` for the public-to-private move), `packages/database/src/features/seed/fixtures/images.ts` (each Fixture `access` + `apps`; `PUBLIC_IN_BACK_OFFICE` stays public, the others private), `packages/database/src/enums` exports if generated
- Test: `packages/database/src/features/auth/access/tests/access.test.ts`, `packages/database/src/features/image/tests/*.integration.test.ts`

**Interfaces:**
- Produces: `ImageAccess` (from `@allonfire/database/enums`), `canSeeImage` and `canManageEverywhere` as above; `ImageRecord` with `access` and `apps: App[]`; `ImageChange` gains `access?: ImageAccess`.

- [x] **Step 1: Write the failing tests:** `canSeeImage`: public → visitor, member and outsider true; private in Laura → visitor false, Laura member true, Back Office-only User false; private in Laura and Back Office → either App's member true. Service: an upload defaults to private; changing `access` persists; Fixtures load.
- [x] **Step 2:** `pnpm db:update` on the Local stack after the changeset, then `pnpm --filter @allonfire/database test` → FAIL.
- [x] **Step 3:** Implement; `pnpm db:drift` clean.
- [x] **Step 4:** `pnpm --filter @allonfire/database test && pnpm check-types` (the readers in storage and the API fail until Task 12; fix their types there) → database PASS.
- [x] **Step 5: Checkpoint.**

### Task 12: Image module: access, signed `srcSet`, and the rename

**Files:**
- Modify: `packages/storage/src/features/image/constants/schemas.ts` (`imageBodySchema`: drop `key`, `apps` becomes `App[]`, add `access` and `srcSet: { width, url }[]`; upload `meta` and patch items take `access`, never per-App `public`), `hono/utils/access.ts` (who may set `access`: `canManageEverywhere`; visibility through the new `canSeeImage`), `hono/utils/upload-batch.ts`, `hono/routes/read-handlers.ts` and `write-handlers.ts`, `hono/utils/deps.ts` (`copyObject` for the rename), `packages/storage/src/features/s3/objects.ts` (`copyObject(bucket, from, to)`), `constants/image.ts` docs strings
- Test: `packages/storage/src/features/image/hono/tests/*`, `apps/api/src/features/image/tests/*.integration.test.ts`

**Interfaces:**
- Consumes: Task 3 (`pictureSrcSet`, `privateLinkExpiry`), Task 11.
- Produces: `toImageBody(image, now: Date)`: public → `pictureSrcSet(key)`; private → `pictureSrcSet(key, privateLinkExpiry(now))`. A patch turning public into private copies the file to a new `<uuid>.avif`, saves the new key in the same transaction as `access`, then deletes the old file.

- [x] **Step 1: Write the failing tests:** a visitor lists only public Images, each with four never-expiring links; a Laura member gets Laura's private Images with links expiring at `privateLinkExpiry(now)`; a Back Office-only User gets none of Laura's private ones; uploading without `access` makes it private; setting `access` needs Admin in every App (403 otherwise, 404 first across the batch as today); "making it private kills its public links" (integration: the old link answers 404 from `image-server`, the new private one 200); the OpenAPI document shows `access` and `srcSet`, no `public` on placements.
- [x] **Step 2:** `pnpm --filter @allonfire/storage test` and `pnpm --filter @allonfire/api exec vitest run src/features/image` → FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Same commands, `pnpm check-types` → PASS.
- [x] **Step 5: Checkpoint.**

### Task 13: `AOFStorageImage` through the image server

**Files:**
- Modify: `packages/ui/src/components/aof-image.tsx` (`AOFStorageImage` reads `srcSet` and uses `srcSetLoader`; width and height from the Image, blur kept), `packages/ui/src/components/tests/*` for it
- Test: `apps/back-office/e2e/smoke.spec.ts` ("serves a stored Image through the image server": the Fixture `PUBLIC_IN_BACK_OFFICE`'s 1080 link answers 200 as AVIF for `Accept: image/avif`; an anonymous storage `GET` of its key answers 403)

**Interfaces:**
- Consumes: Task 9's `srcSetLoader`, Task 12's `ImageBody`.

- [x] **Step 1: Write the failing tests:** the component renders a `next/image` whose `srcset` holds the four signed links and whose `src` is the 1080 one at that width; the smoke e2e above.
- [x] **Step 2:** `pnpm --filter @allonfire/ui test`, `pnpm exec playwright test e2e/smoke.spec.ts --project=chromium` → FAIL.
- [x] **Step 3:** Implement.
- [x] **Step 4:** Same → PASS.
- [x] **Step 5: Checkpoint.**

### Task 14: Docs

**Files:**
- Modify: `CLAUDE.md` (storage: the `image` bucket, now closed, and `image-server`; signed links and their lifetimes; `STORAGE_IMAGE_SERVER_*` in the env lists; the image-server service in the Docker naming line; `Image.access` and the new `canSeeImage` in the access line; the User module's Avatar routes; `setUserImage`, `userImages`; Google's `overrideUserInfoOnSignIn` stays off; a provider's picture goes through the optimizer, allowed by `withProviderPictures` (a new provider adds its host to `AUTH.PICTURE_HOSTS` first); `next/image` for stored pictures uses the image-server loader, never the optimizer; `User.image` holds a name, signed on read; the Users list cache rule: a cache holding signed links never outlives them, replacing the `days` preset sentence), `packages/storage/README.md`, `packages/auth/README.md`, `apps/api/README.md` if it lists env

- [x] **Step 1:** Write the lines, in each file's own voice.
- [x] **Step 2:** End-of-task checks: scoped `pnpm exec biome check --write`, `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm i18n:check` → PASS.
- [x] **Step 3: Checkpoint.**

### Task 15: `image-cache`: nginx in front of the image server

**Files:**
- Modify: `docker/docker-compose.dev.yml`, `docker/docker-compose.prod.yml` (the `image-cache` service, its nginx config inline under `configs` since Production mounts no file from the repo (ADR 0018), identical in both takes the image server's port and Traefik router; `image-server` stays internal), `.husky/pre-commit`, `.github/workflows/ci.yml` (wait for `image-cache`), `packages/config/local/tests/service-names.test.ts`, `packages/storage/src/features/image-server/tests/sign.integration.test.ts`, `CLAUDE.md`, `packages/storage/README.md`

- [x] **Step 1: Failing guards.** `image-cache` runs Locally under its own name; Production routes `IMAGE_SERVER_HOST` to `image-cache`, never to `image-server`. Run `pnpm --filter @allonfire/config test` → FAIL.
- [x] **Step 2: Failing integration.** The same signed link asked twice answers `X-Cache-Status: HIT` the second time; a tampered copy of it still answers 403. Run the storage image-server integration test → FAIL (no header).
- [x] **Step 3: Build it.** The nginx config (key: path plus format from `Accept`; lifetime from imgproxy's `Cache-Control`; only 200 kept; `proxy_cache_lock`; no stale copies; `X-Cache-Status`), the service in both compose files, the waits. Run both tests → PASS.
- [x] **Step 4: Docs.** `CLAUDE.md` (Deployment: the service and why), the storage README.
- [x] **Step 5:** End-of-task checks: scoped `pnpm exec biome check --write`, `pnpm check-types`, `pnpm lint`, `pnpm test` → PASS.

### Task 16: An Avatar's blur, shown from 40 px

**Files:**
- Modify: `packages/storage/src/features/image/prepare/prepare-image.ts` (`blurDataUrlOf`, shared), `packages/storage/src/features/avatar/prepare-avatar.ts` (answers the file and its blur), `packages/storage/src/features/avatar/objects/avatar-objects.ts` (`saveAvatar` answers both)
- Modify: `packages/database/prisma/schema/auth.prisma` (`User.imageBlurDataUrl`), new changeset, `packages/database/src/features/auth/user.service.ts` (`setUserImage(id, picture | null)` sets or clears both; `UserRecord` carries the blur)
- Modify: `packages/auth/src/features/users/hono/{constants/schemas.ts,utils/deps.ts,routes/handlers.ts}` (`imageBlurDataUrl` beside `image`), `packages/auth/src/features/server/auth.ts` (`user.additionalFields.imageBlurDataUrl`, `input: false`; the Session answers it beside the link)
- Modify: `apps/back-office/src/shared/components/user-avatar.tsx` (`blurDataUrl`, used from 40 px), its callers
- Tests beside each

- [x] **Step 1: storage.** Failing: `prepareAvatar` answers a `data:image/webp;base64,` blur; `saveAvatar` answers the name and the blur. Then `blurDataUrlOf` out of `prepareImage`, used by both → PASS.
- [x] **Step 2: database.** Failing integration: `setUserImage` sets the picture and its blur, `null` clears both; a listed User carries the blur. Then the column, `pnpm db:changeset user-image-blur`, review, `pnpm db:update`, `pnpm db:drift` → PASS.
- [x] **Step 3: auth and API.** Failing: the Avatar `PUT` answers `imageBlurDataUrl`; the list answers it beside a link and null beside none; the Session answers it. Then the schemas, deps, handlers, `customSession` → PASS.
- [x] **Step 4: Back Office.** Failing: a 40 px tile with a blur renders next/image's blur placeholder; a 36 px one renders none, and nothing warns. Then `UserAvatar` and its callers → PASS.
- [x] **Step 5:** Docs (`CLAUDE.md`'s `setUserImage`), then scoped `biome check --write`, `pnpm check-types`, `pnpm lint`, `pnpm test`, the Users e2e → PASS.

## Implementation Log
- Implemented: 2026-10-28T14:04:39+01:00
- Workspace: current-branch — feat/users-filters-avatars
- Committed: no — awaiting user review
- Task 15 (image-cache) added and implemented: 2026-10-28 — Ruling: the nginx config lives inline in both compose files, not in `docker/image-cache/nginx.conf`: Production mounts no file from the repo; a guard keeps the two identical.
- Task 15 Ruling: the cache checks every copy with imgproxy (1 s life, then If-None-Match; 304 without resizing) instead of trusting imgproxy's `Cache-Control`: trusting it kept a public Image made private, and a replaced Avatar, answering from the cache (two API integration tests failed). A dead link now dies within 2 s (`IMAGE_SERVER.CACHE_CHECK_SECONDS`); those tests poll for it.
- Task 16 (an Avatar's blur) added and implemented: 2026-10-28 — Ruling: the rule "a blur only beside a link" lives once, in auth's `shared/utils/linked-picture`, read by the Users list, the Avatar `PUT` and the Session; the account menu (32 px) is not handed the blur, which it would never show.
- Task 16 Ruling: the Avatar's blur is next/image's data-URL `placeholder`, not `placeholder="blur"`: a Slow 3G recording showed the latter's 20px SVG blur turning a 42px tile see-through over the green initial. Test: no `feGaussianBlur` in the tile.
- Task 16 Ruling: the tile rule moved to ui's `lib/tile-blur` (`tileBlur`), beside `srcSetLoader`, at Iso's call; `AOFStorageImage` is untouched: measured, the SVG blur's see-through edge follows the size next/image is told, and an Image is told its real size.
