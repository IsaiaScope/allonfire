# Laura: Download and Share in the photo preview

Date: 2026-11-25. Status: design agreed in chat and grilled against `CONTEXT.md` and the ADRs.

## Intent and why

Laura's photo preview (`PhotoPreview` over ui's `AOFLightbox`) has a heart and, for an Admin, Remove. The owner wants **Download** (save the picture to the device) and **Share** (send the picture itself through the phone's share sheet) beside them. The old Laura (before commit `89db6758`, `apps/laura/src/features/gallery/components/photo-preview.tsx`) already had both, plus Copy; the owner wants them rebuilt against the official docs and the repository's skills, not copied, and proven on iOS and Android simulators as well as on the web.

The rebuild left Share out on purpose (`docs/guides/images.md` line "A photo has no Share button"; Phase 4 plan): a link to a private photo works for anyone until it expires, the cdn sends no CORS header so the browser cannot read the file, and `canShare` support is uneven. This design keeps the first reason as a hard rule (the Export is sent, never a link) and removes the other two by moving the work to the API.

## Goals

- A Download and a Share button in the preview's capsule, for every Laura Member (Admin and User): they can already see the photo.
- Share sends the **Export only**: no link, no title, no text.
- The Export is a **JPEG** with no metadata (no GPS, no camera), named `<created UTC date>-<first 8 id chars>.jpg`, never the stored key.
- Share is shown only where `navigator.canShare({ files })` says the browser can send that Export. Download is always shown.
- Works in Chrome, Firefox, Safari (desktop), iOS Safari and Android Chrome, in the browser and installed to the Home Screen.
- Authorised exactly as seeing the photo is (ADR 0020, ADR 0027): a hidden picture answers 404.
- Every word in `en.json` and `it.json`; both themes; keyboard and screen-reader usable; the capsule fits a 320 px phone.

## Non-goals

- Copy to the clipboard (old Laura had it; the owner did not ask; its Safari canvas workaround was the weakest part of the old code).
- Sharing a link, a caption or the photo's alt text.
- Bulk download, a download of the original AVIF, a download from the grid.
- The Back Office's Image page using it now (the endpoint is reusable; adopting it is a later request).

## Anti-goals (a failure even if it works)

- A bearer link reaching page JavaScript, a shared cache or the share sheet.
- A button that does nothing on a browser that cannot share files.
- A download that silently fails on iOS or in an installed app.
- Metadata (location) leaving with a shared picture.

## Constraints

- `docs/guides/images.md`, `laura.md`, `next-apps.md`, `api.md`, `testing.md`, `code-style.md`, `conventions.md`; ADR 0020 (Image Apps and access), ADR 0027 (signed links, 404 for hidden), ADR 0028 (private cache), ADR 0033/0034.
- Laura reads the API only (no Prisma, no storage import). A package never imports an App. Shared pieces know no Design.
- No `as` casts except `as const`; constants one nested object per owner; error codes and paths never string literals; no `JSON.parse/stringify`; Tailwind class lists only via `cva` or inline `cn`.
- Tests first, `// @module-tag` first line.
- Official docs to follow (verified in the plan): MDN `Navigator.share` and `canShare`, W3C Web Share, web.dev "How to share files", RFC 6266 (`Content-Disposition`), Hono streaming, imgproxy or sharp metadata behaviour; skills `/aof-design`, `/aof-safari`, `next-dev-loop`.

## Facts found

- `AOFLightbox` already takes an `actions` slot for the bottom capsule; Laura fills it with `PreviewActions` (the heart and Remove).
- Pictures are stored as AVIF and served as AVIF or WebP by the image server (`IMGPROXY_AUTO_AVIF/WEBP`); the cdn nginx sends no `Access-Control-*`.
- Chromium's Web Share accepts only some image types (AVIF was a proposal at the time of writing); WebKit publishes no list. A JPEG is the safe type.
- WebKit bugs 211234 (revoking a blob URL straight after the click breaks the download on iOS) and 275288 (an installed web app cannot save pictures from a blob link).
- `GET /v1/images/:id` already exists with the rule to reuse: `canSeeImage(user, image)`, else `notFound()`.
- `packages/storage` already uses `sharp` and has `image-objects.ts` (put, copy, delete; no read yet).
- Simulators on this machine: `iPhone 18 Pro` (iOS 27.2) and `Pixel_8_API_35` (Android 15), both shut down.

## Approaches considered

| | Trade-off |
|---|---|
| A. CORS on the cdn, browser fetches a JPEG with `Accept: image/jpeg` | least code; but page JavaScript reads the bearer link, nginx caches the answer, two compose files change, resolution capped at 2560 px |
| B. Next route handler in Laura | no CORS change; but Laura only, Laura's server carries the bandwidth, authorisation is a second copy |
| **D. API endpoint `GET /v1/images/:id/export` (picked)** | authorisation stays in the API; no bearer link in the browser; metadata stripped; `Content-Disposition: attachment` makes Download a plain link; reusable by the Back Office; costs one route, its tests and an OpenAPI entry |

Picked by the owner: **D**, "work done correctly, security first".

## Language

`CONTEXT.md` gains **Export**: the metadata-free JPEG made from an Image on request for a signed-in User to keep or send, never stored, never a link. "File", "picture" and "photo" stay avoided for an Image; the UI's own words are "Download" and "Share" (Italian "Scarica" and "Condividi", with "image" never "photo").

## Design

**As built (2026-11-26):** Download is not a plain link. On the device runs a failed Download left the app, so it fetches the Export first, saves it from a `blob:` URL and tells a failure in a toast. This replaces every "plain link" line below, call 1 included. The rules now live in `docs/guides/images.md`.

### API

- `GET /v1/images/:id/export` in `packages/storage` (`features/image/hono/routes`), beside `getRoute`, behind the same visibility check as `getHandlers` (`canSeeImage`, else 404; no 403).
- It reads the stored object from the bucket, decodes with `sharp`, writes a **JPEG without metadata** at the stored size (quality a named constant), and answers with it (built whole in memory, not streamed).
- Headers: `Content-Type: image/jpeg`, `Content-Disposition: attachment; filename="<created UTC date>-<first 8 of the id>.jpg"` (stable and generic: the Image's creation date and a short id, so two photos never collide and the stored key is never shown; no App prefix, because a package never names an App, ADR 0033; one pure `exportName` in `packages/storage` builds it for the API's header and for the browser's `File`), `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.
- Failure modes: 404 hidden or missing; 413 or 422 never expected (stored files already passed `prepare-image`); a decode failure is a 500 with a coded error.
- Documented in OpenAPI (`docs` module) with its translations (`apps/api` i18n), tests in `read.test.ts` style.
- **Signed in only**, even for a public Image (a visitor cannot make the server decode and re-encode). The guard is the Session plus `canSeeImage`, else 404. It lives under plain `/v1/images` (ADR 0035: a capability several Apps use).
- A **dedicated rate limit** (its own limiter and constants, as `authRateLimit` is for sign-in; 10 a minute per client; raised to 30 and counted per signed-in User, not per address, on 2026-11-26) on top of the global 100.

### Shared UI (`packages/ui`)

- A hook `useAOFExport` or two small utilities in `features/image/utils`: `fetchExport(url)` (a `fetch` with credentials, returns a `File` named and typed JPEG), `canShareExport(file)` (`navigator.canShare?.({ files: [file] })`), and `saveExport(url, name)` (a hidden `<a href download>` pointed at the API URL; no blob, so no revoke race; falls back to a blob link only if the platform needs it, with a **deferred** revoke).
- Share is called inside the click handler. The Export is fetched when Share is pressed, then `navigator.share({ files })`; because `share()` needs transient activation and a fetch between the click and `share()` can lose it on Safari, the device spike checks it and, if iOS rejects, Share becomes a two-tap flow (call 6 below).
- Buttons are `AOFButton` icon buttons with `AOFTooltip`, Tabler icons (`IconDownload`, `IconShare`), no custom hand-rolled button.

### Laura

- `PreviewActions` gains Download and Share beside the heart and Remove. Share is hidden until feature detection runs on the client and says yes (no hydration mismatch: state starts `false`).
- The failure of Download or Share is told in the page's words, in a toast through `aofErrorMeta` (a user cancelling the share sheet, `AbortError`, is silence). **Download is a plain link** (see the calls below), so a network or Session failure there is the browser's own and has no toast.
- Copy: `Gallery.preview.download`, `Gallery.preview.share`, `Gallery.preview.shareFailed`, in English and Italian, with Laura's rule: "image" not "photo" in the copy.
- The capsule's width at 320 px is a browser test; the skeleton does not change (the preview has none).

### Docs

- ADR 0036 (`docs/adr/0036-a-picture-leaves-the-apps-only-as-an-export.md`) is written with this design; `CONTEXT.md` already has **Export**.

- `images.md`: replace "A photo has no Share button" with the new rule (an Export is sent, never a link; the endpoint; JPEG, no metadata).
- `laura.md`: the preview's actions; `api.md`: the new route; `testing.md`: the device runs.

## Test plan

- API: unit and integration for the route (public, private visible, hidden 404, no session on a public Image, headers, JPEG signature bytes, no EXIF in the output, a decode failure).
- UI: unit tests for the pure utilities; browser tests (Vitest browser, chromium and webkit) for the capsule, `canShare` present/absent (stubbed), cancel is silent, revoke is deferred, 320 px fit, both themes, keyboard.
- e2e (Playwright, production build): the capsule shows Download; clicking it downloads a JPEG (the `download` event); Share hidden where Chromium cannot share files.
- Devices (manual, recorded in the plan's log): boot `iPhone 18 Pro` and `Pixel_8_API_35`; with `agent-device`, open Laura in Safari and in Chrome, then installed to the Home Screen; Download saves a JPEG; Share opens the sheet with the file; cancelling the sheet is silent; offline and expired Session fail with the toast. Never close a simulator afterwards.

## Calls made after the builder check

A fresh reader asked six questions; these are the answers, each my call unless marked:

1. **Download is a plain link; no toast for its failures.** A `fetch` then blob would bring back the iOS blob bugs this design avoids. The Share failure (a fetch we control) still toasts. The device runs drop the "Download offline shows a toast" case and instead check the browser's own behaviour.
2. **An installed iOS app and a link to another origin is unproven (the owner pre-approved the fallback).** The plan starts with a device spike (task 1): open the API link from Laura installed to the Home Screen on the iPhone simulator and in the Pixel. If the API is not same-site, or the installed app leaves its scope, the fallback is a **same-origin rewrite in `next.config` that proxies `/exports/:id` to the API** (the API still decides who sees what; Laura's server only streams). The spike picks one; the rest of the plan does not change.
3. **The filename is the Image's creation date plus a short id, with no App prefix** (see the API section): stable and collision-free, never the download date.
4. **The metadata test writes an object with EXIF straight into the bucket** (bypassing `prepare-image`, as a legacy file could) and proves the JPEG has none, rather than relying on what upload does.
5. **Share is probed, not waited for.** At the first client render the capsule asks `navigator.canShare({ files: [new File([""], "x.jpg", { type: "image/jpeg" })] })` with a dummy file, so Share is in the capsule from the first paint (the preview is client-only), never popping in later.
6. **The Export is fetched when Share is pressed, not for every slide.** The spike checks whether iOS accepts `share()` after that fetch; if it rejects (`NotAllowedError`), Share becomes a two-step: the first tap fetches the file and the button reads "Ready", the second tap shares (built 2026-11-26 as a notice, not a "Ready" button: the capsule holds icons only). The API route sits under its own dedicated rate limit (Language and API sections). The `sharp.concurrency` cap first planned here was dropped on 2026-11-26: no problem was seen that it fixes, and it is process-wide, so uploads would pay for it too.

## Left to the builder

- `sharp` from the S3 object (picked: full stored size, no imgproxy dependency) versus asking imgproxy for `@jpg` (needs the API to reach the cdn and a signed link); confirm metadata stripping against imgproxy's and sharp's docs, and by a test on a fixture with EXIF.
- JPEG quality.
- Cookie reach: the API origin versus Laura's in Production (same site?) and in an installed app; confirm with the existing leaderboard calls.
- Exact `Content-Disposition` encoding.
