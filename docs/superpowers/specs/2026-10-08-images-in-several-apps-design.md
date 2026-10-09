# Images in several Apps, with public links — design

**Status:** approved in chat, 2026-10-08. Decision record: ADR 0020 (ADR 0013
and ADR 0019 point to it).

## Why

An Image belongs to exactly one App today (ADR 0019), so a picture two Apps
show is stored twice. Each App's Admins curate their own App (the case agreed
in chat): one Image can now be linked to several Apps, an App's Admin adds or
removes it in their App only, and the Image stays stored as long as any App
still holds it. The Back office manages everything because its Admins hold
the Admin Role in every App (the add-an-App rule in CLAUDE.md), not through a
new super Role.

An App can also show some of its Images to visitors who are not signed in (a
public page inside a private App, such as a Laura share page). Public is a
switch on one Image's link to one App, set by that App's Admin; a whole
public App and share links are out of scope.

## Data

`image."Image"` loses `app`. A new table holds the links:

```prisma
model ImageApp {
  imageId   String
  app       App
  /// Shown to anyone in this App, signed in or not.
  public    Boolean  @default(false)
  createdAt DateTime @default(now())
  image     Image    @relation(fields: [imageId], references: [id], onDelete: Cascade)

  @@id([imageId, app])
  @@index([app, imageId])
  @@schema("image")
}
```

`Image` gains `apps ImageApp[]` and drops `@@index([app, createdAt])` for
`@@index([createdAt, id])`. `0003-image-schema.sql` is rewritten in place (it
never reached `dev`: `origin/dev` stops at `0002`), with rollback lines for the
new table. Local databases are rebuilt: drop and recreate the database, then
`pnpm db:update` and `pnpm db:seed` (a changed changeset fails Liquibase's
checksum on a database that ran the old one).

An Image always has at least one link: the API refuses an empty list, and the
service deletes an Image whose last link it removes.

## Rules (`packages/database/src/features/auth/access/access.ts`)

| Name | Meaning |
|---|---|
| `ImageLink` | `{ app: App; public: boolean }` |
| `canSeeImageIn(user \| null, link)` | `link.public`, or a User who `canEnterApp(user, link.app)` |
| `canSeeImage(user \| null, links)` | `canSeeImageIn` for any link |
| `canManageImage(user, app)` | unchanged: Admin in `app` |
| `canManageEverywhere(user, links)` | `canManageImage` for every link's App |
| `enterableApps(user \| null)` | the Apps `canEnterApp` lets the User into; none without a User |

An Image is **visible in App X** when it is linked to X and `canSeeImageIn`
holds for that link. Every read uses it; every write first requires the Image
to be visible somewhere, else 404.

## API (`packages/storage`, Image module)

The Image body's `app` becomes `apps: { app, public }[]`. Upload meta and the
PATCH body use the same shape; an App appears at most once in a list (400
otherwise). A `public` left out means private on upload; on PATCH it keeps an
existing placement's value and makes a new placement private.

### Reads: no Session needed

`requireSession()` comes off both GET routes; the Session the host loads is
read when present.

- `GET /v1/images?app=X`: the Images visible in X, newest upload first (not
  the date they entered X, so the cursor keeps one shape), paged as today. Never 403: someone who cannot enter X gets X's public Images.
- `GET /v1/images` (no `app`): the Images visible in any App.
- `GET /v1/images/{id}`: the Image when visible in any App, else 404.

### Writes: Session needed (401 without)

| Request | Needs | Refused |
|---|---|---|
| Upload, `apps: [...]` (min 1) | Admin in every listed App | 403, nothing stored |
| PATCH `{ id, apps?, alt? }`, `apps` the full new list (min 1) | each link added, removed or with `public` changed: Admin in that App; `alt` (shared): Admin in every current App of the Image | 403; 404 when not visible |
| DELETE `{ ids, app }` | Admin in `app`; each Image linked to `app` | 403; 404 when not visible or not linked to `app` |
| DELETE `{ ids }` | `canManageEverywhere` for each Image | 403; 404 when not visible |

`DELETE { ids, app }` removes the links to `app`. An Image left with no link
is deleted, row and file; one still linked elsewhere stays. `DELETE { ids }`
deletes the Images everywhere, rows then files (a failed file delete is logged,
as today).

