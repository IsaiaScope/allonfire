# User Avatar — design

Date: 2026-10-27. Status: agreed in conversation (iso-plan).

## Intent

An Admin adding a User in the Back Office can give them an **Avatar**, the
User's own picture (glossary: `CONTEXT.md`). It shows beside the User in
every App: the account menu, the Users list and cards today, Laura once it
is rebuilt. Without one, the User's initial stands in, as now.

## Goals

- Add a User takes an optional picture; the new User has it as soon as
  they are added.
- The API can replace or remove a User's Avatar, for whoever manages Users.
- Deleting a User deletes their Avatar's file.
- One stored shape for every Avatar: square, 256x256, AVIF.

## Non-goals (later plans, on the same endpoint)

- Changing or removing an Avatar from a User's page (`/users/[id]`).
- A User changing their own Avatar from the account menu (adds "the User
  themselves" to who may `PUT`/`DELETE`).
- Signing in with Google. Recorded here so this design does not block it:
  Better Auth writes Google's picture address into `User.image` at
  registration; that address is kept as it is (Google serves it publicly),
  and `overrideUserInfoOnSignIn` stays off so a sign-in never overwrites an
  Avatar an Admin set.

## Anti-goals

- An Avatar is not an Image: no `image` schema row, no placements, no alt
  text per language. Reusing Images would tie a User's picture to App
  placements that must follow Memberships.
- No round avatar: the Japan Design keeps `rounded-full` for things round
  in the world; an Avatar is a square tile with the Design's corners, as the
  account menu draws it.

## Decisions

**Visibility: unlisted, like an Image's private placement.** The file lives
in the `public` bucket, a sibling of `image` with the same policy
(anonymous `s3:GetObject`, no listing; created by `storage-setup`,
`STORAGE_PUBLIC_BUCKET`): the bucket for every file meant to be read by
anyone holding its address, Avatars its first kind. The name is
unguessable and carries its kind (`avatar-…`). Its address reaches only
those an App shows the User to; anyone holding the address sees it. Named by
access, not by content, and not a prefix in `image`, whose files' access is
decided per placement (ADR 0020): the open decision on making private
Images really private (`TODO.md`, **Images**) can then change one bucket
without the other, and no Avatar file ever has to move. The owner chose
unlisted over a private bucket served by the API (option B, considered and
dropped for simplicity once Google's pictures, public anyway, came into the
picture).

**Address in `User.image`.** `/storage/public/<key>`, rewritten by each
App to the `public` bucket beside its `/storage/images` rewrite
(`withStorageImages`). A new name on every change
(`avatar-<userId>-<random>.avif`), so every cache sees a new address and is
never stale; the old file is deleted after `User.image` points at the new
one.

**Cropping in the browser.** Picking or dropping a picture opens a dialog
with DiceUI's Cropper (Base UI): a square frame (`aspectRatio` 1,
`shape="rectangle"`), zoom, Cancel and Use. On Use a canvas draws the
chosen area (`croppedAreaPixels`) at 512x512, and that small image is what
the form sends: never the original, so the Server Action stays under its
1 MB default. The tile then shows the result; choosing it again offers
Change (a new file) or Crop again (the same original, kept in memory). A
file the browser cannot draw (HEIC in Chrome) is refused in the field with
"Choose a JPEG, PNG, WebP or AVIF" (en + it).

**Processing.** Reuse the Image module's decoding (`prepareImage`'s accepted
formats: JPEG, PNG, WebP, AVIF, HEIC; its EXIF rotation and metadata
stripping; its byte and megapixel limits). Output: the centre square,
256x256, AVIF; a picture cropped in the browser is already square, and the
centre square stays the fallback for a form posted before hydration. No blur placeholder (the initial stands in while loading).
Expose the step as one function, so a later Google import can reuse it if
the owner ever copies Google's picture in.

**API (User module, `packages/auth/src/features/users`).**
- `PUT /v1/users/:id/avatar`: multipart, one `file` part. Whoever manages
  Users (`canManageUsers`, read fresh, as `POST` and `DELETE` do). Answers
  the new `image` address. Errors through `CodedError`/problem documents:
  the Image module's `UNSUPPORTED_IMAGE`, `IMAGE_TOO_LARGE`, and 404 for an
  unknown User.
- `DELETE /v1/users/:id/avatar`: same rule; removes the file and sets
  `User.image` to null. 204.
- `DELETE /v1/users` (exists) also deletes the deleted Users' Avatar files,
  after the rows, as the Image module deletes stored files after its rows.
- Documented in `describeRoute` from zod schemas, like every route.

**Add a User flow: two calls.** The `addUser` action calls `POST /v1/users`
(unchanged, JSON), then `PUT /v1/users/:id/avatar` when a picture was
chosen. If the second call fails, the User exists without an Avatar and
the action redirects to the list with a toast saying the User was added but
the picture was not saved (wording in en + it). Then `updateTag` as today.

**Form.** An optional Avatar field, the first block of the left column
(above email; first on a phone too): a 96px square tile with the Design's
corners holding the preview, or an empty tile, with "Choose a picture"
beside it; click, drop or paste; an X removes it. Built on DiceUI's File
Upload (Base UI) and Cropper (Base UI), both installed through the shadcn
CLI into `packages/shadcn` and wrapped as AOF components in `packages/ui`;
Origin UI's comp-543 is the visual reference, never installed (survey:
`2026-10-27-avatar-upload-library-survey.md`). The cropped image reaches
the action through the file input DiceUI keeps in sync (a `DataTransfer`
holding the cropped file), so `formDataTo(action)` sends it. Client checks
repeat the server's (type, size) with translated messages; the server's
answer counts.

## Constraints

- Repo rules in `CLAUDE.md`: AOF forms (`useAOFForm`, `submitAOFForm`), the
  form rhythm, no `as` casts, constants as one object per owner, paths never
  literals, error codes from core/modules.
- The action must send the file as `FormData` through `submitAOFForm`'s
  `formDataTo` (a file input's value travels in the form's own controls).
- Server Action body size: Next's default limit is 1 MB
  (`experimental.serverActions.bodySizeLimit`, nothing set today). The
  cropped 512x512 image stays far below it; only a form posted before
  hydration carries an original, and the builder decides whether to raise
  the limit for that or refuse it with the field's size message. The public
  address base comes from the existing `withStorageImages` rewrite.
- DiceUI's Cropper is about 1,800 lines of vendor code: if it is not strict
  TypeScript it goes in `packages/shadcn`'s lenient list with its `.d.ts`,
  as `GooeyNav.tsx` does (CLAUDE.md).
- To check once installed: removing the file clears DiceUI's hidden input.

## Left to the builder

- The exact input limit for an Avatar (default: the Image module's per-file
  limit).
- File naming beyond "unguessable and new on every change".
- Tests: unit for the square/AVIF step, module tests for `PUT`/`DELETE`
  (rules, errors, old file deleted), an integration test against the bucket,
  a browser test for the field, e2e: add a User with a picture and see it in
  the list, delete the User and the file is gone.
