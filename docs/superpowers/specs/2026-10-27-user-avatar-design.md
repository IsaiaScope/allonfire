# Avatars, and every picture behind signed links — design

Date: 2026-10-27, revised 2026-10-28. Status: agreed in conversation
(iso-plan). Decisions recorded in ADR 0027 and `CONTEXT.md` (**Image**,
**Avatar**).

## Intent

An Admin adding a User in the Back Office can give them an **Avatar**, which
shows beside the User in every App. Building it exposed that a "private"
Image was only unlisted: its file opened for whoever held its address. So
this work also makes privacy real: every stored picture, Avatars and Images,
sits in a bucket nobody reads anonymously, and is served by an image server
that answers only links the API signed.

## Goals

- Add a User takes an optional picture, cropped in the browser; the new User
  shows it at once.
- `PUT`/`DELETE /v1/users/:id/avatar` for whoever manages Users; deleting a
  User deletes their Avatar's file.
- An Image is public or private as a whole (ADR 0027); `ImageApp.public`
  goes, `Image.access` arrives.
- A private Image's file reaches only those who enter one of its Apps, and an
  Avatar's only those who share an App with its User, manage Users, or are
  that User, both through links that expire at the end of the hour after the
  next (one to two hours, so a link stays the same for a whole hour); a public
  Image's links never expire.
- Pages keep `next/image` (srcset, lazy loading, blur), through a loader that
  picks the signed link for each width.

## Non-goals (later plans)

- Changing an Avatar from a User's page, or your own from the account menu
  (same endpoint, one more rule).
- Signing in with Google. Recorded so nothing here blocks it: Better Auth
  writes Google's picture address into `User.image`; it is kept as it is, and
  `overrideUserInfoOnSignIn` stays off so a sign-in never overwrites an
  Avatar an Admin set.
- A Back Office page listing Images (the Images module's screens).

## Anti-goals

- An Avatar is not an Image: no `image` schema row, no placements, no alt.
- No picture readable straight from storage; no Next optimizer for stored
  pictures (it caches one copy for everyone and fetches without the cookie).
- No round avatar: a square tile with the Design's corners (`rounded-lg`).

## Access (the whole logic)

| piece | holds | read by |
|---|---|---|
| bucket `image` (unchanged name, now closed) | every Image (`<uuid>.avif`) and Avatar (`avatar-<userId>-<uuid>.avif`) | nobody anonymously: the API writes, the image server reads |
| `image-server` (imgproxy) | resizes on request | anyone holding a valid signed link: unsigned or tampered 403, expired 404 |
| the API | decides who receives links | signs links only for those allowed to see the picture |

| picture | link handed out by | to whom | lifetime |
|---|---|---|---|
| public Image | the API (list, get) | anyone, signed out included | never expires |
| private Image | the API (list, get) | those who enter at least one of its Apps (`canEnterApp`) | one to two hours: the end of the hour after the next |
| Avatar | the API each time it returns a User (the Users list, the Session through `customSession`) | those who share an App with the User, manage Users, or are the User | one to two hours: the end of the hour after the next |

| event | effect on links already given |
|---|---|
| private Image made public | the hour-long ones lapse; new ones never expire |
| public Image made private | its file is renamed: never-expiring links answer 404 at once |
| Image removed from an App, or a Membership ended | no new links for those who lost access; theirs lapse within two hours |
| Image deleted; Avatar replaced or removed; User deleted | file deleted: 404 |
| a viewer stops sharing an App with a User | no new links to that Avatar; theirs lapse within two hours |
| signing key rotated | imgproxy accepts several key pairs: sign with the new one, retire the old later |

Who may change an Image's access: the Admin Role in every App it is in
(`canManageEverywhere`, as its alt text). Default at upload: private.

## Decisions

**Image server.** imgproxy (11k stars, Apache-2.0, Go and libvips), the Docker
service `image-server` (`allonfire-image-server`), in dev and prod compose. It
reads MinIO through `IMGPROXY_USE_S3` and `IMGPROXY_S3_ENDPOINT` with the
storage's keys, checks signatures (`IMGPROXY_KEY`, `IMGPROXY_SALT`, several
pairs allowed) and the `expires` option, and picks AVIF or WebP from the
browser's `Accept`.

