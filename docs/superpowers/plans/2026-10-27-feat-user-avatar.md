# User Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Admin adding a User in the Back Office can give them an Avatar, cropped in the browser, stored as a 256x256 AVIF, shown wherever `UserAvatar` draws the User.

**Architecture:** The storage package gains an `avatar` feature: a `public` bucket, a sibling of `image` with the same read-only policy, for every file meant to be read by anyone holding its address (Avatars are its first kind; a later decision on private Images can change `image` without it, `TODO.md` **Images**), processing to a square AVIF, unguessable keys, the `/storage/public/<key>` address. The User module (`packages/auth`) gains `PUT`/`DELETE /users/:id/avatar` and deletes Avatars with their Users, through dependencies the API passes in (it never imports storage). The Back Office form gets an AOF Avatar field built on DiceUI's File Upload and Cropper (Base UI): the browser crops to 512x512 and the `addUser` action sends that file after creating the User.

**Tech Stack:** sharp (via the Image module), Hono + hono-openapi, Prisma, Next 16 Server Actions, TanStack Form (AOF), DiceUI File Upload and Cropper (shadcn CLI, base-nova), Vitest (unit, integration, browser), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-user-avatar-design.md` (survey: `docs/superpowers/specs/2026-10-27-avatar-upload-library-survey.md`). Glossary: `CONTEXT.md` **Avatar**.

## Global Constraints

- An Avatar is not an Image: no `image` schema row, no placements, no alt text.
- Stored shape: square, 256x256, AVIF. Browser crop output: 512x512.
- Storage: a sibling bucket `public` (`env.STORAGE_PUBLIC_BUCKET`, default `STORAGE.BUCKET.PUBLIC` = `"public"`): every file in it is readable by anyone holding its address, never listed (anonymous `s3:GetObject` only, as `image`); its first kind is the Avatar, key `avatar-<userId>-<uuid>.avif` (one path segment: the rewrite matches one segment), new on every change; the old file deleted after `User.image` points at the new one.
- `User.image` holds `${STORAGE.PATH.PUBLIC_PROXY}/<key>` (`/storage/public/<key>`) for our Avatars; any other value (a provider's URL) is left alone and never deleted from storage.
- Who may `PUT`/`DELETE` an Avatar: `canManageUsers` (read fresh), as `POST`/`DELETE /users`.
- Errors: the Image module's `IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE` (415) and `IMAGE_TOO_LARGE` (413), core's `NOT_FOUND` (404), `PAYLOAD_TOO_LARGE` (413) for a body over the limit; never a string literal code.
- Input limit: `IMAGE.LIMIT.FILE_BYTES` (20 MiB) and the Image module's megapixel cap; accepted: JPEG, PNG, WebP, AVIF, HEIC.
- Repo rules (`CLAUDE.md`): tests first, `// @module-tag` on every test file, no `as` casts, constants one object per owner, paths never literals, AOF forms (`useAOFForm`, `submitAOFForm`), vendor code only through the shadcn CLI then `pnpm --filter @allonfire/shadcn canonicalize`, AOF components in `packages/ui` with a test, translations en + it with `pnpm i18n:check`, Japan Design corners (`rounded-lg`, never `rounded-full`).
- Never commit (the owner commits with `/iso-commit`); every "Commit" step below is a checkpoint: run the checks, leave the tree uncommitted.

## Review Focus

