# Laura photo Download and Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Download and a Share button in Laura's photo preview that hand a signed-in User an **Export** (a metadata-free JPEG made by the API), proven in browsers and on the iOS and Android simulators.
**Status:** implemented (uncommitted) @ 2026-11-25T17:04:25Z

**Architecture:** `GET /v1/images/:id/export` in the Image module (`packages/storage`) checks the Session and `canSeeImage`, decodes the stored AVIF with `sharp`, answers a JPEG with `Content-Disposition: attachment`, behind its own rate limit. A shared ui component (`AOFExportActions`) shows Download (a plain link to the API) and Share (`fetch` then `navigator.share({ files })`, only where `canShare` says yes); Laura puts it in the preview capsule. A device run on both simulators decides the two open points (installed iOS app and a cross-origin link; `share()` after an async `fetch`).

**Tech Stack:** Hono + hono-openapi, sharp, `@aws-sdk/client-s3`, hono-rate-limiter (Redis), React 19, Base UI via `AOFButton`, next-intl, Vitest (unit, browser), Playwright, `agent-device` through the T3 device tools.

**Spec:** `docs/superpowers/specs/2026-11-25-laura-photo-download-share-design.md` (and `docs/adr/0036-a-picture-leaves-the-apps-only-as-an-export.md`, `CONTEXT.md` term **Export**). Read both before starting.

## Global Constraints