Every batch stays all or nothing. 404 is checked before 403 across the whole
batch, so a refused batch never tells which ids exist.

The recap agreed in chat, with P (Laura public, Back office private), Q
(Laura private), R (Back office private); Giulia a Laura Viewer, Mario a
Laura Admin outside the Back office, Admin in every App:

| Request | Visitor | Giulia | Mario | Admin |
|---|---|---|---|---|
| `GET ?app=LAURA` | P | P, Q | P, Q | P, Q |
| `GET ?app=BACK_OFFICE` | none | none | none | P, R |
| `GET` (no app) | P | P, Q | P, Q | P, Q, R |
| `GET {Q}` / `GET {R}` | 404 / 404 | Q / 404 | Q / 404 | Q / R |
| Upload to Laura + Back office | 401 | 403 | 403 | done |
| PATCH Q switch public in Laura | 401 | 403 | done | done |
| PATCH P `apps: [BACK_OFFICE]` | 401 | 403 | done | done |
| PATCH P `alt` | 401 | 403 | 403 | done |
| PATCH R | 401 | 404 | 404 | done |
| DELETE `{ [P], LAURA }` | 401 | 403 | done, P stays | done |
| DELETE `{ [Q], LAURA }` | 401 | 403 | done, Q gone | done |
| DELETE `{ [P] }` | 401 | 403 | 403 | done |
| DELETE `{ [Q, R] }` | 401 | 404 | 404, nothing deleted | done |

## Service (`packages/database/src/features/image/image.service.ts`)

- `ImageRecord` carries `apps: ImageLink[]` (ordered by App).
- `createImages(images)`: each with its links, one transaction.
- `listImages({ app?, enterable, cursor, limit })`: Images with a link that
  matches `app` (when given) and is in `enterable` or public.
- `getImage(id)`: with its links.
- `linksOfImages(ids)`: `Map<id, ImageLink[]>`; throws `ImageNotFoundError`
  unless every id exists (replaces `appsOfImages`).
- `updateImages(changes)`: `apps` replaces the links, `alt` the alt; one
  transaction.
- `removeImagesFromApp(ids, app)`: drops those links and deletes the Images
  left with none; returns the deleted keys.
- `deleteImages(ids)`: unchanged.

## Handlers

`handlers.ts` sits at the 300-line cap: the authorisation of each write moves
into `hono/utils/errors.ts`-style helpers (`assertVisible`, `assertManages`
reshaped for link lists) so the handlers stay a parse, a check and a call.
Split into `read-handlers.ts` and `write-handlers.ts` if it still crosses 300.
`IMAGE_ROUTE_DOC` describes the new rules ("ADMIN only" is no longer true).

## Docs

- Done during grilling: ADR 0020 written; ADR 0019's Image consequence and
  ADR 0013's `app` column sentence point to it; `CONTEXT.md` **Image** says
  "in one or more Apps", public or private in each (no new noun: code calls the
  row `ImageApp`, docs say "placement").
- `CLAUDE.md` access bullet: `canSeeImage`, `canManageEverywhere`; schema
  bullet: `image` holds `Image` and `ImageApp`.
- `packages/storage/README.md`, `packages/database/README.md`.

## Testing

- **Unit, access:** `canSeeImageIn` (public, member, outsider, no User),
  `canSeeImage`, `canManageEverywhere`, `enterableApps`.
- **Unit, Image module:** one test per row of the recap table, plus: an
  empty `apps` and a repeated App answer 400; upload with `public: true` keeps
  it; PATCH leaving a link unchanged needs no Admin there; PATCH leaving out
  `public` keeps a public placement public.
- **Integration, service:** links created, listed by `app` and by `enterable`
  with public ones, replaced on update, `removeImagesFromApp` keeps a linked
  Image and deletes an orphan (returns its key).
- **Integration, changelog:** `ImageApp` exists with its key and cascade;
  `Image` has no `app`; rollback drops `ImageApp`.

## Out of scope

- A whole public App (`APP_SETTINGS` flag) and share links.
- A Back office UI for Images.
- Serving private Image files behind a Membership check: files stay public by
  key, as today.
- The sign-in page looking its Image up without a Session: now possible (make
  it public in the Back office), left for its own change.