1. A User deleted while their Avatar upload is in flight: `PUT` stores the file, then finds no User; the file must be deleted and the answer 404 (Task 4 test "an unknown User answers 404 and leaves no file").
2. A User signed up through a provider (`User.image` an `https://` URL): replacing, removing or deleting them must never try to delete a storage key (Task 1 test on `avatarKeyOf`, Task 4 test "a provider's picture is replaced but never deleted from storage").
3. A HEIC picked in Chrome: the browser cannot draw it, so the field refuses it with the translated message and keeps the form submittable without a picture (Task 7 browser test "refuses a file the browser cannot draw").
4. The Avatar upload failing after the User was created: the User stays, the list opens, and a toast says the picture was not saved (Task 8 browser test and e2e).
5. A picked file removed again before submitting: nothing is sent, so no `PUT` (Task 7 test "removing the picture clears the field and its hidden input"; spec's "check once installed").

---

### Task 1: Storage: Avatar processing and addresses

**Files:**
- Modify: `packages/storage/src/features/image/prepare/prepare-image.ts` (extract `decodeUpright`)
- Modify: `packages/storage/src/features/image/hono/utils/errors.ts` (add `asImageError`), `packages/storage/src/features/image/hono/utils/upload-batch.ts` (use it)
- Create: `packages/storage/src/features/avatar/constants/avatar.ts`, `packages/storage/src/features/avatar/prepare-avatar.ts`, `packages/storage/src/features/avatar/utils/avatar-address.ts`
- Modify: `packages/storage/src/shared/constants/paths.ts` (`STORAGE.PATH.PUBLIC_PROXY`, `STORAGE.BUCKET.PUBLIC`), `packages/storage/package.json` (one export line per new file)
- Test: `packages/storage/src/features/avatar/tests/prepare-avatar.test.ts`, `packages/storage/src/features/avatar/tests/avatar-address.test.ts`

**Interfaces:**
- Produces:
  - `AVATAR` = `{ KEY_PREFIX: "avatar-", SIZE: 256, CROP_SIZE: 512, INPUT_BYTES: IMAGE.LIMIT.FILE_BYTES, QUALITY: <number> } as const`
  - `decodeUpright(input: Buffer): Promise<Sharp>`: header read, accepted-format check, megapixel cap, HEIC path, EXIF rotation (what `prepareImage` does before resizing); throws `UnsupportedImageError` / `ImageTooLargeError`
  - `asImageError(error: unknown): never` (the mapping now inside `prepareFile`: 413 `IMAGE_TOO_LARGE` with `{ limit: IMAGE.LIMIT.INPUT_MEGAPIXELS }`, 415 `UNSUPPORTED_IMAGE`, else rethrow)
  - `prepareAvatar(input: Buffer): Promise<Buffer>`: `decodeUpright`, then `resize({ width: 256, height: 256, fit: "cover", position: "centre" })`, `.avif({ quality: AVATAR.QUALITY })`; failures through `asImageError`
  - `avatarKey(userId: string): string` → `avatar-<userId>-<crypto.randomUUID()>.avif` (`AVATAR.KEY_PREFIX`: the kind, since the public bucket holds more than Avatars)
  - `avatarAddress(key: string): string` → `${STORAGE.PATH.PUBLIC_PROXY}/${key}`, with `STORAGE.PATH.PUBLIC_PROXY` = `${BASE}/public` and `STORAGE.BUCKET.PUBLIC` = `"public"` added here
  - `avatarKeyOf(image: string | null): string | null` → the key when `image` starts with `${STORAGE.PATH.PUBLIC_PROXY}/${AVATAR.KEY_PREFIX}`, else null

- [ ] **Step 1: Write the failing tests**

```ts
// prepare-avatar.test.ts (@module-tag unit), reading IMAGE_FIXTURE_FILES
it("makes a 256x256 AVIF from a landscape photo", async () => {
  const out = await prepareAvatar(await readFile(join(IMAGE_FIXTURE_FILES, "photo.jpg")));
  const meta = await sharp(out).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["heif", AVATAR.SIZE, AVATAR.SIZE]);
});
it("reads HEIC", /* colors-no-alpha.heic → 256x256 */);
it("refuses an animation as UNSUPPORTED_IMAGE (415)", async () => {
  await expect(prepareAvatar(gif)).rejects.toMatchObject({ code: IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE, status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE });
});
it("refuses bytes that are no image as UNSUPPORTED_IMAGE", /* Buffer.from("text") */);

// avatar-address.test.ts (@module-tag unit)
it("names a new key every time, one path segment", () => {
  const [a, b] = [avatarKey("u1"), avatarKey("u1")];
  expect(a).not.toBe(b);
  expect(a).toMatch(/^avatar-u1-[0-9a-f-]{36}\.avif$/);
});
it("reads the key back from its address", () => expect(avatarKeyOf(avatarAddress(key))).toBe(key));
it("leaves a provider's picture and no picture alone", () => {
  expect(avatarKeyOf("https://lh3.googleusercontent.com/a/x")).toBeNull();
  expect(avatarKeyOf(`${STORAGE.PATH.IMAGE_PROXY}/someimage.avif`)).toBeNull(); // an Image, not an Avatar
  expect(avatarKeyOf(null)).toBeNull();
});
```

- [ ] **Step 2:** Run `pnpm --filter @allonfire/storage exec vitest run src/features/avatar` → FAIL (modules missing).
- [ ] **Step 3:** Extract `decodeUpright` and `asImageError` (the Image module's tests stay green, untouched), then write `prepareAvatar` and the address helpers with the signatures above.
- [ ] **Step 4:** Run `pnpm --filter @allonfire/storage test` and `pnpm --filter @allonfire/storage check-types` → all PASS.
- [ ] **Step 5: Checkpoint** (scoped `biome check --write`, no commit).

### Task 2: Storage: the public bucket

**Files:**
- Modify: `packages/storage/src/environment/environment.ts` (`STORAGE_PUBLIC_BUCKET`, default `STORAGE.BUCKET.PUBLIC`)
- Create: `packages/storage/src/features/avatar/objects/avatar-objects.ts`
- Modify: `packages/storage/src/features/image/setup/cli.ts` and `setup-bucket.ts` (create both buckets, same read-only policy), `packages/storage/src/features/test-bucket/*` (a run bucket for public files too, dropped with the run's), `packages/storage/src/features/image/next/with-storage-images.ts` (a second rewrite `/storage/public/:key` to the public bucket, and its `localPatterns` entry), `packages/config/tests/e2e/playwright.config.ts` (pass the run's public bucket to the API and the build), `apps/back-office/next.config.ts` and `src/environment/build-environment.ts`, `apps/api/.env.example`, `apps/back-office/.env.example`, `docker/docker-compose.dev.yml` and `docker-compose.prod.yml` (the variable where `STORAGE_BUCKET` is set), `packages/storage/README.md`
- Test: `packages/storage/src/features/avatar/objects/tests/avatar-objects.test.ts`, `packages/storage/src/features/image/setup/tests/setup-bucket.integration.test.ts`, `packages/storage/src/features/test-bucket/tests/test-bucket.integration.test.ts`, `packages/storage/src/features/image/next/tests/*` (the rewrite)

**Interfaces:**
- Consumes: Task 1's `STORAGE.BUCKET.PUBLIC`, `STORAGE.PATH.PUBLIC_PROXY`.
- Produces: `putAvatarObject(key: string, body: Buffer, bucket = env.STORAGE_PUBLIC_BUCKET): Promise<void>` (content type AVIF, the Image module's cache control), `deleteAvatarObjects(keys: readonly string[]): Promise<void>` (both on the public bucket); `withStorageImages(config, { bucket, publicBucket = STORAGE.BUCKET.PUBLIC, origin })`.

- [ ] **Step 1: Write the failing tests:** `putAvatarObject` writes to the public bucket with `image/avif`; setup creates `public` with anonymous `s3:GetObject` and no listing, only when missing; a test run creates and drops its public bucket beside its image bucket; `withStorageImages` rewrites `/storage/public/:key` to the public bucket's object and never the bucket root.
- [ ] **Step 2:** Run `pnpm --filter @allonfire/storage test` (integration needs `pnpm docker:up`) → FAIL.
- [ ] **Step 3:** Implement the variable, the path, the objects, the setup, the test runs and the rewrite; wire the env files and compose.
- [ ] **Step 4:** Run `pnpm --filter @allonfire/storage test`, `pnpm --filter @allonfire/config test` (the local-addresses guard reads the `.env.example` files) → PASS.
- [ ] **Step 5: Checkpoint.**

### Task 3: Database: a User's picture

**Files:**
- Modify: `packages/database/src/features/auth/user.service.ts`
- Test: `packages/database/src/features/auth/tests/user.integration.test.ts`

**Interfaces:**
- Produces:
  - `setUserImage(id: string, image: string | null): Promise<{ previous: string | null } | null>`: one transaction (read then update); `null` when no User has `id`
  - `userImages(ids: readonly string[]): Promise<string[]>`: the non-null `image` of those Users

- [ ] **Step 1: Write the failing tests** (against the run's Test database, a User created in the test):

```ts
it("sets a picture and answers the one it replaced", async () => {
  expect(await setUserImage(id, A)).toEqual({ previous: null });
  expect(await setUserImage(id, B)).toEqual({ previous: A }); // A, B: two avatarAddress(avatarKey(id)) values
});
it("answers null for an unknown User", async () => expect(await setUserImage("missing", null)).toBeNull());
it("lists the pictures of the Users named, skipping none-set and unknown ids", ...);
```

- [ ] **Step 2:** Run `pnpm --filter @allonfire/database exec vitest run src/features/auth/tests/user.integration.test.ts` → FAIL.
- [ ] **Step 3:** Implement both in `user.service.ts`; add them to the services list in `CLAUDE.md` (Database Schema Quick Reference).
- [ ] **Step 4:** Run the same command → PASS.
- [ ] **Step 5: Checkpoint.**

### Task 4: User module: Avatar routes and cleanup on delete

**Files:**
- Modify: `packages/auth/src/features/users/constants/users.ts` (`USER.PATH.AVATAR: "/:id/avatar"`, `USER.DOC.AVATAR_PUT_*`, `USER.DOC.AVATAR_DELETE_*`; the size limit comes from the Host as `deps.avatarMaxBytes`, since the module never imports storage)
- Modify: `packages/auth/src/features/users/hono/utils/deps.ts`, `hono/constants/schemas.ts`, `hono/routes/routes.ts`, `hono/routes/handlers.ts`, `hono/routes/index.ts`
- Test: `packages/auth/src/features/users/hono/tests/avatar.test.ts`, extend `delete.test.ts`, `test-host.ts` stubs

**Interfaces:**
- Consumes: Task 3's `setUserImage`, `userImages` (as types only).
- Produces (`UserDeps` additions):
  - `setUserImage: typeof setUserImage`, `userImages: typeof userImages`
  - `saveAvatar: (userId: string, file: Buffer) => Promise<string>`: processes and stores; answers the new `User.image` address; throws `CodedError` for a bad picture
  - `deleteAvatars: (images: readonly (string | null)[]) => Promise<void>`: deletes the stored files among them, ignores anything else
  - `avatarMaxBytes: number`
- Routes (chained in `userRoutes`):
  - `PUT USER.PATH.AVATAR`: `canManage(deps)`, `bodyLimit({ maxSize: deps.avatarMaxBytes, onError: 413 PAYLOAD_TOO_LARGE })`, `validator("form", z.object({ file: z.instanceof(File) }), invalidHook)`, `validator("param", z.object({ id: z.string().min(1) }))`. Order: `saveAvatar` → `setUserImage(id, image)`; `null` → `deleteAvatars([image])` then 404; else `deleteAvatars([previous])`, answer 200 `{ image }` (`userAvatarBodySchema`)
  - `DELETE USER.PATH.AVATAR`: `canManage(deps)`; `setUserImage(id, null)`; `null` → 404; else `deleteAvatars([previous])`, 204
  - `DELETE USER.PATH.DELETE` (exists): `userImages(ids)` before `deleteUsers`, `deleteAvatars(images)` after it
- Docs: `describeRoute` for both, bodies from their zod schemas, errors as `problemResponseRef(status)` (401, 403, 404, 413, 415)

- [ ] **Step 1: Write the failing tests** in `avatar.test.ts` (`@module-tag unit`, `testHost` with stub deps recording calls):

```ts
it("stores the picture and answers its address", async () => {
  const res = await putAvatar(admin, USER_ID, file);
  expect(res.status).toBe(HTTP.STATUS.OK);
  expect(await res.json()).toEqual({ image: NEW_IMAGE });
  expect(deps.setUserImage).toHaveBeenCalledWith(USER_ID, NEW_IMAGE);
});
it("deletes the picture it replaced", /* previous = OLD_IMAGE → deleteAvatars([OLD_IMAGE]) */);
it("an unknown User answers 404 and leaves no file", /* setUserImage → null; deleteAvatars([NEW_IMAGE]); 404 */);
it("a provider's picture is replaced but never deleted from storage", /* previous = "https://lh3…"; deleteAvatars called with it; the real dep ignores it, Task 4 */);
it("refuses anyone who cannot manage Users (403) and a visitor (401)", ...);
it("refuses a body over the limit with PAYLOAD_TOO_LARGE (413)", ...);
it("passes saveAvatar's CodedError through (415 UNSUPPORTED_IMAGE)", ...);
it("DELETE removes the picture: 204, setUserImage(id, null), deleteAvatars([previous])", ...);
it("DELETE an unknown User's picture answers 404", ...);
// delete.test.ts
it("deletes the deleted Users' pictures after the rows", /* call order: userImages, deleteUsers, deleteAvatars */);
```

- [ ] **Step 2:** Run `pnpm --filter @allonfire/auth exec vitest run src/features/users` → FAIL.
- [ ] **Step 3:** Implement the deps, schemas, routes and handlers above.
- [ ] **Step 4:** Run `pnpm --filter @allonfire/auth test && pnpm --filter @allonfire/auth check-types` → PASS.
- [ ] **Step 5: Checkpoint.**

### Task 5: API: wire the Avatar dependencies

**Files:**
- Modify: `apps/api/src/features/users/user-deps.ts`, `apps/api/src/shared/tests/app-deps.ts` (stubs), `apps/api/src/features/docs/tests/spec.test.ts`
- Test: `apps/api/src/features/users/tests/users.integration.test.ts`, `apps/api/src/features/users/tests/user-deps.test.ts`

**Interfaces:**
- Consumes: Task 1 (`prepareAvatar`, `avatarKey`, `avatarAddress`, `avatarKeyOf`, `AVATAR`), Task 2 (`putAvatarObject`, `deleteAvatarObjects`), Task 3 (`setUserImage`, `userImages`), Task 4's `UserDeps`.
- Produces: `userDeps()` with `saveAvatar = async (userId, file) => { const key = avatarKey(userId); await putAvatarObject(key, await prepareAvatar(file)); return avatarAddress(key); }`, `deleteAvatars = (images) => deleteAvatarObjects(keys)` with `keys = images.map(avatarKeyOf)` non-null, nothing called when empty; `avatarMaxBytes: AVATAR.INPUT_BYTES`.

- [ ] **Step 1: Write the failing tests:**
  - `user-deps.test.ts`: `deleteAvatars` calls `deleteAvatarObjects` with only our keys and not at all for `[null, "https://…"]` (storage mocked).
  - `users.integration.test.ts` (signs in as `FIXTURE.USER.BACK_OFFICE.ADMIN`, run bucket): `PUT /v1/users/:id/avatar` with `photo.jpg` answers 200 and an address whose key exists in the run's public bucket as a 256x256 AVIF; a second `PUT` deletes the first key; `DELETE` empties `User.image` and deletes the key; `DELETE /v1/users` with that User deletes the key.
  - `spec.test.ts`: the OpenAPI document lists `put` and `delete` on `${API.PATH.USERS}/{id}/avatar` under the `Users` tag.
- [ ] **Step 2:** Run `pnpm --filter @allonfire/api exec vitest run src/features/users src/features/docs` → FAIL.
- [ ] **Step 3:** Implement the deps above.
- [ ] **Step 4:** Run `pnpm --filter @allonfire/api test && pnpm --filter @allonfire/api check-types` → PASS.
- [ ] **Step 5: Checkpoint.**

### Task 6: Vendor components: DiceUI File Upload and Cropper

**Files:**
- Create (by the CLI only): `packages/shadcn/src/components/file-upload.tsx`, `packages/shadcn/src/components/cropper.tsx` (and any `direction` item it adds)
- Modify if a file is not strict TypeScript: `packages/shadcn/src/components/tsconfig.json` (`"files"`), `packages/shadcn/tsconfig.json` (`"exclude"`), then `pnpm --filter @allonfire/shadcn vendor:types` writes its `.d.ts`
- Test: `packages/ui/src/components/tests/shadcn-compat.test.tsx` (existing guard)

- [ ] **Step 1:** From `apps/back-office`: `npx shadcn@4.21.0 add https://diceui.com/r/base-nova/file-upload.json https://diceui.com/r/base-nova/cropper.json`, then `pnpm --filter @allonfire/shadcn canonicalize`.
- [ ] **Step 2:** Run `pnpm --filter @allonfire/shadcn check-types`. If a vendor file fails strict mode, put it in the lenient list as `GooeyNav.tsx` is and run `vendor:types`. Never edit the vendor files.
- [ ] **Step 3:** Run `pnpm --filter @allonfire/ui test` → `shadcn-compat` PASS (each component in exactly one list, `.d.ts` present when lenient).
- [ ] **Step 4: Checkpoint.**

### Task 7: ui: the Avatar field

**Files:**
- Create: `packages/ui/src/components/aof-dialog.tsx` (shadcn `dialog` wrapped, as `AOFAlertDialog` wraps its own), `packages/ui/src/lib/crop-image.ts`, `packages/ui/src/components/aof-avatar-crop-dialog.tsx`, `packages/ui/src/components/aof-avatar-field.tsx`
- Modify: `packages/ui/src/lib/form.ts` (register `AvatarField`)
- Test: `packages/ui/src/components/tests/aof-dialog.test.tsx`, `aof-avatar-field.test.tsx` (unit, static render); `apps/back-office/src/features/users/components/tests/avatar-field.browser.test.tsx` (behaviour, real Chromium and WebKit)

**Interfaces:**
- Consumes: Task 6's components; Task 1's `AVATAR.CROP_SIZE`, `AVATAR.INPUT_BYTES`.
- Produces:
  - `cropToSquare(source: CanvasImageSource, area: { x: number; y: number; width: number; height: number }, size: number): Promise<Blob>` (canvas `drawImage` of `area` into `size`x`size`, `toBlob("image/webp")`)
  - `canDraw(file: File): Promise<boolean>` (`createImageBitmap` succeeds)
  - `AOFAvatarCropDialog({ open, src, labels, onCancel, onUse(file: File) })`: Cropper with `aspectRatio={1}`, `shape="rectangle"`, a zoom slider (shadcn `slider`), Cancel and Use; Use crops through `cropToSquare(…, AVATAR.CROP_SIZE)` and hands a `File` named `avatar.webp`
  - `AOFAvatarField({ label, labels, name? })` read through `useFieldContext<File | null>()`: a 96px square tile (`rounded-lg`, the preview or an empty tile) with "Choose a picture" beside it; click, drop or paste opens the crop dialog; Use sets the field's value and DiceUI's synced hidden input (`name` = the field's name) to the cropped file; Change / Crop again (the original kept in memory) when set; an X removes it; refuses a file over `AVATAR.INPUT_BYTES` or one `canDraw` rejects with `labels.tooLarge` / `labels.unreadable` in the field's error line
  - `labels` type: `{ choose, change, cropAgain, remove, dialogTitle, zoom, use, cancel, tooLarge, unreadable }: string` each

- [ ] **Step 1: Write the failing tests:**
  - unit: `AOFAvatarField` renders the label, an empty square tile with `rounded-lg` and no `rounded-full`, and a file input named as the field.
  - browser (`@module-tag integration`, the Back Office's `NextIntlClientProvider` + a `useAOFForm` harness): "picking a photo opens the crop dialog; Use shows a 512x512 preview and the hidden input holds one `image/webp` file"; "refuses a file the browser cannot draw" (a `.heic` built from bytes Chromium cannot decode; skip the assertion in WebKit, which can) "and the form still submits"; "removing the picture clears the field and its hidden input"; "Crop again reopens the dialog on the same original".
- [ ] **Step 2:** Run `pnpm --filter @allonfire/ui test` and `pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/users/components/tests/avatar-field.browser.test.tsx` → FAIL.
- [ ] **Step 3:** Implement the components with the signatures above (cva for states, `cn` for joins, Japan Design tokens only).
- [ ] **Step 4:** Run both commands again, plus `pnpm --filter @allonfire/back-office tailwind:check` → PASS.
- [ ] **Step 5: Checkpoint.**

### Task 8: Back Office: Add a User sends the Avatar

**Files:**
- Modify: `apps/back-office/src/features/users/components/add-user.tsx` (the field, first block of the left column), `apps/back-office/src/features/users/actions/add-user.ts`, `apps/back-office/src/features/users/utils/add-user-schema.ts` (`avatar: z.instanceof(File).nullable()` in the client schema; never in the action's returned `values`), `apps/back-office/src/features/users/constants/users.ts` (`USERS.ADD_NOTICE.AVATAR_FAILED`)
- Modify: `apps/back-office/src/features/i18n/translations/en.json`, `it.json` (`Users.add.avatar.*`: `label` "Picture" / "Foto", the ten `labels`, `failed` "User added; the picture was not saved." / "Utente aggiunto; la foto non è stata salvata.")
- Test: `apps/back-office/src/features/users/components/tests/add-user.browser.test.tsx`, `apps/back-office/e2e/users.spec.ts`

**Interfaces:**
- Consumes: Task 7's `field.AvatarField`; Task 4's routes through the typed client (`client[API.VERSION.CURRENT].users[":id"].avatar.$put({ form: { file }, param: { id } })`).
- Produces: `addUser` reads `form.get("avatar")` (a non-empty `File` or nothing). After a 201 it `PUT`s the file when present; any non-200 answer returns `{ notice: USERS.ADD_NOTICE.AVATAR_FAILED }` instead of redirecting. `updateTag(USERS.CACHE.TAG)` runs before either outcome. `AddUser` on that notice sends the `failed` toast (`useAOFToast`) and `router.replace`s to the list.

- [ ] **Step 1: Write the failing tests:**
  - browser (action mocked): "the picture field is the form's first block"; "a notice of a failed picture toasts and goes to the list".
  - e2e (`users.spec.ts`): "adds a User with a picture: the list shows it" (`setInputFiles` with `IMAGE_FIXTURE_FILES/photo.jpg`, Use in the dialog, submit; the new row's avatar `img` loads a `/storage/public/avatar-` address with natural size > 0); "deleting that User removes the picture" (that address answers 404 after the deletion, through `page.request`).
- [ ] **Step 2:** Run the browser test and `pnpm exec playwright test e2e/users.spec.ts --project=chromium` → FAIL.
- [ ] **Step 3:** Implement the field placement, the action and the notice.
- [ ] **Step 4:** Run the App's unit, browser and full Users e2e (all four projects), `pnpm i18n:check`, `tailwind:check` → PASS.
- [ ] **Step 5: Checkpoint.**

### Task 9: Docs

**Files:**
- Modify: `CLAUDE.md` (User service list: `setUserImage`, `userImages`; the User module's Avatar routes in the Auth guards bullet; the `public` bucket beside `image` (anyone holding a file's address reads it; Avatars its first kind) and `STORAGE_PUBLIC_BUCKET` in the env lists; Google's `overrideUserInfoOnSignIn` stays off), `packages/auth/README.md` (the two routes), `packages/storage/README.md` if it lists features

- [ ] **Step 1:** Write the lines above, matching the files' existing voice.
- [ ] **Step 2:** Run the repo's end-of-task checks: scoped `pnpm exec biome check --write`, `pnpm check-types`, `pnpm lint`, `pnpm test` → all PASS.
- [ ] **Step 3: Checkpoint.**