- The Export is a **JPEG with no metadata**, named `<created UTC date>-<first 8 id chars>.jpg`, never the stored key; never a link; made on request, never stored.
- `GET /v1/images/:id/export` needs a **Session** even for a public Image; same visibility rule as a read (`canSeeImage`, hidden is **404**, never 403); `Cache-Control: private, no-store`; `X-Content-Type-Options: nosniff`.
- Dedicated rate limit: **10 requests a minute per client**, env `STORAGE_EXPORT_RATE_LIMIT_{KEY_PREFIX,MAX,WINDOW_MS}` with defaults in `IMAGE.EXPORT.RATE_LIMIT.DEFAULT`, on top of the global 100. (Raised to 30, and counted per signed-in User instead of per address, on 2026-11-26.)
- Share shows only where `navigator.canShare({ files })` is true (probed with a dummy JPEG `File` on the first client render); Download always shows. Cancelling the share sheet (`AbortError`) is silent. Download is a plain link: no toast for its failures.
- No Copy button, no link or clipboard fallback, no Back Office change.
- A package never names an App (ADR 0033). Laura reads the API only. Shared pieces know no Design.
- Repo rules: no `as` casts except `as const`; a constant's type from zod (`z.enum`); constants one nested object per owner (`IMAGE.EXPORT`); no `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify` (use core's helpers); a path or error code is never a string literal (use the typed client's `$url`, `API.*`, `STORAGE.PATH.*`); Tailwind class lists via `cva` or inline `cn`; tests first, first line `// @module-tag unit|integration`, Vitest globals; env var names start with their owner (`STORAGE_`); Italian and English both; Laura copy says "image", never "photo"; never `rounded-full`, no raw colours.
- Never close a simulator or emulator; never stop the owner's dev servers (3200 Laura, 3300 API); use the owner's Chrome tab. **Never commit** (the owner commits with `/iso-commit`); other threads' uncommitted work stays untouched.
- Guides to follow while building: `docs/guides/{images,api,laura,next-apps,testing,code-style,conventions,package-layout,design-system}.md`; read `docs/guides/next-apps.md` data checklist (this feature adds no page read, so only "resource protection" applies).

## Review Focus

1. **The Image is removed or hidden between opening the preview and pressing Share/Download** → the export answers 404; Share shows `shareFailed`, Download lands on the API's problem page. Task 2 and Task 5 pin the 404; Task 6 pins the toast.
2. **`share()` rejects with `NotAllowedError` after the `fetch`** (Safari's activation) → Task 8's spike decides; Task 9 implements the two-tap path if needed and its test.
3. **Slide changes while a share is in flight** → the sheet gets the Export of the photo that was pressed, never the next one. Task 5 pins it.
4. **A very large stored Image** (decode memory/CPU) → one decode in flight per request, `limitInputPixels` from `IMAGE.LIMIT.INPUT.PIXELS`; Task 2 pins a refusal above it.
5. **An expired Session** → 401 from the export; Share toasts `shareFailed`, nothing is half-saved. Task 5 pins it.
6. **A stored file that carries EXIF** (a legacy object bypassing `prepare-image`) → the JPEG has none. Task 2 and Task 4 pin it.
7. **A 320 px phone**: heart, Download, Share, Remove in one capsule without overflow or a covered control. Task 6 pins it at 320 and 390.

---

### Task 1: The Export's name and constants

**Files:**
- Create: `packages/storage/src/features/image/utils/export-name.ts`
- Create: `packages/storage/src/features/image/utils/tests/export-name.test.ts`
- Modify: `packages/storage/src/features/image/constants/image.ts` (add `IMAGE.EXPORT`)
- Modify: `packages/storage/package.json` (export key for `export-name`, as the neighbouring files have one)

**Interfaces:**
- Produces: `exportName({ createdAt, id }: { createdAt: string; id: string }): string`; `IMAGE.EXPORT = { CONTENT_TYPE: "image/jpeg", EXTENSION: "jpg", QUALITY: 90, RATE_LIMIT: { DEFAULT: { KEY_PREFIX, MAX: 10, WINDOW_MS: UNIT.MS_PER_MINUTE } }, DOC: { SUMMARY, DESCRIPTION, RESPONSE } }`.

- [x] **Step 1: Failing test** `export-name.test.ts`: `exportName({ createdAt: "2026-11-25T08:30:00.000Z", id: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d" })` is `"2026-11-25-1a2b3c4d.jpg"`; two ids sharing a date give two names; a `createdAt` near midnight in another offset still uses the **UTC** date (`2026-11-25T23:59:59.999Z` → `2026-11-25`); the name never contains the stored key's `.avif`.
- [x] **Step 2:** run `pnpm --filter @allonfire/storage exec vitest run src/features/image/utils/tests/export-name.test.ts`; expect FAIL (module missing).
- [x] **Step 3:** implement `exportName` (slice the ISO date, the first 8 id characters, `IMAGE.EXPORT.EXTENSION`); add the `IMAGE.EXPORT` constants (quality named, doc strings in the same style as `IMAGE.DOC.GET`: sign-in required, 404 hides, JPEG without location or camera data, `attachment`, rate limit).
- [x] **Step 4:** rerun; expect PASS. Run `pnpm --filter @allonfire/storage exec tsc --noEmit`.

### Task 2: The export route and its JPEG

**Files:**
- Create: `packages/storage/src/features/image/export/export-image.ts`, `.../export/tests/export-image.test.ts`
- Modify: `packages/storage/src/features/s3/utils/objects.ts` (add `getObject`), `packages/storage/src/features/image/objects/utils/image-objects.ts` (add `readImageObject`)
- Modify: `packages/storage/src/features/image/hono/utils/deps.ts` (`readObject: typeof readImageObject`), `.../hono/tests/stub-image-deps.ts`
- Modify: `packages/storage/src/features/image/hono/routes/{routes,read-handlers,index}.ts`, `packages/storage/src/shared/constants/paths.ts` (`EXPORT: "/:id/export"`)
- Modify: `apps/api/src/features/image/image-deps.ts` (pass `readObject: readImageObject`)
- Test: `packages/storage/src/features/image/hono/tests/export.test.ts`

**Interfaces:**
- Consumes: Task 1's `exportName`, `IMAGE.EXPORT`.
- Produces: `getObject(bucket: string, key: string): Promise<Buffer>`; `readImageObject(key: string, bucket = env.STORAGE_BUCKET): Promise<Buffer>`; `exportImage(source: Buffer): Promise<Buffer>` (sharp, `limitInputPixels: IMAGE.LIMIT.INPUT.PIXELS`, `.jpeg({ quality: IMAGE.EXPORT.QUALITY })`, no `withMetadata`; throws `ImageTooLargeError` above the limit); `exportRoute` (`describeRoute`, tag `IMAGE.OPENAPI_TAG`, responses `200` content `image/jpeg`, problems 401, 404, 429); `exportHandlers(deps: ImageDeps)`; route `GET STORAGE.PATH.EXPORT` registered in `imageRoutes`.

- [x] **Step 1: Failing tests.** `export-image.test.ts` (unit, builds AVIFs with sharp): the output starts with the JPEG signature `FF D8 FF`; an input carrying EXIF (`sharp(...).withExif({ IFD0: { Copyright: "x" } })` then written as AVIF/PNG) yields a JPEG whose `sharp(out).metadata()` has no `exif`; the dimensions are the source's; an input over `IMAGE.LIMIT.INPUT.PIXELS` throws `ImageTooLargeError` (stub the limit by passing a tiny source and a constants override only if the constant cannot be exceeded cheaply: use a header-only fixture). `export.test.ts` (route, stub deps as `read.test.ts` does): no Session → 401 on a **public** Image; a visible private Image with a Session → 200, `Content-Type: image/jpeg`, `Content-Disposition` equals ``attachment; filename="${exportName(...)}"``, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, body is a JPEG; a hidden Image → 404 with the same body as a missing id (it never says it exists); the stored key never appears in any header.
- [x] **Step 2:** run both files; expect FAIL.
- [x] **Step 3:** implement `getObject` (`GetObjectCommand`, body to `Buffer` through `transformToByteArray`), `readImageObject`, `exportImage`, the handler (`validator("param", idParamSchema, invalidHook)`; Session via `c.get(AUTH.VAR.SESSION)`; missing Session throws the module's existing 401 helper; `getImage` → `canSeeImage(user, image)` else `notFound()`; `readObject(image.key)` then `exportImage`; headers set with `HTTP.HEADER.*` constants where they exist), the route and its OpenAPI entry. Wire `readObject` in the host's `imageDeps` and in `stub-image-deps.ts` (it returns a small real AVIF made once with sharp).
- [x] **Step 4:** run the storage package's tests (`pnpm --filter @allonfire/storage test`), `tsc --noEmit` for storage and `apps/api`; expect PASS.

### Task 3: The export's own rate limit

**Files:**
- Create: `packages/storage/src/features/image/hono/rate-limit/export-limit.ts`, `.../tests/export-limit.test.ts`
- Create: `apps/api/src/features/image/middleware/export-rate-limit.ts`
- Modify: `packages/storage/src/environment/environment.ts` (`STORAGE_EXPORT_RATE_LIMIT_KEY_PREFIX`, `_MAX`, `_WINDOW_MS`, shaped like `AUTH_RATE_LIMIT_*` in `packages/auth/src/environment/environment.ts`, defaults from `IMAGE.EXPORT.RATE_LIMIT.DEFAULT`), `apps/api/src/app.ts` (`.use(exportRateLimit(store))` right after `.use(authRateLimit(...))`), wherever `AUTH_RATE_LIMIT_MAX` is listed in docs, compose files and env examples (`grep -rn AUTH_RATE_LIMIT_MAX . --exclude-dir=node_modules`)

**Interfaces:**
- Produces: `exportLimit<E extends Env>(limiter: MiddlewareHandler<E>): MiddlewareHandler<E>` (the module owns which requests count, as `authLimit` does): runs `limiter` only for `GET` on the images mount's `/:id/export` path, else `next()`; `exportRateLimit(store: RateLimitStore)` in the host builds `createRateLimiter({ keyPrefix, limit, store, trustedHops: env.API_TRUSTED_PROXY_HOPS, windowMs })`.

- [x] **Step 1: Failing tests.** `export-limit.test.ts`: the limiter runs for `GET /v1/images/<id>/export` and not for `GET /v1/images`, `GET /v1/images/<id>`, `POST /v1/images`, or `GET /v1/images/<id>/export/other`; the trailing slash is tolerated. Add an integration case in Task 4 for the 429.
- [x] **Step 2:** run it; expect FAIL. **Step 3:** implement as `authLimit` is (path predicate built from the paths constants, not string literals). **Step 4:** rerun; expect PASS; `pnpm --filter @allonfire/api exec tsc --noEmit`.

### Task 4: API integration, OpenAPI and copy

**Files:**
- Create: `apps/api/src/features/image/tests/export.integration.test.ts`
- Modify: `apps/api/src/features/docs/tests/spec.test.ts` (the new operation is documented with 200/401/404/429), `apps/api/src/features/i18n/translations/{en,it}.json` only if a new error code was added (none expected)
- Modify: `docs/guides/api.md`

- [x] **Step 1: Failing integration tests** (real Postgres and MinIO, as `read.integration.test.ts`, Fixtures from `FIXTURE.IMAGE`): a Laura User exports `PRIVATE_IN_LAURA` → 200 JPEG; a Back Office-only Admin gets 404 for it; a visitor gets 401 for a public Image; an object put straight into the bucket **with EXIF** (via `putImageObject`) exports with no EXIF; the 11th request within a minute from one client answers 429 (set `STORAGE_EXPORT_RATE_LIMIT_MAX` low through the test app's env, as the auth limiter's test does). 
- [x] **Step 2:** run `pnpm --filter @allonfire/api exec vitest run src/features/image/tests/export.integration.test.ts`; expect FAIL until the host wiring from Tasks 2 and 3 is in; then PASS.
- [x] **Step 3:** update the spec test and `api.md` (the route, who may call it, JPEG, limits).
- [x] **Step 4:** `pnpm --filter @allonfire/api test` and `pnpm --filter @allonfire/api test:integration` (script names as in the package); expect PASS except the known Phase 5 failure `favorites.integration` ("is refused on both writes...").

### Task 5: Shared `AOFExportActions` and the share utility

**Files:**
- Create: `packages/ui/src/features/image/utils/share-export.ts`, `.../utils/tests/share-export.test.ts`
- Create: `packages/ui/src/features/image/components/aof-export-actions.tsx`, `.../tests/aof-export-actions.browser.test.tsx`
- Modify: `packages/ui/package.json` (two export keys)

**Interfaces:**
- Produces: `SHARE_RESULT = { CANCELLED: "cancelled", FAILED: "failed", SHARED: "shared" } as const` with `shareResultSchema = z.enum(SHARE_RESULT)`; `canShareExport(): boolean` (`navigator.canShare?.({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] })`, false when `navigator` or the method is missing); `shareExport(url: string, name: string): Promise<ShareResult>` (`fetch(url, { credentials: "include" })`; not ok → FAILED; the blob typed `IMAGE.EXPORT.CONTENT_TYPE`; `new File([blob], name, { type })`; `navigator.canShare({ files })` false → FAILED; `navigator.share({ files })`; `AbortError` → CANCELLED; any other throw → FAILED; never throws); `AOFExportActions({ downloadHref, fileName, labels: { download, share }, onShareFailed }: AOFExportActionsProps)` where `AOFExportActionsProps` extends `ComponentPropsWithoutChildren<"div">`-style spread of the rest, renders **Download** as an anchor styled as an `AOFButton` icon ghost (`render={<a href={downloadHref} download={fileName} />}`, `IconDownload`, `AOFTooltip`, `aria-label`) and **Share** as an `AOFButton` icon ghost (`IconShare`) shown only once the client says `canShareExport()`.

- [x] **Step 1: Failing unit tests** (`share-export.test.ts`, `navigator` stubbed with `vi.stubGlobal`): `canShareExport` is false without `navigator.canShare`, false when it returns false, true when it returns true for a JPEG `File`; `shareExport` calls `navigator.share` with one `File` named `name` and typed `image/jpeg` and returns SHARED; a rejected `AbortError` returns CANCELLED; a `NotAllowedError`, a non-ok response and a `fetch` rejection return FAILED; `canShare` false at call time returns FAILED without calling `share`; `fetch` receives `credentials: "include"`.
- [x] **Step 2: Failing browser tests** (`aof-export-actions.browser.test.tsx`, Chromium and WebKit): Download is a link whose `href` and `download` match the props and has an accessible name; Share is absent when `canShare` is false and present from the first paint when true (stub before render); pressing Share calls the share utility with the **props at the time of the press** (re-render with a new `downloadHref` after the press does not change what was shared); `onShareFailed` runs on FAILED and not on CANCELLED; both buttons are keyboard operable; at 320 px the two icon buttons stay inside their container.
- [x] **Step 3:** run both; expect FAIL. **Step 4:** implement. **Step 5:** run `pnpm --filter @allonfire/ui exec vitest run src/features/image` and `pnpm --filter @allonfire/ui test:browser`; `tsc --noEmit`; expect PASS.

### Task 6: Laura's preview capsule

**Files:**
- Modify: `apps/laura/src/features/gallery/components/photo-preview.tsx` (`PreviewActions` gains `<AOFExportActions>` between the heart and Remove), `apps/laura/src/features/i18n/translations/{en,it}.json` (`Gallery.preview.download`, `.share`, `.shareFailed`: "Download the image", "Share the image", "The image could not be shared. Try again." and Italian "Scarica l'immagine", "Condividi l'immagine", "Non è stato possibile condividere l'immagine. Riprova."), `apps/laura/src/features/gallery/constants/gallery.ts` only if a constant is needed
- Test: `apps/laura/src/features/gallery/components/tests/photo-preview.browser.test.tsx`

**Interfaces:**
- Consumes: Task 5's `AOFExportActions`, `exportName` (Task 1) with the photo's `createdAt` and `id` (add `createdAt` to the feed item if the feed does not carry it: read `GalleryItem` in `utils/feed-patch.ts` first; the API body already has `createdAt`).
- The export URL comes from the typed client: `api[API.VERSION.CURRENT].images[":id"].export.$url({ param: { id } }).toString()`, never a string path.

- [x] **Step 1: Failing tests** added to the preview's browser test: Download's `href` ends with the export path of the open photo and `download` equals `exportName(...)`; stepping to the next photo changes both; Share is hidden when `canShare` is false and shown when true; a failed share shows the page's `shareFailed` toast, a cancelled one shows nothing; the capsule (heart, Download, Share, Remove for an Admin) has no overflow and no covered control at **320 and 390 px**, in English and Italian, light and dark; for a User (no Remove) the capsule still fits; an Italian `aria-label`s test.
- [x] **Step 2:** run `pnpm --filter @allonfire/laura test:browser src/features/gallery/components/tests/photo-preview`; expect FAIL. **Step 3:** implement and add the copy (`pnpm static:i18n`). **Step 4:** run Laura's unit and browser suites, `tsc`, Biome; expect PASS. Invoke `/aof-design` only for the button look if a screenshot round shows the capsule needs it (owner's budget: one build, one screenshot round).

### Task 7: End to end

**Files:**
- Modify: `apps/laura/e2e/gallery.spec.ts` (or the spec that opens the preview), reuse `e2e/pages.ts` `signInAsAdmin`

- [x] **Step 1: Failing test** `downloads a JPEG named for the photo from the preview`: sign in as the Laura Admin, open a photo, click Download, `page.waitForEvent("download")`; the suggested filename matches `^\d{4}-\d{2}-\d{2}-[0-9a-f]{8}\.jpg$`, the file's first three bytes are `FF D8 FF`, and the stored key is not in the name. A second test: Share is visible exactly when `page.evaluate(() => typeof navigator.canShare === "function" && navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] }))` says so.
- [x] **Step 2:** run through the e2e runner (`pnpm --filter @allonfire/laura test:e2e e2e/gallery.spec.ts`; if another session holds the e2e ports, wait and retry); expect FAIL, then PASS after Task 6.

### Task 8: Device runs and the spike (decides Task 9)

**Files:**
- Modify: this plan's Implementation Log (record each run: device, browser or installed, result)

- [x] **Step 1: Prepare.** Load the device tools (`ToolSearch select:mcp__t3-code__device_list,mcp__t3-code__device_open,mcp__t3-code__device_screenshot,mcp__t3-code__device_close`). `device_list`; boot `iPhone 18 Pro` (iOS 27.2) and `Pixel_8_API_35` if not booted. Reach the dev servers as `docs/adr/0021-dev-apps-reach-devices-as-tailscale-services.md` and `docs/guides/tooling.md` say (an Android emulator needs `adb reverse` for 3200, 3300 and the image server's 9010 if it does not use the tailnet addresses). Never stop the owner's dev servers; check the ports first.
- [ ] **Step 2: iPhone, Safari tab.** Open Laura, sign in with the Fixtures' Admin, open a photo. Record: Download saves a JPEG (it appears in Files/Downloads); Share opens the sheet **with the JPEG** and "Save Image" works; cancelling the sheet shows nothing; with the Session expired (clear cookies) Share shows the toast. *All run except the expired Session, NOT tested on a device (browser tests cover a 401).*
- [ ] **Step 3: iPhone, installed.** Add to Home Screen (Safari's share sheet in the simulator), open the app, repeat. **Decision 1:** if Download leaves the app's scope or fails, the answer is the same-origin rewrite (Task 9a). **Decision 2:** if `share()` rejects with `NotAllowedError` after the `fetch`, the answer is the two-tap Share (Task 9b). *First run: Add to Home Screen opened Safari chrome. Run standalone on 2026-11-26 (see the Log); expired Session NOT tested. Decision 1: the owner kept the API link (Task 9a not built).*
- [ ] **Step 4: Pixel, Chrome tab, then installed.** Repeat; record the same four results. *Chrome tab, and installed on 2026-11-26 (see the Log); expired Session NOT tested.*
- [ ] **Step 5: Desktop.** Chrome and Safari show Share and open the system menu; Firefox shows only Download (note Firefox is manual: no Playwright project). *Playwright (Chromium, WebKit) covers Chrome and Safari; Firefox NOT run.*
- [x] **Step 6:** write each result in the Implementation Log; screenshots (`device_screenshot`) go in the scratchpad, not the repo. Leave every simulator running.

### Task 9: Apply the spike's outcomes (only the ones Task 8 recorded)

**Files:** a) `apps/laura/next.config.ts`, `apps/laura/src/features/gallery/components/photo-preview.tsx`, tests; b) `packages/ui/src/features/image/components/aof-export-actions.tsx`, `packages/ui/src/features/image/utils/share-export.ts`, tests.

- [ ] **9a, if Decision 1 says rewrite:** failing test first: Laura's `next.config` rewrites `/exports/:id` to the API's export path (read the config the way `next.config.ts` is tested elsewhere, or an e2e that downloads through Laura's origin); implement the `rewrites()` entry from the typed path and point `downloadHref` and the share URL at Laura's own origin; the API still decides access (the Session cookie travels). Re-run Task 8 steps 3 and 4. *NOT built: see the Implementation Log (2026-11-26: Download now fetches first; the installed iPhone behaviour was kept by the owner).*
- [x] **9b, if Decision 2 says two taps:** failing browser test: when `share()` rejects with `NotAllowedError`, the button reads "Ready" (new copy `Gallery.preview.shareReady`, English and Italian), keeps the fetched `File`, and the second press calls `navigator.share` synchronously with it; the held `File` is dropped when the photo changes; `shareExport` splits into `prepareExport(url, name): Promise<File | null>` and `shareFile(file): Promise<ShareResult>`. Re-run Task 8 steps 2 to 4. *Not triggered by the first device runs; triggered and built on 2026-11-26 (a slow connection): see the Log. The notice is a message, not a "Ready" button: the capsule holds icons only.*
- [x] **If neither decision triggered:** write "no change" in the Implementation Log.

### Task 10: Documentation and final checks

**Files:**
- Modify: `docs/guides/images.md` (replace the line "A photo has no Share button…" with the Export rule: signed-in, JPEG, no metadata, never a link, `GET /v1/images/:id/export`, rate limit), `docs/guides/laura.md` (the preview's actions), `docs/guides/design-system.md` (`AOFExportActions`), `docs/guides/testing.md` (the device runs and their record), `docs/guides/api.md` (done in Task 4)
- Verify: `CONTEXT.md` already holds **Export**; ADR 0036 exists.

- [x] **Step 1:** update the guides; cite the docs used (MDN `Navigator.canShare` and `share`, W3C Web Share, WebKit bugs 211234 and 275288, RFC 6266 `Content-Disposition`).
- [x] **Step 2: Repository documentation review** (`/iso-write` Step 3): read `docs/guides/{images,api,laura,testing,code-style,conventions,package-layout,design-system}.md` against the new code and fix any place it breaks a rule, test first.
- [x] **Step 3: Final run:** `pnpm static:lint`, `pnpm exec biome check`, `pnpm static:knip`, `pnpm static:dupes`, `pnpm static:i18n`, `pnpm design:sync --check`; `tsc --noEmit` in storage, ui, api and laura; unit, browser and the API integration suites of storage, ui, api and laura; Laura's e2e. Expected: all green except the known Phase 5 `favorites.integration` failure.
- [x] **Step 4:** tick the plan's checkboxes, stamp it as `/iso-write` says, and stop. Nothing is committed.

## Implementation Log

### Reconciliation with the code (before building)

- `exportImage` reuses `decodeUpright` (`prepare/prepare-image.ts`): it already reads the header, throws `ImageTooLargeError` above `IMAGE.LIMIT.INPUT.PIXELS` and applies the orientation; sharp writes no metadata unless asked.
- The 401 comes from auth's `requireSession()` guard; `HTTP.HEADER.CONTENT_DISPOSITION`, `HTTP.CACHE_CONTROL.PRIVATE_NO_STORE` and `HTTP.NO_SNIFF` did not exist and were added to core's `HTTP`.
- `exportLimit(limiter)` has no mount argument, so it matches the path's last three segments (`…/images/:id/export`) from the paths constants, wherever a host mounts the module.
- Review (2026-11-26) replaced that matcher and `export-limit.test.ts`: it let `HEAD` through uncounted (Hono answers `HEAD` with the `GET` handler). The host now passes `deps.limitExport`, which the Export route runs first.
- ui keeps its tests in `features/image/tests/`, not `utils/tests/`; `SHARE_RESULT` lives in ui's `IMAGE.EXPORT` constants and `ShareResult` in `image-schema.ts`. Download is an anchor styled by `aofButtonVariants`, not a Base UI `render`: `render` would give it `role="button"`.
- Gallery and Favorites items carried no `createdAt` (the service dropped it): `GalleryRecord.createdAt` (the Image's, never the Favorite's), the item schema and body now carry it, so the browser names the file as the API does.
- Image ids are cuid-like, not hex: the e2e name pattern is `[0-9a-z]{8}`.
- Shared test helpers `tests/png-header.ts` (moved out of `prepare-image.test.ts`) and `tests/exif-image.ts` (`apps/api` has no `sharp`).
- `stubImageDeps.readObject` fails loudly like every other dep; tests pass their own.
- Task 7 signs in as the Laura User (the spec's `beforeEach`), which is the stricter case.
- Owner's follow-up: the capsule's controls were made bigger (44px buttons, 28px icons, `size-11`/`size-7`) on the heart, Download, Share, Remove, Close and the arrows; the lightbox's bottom padding grew 12px (`4.75rem`) to keep the photo centred between caption and capsule.

### Device runs (Task 8)

Dev Apps over Tailscale Services; a throwaway Laura Admin created in the dev database and deleted after (the dev database has no Fixtures).

| Device | Where | Download | Share | Cancel the sheet | Capsule |
|---|---|---|---|---|---|
| iPhone 18 Pro (iOS 27.2) | Safari tab | "Do you want to download 2026-11-24-zj1ht4n8.jpg" from the API's origin, accepted | Sheet opens with the JPEG (622 KB, named), Save Image offered; `share()` after the `fetch` did **not** reject | Silent | Fits |
| Pixel_8_API_35 (Android 15) | Chrome tab | Saved as the named JPEG (second press: Chrome's "Download file again?") | "Sharing image" sheet with the picture, Copy image, Quick Share | Silent | Fits |
| iPhone, installed | Home Screen | **Not verified**: Safari's Add to Home Screen made an icon that opened with Safari's chrome (not standalone); the Options "Open as Web App" step was not driven | - | - | - |
| Pixel, installed | Chrome's Install | **Not run** (Laura showed "Install Laura") | - | - | - |
| Desktop Chrome, Safari, Firefox | - | Playwright (Chromium, WebKit, mobile projects) pass; Firefox is manual and **not run** | - | - | - |

Not run on a device: Share with an expired Session (covered by the browser tests: a 401 shows the toast).

### Decisions (Task 9)

- **Decision 1 (cross-origin link in an installed iOS app):** the API link works from a Safari tab. The installed standalone case is unverified, so **no rewrite was added**; if an installed app refuses the link, Task 9a applies.
- **Decision 2 (`share()` after the `fetch`):** iOS Safari and Android Chrome both opened the sheet, so **no two-tap path was added** (Task 9b not needed).

### Slow connection (2026-11-26, Task 9b)

With the local API delaying the Export, `share()` opened after 3 s (iOS) and was refused after 6 s (iOS Safari and Android Chrome, `NotAllowedError`), so Task 9b was built: `prepareExport` and `shareFile`; the late file waits for the next press; another Image or leaving the preview drops the fetch and the file. Run on both devices with 6 to 8 s delays: second tap and a tap after closing the sheet share with no new request; moving on or closing while loading shows nothing later; a kept file is forgotten on the next Image; a slow Download saves; a Download left behind saves nothing (Android: no download notice); a 429 shows the failure notice (Android: Share and Download; iOS: Share). iOS, Download left behind while loading: no download sheet. Not run in this pass: installed apps (next paragraph), expired Session, offline.

Installed, same day, both simulators (iOS "Open as Web App"; Android Chrome "Add to Home screen" > "Install", which on this emulator made a Chrome-badged icon opening full screen): Share fast and slow, the second tap, a tap after closing the sheet, moving on or closing while loading, a kept file forgotten on the next Image, slow Download and the 429 notices all passed; a Download left behind saved nothing on Android (on iOS no file viewer opened). Android keeps the Image open after a Download. **Accepted by the owner (2026-11-26, left as it is), iOS installed only:** Download opens the system file viewer (Share there offers Save Image), and closing it **reloads Laura** on the Gallery, so the open Image is lost. Not compared with the earlier plain link.

### Implementation

- Implemented: 2026-11-25T17:04:25Z
- Workspace: current-branch — feat/laura-p0-drop
- Committed: no, awaiting user review
