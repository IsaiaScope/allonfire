# Avatar picker — library survey

Date: 2026-10-27. For the Add a User form's Avatar field
(`2026-10-27-user-avatar-design.md`): one image, a square preview, replace
or remove before submitting, a controlled field the AOF form reads, the
file sent with the form (no upload of its own). Stack: shadcn `base-nova`
(Base UI), Tailwind v4, React 19. Free only.

| Library / component | Primitive | Install, extra npm | Registry JSON without a key | Fit | Verdict |
|---|---|---|---|---|---|
| shadcn official | – | nothing for uploads in base-nova's registry (only `avatar`) | – | – | skip |
| **DiceUI File Upload** | **Base UI** | `https://diceui.com/r/base-nova/file-upload.json`; `@base-ui/react`, `@base-ui/utils` (both installed), the `direction` item; no react-dropzone | 200 | `value`/`onValueChange` (File[]), `accept`, `maxSize`, `name`, `required`, `invalid`, `label`; a hidden `<input type=file>` kept in sync (DataTransfer), so the file travels in the form's own controls; drop, paste, Enter/Space, delete buttons. No avatar example: the round preview is ours. `maxFiles=1` refuses a second file, so replacing keeps `files.slice(-1)` | **use** |
| Origin UI comp-543 "Avatar uploader with droppable area" (and 125, 126, 544, 545, 554 with a cropper) | none (`useFileUpload` hook) | `https://coss.com/origin/r/comp-543.json`; pulls a Radix `button` that would overwrite base-nova's | 200 | the look we want (round preview, remove, drop, single replaces), but uncontrolled and a dropped file never reaches the `<input>` | idea only (visual reference) |
| Shadcnblocks file-upload-special-1 / special-5 (avatar) | DiceUI | Pro registry | 401 (paid) | built on DiceUI | skip (paid) |
| Shadcn Studio file-upload-01, input-27 | Base UI | `shadcnstudio.com/r/base-nova/file-upload-01.json` | 200 | a styled file input: no drop, no preview | skip |
| Shadcn UI Kit file-upload1–10 | none | `shadcnuikit.com/r/file-upload1.json` | 200 (6, 7, 9 empty) | copies of Origin's hook, same gaps | idea only |
| Shadcn UI Blocks input-12 | none | `shadcnui-blocks.com/r/input-12.json`; react-dropzone | 200 | one image with preview, but `next/image` on a blob URL, not controlled | idea only |
| Ui-Layouts file-upload, imgpreview-dropzone | none | react-dropzone, sonner | 200 | multi-file dropzone with toasts | skip |
| Aceternity file-upload | none | react-dropzone, motion, @tabler/icons-react | 200 | animated file list, no preview, no remove | skip |
| React Bits | – | nothing for uploads | – | – | skip |

Every npm package named is far above the 200k weekly floor.

## Recommendation

**DiceUI File Upload (Base UI)**, installed through the shadcn CLI into
`packages/shadcn` and wrapped as an AOF component in `packages/ui`: the only
free candidate on Base UI, controlled for `useAOFForm`, and its synced
hidden input carries the file for `formDataTo(action)` and for a post
before hydration. Drawn as a square tile (the Design's corners) holding the preview, with a
remove button; Origin's comp-543 is the visual reference, never installed.

To check once installed: removing the file clears the hidden input too.

## Cropper

The owner added DiceUI's **Cropper (Base UI)**
(`https://diceui.com/r/base-nova/cropper.json`, 200 without a key): no new
npm packages (`@base-ui/react`, `@base-ui/utils`), one file of about 1,800
lines, `aspectRatio`, `shape`, zoom, and `onCropComplete(croppedArea,
croppedAreaPixels)`; it reports the area only, so a canvas draws the
cropped image.
