# Admin Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Laura Admin adds pictures to the Gallery from Laura's Upload Section (`/upload`) through the same ui pieces the Back Office's Add Images page runs on, in one all-or-nothing `POST /v1/images` that places each Image in the Laura App only.

**Architecture:** The Add Images form moves out of the Back Office into `packages/ui` (`features/image/upload/`) as `AOFAddImages`: field groups, picture row with its local preview, pick limits, form-data helpers, shared server logic, skeleton, and one `AOFAddImagesDressing` of slots each App fills with its own Design (ADR 0033). The Back Office is put back on top of it first (its tests are the proof), then Laura adds its own `addImage` action, dressing, copy, page and e2e; the Image module's rules (private by default, make-public needs Admin in every App, signed links) are not touched.

**Tech Stack:** Next 16 (Cache Components, Server Actions), TanStack Form (`useAOFForm`) and Query, next-intl, DiceUI `FileUpload` (already `AOFFileUpload`), `heic-to` (already in ui), Hono client, zod 4, Vitest (node and Chromium/WebKit browser), Playwright. No new dependency.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 5, "Photos in Laura", "Roles in Laura", "Parity rule")

## Global Constraints

- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`. A constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers.
- Constants are one nested object per owner (`API`, `AUTH`, `IMAGE`, ...). A path or an error code is never a string literal, tests included. A Tailwind class list is never a constant: `cva`, or inline in `cn`.
- An env var starts with its owner: `STORAGE_`, `DATABASE_`, `AUTH_`, `API_`.
- A package never imports an App. Files go in `src/{environment,shared,features}`. A package's logic never names an App (ADR 0033).
- Server Components by default; `"use client"` only for hooks, event handlers, browser APIs or client libraries. A shared client piece takes strings and ReactNodes; a Design function reaches it through a thin `"use client"` binding file of the App (Phase 1, "Slot rules").
- Every form with fields is an AOF form (`useAOFForm`), never bare `useForm`. Components shared by Apps live in `packages/ui`, named `AOF...`; `packages/shadcn` is written only by the shadcn CLI. Pages are built through `/aof-design`, never plain `/impeccable`.
- A page of any Next App that reads or writes the API follows the data checklist in `docs/guides/next-apps.md`; every plan for one names each point (done per task below, and in "Data checklist" before Task 1).
- A page that waits has a skeleton at the loaded page's sizes with a browser test that compares heights at a wide and a phone width: change the page, change its skeleton in the same edit.
- A stored picture in a Next App shows its blur while it loads (`images.md`); the Upload page shows no stored picture, only local object-URL previews of files just picked (no blur, `unoptimized`, revoked with their row).
- Database changes are Liquibase changesets (none here). exFAT drive: a new scanner ignores `**/._*`.
- A new file's export key mirrors its path without `src/` and `.ts`, one line per file, only for a file an App, another package, a script or a config imports.
- Docs are plain English prose, no emoji, never the word "may" (use can / is allowed to / might); text diagrams use arrows and indentation.
- Do not commit (the owner commits by hand). Reconcile before each task: re-read the files it names, since Phases 1, 3 and 4 land before this one and move paths (`git status`, `git log -5 -- <path>`).

## Review Focus

1. **Back Office drift from the move.** Add Images must look and behave as before (kanji buttons, shared set, Apply to all, refused-batch notice, toast then list). Pinned by the Back Office's own add-image, image-form-parts, image-skeletons browser tests (kept, re-pointed by path only) and `e2e/images.spec.ts`, `images-logic.spec.ts` at Tasks 10, 11, 12.
2. **An Image placed outside Laura, or by someone who is not a Laura Admin.** The form shows no Apps picker, but a tampered post must still land in Laura only, and the API must refuse a Laura User and a Laura Admin naming another App. Pinned by Task 5 (`addImages` with `apps` forced), Task 14 (Laura action posts `["LAURA"]` whatever `rows[0].apps` says) and Task 13 (API integration rows).
3. **HEIC.** The browser must preview an iPhone picture (Chrome has no HEIC) without re-encoding what is sent: the API decodes HEIC itself, and a JPEG round trip would lose quality and add bytes against the 20 MiB per-file cap. Pinned by Task 8 (the posted file is the original HEIC, the preview comes from `heicToJpeg`, a failing decode shows a tile, every object URL is revoked with its row).
4. **A refused batch loses typed rows, or its notice outlives its files.** The form keeps every row and its text; the notice leaves only when the picked files change. Pinned by Task 10 (moved test) and Task 18 (e2e: a text file named `.jpg` is refused with 415, rows stay).
5. **A batch the proxy or Server Action cuts off.** Next buffers a request body to 10 MB and a Server Action takes 1 MB unless told: Laura needs the Back Office's limits or a big batch arrives truncated ("Unexpected end of form"). Pinned by Task 1 (`withImageUploads`) and Task 18 (e2e: two 6 MB pictures).

---

## Decisions this plan takes (correctable)

- **Reuse by `AOFAddImages` plus a dressing, not by copy.** Everything that is the same in both Apps (state, limits, form data, field groups, picture row, preview, refused-batch alert, focus after Remove, toast-then-list, the shared server logic, the skeleton) lives in `packages/ui/src/features/image/upload/`. Everything a Design changes is a slot of `AOFAddImagesDressing`: `Card`, `Picker`, `PickerSkeleton`, `Apply`, `Remove`, `Actions`, `ActionsSkeleton` and the chosen-option colours `choice`. The Back Office fills them with its kanji pieces (`CardFrame`, `ToolbarActionBody`, `FormActions`), Laura with its Design.
- **Default access is private**, in the shared set and in each row, in both Apps. Why: it is the API's own default when `access` is left out; Laura's PRODUCT.md says a private place; a public Image has links that never expire and survive a lost Membership (ADR 0027), so making one public stays a deliberate click. The Access choice stays on screen: a Laura Admin is Admin in every App the Image will be in (Laura only), so the make-public rule of CONTEXT.md Image is met at upload. Edit of access later, and any later placement in another App, stay in the Back Office (spec, "Admin section").
- **Laura offers no Apps picker.** The action forces `apps` to `[App.LAURA]` on the server (`addImages({ apps })`), whatever the form posted; the form's seed value is the same, so the client check passes.
- **HEIC is converted for the preview only; the original file is sent.** `isHeic` and `heicToJpeg` come from `@allonfire/ui/shared/utils/heic-to-jpeg` (Phase 1, Task 9), replacing `heic2any` and `lib/convert-heic.ts`. This also gives the Back Office a real preview in Chrome (it showed a tile); the tile stays for a file that cannot be decoded.
- **File validation: the API is the judge.** `acceptFiles` (count, per file, total, from `IMAGE.LIMIT`) and the dropzone's type and size check spare a round trip; the old `lib/file-validation.ts` limits (10 MiB, 50 MiB, a type set) are dropped. The old sequential upload loop is dropped for one all-or-nothing request.
- **No `STORAGE.CACHE.TAG` / `QUERY.STORAGE.ALL` in Laura** (the brief named them): they belong to the Back Office's Home Storage overview, which Laura does not have, so a call would clear nothing and read as a lie. Laura's action clears `GALLERY.CACHE.TAG` (`apps/laura/src/features/gallery/constants/gallery.ts`, Phase 4 Task 10) and the form refreshes `QUERY.GALLERY.ALL` (`apps/laura/src/shared/constants/query.ts`, Phase 4 Task 10) through `invalidateGallery` (Phase 4 Task 11), which is core's `invalidateAll` and so `invalidateStatic` (Phase 4 Task 1). The API already drops its own bucket listing (`deps.changed()`). If Phase 3 or 4 gave Laura a Storage read, add the two lines then.
- **The browser copy is refreshed with a static-aware call, not a bare `invalidateQueries`.** The Gallery feeds are `staleTime: "static"` queries, and TanStack 5.103.2's `invalidateQueries` never refetches an active static one (Phase 4 Task 0's spike). Phase 4 Task 1 adds core's `invalidateStatic(queryClient, queryKey)` (refetches every loaded page of a mounted static feed through its observers, removes an unmounted static one so the next visit hydrates a fresh first page) and makes `invalidateAll` call it. Laura's `invalidateUpload` therefore ends in `invalidateGallery(queryClient)` (Phase 4 Task 11: `invalidateAll(queryClient, [QUERY.GALLERY.ALL])`), which is `invalidateStatic` on that prefix. It calls `invalidateGallery` and not `invalidateStatic` directly because Phase 4 gives `invalidateStatic` no export key (a key with no reader fails knip) and a second wrapper would be a clone. Task 14 proves the refetch with a real `QueryClient`, not a spy.
- **The Back Office stays on its existing mechanism.** Its Add form's refresh is `invalidateImages` = `invalidateAll(queryClient, [QUERY.IMAGES.ALL, QUERY.STORAGE.ALL])` and this plan does not touch it. Phase 4 Task 1 changes `invalidateAll` itself to call `invalidateStatic`, so the Back Office's refresh becomes static-aware through core, not through anything here: its mounted static queries are now really refetched after an add (Phase 4 flags this as a Back Office behaviour change for the owner, Decisions open point). Tasks 10 and 12 keep the Back Office's existing assertion (`invalidateQueries` is called with `QUERY.IMAGES.ALL` and `QUERY.STORAGE.ALL`, which `invalidateStatic` still calls first) and run its suites. If the owner rejects that change and Phase 4 falls back to its numeric-`staleTime` option, `invalidateUpload` follows Phase 4's `invalidateGallery` unchanged.
- **No new API route and no `requireApp(App.LAURA, Role.ADMIN)` on `POST /v1/images`.** The shared route already gates: `requireSession`, `authoriseUploader` (Admin in some App, before the body is read) and `authoriseUpload` (Admin in every App named). A `requireApp(App.LAURA, Role.ADMIN)` there would lock Back Office Admins out. Phase 0's guard stays for Laura-only routes. Task 13 pins the Laura cases.
- **Laura's page reads the Session inside its own `Suspense`** (`requireAppSession({ minRole: Role.ADMIN })`, a cache hit after the page check), so the form never paints, even for a frame, for a User the page check is about to send Home; that makes the page a waiting page with a skeleton, exactly as the Back Office's Add page.

## Data checklist (every point, for the Upload page and the Back Office's Add page)

1. **Reads / hydration:** the page reads nothing from the API (no list, no Apps to fetch: Laura's are fixed, the Back Office's come from the Session). Nothing to hydrate; the page's only data is the Session check, behind the skeleton. The Gallery's read is Phase 4's.
2. **Both copies refreshed:** the action calls the API, then `updateTag(GALLERY.CACHE.TAG)` (Back Office: `IMAGES.CACHE.TAG` and `STORAGE.CACHE.TAG`); the form then runs `refresh` (`invalidateGallery` on `QUERY.GALLERY.ALL`, static-aware: Phase 4 Task 1; Back Office: `invalidateImages`, unchanged, on `invalidateAll`) before it opens the list through `useToastThenList`. A form with fields is `useActionState`, never optimistic (a refused batch would arrive after the rows are gone).
3. **Resource protection twice:** the Section's `minRole: Role.ADMIN` (proxy `gated` list, `signedInPage(Page, { minRole })`, the frame's role-gated row, the guard test: Phase 1, Task 7, 8, 12) and the API (`authoriseUploader`, `authoriseUpload`). A refusal shows as the form's notice (`refused`), never a pre-check.
4. **Resource changed:** does not apply, an add has no Version to carry (the API answers each new Image's first Version). Said here so a reviewer does not look for it.
5. **Lost and gone:** no resource to be gone. The nearest case, a Role taken away meanwhile, answers 403 and shows `refused` ("Sign in again"); the next navigation is sent Home by the page check.
6. **Skeleton:** `AOFAddImagesSkeleton` (ui), bound as `AddImageSkeleton` (Back Office) and `UploadSkeleton` (Laura), each with a height test at a wide, a tablet and a phone width (Tasks 11, 16).

## Parity: which Back Office mechanism each piece reuses

| Laura piece | Reuses | Where |
|---|---|---|
| Pick pictures | `AOFFileUpload` (DiceUI dropzone: click, drop, paste, keyboard) as `AOFImageDropzone`; the Back Office keeps its button on `useImageFileInput` | Tasks 2, 9 |
| Rows, previews | `AOFPictureRow`: object URL revoked with its row, `AOFImage unoptimized`, tile for an undrawable file, HEIC preview via `heicToJpeg` | Task 8 |
| Alt per language, access | `AOFImageAltFields`, `AOFImageAccessRow` (`withAOFFieldGroup`) | Task 7 |
| Form | `useAOFForm` + `useAOFFormAction` + `useActionState` | Task 9, 10 |
| Server action | `addImages` shared logic, App `serverApi` (Phase 1 `aofCreateServerApi`), `refusalOf`, `updateTag` | Tasks 5, 14 |
| Toast then list, refresh | `useToastThenList` (ui `features/data-table/hooks`, Phase 1 Task 5), `invalidateAll` (core, Phase 1 Task 4, made static-aware by Phase 4 Task 1) through Phase 4's `invalidateGallery` | Tasks 10, 14 |
| Skeleton | `AOFFormSkeleton`, `Bar`, `ink` (Phase 1 Task 4, 15), height test | Tasks 11, 16 |
| Errors told once | `AOFQueryProvider`, `aofErrorMeta` (no query or mutation here: the action's answer is a value) | n/a, said |
| Stored pictures | none shown on this page (`AOFStorageImage`, `AOFPictureGuard`, `tileBlur` are the Gallery's, Phase 4 Task 12) | n/a, said |
| Gating | `signedInPage(Page, { minRole })`, proxy `gated`, `sectionGuards` | Task 16 |
| Body limit | `withImageUploads` (new, storage), the Back Office's `next.config` numbers | Task 1, 17 |
| e2e | Back Office `images-flow.ts` pattern, `safe-area`, keyboard | Task 18 |

## File structure

Created (ui, all under `packages/ui/src/features/image/upload/` unless stated; tests in `tests/`):

- `constants/image-upload.ts`: `IMAGE_UPLOAD`
- `utils/{image-form-schema,add-image-schema,image-alt,accept-files,image-form-data,add-images,add-images-layout}.ts`
- `hooks/{use-add-images-form,use-image-rows,use-image-file-input}.ts(x)`
- `components/{aof-image-alt-fields,aof-image-access-row,aof-image-apps-row,aof-image-facts,aof-picture-row,aof-image-dropzone,aof-add-images,aof-add-images-skeleton}.tsx`
- `types/add-images-dressing.ts`
- `tests/image-upload-copy.ts` (test helper: translators over core's shared copy)
- `packages/ui/src/shared/components/aof-file-upload.tsx` (moved from `features/form/avatar-field/components/`)
- storage: `packages/storage/src/features/next/utils/with-image-uploads.ts` (+ test)
- core: `Common.ImageUpload` and `Common.ImageFields` in `packages/core/src/features/next/i18n/translations/{en,it}.json`
- Back Office: `features/images/components/add-image-dressing.tsx`
- Laura (reconcile each path with Phase 3's folders): `src/features/upload/{actions/add-image.ts, components/{upload,upload-dressing,upload-skeleton}.tsx, utils/upload-mutations.ts, tests/}`, `src/app/[locale]/(signed-in)/upload/page.tsx`, `src/features/i18n/translations/{en,it}.json` (`Upload`), `e2e/{upload.spec.ts,upload-flow.ts}`

Modified: Back Office `features/images/{components/{add-image,add-image-skeleton,edit-image,edit-image-skeleton,image-form-parts}.tsx, actions/{add-image,edit-image}.ts, utils/{edit-image-schema,image-alt}.ts, constants/images.ts}`, `next.config.ts`, `i18n/translations/{en,it}.json`, `i18n/tests/translations.test.ts`, `e2e/{images-flow,images,images-logic}`; ui `package.json`, `avatar-field` import; storage `package.json`, `IMAGE.LIMIT`; Laura `next.config.ts`; docs (Task 19); `apps/api/src/features/image/tests/upload.integration.test.ts`; `knip.jsonc` only if a test helper needs an `ignoreIssues` entry with a reason.

Deleted from the Back Office after re-pointing: `components/{picture-row,image-alt-fields,image-facts}.tsx`, `hooks/use-add-image-form.ts`, `utils/{accept-files,add-image-schema,image-form-data,image-form-schema,add-image-layout}.ts` and their tests; `IMAGES.ADD_ERROR`, `ADD_NOTICE`, `UPLOAD_BODY_LIMIT`. Deleted from old Laura: `src/features/upload/*`, `lib/file-validation.ts`, `lib/convert-heic.ts` (reconcile: Phase 3 empties `src/`; if they are still there, delete them here and the `heic2any` dependency).

## How every move task runs

1. Move the existing tests first (`git mv` into the destination's `tests/`), re-point their imports, add the task's new assertions. The moved test is the failing test.
2. Run it: fails (module missing).
3. `git mv` the implementation, change it only as the task's Interfaces say, add its export key to the package's `package.json` `exports` (one line per file).
4. Run it: passes.
5. Re-point every Back Office importer (`git grep -ln '<old path>' apps`), then run the Back Office bundle: `pnpm --filter @allonfire/back-office check-types`, `pnpm --filter @allonfire/back-office test`, `pnpm --filter @allonfire/back-office test:browser`. All stay green; no Back Office test is edited except an import path, a mock path, or the place its copy is read from.
6. `git grep -n '<old path>' apps packages` prints nothing.

Commands: ui `pnpm --filter @allonfire/ui exec vitest run <path>` and `... --config vitest.browser.config.ts <path>`; Back Office the same with `@allonfire/back-office`; storage `pnpm --filter @allonfire/storage exec vitest run <path> --tags-filter=unit`; core `pnpm --filter @allonfire/core exec vitest run <path>`; Laura `pnpm --filter @allonfire/laura ...` (reconcile with Phase 3's scripts).

---

### Task 0: Baseline and reconcile

**Files:** none.

**Interfaces:** Consumes, from Phase 1, names that must exist (read each; if a name moved, use the new one everywhere in this plan): ui `useToastThenList` (`features/data-table/hooks/use-toast-then-list`), `AOFFormSkeleton` and its `Bar`, `formBar`, actions and alert skeletons (`features/form/components/aof-form-skeleton`, Phase 1 Task 15 names only `AOFFormSkeleton`: read the real exports), `AOFFormAlert`, `ink` (`shared/utils/skeleton-ink`), `isHeic`/`heicToJpeg` (`shared/utils/heic-to-jpeg`), `renderInUi` (`shared/tests/render-in-ui`), `AOFFreshOnReturn`, `AOFSectionPage`; core `invalidateAll`, `aofCreateApi`, `aofRefusal`; auth `signedInPage`/`requireAppSession({ minRole })`; the `sectionGuards` helper. Consumes from Phase 3 the `LAURA` descriptor (`apps/laura/src/shared/constants/laura.ts`), its Sections tuple (Upload row with `minRole: Role.ADMIN`, path `/upload`), its i18n files, `renderInApp`, e2e helpers, bindings. Consumes from Phase 4 (`docs/superpowers/plans/2026-11-17-laura-p4-gallery-favorites.md`): `GALLERY.CACHE.TAG` (`@/features/gallery/constants/gallery`, Task 10), `QUERY.GALLERY.ALL` (`@/shared/constants/query`, Task 10, `["gallery"]`, the prefix of both feeds), `invalidateGallery(queryClient)` (`@/features/gallery/utils/gallery-mutations`, Task 11), core's `invalidateStatic` and the static-aware `invalidateAll` (Task 1). Reconcile: re-read Phase 4's Task 0 spike result; if it chose another way to refresh a static feed, use that.

- [ ] Step 1: record the baseline: `pnpm --filter @allonfire/back-office check-types`, `test`, `test:browser`; `pnpm --filter @allonfire/ui test`, `test:browser`; `pnpm static:dupes`, `pnpm static:knip`, `pnpm static:knip-production`. Write the pass counts in the task notes; fix or report any red before starting.
- [ ] Step 2: `git grep -n "heic2any\|file-validation\|convert-heic\|features/upload" apps/laura packages docs` and write down what is still there (Phase 3 decides).
- [ ] Step 3: confirm ui has `zod` and `@allonfire/database` (Phase 1 Task 7 adds the second) as dependencies; if `zod` is missing add the repo's existing version, no new dependency.

### Task 1: The Server Action body limit as one config wrapper

**Files:**
- Create: `packages/storage/src/features/next/utils/with-image-uploads.ts`, `packages/storage/src/features/next/tests/with-image-uploads.test.ts`
- Modify: `packages/storage/src/features/image/constants/image.ts` (`LIMIT.UPLOAD_BODY_BYTES`), `packages/storage/package.json` (export key, `next` optional peer and devDependency, as auth declares it), `apps/back-office/next.config.ts`, `apps/back-office/src/features/images/constants/images.ts` (delete `UPLOAD_BODY_LIMIT`), delete `apps/back-office/src/features/images/tests/images-constants.test.ts` (its case moves)

**Interfaces:** Produces `IMAGE.LIMIT.UPLOAD_BODY_BYTES = UPLOAD_BYTES + UNIT.BYTES_PER_MIB` (a file-local `UPLOAD_BYTES` above `LIMIT`) and `withImageUploads(config: NextConfig): NextConfig` at `@allonfire/storage/features/next/utils/with-image-uploads`, modelled on auth's `withProviderPictures`: sets `experimental.proxyClientMaxBodySize` and `experimental.serverActions.bodySizeLimit` to `UPLOAD_BODY_BYTES`, keeping every other `experimental` and `serverActions` key the App set.

- [ ] Step 1: unit test (`// @module-tag unit`): `withImageUploads({ experimental: { authInterrupts: true, serverActions: { allowedOrigins: ["x"] } } })` has both limits equal to `IMAGE.LIMIT.UPLOAD_BYTES + UNIT.BYTES_PER_MIB`, keeps `authInterrupts` and `allowedOrigins`; `IMAGE.LIMIT.UPLOAD_BODY_BYTES` equals that sum (the moved `IMAGES.UPLOAD_BODY_LIMIT` case).
- [ ] Step 2: `pnpm --filter @allonfire/storage exec vitest run src/features/next/tests/with-image-uploads.test.ts --tags-filter=unit`: fails.
- [ ] Step 3: implement; move the long comment of the Back Office's `next.config.ts` (why 1 MB and 10 MB break a batch, "Unexpected end of form") into the wrapper's JSDoc; the Back Office config becomes `withImageUploads(withProviderPictures({}))` inside `AOFWithLocalizedNotFound(..., { routing })`.
- [ ] Step 4: run the storage test (passes), then `pnpm --filter @allonfire/back-office check-types` and the Back Office's e2e big-batch case later at Task 12.

### Task 2: One file picker for the avatar field and for pictures

**Files:**
- Move: `packages/ui/src/features/form/avatar-field/components/aof-file-upload.tsx` to `packages/ui/src/shared/components/aof-file-upload.tsx`; its tests `avatar-field/tests/aof-file-upload.test.tsx`, `aof-file-upload.browser.test.tsx` to `packages/ui/src/shared/tests/`
- Modify: `packages/ui/package.json` (key `./shared/components/aof-file-upload`), `aof-avatar-field.tsx` (import path, relative paths in the moved file shorten)

**Interfaces:** `AOFFileUpload`, `AOFFileUploadLabels`, `AOFFileUploadItem`, `AOFFileUploadProps`, `fileRefusal` unchanged. Why it moves: the avatar field (`features/form`) and the picture dropzone (`features/image`) are two top-level ui features reading it (`package-layout.md`: then `shared/`).

- [ ] Steps: recipe, no new assertion (the moved tests are the specification). After step 5 also run `pnpm --filter @allonfire/ui exec vitest run src/features/form/avatar-field` and the Back Office's Users add and edit browser tests (they render the avatar field).

### Task 3: Constants, schemas and alt helpers into ui

**Files:**
- Create: `constants/image-upload.ts`, `utils/image-form-schema.ts`, `utils/add-image-schema.ts`, `utils/image-alt.ts` (all under `packages/ui/src/features/image/upload/`)
- Move (with tests): Back Office `utils/{image-form-schema,add-image-schema}.ts` and their `image-form-schema.test.ts`, `add-image-schema.test.ts`; from `image-alt.ts` the functions `isBaseLanguage`, `addAltLanguage`, `removeAltLanguage`, `altValuesOf` with `image-alt-values.test.ts` and those cases of `image-alt.test.ts`
- Modify: Back Office `utils/image-alt.ts` (keeps only `altFor` and its test cases), `utils/edit-image-schema.ts`, `constants/images.ts` (delete `ADD_ERROR`, `ADD_NOTICE`), `actions/edit-image.ts`, `components/edit-image.tsx`, every importer and mock path; `packages/ui/package.json` keys

**Interfaces:** Produces
```ts
// constants/image-upload.ts, owner IMAGE_UPLOAD
export const IMAGE_UPLOAD = {
  ERROR: { FAILED: "failed", INVALID: "invalid", REFUSED: "refused", TOO_LARGE: "tooLarge", UNSUPPORTED: "unsupported" },
  NOTICE: { ADDED: "added" },
  /** The API's codes an add is told by, for `refusalOf`'s `known` map: the code, then the error. */
  REFUSAL: [
    [IMAGE.ERROR_CODE.IMAGE_TOO_LARGE, "tooLarge"],
    [IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE, "unsupported"],
    [ERROR.CODE.BAD_REQUEST, "invalid"],
  ],
} as const;
```
(file-local consts above the object so `REFUSAL` reads `ERROR.TOO_LARGE`, not a retyped string). `image-form-schema.ts`: `ImageFieldMessages`, `imageAccessSchema`, `imageAppSchema`, `altSchema`, `ImageAltValues`, `imageFields` (unchanged). `add-image-schema.ts`: `addImageSchema(messages?)`, `addImageFormSchema(messages?)`, `AddImageError`, `AddImageNotice`, `AddImageRowValues`, `AddImageState = { added?: number; error?: AddImageError; notice?: AddImageNotice }`. `image-alt.ts`: the four helpers.

- [ ] Step 1: moved tests plus: `z.enum(IMAGE_UPLOAD.ERROR).options` equals the five values; `new Map(IMAGE_UPLOAD.REFUSAL).get(IMAGE.ERROR_CODE.UNSUPPORTED_IMAGE)` is `IMAGE_UPLOAD.ERROR.UNSUPPORTED`, `.get(ERROR.CODE.BAD_REQUEST)` is `INVALID`, `.get(IMAGE.ERROR_CODE.IMAGE_TOO_LARGE)` is `TOO_LARGE`.
- [ ] Step 2: run `pnpm --filter @allonfire/ui exec vitest run src/features/image/upload`: fails.
- [ ] Step 3: recipe step 3 and 5; the Back Office tests that wrote `IMAGES.ADD_ERROR.X` read `IMAGE_UPLOAD.ERROR.X` (a constant's home changes, not its value).
- [ ] Step 4: run: passes; recipe step 5 and 6.

### Task 4: Pick limits and the posted rows into ui

**Files:**
- Move (with tests): Back Office `utils/accept-files.ts`, `utils/image-form-data.ts`, `utils/tests/{accept-files,image-form-data}.test.ts` to ui `utils/` and `tests/`
- Modify: every importer (`actions/add-image.ts`, `actions/edit-image.ts`, `actions/tests/*.test.ts`, `components/tests/*`, `edit-image.browser.test.tsx`), `packages/ui/package.json`

**Interfaces:** `acceptFiles(held, files)` and `FileRefusal`; `imageNames(prefix)`, `rowPrefix(index)`, `editValuesOf(form)`, `rowsOf(form)`, `uploadFormOf(rows)` returning `{ file: File[]; meta: string }`, all unchanged. `textOf` (a posted field's text) was the Back Office's `api-refusal` export; read it from core's `aofRefusal` binding if Phase 1 exports it standalone, else keep a one-line local `typeof value === "string" ? value : ""` (reconcile).

- [ ] Steps: recipe, moved tests as specification (they pin: each posted row in order, other languages' alt only where posted, unknown access reads private, one `meta` entry per file in order, count, per-file and total limits with the first reason told). New assertion: `rowsOf` on a form with rows `0` and `2` but no `1` returns one row (stops at the first with no file).

### Task 5: The shared add logic and the Back Office action on it

**Files:**
- Create: `packages/ui/src/features/image/upload/utils/add-images.ts`, `tests/add-images.test.ts`
- Modify: `apps/back-office/src/features/images/actions/add-image.ts`; Back Office `actions/tests/add-image.test.ts` stays untouched (it is the proof)

**Interfaces:** Produces (a plain server-safe util, no `"use client"`):
```ts
export type AddImagesInput = {
  /** Place every Image here whatever the form posted (an App that adds to one App only). */
  apps?: readonly App[] | undefined;
  form: FormData;
  post: (upload: { file: File[]; meta: string }) => Promise<Response>;
  /** The App's `refusalOf` bound to its API codes; `known` is `IMAGE_UPLOAD.REFUSAL` as a Map. */
  refusalOf: (response: Response, known: ReadonlyMap<string, AddImageError>) => Promise<AddImageError>;
};
export const addImages: (input: AddImagesInput) => Promise<AddImageState>;
```
Behaviour: `rowsOf(form)`, apply `apps` when given, `addImageSchema().safeParse` (failure: `{ error: INVALID }`, `post` never called), `post(uploadFormOf(rows))`, on a status other than `HTTP.STATUS.CREATED` `{ error: await refusalOf(res, new Map(IMAGE_UPLOAD.REFUSAL)) }`, else `{ added: <length of the answer's array, read with zod>, notice: IMAGE_UPLOAD.NOTICE.ADDED }`. Reconcile: if the generic `refusalOf` of Phase 1's `aofRefusal` does not accept a `ReadonlyMap<string, ...>`, type `known` as the narrow literal-key map and let the App adapt in one line.

- [ ] Step 1: unit tests with a fake `post` and `refusalOf`: (a) two rows post one `meta` entry each in order and answer `{ added: 2, notice: IMAGE_UPLOAD.NOTICE.ADDED }`; (b) `apps: [App.LAURA]` with a form posting `rows[0].apps = BACK_OFFICE` sends `meta` whose entry `apps` is `[App.LAURA]` (parsed with `parseJson`); (c) no file: `{ error: INVALID }` and `post` not called; (d) a 415 answer returns what `refusalOf` returns; (e) a thrown `post` is not caught here (the action's caller decides): assert it rejects.
- [ ] Step 2: `pnpm --filter @allonfire/ui exec vitest run src/features/image/upload/tests/add-images.test.ts`: fails.
- [ ] Step 3: implement. Back Office `addImage` becomes: `const state = await addImages({ form, post: async (upload) => (await serverApi())[API.VERSION.CURRENT].images.$post({ form: upload }), refusalOf: (res, known) => refusalOf(res, IMAGE_UPLOAD.ERROR, known) })`, then `updateTag(IMAGES.CACHE.TAG)` and `updateTag(STORAGE.CACHE.TAG)` only when `state.notice`; it stays `"use server"`, its `jscpd:ignore` import block shrinks.
- [ ] Step 4: ui test passes; `pnpm --filter @allonfire/back-office exec vitest run src/features/images/actions` passes untouched (clears both tags after a save, none after a refusal, 413/415/403/500 mapped).

### Task 6: Shared copy in core's `Common`

**Files:**
- Modify: `packages/core/src/features/next/i18n/translations/{en,it}.json`, Back Office `i18n/translations/{en,it}.json`, `i18n/tests/translations.test.ts`, Back Office tests, e2e files and components that read a moved key (`git grep -n "Images.add.pick\|Images.add.row\|Images.add.shared\|Images.add.error\|Images.form\."`)
- Create: `packages/ui/src/features/image/upload/tests/image-upload-copy.ts`

**Interfaces:** Produces under `Common` (words moved verbatim from the Back Office's `Images.*`, Italian included, plus the dropzone's four, below):
- `Common.ImageUpload`: `pick.{button,hint,input,none}`, `row.{remove,title}`, `shared.{apply,title}`, `error.{failed,invalid,refused,tooLarge,unsupported}`, `field.{altTooLong,appsRequired,fileTooLarge,tooManyFiles,totalTooLarge}`, `facts.{name,size,dimensions}` (the three words of `Images.column`, which stay for the lists), `cancel`, `dropzone.{choose,drop,remove,wrongType}` new: en "Choose pictures", "Drop pictures here", "Remove", "This file is not a supported picture"; it "Scegli le immagini", "Trascina qui le immagini", "Rimuovi", "Questo file non è un'immagine supportata".
- `Common.ImageFields`: `access`, `accessWho`, `option.{PRIVATE,PUBLIC}` (the two words of `Images.access`, which stay for the lists), `addLanguage`, `altGroup`, `appIn`, `appOut`, `apps`, `clearAlt`, `languageSearch`, `noLanguage`, `removeLanguage`.
- App-owned, staying in each App's JSON (Back Office `Images.add.{added,page,title,submit,submitting}`, `Images.loading`, `Images.form.cancel` for Edit): the title, submit and pending words, the "N added" toast, the loading line.
- Test helper `image-upload-copy.ts`: `uploadCopy` and `fieldsCopy` built with `createTranslator({ locale: "en", messages: SHARED_TRANSLATIONS.en, namespace: "Common.ImageUpload" | "Common.ImageFields" })` (core's `shared-translations.ts`), so ui tests read copy from its source, never retyped.

- [ ] Step 1: in `translations.test.ts` add the moved keys to the lists the test reads: every `Common.ImageUpload.error.*` is within `MESSAGE_LENGTH.ERROR` (the test's `under(tree, "error")` already finds a key called `error`: make it read the merged copy as Phase 1 Task 15 reconciled it), and `Common.ImageUpload.field.{fileTooLarge,tooManyFiles,totalTooLarge}` join `TOAST_KEYS` (replacing the three `Images.form.field.*` entries). Add `it("holds the same keys in en and it for the moved namespaces")` comparing `objectKeys` trees of `Common.ImageUpload` and `Common.ImageFields`.
- [ ] Step 2: run `pnpm --filter @allonfire/back-office exec vitest run src/features/i18n/tests/translations.test.ts` and `pnpm --filter @allonfire/core exec vitest run src/features/next/i18n`: fail.
- [ ] Step 3: move the keys (both languages), delete them from the Back Office JSONs, run `pnpm static:i18n`. Components that read them are re-pointed in Tasks 7 to 10; until then the Back Office build is red on i18n: do Tasks 6 to 10 on one branch and run the Back Office bundle at Task 10 (the only task in this plan that leaves it red in between; noted so an implementer does not stop).
- [ ] Step 4: core and translations tests pass.

### Task 7: Field groups in ui (alt, access, apps)

**Files:**
- Create (moved, with `image-form-parts.browser.test.tsx` split): ui `components/aof-image-alt-fields.tsx`, `aof-image-access-row.tsx`, `aof-image-apps-row.tsx`; tests `tests/aof-image-fields.browser.test.tsx`
- Modify: Back Office `components/image-form-parts.tsx` (keeps `ImageFormActions` only), `edit-image.tsx`, `tests/app-toggle.ts`; delete `image-alt-fields.tsx`; `packages/ui/package.json`

**Interfaces:** Produces three `withAOFFieldGroup` groups (same `form`/`fields` contract as today; `fields` is `rows[2]` or the Edit form's `IMAGE_FIELDS`-style names): `AOFImageAltFields`; `AOFImageAccessRow` with group props `{ ink: string; pill: string }` (the Design's chosen-option colours, which were `BACK_OFFICE.CHOSEN`); `AOFImageAppsRow` with `{ ink, pill, options: readonly { label: string; value: App }[] }` (the App names come from the caller: the Back Office's `APP_ENTRY[app].name`; Laura never renders it). They read `Common.ImageFields`. `IMAGES.FORM_FIELDS.EDIT` stays in the Back Office (the Edit form's own mapping).

- [ ] Step 1: the moved browser tests render a harness inside `renderInUi` (messages: core's shared copy) and read words from `fieldsCopy`; same assertions as today (English and Italian shown with text; add a language from the picker and remove it; clear button keeps the caret; remove button level with its input; a held language is not offered; extra languages start filled; typing survives adding a language; Apps offered are only those given, the Image's own switched on; access offers public and private). New: with `ink="INK"` and `pill="PILL"` props the access group's chosen option carries them (assert through the group's rendered `data-`/style the ChoiceField already sets; reconcile by reading `AOFChoiceField`).
- [ ] Step 2: `pnpm --filter @allonfire/ui exec vitest run --config vitest.browser.config.ts src/features/image/upload/tests/aof-image-fields.browser.test.tsx`: fails.
- [ ] Step 3: move and generalise as above (copy namespace, `ink`/`pill`/`options` props; Tabler icons stay).
- [ ] Step 4: passes. Re-point the Back Office Edit form (`edit-image.tsx` passes `ink={BACK_OFFICE.CHOSEN.INK}`, `pill`, `options`), recipe step 5 deferred to Task 10 (see Task 6 note) except `pnpm --filter @allonfire/back-office exec vitest run --config vitest.browser.config.ts src/features/images/components/tests/edit-image.browser.test.tsx`.

### Task 8: Facts and the picture row, with the local preview

**Files:**
- Move: Back Office `components/image-facts.tsx` to ui `components/aof-image-facts.tsx`; `components/picture-row.tsx` to ui `components/aof-picture-row.tsx`
- Create: `tests/aof-picture-row.browser.test.tsx`, `tests/aof-image-facts.test.tsx`
- Modify: Back Office `edit-image.tsx`, `edit-image-skeleton.tsx` (facts import); `packages/ui/package.json`

**Interfaces:** `AOFImageFacts`, `AOFImageFact`, `AOFImageName` (as today; the dl grid of `code-style.md`). `AOFPictureRow({ apps, dressing, form, index, row })` where `apps: { options } | { fixed }` (as `AOFAddImages`, Task 10) and `dressing: Pick<AOFAddImagesDressing, "Card" | "Remove" | "choice">` (type created in Task 10's file, imported as a type; create `types/add-images-dressing.ts` here with the full type from Task 10 so both tasks read one file). It draws: `Card role="group"` named by `Common.ImageUpload.row.title` ("Picture N"), the hidden `RowFile` input posting the file under `rowPrefix`, the preview, the facts (name, `formatSize`, dimensions or `—`), `Remove`, `AOFImageAltFields`, `AOFImageAccessRow`, and `AOFImageAppsRow` only for `options`. Preview rule: `source = isHeic(file) ? await heicToJpeg(file) : file`; `URL.createObjectURL(source)` in an effect, cancelled flag, cleanup `URL.revokeObjectURL`; blank tile while converting; on a decode or load error the tile (`data-testid="preview-fallback"`, never a broken-image icon). The file posted is `row.file`, never `source`.

- [ ] Step 1: browser tests (the Back Office's add-image preview tests move here, with `vi.mock` of the converter module at its ui path): (a) a JPEG row shows `data-testid="picture"`, no tile; (b) a HEIC row calls `heicToJpeg` once with the HEIC file, previews the converted file (`URL.createObjectURL` called with it), and the hidden file input holds the original HEIC (`input.files[0] === file`); (c) when `heicToJpeg` rejects the tile shows and dimensions read `—`; (d) unmounting (Remove) calls `URL.revokeObjectURL` for every URL created, converted ones included; (e) a long name is cut after two lines (`-webkit-line-clamp: 2`); (f) name, size and dimensions sit beside the picture at 900 px and under it at 360 px (`getBoundingClientRect`, in an `@container`); (g) one real-decoder test on Chromium and WebKit: the HEIC fixture (`IMAGE_FIXTURE.FILE.HEIC` through Vite's `?url`, per `testing.md`) previews with `naturalWidth > 0` (poll with a 10 s timeout, the wasm decoder loads on first use); (h) `fixed` apps render no Apps toggle, `options` render one.
- [ ] Step 2: `pnpm --filter @allonfire/ui exec vitest run --config vitest.browser.config.ts src/features/image/upload/tests/aof-picture-row.browser.test.tsx`: fails.
- [ ] Step 3: move, generalise (slots, `Common` copy, `heicToJpeg` preview), export keys.
- [ ] Step 4: passes.

### Task 9: Form state, row actions and the pickers

**Files:**
- Create: ui `hooks/use-add-images-form.ts`, `hooks/use-image-rows.ts`, `hooks/use-image-file-input.ts`, `components/aof-image-dropzone.tsx`, `tests/use-image-rows.browser.test.tsx`, `tests/aof-image-dropzone.browser.test.tsx`
- Delete (after Task 10 re-points): Back Office `hooks/use-add-image-form.ts`

**Interfaces:**
- `useAddImagesForm(apps: readonly App[])`: `useAOFForm` with `defaultValues` `{ rows: [], shared: { access: ImageAccess.PRIVATE, apps: apps.slice(0, 1) } }`, `validators.onChange: addImageFormSchema(messages)` with the five messages from `Common.ImageUpload.field`; `AddImagesForm = ReturnType<typeof useAddImagesForm>`. Fixed Apps seed all of them (`apps` is the whole fixed list, so pass it and the caller slices nothing: `startApps = fixed ? apps : apps.slice(0, 1)` via a second argument `fixed: boolean`).
- `useImageRows(form)` returns `{ applyToAll(): void; pick(files: File[]): void; remove(index: number): void }`: `pick` runs `acceptFiles` against the held count and bytes, tells the first refusal as `aofToast(t("field.<why>"), "error")`, pushes a row per accepted file seeded from `shared` with `id: crypto.randomUUID()` (ADR 0021 serves dev over HTTPS Tailscale Services, so the secure context holds; the old Laura fallback is not carried), alt `{ en: "", it: "" }`, `picker: ""`; `remove` drops the row then moves focus: the next row's Remove button (found by `[data-remove-row]` inside the form), else the previous one, else the form's heading (`tabIndex={-1}`).
- `useImageFileInput(pick)` returns `{ inputProps, open }`: a hidden `multiple` input (`accept={IMAGE.INPUT_ACCEPT}`, `aria-label` from `Common.ImageUpload.pick.input`, `className="sr-only"`, `tabIndex={-1}`) whose `onChange` hands `[...files]` to `pick` and clears its value (the same file can be picked again); `open` clicks it.
- `AOFImageDropzone({ disabled?, pick, triggerProps?, className? })` (client): `AOFFileUpload` with `accept={IMAGE.INPUT_ACCEPT}`, `maxBytes={IMAGE.LIMIT.FILE_BYTES}`, `multiple`, `items={[]}`, `label` = `pick.input`, labels from `Common.ImageUpload.{dropzone,pick.hint,field.fileTooLarge}`, `onAccept={pick}`, `onFileReject` toasting the refusal. Count and total limits stay `pick`'s.

- [ ] Step 1: tests. `use-image-rows` (harness in `renderInUi`): (a) three picks of 1 byte, then 21 files: 20 rows, an error toast naming `tooManyFiles` copy, rows kept; (b) a file over `IMAGE.LIMIT.FILE_BYTES` (a `File` whose `size` is overridden) is left out with `fileTooLarge`, the others kept; (c) rows start from `shared` (private, first App) and `applyToAll` copies `shared` onto every row, leaving alt untouched; (d) `remove` of the middle row focuses the next row's Remove button, of the last row the previous, of the only row the heading; (e) two picks give distinct ids. `aof-image-dropzone`: (f) the region is named `pick.input` copy and is a tab stop; (g) Enter and Space on it open the chooser (spy `HTMLInputElement.prototype.click`); (h) a `drop` event with a `DataTransfer` holding two images calls `pick` once with both; (i) a text file dropped is refused with `dropzone.wrongType` and `pick` is not called; (j) `disabled` ignores a drop.
- [ ] Step 2: run the two files with `--config vitest.browser.config.ts`: fail.
- [ ] Step 3: implement from the Back Office's `usePicker` and `useAddImageForm` (moved, not rewritten).
- [ ] Step 4: pass.

### Task 10: `AOFAddImages` and the Back Office on it

**Files:**
- Create: ui `components/aof-add-images.tsx`, `types/add-images-dressing.ts` (started in Task 8), `utils/add-images-layout.ts` (the Back Office's `sharedSet` cva, moved), `tests/aof-add-images.browser.test.tsx`; Back Office `components/add-image-dressing.tsx`
- Move: the Back Office's `add-image.browser.test.tsx` cases that do not name the Japan look into the ui test (below); the rest stay
- Modify: Back Office `components/add-image.tsx` (becomes a binding), `image-form-parts.tsx`; delete the Back Office leftovers listed in "File structure"; `packages/ui/package.json`

**Interfaces:**
```ts
// types/add-images-dressing.ts
export type AOFImageButtonProps = { disabled?: boolean; label: string; onClick: () => void };
export type AOFImagePickerProps = { disabled: boolean; pick: (files: File[]) => void };
export type AOFImageActionsProps = { cancelHref: string; cancelLabel: string; disabled: boolean; pending: boolean; pendingLabel: string; submitLabel: string };
export type AOFAddImagesDressing = {
  Actions: ComponentType<AOFImageActionsProps>;   // Cancel back to the list, and the submit
  ActionsSkeleton: ComponentType;
  Apply: ComponentType<AOFImageButtonProps>;      // "Apply to all pictures"
  Card: ComponentType<ComponentProps<"div">>;     // a block's frame (shared set, a row)
  choice: { ink: string; pill: string };          // chosen option colours of Access and Apps
  Picker: ComponentType<AOFImagePickerProps>;     // a button or a drop area, placed in the header row
  PickerSkeleton: ComponentType;
  Remove: ComponentType<AOFImageButtonProps>;
};
export type AOFAddImagesApps =
  | { kind: "options"; options: readonly { label: string; value: App }[] }   // the Back Office: pick among them, start on the first
  | { kind: "fixed"; apps: readonly [App, ...App[]] };                        // Laura: no picker
export type AOFAddImagesLabels = { added: (count: number) => string; submit: string; submitting: string; title: string };
// components/aof-add-images.tsx (client)
export const AOFAddImages: (props: {
  action: (state: AddImageState, form: FormData) => Promise<AddImageState>;
  apps: AOFAddImagesApps;
  dressing: AOFAddImagesDressing;
  labels: AOFAddImagesLabels;
  list: string;                         // where Cancel and a saved add go
  refresh: () => Promise<unknown>;      // this browser's copies, read again
}) => JSX.Element;
```
`AOFAddImages` is the Back Office's `AddImage` body: heading (`h1`, Tabler `IconPhotoPlus`, `labels.title`) with the `pick.hint` line (files, MiB from `IMAGE.LIMIT`), `Picker` in the same wrapping row, the `<form aria-label={labels.title}>` from `useAOFFormAction(form, action)` over `useActionState`, the shared-set `Card` (Access; Apps only for `options`; `Apply` disabled with no rows), the rows (`AOFPictureRow`) or `pick.none`, the `Refusal` alert (the moved component: shown for `error` while the picked files' ids are unchanged, never an effect), `Actions` disabled with no rows, and `useToastThenList(list, notice, { added: { kind: "success", message: labels.added(count) } }, refresh)`.

- [ ] Step 1: ui browser test moves from the Back Office's `add-image.browser.test.tsx` (same assertions, against a stub dressing of plain elements, `action` a `vi.fn`, `list` a string, the router mocked as Phase 1 Task 5 does through `aofBaseNavigation`): opens with nothing picked; a row per picked file filled from the shared set; the shared set leaves rows alone until Apply to all; hint under the title (gap under 24 px) with the limits; Pick offered; `accept` is `IMAGE.INPUT_ACCEPT`; 21 files keep 20 rows; Remove frees the preview and turns no field uncontrolled; posts every row's file, alt, access and Apps (`imageNames(rowPrefix(0))`); keeps every row and shows `error.unsupported` when the action refuses, until the picked files change (typing in a row leaves it, removing a file clears it) and does not navigate; toasts `labels.added(2)` then `replace`s `list`; with `apps={{ kind: "fixed", apps: [App.LAURA] }}` no Apps toggle exists anywhere (shared set and rows), the form still posts and the shared set seeded rows carry `LAURA` in form state; Apply to all sits bottom-left of the grid at 900 px and after the Apps at 360 px (the moved `sharedSet` layout cases).
- [ ] Step 2: run it: fails.
- [ ] Step 3: implement (move `AddImage`'s JSX and `Refusal`; layout cva exported as `addImagesLayout`). Back Office `add-image-dressing.tsx` (`"use client"`, under 60 lines): `Card` = `CardFrame` with `kanji={IMAGES.ADD_KANJI}`, `Picker` = the "Pick pictures" `AOFButton` of `toolbarActionClass("labeled")` over `useImageFileInput`, `Apply` = the `kanjiAction()` button with `IMAGES.APPLY_KANJI`, `Remove` = the icon `toolbarActionClass("icon", "destructive")` with `IMAGES.DELETE_KANJI` (it adds `data-remove-row`), `Actions` = `FormActions` (cancel `ACTION_KANJI.CANCEL`, submit `IMAGES.ADD_KANJI`), skeleton twins as bars, `choice` = `BACK_OFFICE.CHOSEN`. `AddImage({ apps })` becomes: `<AOFAddImages action={addImage} apps={{ kind: "options", options }} dressing={ADD_IMAGE_DRESSING} labels={...} list={BACK_OFFICE.PAGE.STORAGE_IMAGES} refresh={() => invalidateImages(queryClient)} />`.
- [ ] Step 4: ui test passes. The Back Office bundle is now green again: `check-types`, `test`, `test:browser`; its `add-image.browser.test.tsx` keeps what is the Back Office's: the kanji stays on the button while adding (`IMAGES.ADD_KANJI`), the Apps toggles named by `APP_ENTRY`, the Add button's name, a saved add opens `BACK_OFFICE.PAGE.STORAGE_IMAGES`, only administered Apps offered; `image-form-parts` keeps `ImageFormActions`. `pnpm static:i18n` green. The Back Office's refresh stays `invalidateImages` on `invalidateAll` (Decisions): its `images-mutations.test.ts` and the Add form's `refresh` assertion are not edited, whatever Phase 4 Task 1 does inside `invalidateAll`.

### Task 11: The skeleton, shared and bound

**Files:**
- Create: ui `components/aof-add-images-skeleton.tsx`, `tests/aof-add-images-skeleton.browser.test.tsx`
- Modify: Back Office `components/add-image-skeleton.tsx` (binding); the Back Office's `image-skeletons.browser.test.tsx` stays untouched

**Interfaces:** `AOFAddImagesSkeleton({ apps, dressing: Pick<AOFAddImagesDressing, "ActionsSkeleton" | "Card" | "PickerSkeleton">, loading: string, title: string })`: `AOFFormSkeleton` (busy, a status line `loading`), the heading and hint as the form draws them, `PickerSkeleton`, the shared-set `Card` with bars at the real sizes (Access toggle, one Apps block per option for `options`, none for `fixed`, Apply), `pick.none`, the alert's kept place, `ActionsSkeleton`; its classes are `addImagesLayout`, the same cva the form reads.

- [ ] Step 1: ui browser test: with a stub dressing (a `PickerSkeleton` bar of the stub `Picker`'s size), for each of 900, 520 and 360 px inside an `@container`, the skeleton's height `toBeCloseTo` the empty `AOFAddImages`' height (`options` of two Apps, and `fixed`); the skeleton says it is loading (`role="status"`, `aria-busy`), reads no part to a screen reader.
- [ ] Step 2: run: fails. Step 3: implement; the Back Office binding passes `ADD_IMAGE_DRESSING`, `t("Images.loading")`, `t("Images.add.title")`. Step 4: ui test and the Back Office's `image-skeletons.browser.test.tsx` pass untouched (this is Back Office point 6 of the checklist: skeleton and test unchanged).

### Task 12: Back Office proof and cleanup

**Files:** the Back Office deletions in "File structure"; `apps/back-office/e2e/{images-flow.ts,images.spec.ts,images-logic.spec.ts}` (the key's place only: `t.add.pick.input`, `t.add.shared.title`, `t.add.row.title`, `t.form.*` now read `Common.ImageUpload`/`Common.ImageFields` through `EN.Common...` or `enT`); `docs`: none yet.

- [ ] Step 1: `git grep -n "picture-row\|image-alt-fields\|image-facts\|use-add-image-form\|accept-files\|add-image-schema\|image-form-schema\|image-form-data\|add-image-layout\|UPLOAD_BODY_LIMIT\|ADD_ERROR\|ADD_NOTICE" apps packages` prints nothing outside ui's new files.
- [ ] Step 2: `pnpm --filter @allonfire/back-office check-types test test:browser` (three commands), then `pnpm test:services && pnpm --filter @allonfire/back-office exec playwright test e2e/images.spec.ts e2e/images-logic.spec.ts e2e/keyboard.spec.ts e2e/safe-area.spec.ts`: all projects green, including the big-batch case (Review Focus 1 and 5), no spec edited beyond where its copy is read from. If Phase 4 Task 1 has landed, this run is also the proof that its static-aware `invalidateAll` leaves the Add flow green (the list shows the new Image after the redirect); a red here is Phase 4's to report, never a spec edit here.
- [ ] Step 3: `pnpm static:dupes` and `pnpm static:knip` (read each hit by finding its readers; export keys only for files an App imports).

### Task 13: API pins for a Laura Admin's upload

**Files:** Modify `apps/api/src/features/image/tests/upload.integration.test.ts`.

**Interfaces:** Consumes `cookieFor`, `upload(app, cookie, { apps, files, alt? })`, `jpeg()`, `uploaded`, `FIXTURE.USER.LAURA.ADMIN`, `FIXTURE.USER.LAURA.USER` (Phase 0), `FIXTURE.USER.BACK_OFFICE.ADMIN`.

- [ ] Step 1: add rows to the refusal table and one success test: a Laura User uploading into `[App.LAURA]` is 403 and nothing is stored (the guard acts before the body is read); a Laura Admin into `[App.BACK_OFFICE]` is 403; into `[App.LAURA, App.BACK_OFFICE]` is 403; a Laura Admin into `[App.LAURA]` is 201, the Image is `ImageAccess.PRIVATE` (no `access` sent), its `apps` are `[App.LAURA]`, a Laura User reads it through `GET` with `app=laura` while a visitor does not (reuse the read helpers), and the HEIC fixture is accepted (the original file is what Laura sends, Review Focus 3).
- [ ] Step 2: `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/image/tests/upload.integration.test.ts`: the new rows should already pass (the route is Phase 0 and the Image module as is): record that this task is a pin, not a red test, as Phase 0's Task 5 does. If a row fails, the failure is a real finding: stop and report it.
- [ ] Step 3: nothing to implement. Step 4: `pnpm --filter @allonfire/api test`.

### Task 14: Laura's `addImage` action and refresh

**Files:**
- Create: `apps/laura/src/features/upload/actions/add-image.ts`, `actions/tests/add-image.test.ts`, `utils/upload-mutations.ts`, `utils/tests/upload-mutations.test.ts`

**Interfaces:** Consumes `addImages`, `IMAGE_UPLOAD`, `AddImageState` (ui, Tasks 3 and 5); Laura's `serverApi` and `refusalOf` bindings (Phase 3, built on Phase 1's `aofCreateApi` and `aofRefusal`); `GALLERY.CACHE.TAG` (Phase 4 Task 10), `invalidateGallery` (Phase 4 Task 11, which is `invalidateAll` over `QUERY.GALLERY.ALL`, itself `invalidateStatic`: Phase 4 Task 1). Produces `addImage(_state: AddImageState, form: FormData): Promise<AddImageState>` (`"use server"`) and `invalidateUpload(queryClient: QueryClient): Promise<void>` = `invalidateGallery(queryClient)`.

- [ ] Step 1: tests, mirroring the Back Office's `add-image.test.ts` with the fake API (`@allonfire/core/features/next/api/tests/fake-api`, Phase 1 Task 2) and `next/cache` mocked: (a) a form posting `rows[0].apps = BACK_OFFICE` sends `meta` whose entry has `apps` `[App.LAURA]` (the placement is Laura's whatever the browser says); (b) a form with no `apps` at all still posts and succeeds (Laura's form posts none); (c) success answers `{ added: 2, notice: IMAGE_UPLOAD.NOTICE.ADDED }` and calls `updateTag(GALLERY.CACHE.TAG)` once, and never `updateTag` with any other tag; (d) 413, 415, 403 and 500 answer `TOO_LARGE`, `UNSUPPORTED`, `REFUSED`, `FAILED` and clear no tag; (e) no file sends nothing. `upload-mutations.test.ts`: `invalidateUpload` really refetches the Gallery, proven with a real `QueryClient` and no spy on `invalidateQueries`: (i) an `InfiniteQueryObserver` under `QUERY.GALLERY.FEED` with `staleTime: "static"`, two pages loaded through `fetchNextPage` and a counting `queryFn`, is refetched on both pages in order after `invalidateUpload` resolves (a bare `queryClient.invalidateQueries({ queryKey: QUERY.GALLERY.ALL })` leaves the count unchanged: assert that first, as the regression this call exists for); (ii) the same under `QUERY.FAVORITES.FEED` (the prefix covers both); (iii) an inactive static feed is removed from the cache (`queryClient.getQueryData(QUERY.GALLERY.FEED)` is `undefined`), so the next visit hydrates a fresh first page that holds the new photo; (iv) a query outside the prefix is untouched.
- [ ] Step 2: run `pnpm --filter @allonfire/laura exec vitest run src/features/upload`: fails. Step 3: implement (the action is `addImages({ apps: [App.LAURA], form, post, refusalOf })` plus the tag; under 25 lines). Step 4: passes. Reconcile with Phase 4: `invalidateUpload` follows whatever `invalidateGallery` is when this starts.

### Task 15: Laura's copy, dressing and `Upload` component (through `/aof-design`)

**Files:**
- Create: `apps/laura/src/features/upload/components/{upload,upload-dressing}.tsx`, `components/tests/upload.browser.test.tsx`
- Modify: Laura's `translations/{en,it}.json` (reconcile the path with Phase 3): `Upload`

**Interfaces:** Produces `Upload` (client binding of `AOFAddImages`) and `UPLOAD_DRESSING: AOFAddImagesDressing` (Laura's Design). Copy `Upload` (en then it): `title` "Upload photos" / "Carica le foto"; `submit` "Upload" / "Carica"; `submitting` "Uploading" / "Caricamento"; `added` `{count, plural, one {# photo added} other {# photos added}}` / `{count, plural, one {# foto aggiunta} other {# foto aggiunte}}`; `loading` "Loading the upload form" / "Caricamento del modulo"; `page` "Upload" / "Carica" (metadata title). A toast stays within `MESSAGE_LENGTH.TOAST`, add `Upload.added` to Laura's toast key list. Binding: `apps={{ kind: "fixed", apps: [App.LAURA] }}`, `list={LAURA.PAGE.GALLERY}` (Phase 3 names the Gallery's path; it is Home, `sections[0]`: reconcile), `refresh={() => invalidateUpload(queryClient)}`, `labels` from `useTranslations("Upload")`. The dressing is built with `/aof-design` (one build and one screenshot round, owner's budget): a drop area as `Picker` (`AOFImageDropzone`, `className="basis-full"` so it wraps under the heading), the octopus Design's card, buttons and chosen colours; no kanji, Tabler icons; every control one `--field-height` tall; motion only behind `motion-safe:`.

- [ ] Step 1: browser test (`renderInApp` of Laura, `addImage` mocked, router mocked): the page offers the dropzone named by `Common.ImageUpload.pick.input` and no Apps toggle; picking a photo makes a row with Access defaulting to Private (`aria-current` on the Private option; the default and its why are Decision 2); the shared set's Access is Private; the action receives a form posting `rows[0].access = ImageAccess.PRIVATE` and the alt typed; a refused batch keeps the row and shows the `error.unsupported` copy; a saved add toasts `Upload.added` with the count then `replace`s `LAURA.PAGE.GALLERY`; Cancel links to the Gallery.
- [ ] Step 2: run: fails. Step 3: write copy, dressing, binding (run `/aof-design`; PRODUCT.md and the Design come from Phase 2). Step 4: passes; `pnpm static:i18n`.

### Task 16: The skeleton, the page and its gate

**Files:**
- Create: `apps/laura/src/features/upload/components/upload-skeleton.tsx`, `components/tests/upload-skeleton.browser.test.tsx`, `apps/laura/src/app/[locale]/(signed-in)/upload/page.tsx`
- Modify: Laura's guard test of Sections (Phase 3 calls `sectionGuards`: it must now cover Upload)

**Interfaces:** `UploadSkeleton` = `AOFAddImagesSkeleton` with `apps={{ kind: "fixed", ... }}`, `UPLOAD_DRESSING`, `t("Upload.loading")`, `t("Upload.title")`. Page, as the Back Office's `new/page.tsx` with no Apps read:
```tsx
export const generateMetadata = () => pageMetadata(LAURA.PAGE.UPLOAD, "Upload.page");
const UploadForm = async () => {
  await requireAppSession({ minRole: Role.ADMIN }); // the page check's own cached read; redirects Home below Admin
  return <SectionPage width="form"><AOFFreshOnReturn><Upload /></AOFFreshOnReturn></SectionPage>;
};
const UploadPage = () => (
  <Suspense fallback={<SectionPage width="form"><UploadSkeleton /></SectionPage>}><UploadForm /></Suspense>
);
export default signedInPage(UploadPage, { minRole: Role.ADMIN });
```
Data checklist here: points 1 to 6 as in "Data checklist"; the skeleton is point 6.

- [ ] Step 1: height test (ui's `heightAtIn`, fixed by Phase 1, Task 6): at 900, 520 and 360 px inside an `@container`, `UploadSkeleton` is as tall as the empty `Upload` (`toBeCloseTo(real, 0)`), and says it is loading. The guard test fails until the page declares `minRole: Role.ADMIN` equal to the Upload Section's (Phase 1 Task 7 helper: it reads the page source for `signedInPage(` and `minRole: Role.<X>`).
- [ ] Step 2: run both: fail. Step 3: write them. Step 4: pass; `pnpm --filter @allonfire/laura check-types`.

### Task 17: Laura's body limit and the ingress note

**Files:** Modify `apps/laura/next.config.ts` (Phase 3's, built on `AOFCreateNextConfig`), a test for it if Phase 3 tests its config; `docs/guides/deployment.md`.

- [ ] Step 1: test (a `next.config` test beside Phase 3's, or a one-case unit test): the exported config's `experimental.proxyClientMaxBodySize` and `experimental.serverActions.bodySizeLimit` equal `IMAGE.LIMIT.UPLOAD_BODY_BYTES`.
- [ ] Step 2: fails. Step 3: wrap with `withImageUploads` (inside `AOFWithLocalizedNotFound`, as the Back Office); remove the old `bodySizeLimit: "10mb"` if Phase 3 left it. Step 4: passes.
- [ ] Step 5: ingress note in `deployment.md` (one line, with the host list): every App that adds Images raises Next's body limit with `withImageUploads` and its ingress must let a body that size through: Traefik sets no body limit, and Cloudflare (which proxies `laura.` like `back-office.`) caps a request body per plan (reconcile: look the current free-plan limit up; it is 100 MB when this was written, below the API's 100 MiB `UPLOAD_BYTES`, so a batch near the cap is refused at Cloudflare before it reaches either App; owner's call whether to lower `IMAGE.LIMIT.UPLOAD_BYTES`). Laura's Traefik labels and host are Phase 7's.

### Task 18: e2e (Laura)

**Files:** Create `apps/laura/e2e/upload.spec.ts`, `upload-flow.ts` (the Back Office's `images-flow.ts` pattern: `openUpload`, `pick`, `fillRow`, `submitUpload`), modify Phase 3's `safe-area.spec.ts` and `instant.spec.ts` only if they need the Upload page added (reconcile: `appRoutes` finds it by itself; the spec must sign in as a Laura Admin for `/upload`).

**Interfaces:** Consumes Phase 3's e2e harness (`aofPlaywrightConfig`, a `signInAsAdmin`-style helper over `FIXTURE.USER.LAURA.ADMIN`, and one over `FIXTURE.USER.LAURA.USER`), `IMAGE_FIXTURE.FILE.PHOTO`, `IMAGE_FIXTURE.FILE.HEIC`, `LAURA.PAGE`, copy through the translators of Laura (`enT`).

- [ ] Step 1: tests, each run in all four projects: (a) happy path: an Admin opens `/upload`, picks the photo, types English and Italian alt (unique per run), submits, is at the Gallery path, the toast says one photo added, and the Gallery shows the new photo by its alt without a reload, in both browser states of the feed: (a1) the Admin first opened the Gallery, then moved to Upload by a soft navigation (the feed is mounted or hidden in `<Activity>`, so `invalidateStatic` must refetch it through its observers: the case a bare `invalidateQueries` leaves stale), and (a2) the Admin opened `/upload` directly (no feed in the browser, so the Gallery hydrates a fresh first page after `updateTag(GALLERY.CACHE.TAG)`); the photo's tile names itself by the alt (Phase 4 Task 12's `photo-tile`: the button's name is the alt in the page's language; reconcile if it changed); the Image is private (`GET /v1/images?app=laura` as the Admin lists it, a signed-out `request` does not); (b) a HEIC is previewed (a `picture` shows) and uploaded, and the stored Image is AVIF; (c) a refused batch: a text file named `.jpg` answers 415, the row and its typed alt stay, the form says the unsupported copy, nothing is in the Gallery; (d) a Laura User visiting `/upload` lands on the Gallery (proxy gate), and the Upload row is not in a User's menu; (e) two 6 MB pictures arrive whole (the Back Office's big-batch test, padded buffers) and are removed afterwards through the API; (f) without a mouse: Tab reaches the dropzone, Enter opens the chooser (`page.waitForEvent("filechooser")`) and `setFiles` makes row 1; Space does the same; Tab from the dropzone reaches its Choose button, then row 1's fields; Remove by keyboard moves focus to the heading when it was the last row; (g) a drop of a file on the dropzone (a `DataTransfer` built in the page) makes a row; the safe-area spec covers `/upload` upright and sideways.
- [ ] Step 2: `pnpm test:services && pnpm --filter @allonfire/laura exec playwright test e2e/upload.spec.ts`: fails until Tasks 14 to 17 are in (this is the first run of the whole chain; the Back Office's e2e at Task 12 already proved the shared part).
- [ ] Step 3: fix what the real browsers show (selectors, waits for hydration with `networkidle` as `openAdd` does). Step 4: all four projects green; then `e2e/safe-area.spec.ts` and `e2e/instant.spec.ts` (a soft navigation from the Gallery to Upload shows the skeleton in the static shell).

### Task 19: Docs and the parity table

**Files:** `docs/guides/images.md`, `docs/guides/back-office.md`, `docs/guides/laura.md` (Phase 3 rewrites it: reconcile), `docs/guides/design-system.md`, `docs/guides/forms.md` (one pointer), `apps/api/README.md`, `packages/ui/README.md` and `packages/storage/README.md` if they list exports (`ls`), Phase 3's parity-audit table (find with `git grep -n "file-validation" docs`).

- [ ] Step 1: gate, expected to print what the edits fix: `git grep -n "Add Images page sends\|UPLOAD_BODY_LIMIT\|features/images/components/picture-row\|image-alt-fields\|apps: \[{ app, public" docs apps/api/README.md`.
- [ ] Step 2: edits, each one pointer line, never a copy of code (`writing.md`): `images.md` bullet "The Back Office's Add Images page sends up to 20 pictures..." now names `AOFAddImages` (ui, `features/image/upload`), says Laura's Upload Section sends the same request through its own `addImage` with the Apps forced to Laura, the default access (private, with the reason), that the form previews a HEIC through `heicToJpeg` and sends the original, and `withImageUploads`. `back-office.md`: the Images Add paragraph and the body-limit bullet say "dressed in the Back Office's slots (`add-image-dressing`)" and point at `withImageUploads`. `laura.md`: the Upload route "(Admin only: Section `minRole`, API `authoriseUpload`)", the dressing and action files, the default access. `design-system.md`: one line under Phase 1's slot rules: `AOFAddImagesDressing` and its eight slots. `forms.md`: the field-group pointer example becomes ui's `AOFImageAccessRow`. `apps/api/README.md`: the `POST /v1/images` row's `meta` is `[{ apps: [App], alt, access? }]` (the README wrote `apps: [{ app, public? }]`, which the schema and ADR 0027 no longer match; reconcile against `uploadItemSchema`).
- [ ] Step 3: parity table rows (Phase 3's audit): `features/upload` (dropzone, preview grid, sequential loop): replaced by `AOFImageDropzone`, `AOFPictureRow`, the one `POST`; `lib/file-validation.ts`: replaced by `acceptFiles` and the API's limits; `lib/convert-heic.ts` and `heic2any`: replaced by `heicToJpeg` for the preview only, dependency removed; none "pending".
- [ ] Step 4: rerun the gate: prints nothing.

### Task 20: Review checkpoint

**Files:** none new.

- [ ] Step 1: `pnpm static:fix`, then `pnpm static:lint`.
- [ ] Step 2: `pnpm static:dupes` (the two dressings and the two `Upload`/`AddImage` bindings must not be clones of each other; a clone means the piece belongs in `AOFAddImages`), `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:i18n`, `pnpm static:tailwind`, `pnpm static:types`.
- [ ] Step 3: `pnpm turbo run check-types test --filter=@allonfire/ui --filter=@allonfire/storage --filter=@allonfire/core --filter=@allonfire/api --filter=@allonfire/back-office --filter=@allonfire/laura`, then `pnpm turbo run test:browser --filter=@allonfire/ui --filter=@allonfire/back-office --filter=@allonfire/laura`.
- [ ] Step 4: `pnpm test:services`, then `pnpm e2e:run --filter=@allonfire/back-office --filter=@allonfire/laura` (every spec, four projects; Back Office specs edited only for where copy is read from).
- [ ] Step 5: boundary proof: `pnpm --filter @allonfire/config exec vitest run local/tests/packages-name-no-app.test.ts` (Phase 1 Task 0 guard) passes; `git grep -n "BACK_OFFICE\|LAURA" packages/ui/src/features/image/upload packages/storage/src/features/next` prints nothing; `git grep -n "heic2any" apps packages` prints nothing.
- [ ] Step 6: docs touched are those of Task 19; `git status` shows only intended files; stamp the plan done and stop: the owner reviews and commits by hand (one branch and PR to `dev` for the phase).
