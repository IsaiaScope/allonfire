# Upload -- Claude Guide

## Feature Scope

**Owns:** Photo upload UI, drag-and-drop interaction, file preview grid, upload progress tracking, sequential upload orchestration, preview modal for selected files.

**Does not own:** HEIC conversion logic (in `@/lib/convert-heic`), file validation rules (in `@/lib/file-validation`), image processing/resizing/blurhash (in `@allonfire/storage`), S3/MinIO upload (in `@allonfire/storage`), database record creation (in `@allonfire/database`), role guard (in `@allonfire/auth/guard`), gallery cache invalidation keys (owned by gallery feature).

## File Responsibilities

| File | Purpose |
|------|---------|
| `actions/upload.ts` | Server action `uploadPhotoAction`: validates file, processes image (resize + thumbnail + blurhash via `@allonfire/storage`), uploads full + thumb to S3 in parallel, creates `Photo` DB record. Returns `{ success }` or `{ success, error }`. |
| `components/upload-client.tsx` | Orchestrator component: manages file/preview state, runs HEIC conversion on add, handles sequential upload loop with progress, enforces total size limit, invalidates `["photos"]` query on success. |
| `components/upload-dropzone.tsx` | Drag-and-drop zone with visual feedback (`isDragging` state). Hidden `<input type="file" multiple>` with `ACCEPTED_INPUT_STRING` accept filter. Delegates file array to parent via `onFiles` callback. |
| `components/upload-preview-grid.tsx` | Thumbnail grid with remove buttons. Measures blob URL dimensions for aspect-ratio preview. Fullscreen preview modal via `createPortal`. Handles Escape key and scroll lock. |

## Modification Guide

### 1. Add a new accepted file type

1. Add the MIME type to `ACCEPTED_IMAGE_TYPES` in `apps/laura/src/lib/file-validation.ts`
2. `ACCEPTED_INPUT_STRING` updates automatically (derived from the Set)
3. If the type needs client-side conversion (like HEIC), add conversion logic in `apps/laura/src/lib/convert-heic.ts`
4. Ensure `@allonfire/storage`'s `processPhoto` can handle the format server-side

### 2. Change file size limits

1. Edit `MAX_FILE_SIZE` (per-file) or `MAX_TOTAL_SIZE` (batch) in `apps/laura/src/lib/file-validation.ts`
2. `upload-client.tsx` reads `MAX_TOTAL_SIZE` for the client-side warning
3. `upload.ts` server action uses `validateImageFile` which checks `MAX_FILE_SIZE`

### 3. Add metadata fields (caption, date, etc.)

1. Add form fields to `upload-client.tsx` or create a new form component
2. Pass additional fields in the `FormData` in the upload loop
3. Extract them in `actions/upload.ts` and pass to `createPhoto`
4. Ensure the database schema supports the new fields

### 4. Switch to parallel uploads

1. Replace the sequential `for...of` loop in `upload-client.tsx`'s `handleUpload` with `Promise.all` or a concurrency limiter
2. Update progress tracking to handle out-of-order completions
3. Adjust error handling (currently breaks on first failure)

## Gotchas

- **Sequential upload**: Files are uploaded one at a time in a `for...of` loop. This is intentional to provide predictable progress and to stop on first error. Switching to parallel requires rethinking the progress UI and error handling.

- **Object URL cleanup**: `upload-client.tsx` uses a `urlsRef` to track all created object URLs and revokes them in a cleanup `useEffect`. Individual URLs are also revoked on file removal and after successful upload. Missing cleanup causes memory leaks.

- **HEIC conversion is async**: `addFiles` sets `processing = true` while converting, which disables the dropzone. The conversion can be slow on large HEIC files, especially on the `heic2any` fallback path.

- **biome-ignore on img elements**: `upload-preview-grid.tsx` uses `<img>` instead of `next/image` because the `src` is a blob URL (`URL.createObjectURL`). Next.js `<Image>` cannot optimize blob URLs. The biome lint ignores for `noImgElement` and `useImageSize` are sanctioned.

- **Preview modal uses createPortal**: The fullscreen preview in `upload-preview-grid.tsx` portals to `document.body` at `z-[9999]` to escape any parent overflow/transform contexts. This is different from the gallery's `PhotoPreview` which renders inline.

- **Total size check is client-only**: `MAX_TOTAL_SIZE` is only enforced in the client UI (disables upload button + shows warning). The server action only validates individual file size. A malicious client could bypass the total limit.

- **File input reset**: `upload-dropzone.tsx` resets `e.target.value = ""` after reading files. Without this, selecting the same file again would not trigger the `onChange` event.

- **Drop filter**: `handleDrop` in the dropzone filters files by `f.type.startsWith("image/")`, which is more permissive than `ACCEPTED_IMAGE_TYPES`. Invalid types are caught by server-side validation.

## Dependencies

| Package | Why |
|---------|-----|
| `@tanstack/react-query` | `useQueryClient` to invalidate `["photos"]` after successful upload |
| `@allonfire/ui` | Button, Progress components and `cn` utility |
| `@allonfire/database` | `createPhoto` for database record creation |
| `@allonfire/storage` | `processPhoto` (resize + thumbnail + blurhash), `uploadFile` (S3/MinIO) |
| `@allonfire/auth` | `checkMutationAccess` for viewer role guard on upload action |
| `next-intl` | `useTranslations` for i18n strings |
| `lucide-react` | Upload, Loader2, X icons |
| `sonner` | Toast notifications for upload success/error feedback |
| `heic2any` | HEIC-to-JPEG conversion fallback (dynamically imported in `@/lib/convert-heic`) |
