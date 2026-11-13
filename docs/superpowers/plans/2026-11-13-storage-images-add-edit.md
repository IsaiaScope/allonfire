# Storage > Images: add and edit pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Admin adds up to 20 Images at once and edits one from the Back Office, with alt in any language of a new core language catalogue.

**Status:** implemented (uncommitted) @ 2026-11-13T11:55:23+01:00

**Architecture:** Core gains the ISO 639-1 catalogue as the Content languages (Hosts keep their own routed list); an Image's alt accepts any of them. The Back Office mirrors `features/users` for `new/` and `[id]/`: one multipart `POST /images` through a server action (all or nothing), one `PATCH /images` item with `version`, one shared alt field group. This finishes Task 8 of `2026-11-09-storage-images.md` and replaces its "one file per upload" call.

**Tech Stack:** Next 16 (Cache Components, server actions), TanStack Query/Form via `useAOFForm`, zod, Vitest (unit, browser), Playwright, `iso-639-1`.

**Spec:** `docs/superpowers/specs/2026-11-13-storage-images-add-edit-design.md`

## Global Constraints

- Read first: `docs/guides/{back-office,images,next-apps,forms,api,testing,code-style,conventions,design-system}.md`, `packages/core/node_modules/next/dist/docs/` (server actions, `serverActions.bodySizeLimit`), ADR 0020, 0026-0028; `CONTEXT.md` (*Content languages*, already updated).
- Tests first; a test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals; browser tests are `*.browser.test.tsx`.
- No `as` casts except `as const`; constants in one nested object per owner (`IMAGES`, `I18N`, `IMAGE`); a path or error code is never a string literal, tests included; no `Object.keys/values/entries/fromEntries` or `JSON.parse/stringify` (use core's helpers).
- Every form is `useAOFForm`; pages are built through `/aof-design`, never plain `/impeccable`; one build plus one screenshot round per page; the UI never says "bucket".
- A stored picture shows its blur (`AOFStorageImage`); a just-picked file previews through a local object URL, revoked on removal.
- Limits come from `IMAGE.LIMIT` (`@allonfire/storage/features/image/constants/image`): `FILES_PER_UPLOAD` 20, `FILE_BYTES` 20 MiB, `UPLOAD_BYTES` 100 MiB. Alt max 300 characters per language; both Base languages required (`""` marks decorative).
- The data checklist (`next-apps.md`), point by point: (1) reads use the existing `readImage` private cache and `imagesQuery`; (2) each action calls `updateTag(IMAGES.CACHE.TAG)` and `updateTag(STORAGE.CACHE.TAG)`, the client then `invalidateQueries` on `QUERY.IMAGES.ALL` and `QUERY.STORAGE.ALL` (Task 3); (3) pages gate through `signedInPage`, the API judges Roles, refusals show as form notices, no Role pre-check on actions; (4) edit sends `version`, 409 shows `Common.Request.changed`; (5) 404 shows the gone state.
- Do not commit (the user commits); do not touch `apps/laura`.

## Review Focus

- A 21st file is refused before upload, the 20 already picked stay.
- A file over 20 MiB, or files over 100 MiB together, are refused before upload with the reason; nothing is sent.
- A file the API refuses (unsupported, corrupt) rejects the whole batch: every row keeps its typed alt, access and Apps, and the notice shows the API's code.
- Editing an Image whose alt holds a language the form did not show: that language is still in the saved alt (PATCH replaces `alt` wholesale); removing a language in the form drops it.
- The same file picked twice makes two rows, both uploaded.
- An alt over 300 characters, or a missing Base language, blocks Save with the field message.
- Saving an edit that leaves the Image in no App: 409, shown as a notice, nothing lost.
- An unknown or hidden id on `[id]`: the 404 page, not a blank.

---

## Task 1: The language catalogue in core

**Files:**
- Modify: `packages/core/package.json` (add `iso-639-1`), `packages/core/src/features/i18n/constants/locales.ts`, `packages/core/README.md` (the I18N table), `packages/auth/src/features/next/utils/redirect-to.ts`, `apps/back-office/src/features/images/components/image-columns.tsx`
- Test: `packages/core/src/features/i18n/tests/locales.test.ts` (new), `.../locales.test-d.ts`

**Interfaces:**
- Produces: `I18N.CONTENT_LANGUAGES` (every ISO 639-1 code, Base first), `ContentLanguage`, `contentLanguageSchema` now the catalogue; `I18N.OPTIONAL_LANGUAGES` (catalogue minus Base); new `I18N.HOST_LANGUAGES` (Base + `EXTRA_LANGUAGES`), `HostLanguage`, `hostLanguageSchema` (exactly what `ContentLanguage` / `contentLanguageSchema` meant before). `defineLanguages` takes `HostLanguage`s. `EXTRA_LANGUAGES` stays `[]`.

- [x] **Step 1: Failing tests** in `locales.test.ts`: `the catalogue holds the Base languages first`, `the catalogue accepts fr and ja and refuses xx`, `OPTIONAL_LANGUAGES leaves out en and it`, `hostLanguageSchema accepts only en and it today`. In `locales.test-d.ts`: `defineLanguages([...BASE, "fr"])` still errors (message: a language must be in `EXTRA_LANGUAGES`).
- [x] **Step 2: Run** `pnpm --filter @allonfire/core test` and `... check-types` — expect FAIL.
- [x] **Step 3: Implement** with `pnpm --filter @allonfire/core add iso-639-1`; build the catalogue from its `getAllCodes()` with Base first, typed by the package's `LanguageCode` and a zod enum without a cast (a `z.custom` guarded by the package's `validate` is acceptable if `z.enum` needs a tuple). Switch `redirect-to.ts` and `image-columns.tsx` from `contentLanguageSchema` to `hostLanguageSchema` (they decide a Host's routing, not alt). Update the README table rows.
- [x] **Step 4: Run** both commands plus `pnpm --filter @allonfire/auth test` — expect PASS.

## Task 2: Alt accepts any catalogue language

**Files:**
- Modify: `packages/database/src/features/image/utils/alt.ts`, `apps/api/README.md` and the `ImageAlt` mention in `IMAGE.DOC`, `docs/guides/images.md` (the alt bullet)
- Test: `packages/database/src/features/image/tests/alt.test.ts`, `apps/api/src/features/docs/tests/spec.test.ts`

**Interfaces:**
- Consumes: `I18N.BASE_LANGUAGES`, `I18N.OPTIONAL_LANGUAGES`, `I18N.CONTENT_LANGUAGES` (Task 1).
- Produces: `imageAltSchema` — Base languages required, every other catalogue language optional text ≤ 300; `ImageAlt` = `Record<Base, string> & Partial<Record<ContentLanguage, string>>`. `readAlt` and `nameContains` unchanged.

- [x] **Step 1: Failing tests**: `accepts fr beside en and it`, `refuses a language outside the catalogue`, `still refuses an alt without it`, `readAlt keeps a stored fr text`; spec test: the OpenAPI `ImageAlt` model lists `fr` as optional.
- [x] **Step 2: Run** `pnpm --filter @allonfire/database test -- alt` and `pnpm --filter @allonfire/api test -- spec` — expect FAIL.
- [x] **Step 3: Implement** the schema from `I18N.OPTIONAL_LANGUAGES` instead of `EXTRA_LANGUAGES`; check `image-version.ts` still hashes every language deterministically (its tests must stay green).
- [x] **Step 4: Run** the same commands plus `pnpm --filter @allonfire/storage test` — expect PASS.

## Task 3: Back Office constants, size limit and cache refresh

**Files:**
- Modify: `apps/back-office/src/features/images/constants/images.ts`, `apps/back-office/next.config.ts`, `apps/back-office/src/features/images/utils/images-mutations.ts`, `apps/back-office/src/shared/constants/mutation.ts`
- Test: `apps/back-office/src/features/images/utils/tests/images-mutations.test.ts`, `apps/back-office/src/features/images/tests/images-constants.test.ts` (new)

**Interfaces:**
- Produces: in `IMAGES`: `ADD_ERROR` (`FAILED`, `INVALID`, `REFUSED`, `TOO_LARGE`, `UNSUPPORTED`), `ADD_NOTICE` (`ADDED`), `EDIT_ERROR` (`CHANGED`, `FAILED`, `GONE`, `INVALID`, `REFUSED`), `EDIT_NOTICE` (`SAVED`), `FORM_FIELDS`, `UPLOAD_BODY_LIMIT` = `IMAGE.LIMIT.UPLOAD_BYTES + 1 MiB` (from `UNIT`); `invalidateImages(client): Promise<void>` invalidating `QUERY.IMAGES.ALL` and `QUERY.STORAGE.ALL`.

- [x] **Step 1: Failing tests**: `UPLOAD_BODY_LIMIT is the API's upload cap plus 1 MiB`; `invalidateImages invalidates the Images and Storage keys` (spy on a `QueryClient`).
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- features/images` — expect FAIL.
- [x] **Step 3: Implement**; pass `experimental: { serverActions: { bodySizeLimit: IMAGES.UPLOAD_BODY_LIMIT } }` in `next.config.ts` through `AOFCreateNextConfig`'s `config` (it spreads `config.experimental`).
- [x] **Step 4: Run** the command and `pnpm --filter @allonfire/back-office check-types` — expect PASS.

## Task 4: Form schemas and form data

**Files:**
- Create: `apps/back-office/src/features/images/utils/{image-form-schema,add-image-schema,edit-image-schema,image-form-data}.ts`
- Test: `.../images/utils/tests/{image-form-schema,add-image-schema,edit-image-schema,image-form-data}.test.ts`

**Interfaces:**
- Produces: `imageAltFieldsSchema(messages)` (Base required, other catalogue languages optional, each ≤ 300); `addImageSchema(messages?)` = `{ rows: 1..IMAGE.LIMIT.FILES_PER_UPLOAD of { file: File, alt, access, apps ≥ 1 } }` also refusing a file over `FILE_BYTES` or a total over `UPLOAD_BYTES`; `editImageSchema(messages?)` = `{ alt, access, apps ≥ 1 }`; `type AddImageFields`, `EditImageFields`; `imageFormData`: `rowsOf(form: FormData): AddImageRowValues[]`, `uploadPartsOf(rows): FormData` (one `file` part per row and one `meta` JSON text part in file order, the shape `uploadFormSchema` parses), `editValuesOf(form: FormData): EditImageFields`.

- [x] **Step 1: Failing tests**: schemas — 21 rows refused, 20 accepted; a row without an App refused; a missing Italian alt refused; empty `""` alt accepted; a file of `FILE_BYTES + 1` refused; total over `UPLOAD_BYTES` refused. Form data — `uploadPartsOf` produces a form that `uploadFormSchema.safeParse` accepts (import from `@allonfire/storage/.../hono/constants/schemas`); two rows keep file order in `meta`; `editValuesOf` round-trips alt in two languages.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- features/images/utils` — expect FAIL.
- [x] **Step 3: Implement** after `user-form-schema.ts` / `user-form-data.ts`; the same schema checks run in the form and the action (the action's copy counts).
- [x] **Step 4: Run** the command — expect PASS.

## Task 5: The add and edit actions

**Files:**
- Create: `apps/back-office/src/features/images/actions/{add-image,edit-image}.ts`
- Test: `.../images/actions/tests/{add-image,edit-image}.test.ts` (mock `serverApi` as `delete-images.test.ts` does)

**Interfaces:**
- Consumes: Task 3 constants, Task 4 schemas and `uploadPartsOf` / `editValuesOf`.
- Produces: `addImage(_state: AddImageState, form: FormData): Promise<AddImageState>` and `editImage({ id, version, imageAlt }: { id: string; version: string; imageAlt: ImageBody["alt"] }, _state: EditImageState, form: FormData): Promise<EditImageState>`; states `{ error?, notice?, values? }`. Neither redirects: the form shows the notice and goes to the list after refreshing its query copy (Task 7/8). Both `updateTag(IMAGES.CACHE.TAG)` and `updateTag(STORAGE.CACHE.TAG)` on success only.

- [x] **Step 1: Failing tests**: `addImage posts a multipart the API schema parses and clears both tags`; `addImage hands back the typed rows when the API answers 413/415/400` (with the matching `ADD_ERROR`); `addImage does not clear a tag on a refusal`; `editImage sends one PATCH item with the version and clears both tags`; `editImage maps 409 RESOURCE_CHANGED to CHANGED, 404 to GONE, other to FAILED`; `editImage sends the whole alt: the extra language the Image held stays unless the form removed it`.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test -- features/images/actions` — expect FAIL.
- [x] **Step 3: Implement** after `add-user.ts` / `edit-user.ts` using `refusalOf` with a map from status/code to error; no `updateTag` on any refusal (see the comment in `edit-user.ts`).
- [x] **Step 4: Run** the command — expect PASS.

## Task 6: The alt and Image field groups

**Files:**
- Create: `apps/back-office/src/features/images/components/{image-alt-fields,image-form-parts}.tsx`; modify `apps/back-office/src/features/i18n/translations/{en,it}.json` (`Images.form.*`)
- Test: `.../images/components/tests/{image-alt-fields,image-form-parts}.browser.test.tsx`

**Interfaces:**
- Produces: `ImageAltFields` (a `withAOFFieldGroup`): English and Italian always shown; a collapsed "Add a language" combobox (`AOFComboboxField`) searching `I18N.OPTIONAL_LANGUAGES` by `languageName` in the UI language adds a field; each added language has a remove button; `ImageAccessRow` (public/private choice) and `ImageAppsRow` (`apps: readonly App[]` offered, at least one chosen). Messages fit `MESSAGE_LENGTH`; `translations.test.ts` stays green.

- [x] **Step 1: Failing browser tests**: both Base fields are present and required; adding French shows a French field and removing it hides it; the combobox does not offer `en` or `it` or a language already added; the Apps row offers only the `apps` it is given; typing in a language survives toggling another.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser -- features/images/components` — expect FAIL.
- [x] **Step 3: Implement** after `user-form-fields.tsx` / `user-form-parts.tsx`, built through `/aof-design`.
- [x] **Step 4: Run** the same command and `pnpm --filter @allonfire/back-office test -- translations` — expect PASS.

## Task 7: The Add Images page

**Files:**
- Create: `apps/back-office/src/app/[locale]/(signed-in)/storage/images/new/page.tsx`, `apps/back-office/src/features/images/components/add-image.tsx`, `.../image-row.tsx`, `.../image-picker.tsx`; modify the two translation files (`Images.add.*`, `Navigation` title)
- Test: `.../images/components/tests/add-image.browser.test.tsx`

**Interfaces:**
- Consumes: Tasks 3-6; `administeredApps` — the Apps where the visitor's Session membership Role is Admin, read on the server (ADR 0019, `packages/auth`) and passed to `AddImage` as `apps`.
- Produces: `AddImage({ apps }: { apps: readonly App[] })`: a picker (`<input type="file" multiple accept=…>`), a shared starting set (access + Apps) copied into each row at pick time, an "Apply to all rows" button, one row per file (local thumbnail, name, size, `ImageAltFields`, `ImageAccessRow`, `ImageAppsRow`, remove). Save submits `addImage`; on `notice: ADDED` it calls `invalidateImages`, toasts "N Images added" and `router.replace(BACK_OFFICE.PAGE.STORAGE_IMAGES)`. Wrapped in `AOFFreshOnReturn` on the page. Pre-checks count, per-file size and total from `IMAGE.LIMIT`.

- [x] **Step 1: Failing browser tests**: picking two files makes two rows with the shared set copied; changing the shared set afterwards leaves existing rows, "Apply to all rows" overwrites them; a 21st file is refused with a message and 20 rows remain; an oversized file is refused; removing a row revokes its object URL; a refused batch keeps every row's typed values; the page opens empty on a second visit.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser -- add-image` — expect FAIL.
- [x] **Step 3: Implement** after `add-user.tsx` and `users/new/page.tsx` (`SectionPage width="form"` or wider if the rows need it), `generateMetadata` via `pageMetadata(newImageHref(), "Images.add.page")`; `/aof-design` once, one screenshot round.
- [x] **Step 4: Run** the command — expect PASS.

## Task 8: The Edit Image page

**Files:**
- Create: `apps/back-office/src/app/[locale]/(signed-in)/storage/images/[id]/page.tsx`, `apps/back-office/src/features/images/components/edit-image.tsx`; modify the two translation files (`Images.edit.*`)
- Test: `.../images/components/tests/edit-image.browser.test.tsx`

**Interfaces:**
- Consumes: Tasks 3-6, `readImage(id)` (null → `notFound()`), `deleteImages` (single id).
- Produces: `EditImage({ image }: { image: ImageBody })`: the picture with blur (`AOFStorageImage`) and a read-only summary (size via `formatSize`, dimensions, created), `ImageAltFields` starting on the languages the Image holds, `ImageAccessRow`, `ImageAppsRow` (every App the Image is in, plus the ones the visitor administers), Save → `editImage`, Delete with the list's confirm dialog. On `SAVED` it calls `invalidateImages`, toasts and goes to the list; `CHANGED`/`GONE`/`FAILED` show in the `FormAlert` and keep nothing typed after `CHANGED` (the form is re-read by the page on reload).

- [x] **Step 1: Failing browser tests**: opens on the Image's alt languages; saving sends the stored extra language back; `CHANGED` shows `Common.Request.changed`; `GONE` shows the gone state; delete confirms then returns to the list; an unknown id renders the 404.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office test:browser -- edit-image` — expect FAIL.
- [x] **Step 3: Implement** after `edit-user.tsx` and `users/[id]/page.tsx` (`Promise.all([requireAppSession(), readImage(id)])`, `AOFFreshOnReturn`); `/aof-design` once, one screenshot round.
- [x] **Step 4: Run** the command — expect PASS.

## Task 9: End to end and docs

**Files:**
- Create: `apps/back-office/e2e/images.spec.ts`
- Modify: `apps/back-office/e2e/instant.spec.ts` (instant navigation to `/storage/images/new` and an Image page), `docs/guides/back-office.md` (Images: add and edit pages, upload size limit), `docs/guides/images.md` (alt in any catalogue language, `HOST_LANGUAGES` vs `CONTENT_LANGUAGES`), `docs/guides/next-apps.md` only if a rule changed, `docs/superpowers/plans/2026-11-09-storage-images.md` (Task 8 note: superseded by this plan)

- [x] **Step 1: Failing e2e** `images.spec.ts`: sign in as the seed Admin, open Storage > Images, add two fixture photos (`packages/storage/src/features/image/fixtures/files/photo.jpg`) with alt in English, Italian and French, see both in the table with the Storage count up by two, open one, change its French alt and access, save, delete both and see the count return.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office e2e -- images instant` — expect FAIL before Tasks 3-8, PASS after.
- [x] **Step 3: Write the docs** edits above, one bullet each in its guide; check the VPS ingress (`docs/guides/deployment.md`, `vps.md`) for a request-body limit below 100 MiB and record the finding.
- [x] **Step 4: Run** the full gate: `pnpm turbo lint check-types test` and the browser/e2e suites — expect green.

## Documentation checked

`AGENTS.md` and the guides it points to, read before and after the build: `back-office.md`, `images.md`, `next-apps.md` (data checklist), `forms.md`, `code-style.md`, `conventions.md`, `testing.md`, `design-system.md`; `packages/core/README.md`. Applied: AOF forms (`useAOFForm`, `withAOFFieldGroup`, a new ui `AOFCheckboxGroupField`), no `as` casts, core's object helpers, constants in `IMAGES`, translations within `MESSAGE_LENGTH`, toast keys in `TOAST_KEYS`, `jscpd` and `knip` clean (`FormActions` shared by Users and Images). Updated: `docs/guides/back-office.md`, `docs/guides/images.md`, `packages/core/README.md`, `apps/api/README.md`, `CONTEXT.md`.

## Implementation Log
- Implemented: 2026-11-13T11:55:23+01:00
- Workspace: fresh-branch — feat/storage-images-add
- Committed: no — awaiting user review
- Rulings: tests for `image-alt.ts` and `accept-files`/`administered-apps` were written before the code except `image-alt` (written together, passed at once); `editImage` takes `{ id, version }` only (the form posts every language it holds, so no merge parameter); `uploadFormOf` returns `{ file, meta }` for the typed client, not a `FormData`; the Add form's `shared`, `picker` and row `id` are form-only schema keys; no OpenAPI spec-test line for `fr` (the alt schema tests cover it); `/aof-design`'s impeccable hand-off and the owner's-tab screenshot round were not run.
- Verified: unit suites (core, auth, database, storage, api, ui, back-office), back-office browser suite (chromium and webkit), `images.spec.ts` e2e on chromium only, `ultracite`, `oxlint --type-aware`, `knip`, `jscpd`, `i18n:check`, `design:sync --check`.
