# Storage > Images: add and edit pages — design

Finishes Task 8 of `docs/superpowers/plans/2026-11-09-storage-images.md`
(the list, filters and bulk delete shipped in `b19db10`). This design
replaces that task's "one file per upload" call.

## Intent

An Admin adds Images to the library and edits existing ones from the Back
Office, instead of calling the API by hand. Upload is for batches of
photographs, so the add page takes several files at once.

## Goals

1. `/storage/images/new`: pick up to `IMAGE.LIMIT.FILES_PER_UPLOAD` (20)
   files. Each file is a row: thumbnail, alt in every Base language, access
   (public/private), Apps. A shared starting set (access + Apps) pre-fills
   each new row; every row stays editable. One Save sends one multipart
   `POST /images` (`file` parts + `meta` JSON in file order).
2. `/storage/images/[id]`: edit alt, access and Apps on the Image's
   `version` (`PATCH /images`, one item); host the single-Image delete
   (reuses `deleteImages`). Unknown or hidden id is the 404.
3. After a save, redirect to the Images list; both caches refreshed
   (`updateTag(IMAGES.CACHE.TAG)` and `updateTag(STORAGE.CACHE.TAG)`, and the
   mutations invalidate `QUERY.STORAGE.ALL`), per the Next-App data checklist.
4. A refused batch (too large, unsupported, one bad file) keeps every typed
   row and shows the API's problem code as a form notice. A 409
   `RESOURCE_CHANGED`/`IMAGE_CHANGED` on edit shows `Common.Request.changed`
   and keeps nothing typed; a 404 shows `GONE`.

5. **Language catalogue in core.** `packages/core` holds every language as the
   `iso-639-1` list (new dependency of core only): `CONTENT_LANGUAGES` becomes
   that catalogue, `BASE_LANGUAGES` (en, it) stay required, `EXTRA_LANGUAGES`
   stays the languages a Host actually routes (still `[]`). An Image's alt
   accepts any catalogue language (optional), so no code change is needed to
   write alt in a new one. Names shown via `Intl.DisplayNames` in the UI
   language. `CONTEXT.md` *Content languages* updated.
6. **One alt field group, both pages.** English and Italian always shown; a
   collapsed "Add a language" control with a search adds any other catalogue
   language. The edit form starts with the languages the Image already holds
   and sends the whole `alt` (PATCH replaces it), so no stored language is lost.

## Non-goals

- Replacing an Image's file (no API for it).
- Per-file upload progress or partial success (the API is all or nothing).
- Drag-to-reorder rows, cropping, client-side compression.
- Avatars (they have their own field on the User page).
- Translating the UI into a catalogue language (only a Host's routed languages).

## Approaches considered

- **A. One multipart request through a server action (chosen).** Same
  shape as Users: `useAOFForm`, server action, redirect. All or nothing.
- B. One request per file from the browser: progress and partial success,
  but the client talks to the API directly, needs a partial-failure state
  and ignores the batch endpoint. Rejected.

## Decisions

- Per-file metadata with a shared default set (user's call).
- Mirrors `features/users` (`add-user`/`edit-user` actions, schemas, form
  fields, `new/` and `[id]/` pages, `AOFFreshOnReturn`); pages built through
  `/aof-design`, one build plus one screenshot round each.
- Blur on every shown picture (`AOFStorageImage`); thumbnails of just-picked
  files are local object URLs (not stored pictures yet).
- **My call:** Back Office raises `experimental.serverActions.bodySizeLimit`
  to the API's `UPLOAD_BYTES` (100 MiB) plus multipart overhead (Next's
  default is 1 MB). The ingress limit is checked during the build.

## Left to the builder

Row component layout, how the shared default set is presented, copy and
translations (en, it, within `MESSAGE_LENGTH`), file-count and size
pre-checks (mirror the API's limits from `IMAGE.LIMIT`, API stays the judge).

## Settled in grilling

Apps: Add offers only the Apps the visitor administers, Edit shows every App the
Image is in, the API stays the judge. Shared starting set copies at pick time,
plus an "Apply to all rows" button. `serverActions.bodySizeLimit` =
`IMAGE.LIMIT.UPLOAD_BYTES` + 1 MiB; the form pre-checks size, count and total
from `IMAGE.LIMIT`. Edit shows the picture with a read-only summary. A saved
add redirects to the list with an "N Images added" toast.