**Signing.** In the storage package, one function: the image-server link for a
bucket and key at a width, with an optional expiry, signed with HMAC-SHA256
(Node's `crypto`, no library). Its variables are the storage package's:
`STORAGE_IMAGE_SERVER_URL` (the address browsers reach), `STORAGE_IMAGE_SERVER_KEY`,
`STORAGE_IMAGE_SERVER_SALT`; compose hands the same values to imgproxy under
its own names.

**Widths.** Images: 640, 1080, 1920, 2560 (stored at most 2560). Avatars: one
link at 256; the stored file is already 256x256.

**What the API returns for an Image.** `ImageBody` drops `key` and each
placement's `public`; it gains `access` (`"public" | "private"`) and `srcSet`
(`{ width, url }[]`, signed per the table above). `apps` lists Apps only.

**Avatar.** Cropped in the browser in a dialog (DiceUI Cropper, Base UI,
square frame, zoom), drawn at 512x512 by a canvas, sent as that small file;
the API re-encodes the centre square at 256x256 AVIF (the Image module's
decoding: JPEG, PNG, WebP, AVIF, HEIC, EXIF rotation, metadata stripped,
limits), stores it under a new key every time, and writes the file's name
(`avatar-<userId>-<uuid>.avif`) into `User.image`, never a link: the API
signs an hour-long link each time it returns that User (the Users list, the
Session's `customSession`), and passes a provider's `https://` picture through
unchanged. A file the browser cannot draw (HEIC in Chrome) is
refused in the field with a translated message. The Add a User action calls
`POST /v1/users`, then `PUT /v1/users/:id/avatar` when a picture was chosen;
if that fails, the User stays, the list opens and a toast says the picture was
not saved.

**Form.** The Avatar field is the first block of the left column: a 96px
square tile (`rounded-lg`) with the preview, "Choose a picture" beside it,
click, drop or paste, an X to remove. Built on DiceUI File Upload and Cropper
(Base UI) through the shadcn CLI, wrapped as AOF components; Origin UI's
comp-543 is the visual reference (survey:
`2026-10-27-avatar-upload-library-survey.md`).

**Pages.** `next/image` with a loader that returns, for the width it asks,
the signed link from `srcSet` (Images) or the one Avatar link. `UserAvatar`
keeps its tile and initial underneath.

**A provider's picture.** A Google address in `User.image` (written by
Better Auth at a Google sign-in) goes through Next's optimizer, the most common
setup: the auth package's `withProviderPictures` adds `AUTH.PICTURE_HOSTS`
(`lh3.googleusercontent.com`) to `images.remotePatterns`, so it is resized,
served as AVIF or WebP and cached by the App's server, which fetches it: a
viewer's browser never asks Google. Next caches a copy per address and width
for `minimumCacheTTL` (a year, `withStorageImages`), keeps it in the
container (a deploy empties it), and caches no failure. Chosen over a loader
that asks Google directly (no server work, no logs, but no AVIF and Google
sees viewers) and over copying the picture into storage at sign-in.

**What a User's tile shows.** The tile has a fixed size and the picture its
`width` and `height`, so no row shifts the layout. The initial (the first
letter of the name, else of the email, on a coloured square) sits underneath,
so a missing or failed picture shows it, never a broken image.

| Picture in `User.image` | Situation | The tile shows | Server log |
|---|---|---|---|
| none (`null`) | always | initial | nothing |
| our Avatar (signed link) | loading | initial, then the picture | nothing |
| our Avatar (signed link) | link expired (page open over an hour) | the picture if the browser has it, else initial (a failed picture hides itself, never the broken-image glyph) | nothing |
| Google address | first view, Google answers | initial, then the picture (resized, AVIF/WebP) | nothing |
| Google address | the browser has it | the picture at once | nothing |
| Google address | the App's server has it, the browser does not | the picture | nothing |
| Google address | the User changed their Google photo | the **old** photo (`User.image` keeps the old address) | nothing |
| Google address | dead (404), the browser has a copy | the **old** photo, up to a year | nothing |
| Google address | dead, the App's server has a copy | the **old** photo | one line per recheck (after a year: practically never) |
| Google address | dead, nothing cached (after a deploy) | initial | **one line per view** (`upstream image response failed`) |
| Google address | Google slow or down | initial, then the picture or initial | one line per failed view |
| another provider's address (host not allowed) | dev and production | the picture, loaded as it is from that host (`unoptimized`: no resizing, the viewer's browser asks the host); only an Admin (the User module) or a provider's own sign-in writes `User.image` | nothing |
| anything else (an old app path such as `/storage/images/...`, a name only shaped like ours, `http://`) | always | initial, and the page asks for nothing: `avatarLink` answers null for it | nothing |
| any | offline, the browser has it | the picture | nothing |
| any | offline, the browser does not | initial | nothing |

A new sign-in provider adds its host to `AUTH.PICTURE_HOSTS` first. Bringing
a changed Google photo in (updating `User.image` at sign-in when it still
holds a provider's address) belongs to the Google sign-in plan.

### A cache in front of the image server

The open-source imgproxy keeps nothing: every request it answers is a read of
the bucket and a resize (its own cache is imgproxy Pro's). A link does not
depend on who asks for it (file, width and `exp` only), so within an hour every
viewer of a private picture gets the same link, and a public picture's link
never changes. An nginx cache, the `image-cache` service, sits in front of
`image-server` and answers a link it has seen without asking imgproxy: one
resize per picture and width per hour for everyone together, not one per
viewer.

| piece | rule |
|---|---|
| key | the whole path, signature and `exp` included, plus the format the browser takes (`avif`, `webp` or other, read from `Accept`): a hit needs the exact signed link, so a tampered or unsigned one always reaches imgproxy (403) |
| lifetime | a copy lives 1 s, counted in whole seconds (so at most 2 s, `IMAGE_SERVER.CACHE_CHECK_SECONDS`); after that nginx asks imgproxy with the copy's ETag. imgproxy checks the link (403 tampered, 404 past `exp`) and asks the bucket whether the file is unchanged: 304, and the copy is served without resizing again; 404 once the file is gone. What is saved is the resize, not the check. Only a 200 is kept; the browser still gets imgproxy's own `Cache-Control` |
| size | 5 GB on disk, the least recently used dropped first; a picture not asked for in 30 days is dropped |
| stale copies | never served: an expired link or a deleted file answers 404 within 2 s |
| a deleted or renamed picture | its links answer 404 within 2 s, as the access rules require (a public Image made private, an Avatar replaced); only a browser that already has it keeps its own copy |

A cache that trusted imgproxy's `Cache-Control` (a public picture's year)
was tried first and rejected: a public Image made private, or a replaced
Avatar, kept answering from the cache, breaking the rename that kills a
public link at once (the API's integration tests caught it).

Rejected: Redis (pictures in the VPS's RAM, and the API would have to serve
them); a CDN (family pictures through a third party); imgproxy Pro (paid);
another image server (willnorris/imageproxy has a cache but no AVIF; none
free has signing, expiry, AVIF and S3 together); daily links (revoking access
would take two days).

### An Avatar's blur

An Avatar carries the blur an Image already has (`Image.blurDataUrl`): made
when the picture is stored, from the stored file (16 px wide WebP, about
130 characters as a data URL), kept in `User.imageBlurDataUrl` and set in the
same transaction as `User.image`, cleared with it. Wherever a User's picture
is answered (the Users list, the Avatar `PUT`, the Session), its blur goes
with it as `imageBlurDataUrl`, and only beside a link: a picture with no link
(none, or a value we cannot sign) has no blur, and a provider's picture never
has one.

| tile | while the picture loads | when it fails or is missing |
|---|---|---|
| 40 px or more a side | the blur itself, opaque: next/image's `placeholder` set to the `imageBlurDataUrl` data URL, scaled up by the browser. Never `placeholder="blur"`: its SVG filter (a fixed 20px Gaussian, tuned for large pictures) turns a 42px tile see-through and the green initial shows through it (seen in a Slow 3G recording) | the initial |
| under 40 px | the initial: next/image warns against a placeholder under 40x40 (checked in the console: the 32 and 36 px tiles warn) | the initial |
| a provider's picture, any size | the initial | the initial |

What decides it is the size next/image is told, not the size shown: its
blur is a fixed 20px Gaussian counted in the told size (measured on the
same blur: told 42px, shown 42 or 150px, the corner is 25-29/255 alpha; told
2560px, shown 42 or 150px, 239-255/255). So `AOFStorageImage`, told an
Image's real size, keeps `placeholder="blur"` at any size, a gallery's
thumbnails included; a tile told its own side uses ui's `tileBlur`.

## Constraints

- Repo rules in `AGENTS.md` and `docs/agents/` (TDD, test tags, no `as` casts, constants per
  owner, paths never literals, AOF forms and components, shadcn only through
  its CLI, Docker services named by purpose, env names by owner).
- The cropped file stays under the Server Action's default 1 MB body limit.
- A cache holding signed links never outlives them: the Back Office's Users
  list (`readUsers`) moves from the `days` preset to `{ stale: 5 min,
  revalidate: 30 min, expire: 1 h }`; `updateTag` on every change stays.
- Production is rebuilt: no data migration, the changeset may drop
  `ImageApp.public` outright.

## Left to the builder

- imgproxy's exact version (pinned) and its tuning (memory, concurrency) for
  the 8 GB VPS.
- The local port for `image-server` (in `LOCAL.PORT`, with its guard test).
- Where the loader lives (`images.loaderFile` or a `loader` prop on the AOF
  components).
