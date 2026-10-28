# An Image is public or private, and every picture is served through signed links

ADR 0020 let each placement be public, and served every Image file by key
from a bucket anyone could read. Two things were wrong with that. One file
cannot be public in one App and private in another: once any App shows it to
anyone, its address works everywhere. And "private" meant only unlisted: the
file opened for whoever held its address. So an Image now has one access of
its own, public or private, and its placements say only which Apps it is in.
A public Image shows to anyone; a private one only to those who enter at
least one of its Apps (`canEnterApp`). Making it public or private, which
every one of its Apps shows, takes the Admin Role in every App it is in, as
its alt text does.

Every stored picture, Images and Avatars alike, sits in one bucket, `image`,
that nobody reads anonymously any more. An image server (imgproxy, the Docker service
`image-server`) reads it and resizes on request, and answers only links the
API signed: a public Image's never expire; a private Image's and an Avatar's
expire after an hour, rounded to the hour so a page's links stay the same
within it. An Avatar is private: `User.image` holds its file's name, and the
API signs a link each time it returns a User, to those who share an App with
them, manage Users, or are them. The API signs links only for those allowed to see the picture, so
the check happens when a link is handed out. Pages keep `next/image` with a
loader that picks the signed link for each width; Next's own optimizer is not
used for stored pictures, since it caches one copy for every visitor and
fetches without the visitor's cookie.

## Considered Options

- **Keep public per placement, enforce it per request**: a route checking the
  Session before each file; still one file with two answers, and Next's
  optimizer could not be used for private Images.
- **Buckets by access, moving a file when it changes**: public files served by
  storage, private ones through the API; two paths, and resized copies for
  private files had to be made at upload.
- **Our own resizing route with sizes made at upload**: a check on every
  request, but three or four files per Image and code imgproxy already is.
- **A hosted service** (imgix, Cloudinary): the same signed and expiring
  links, paid and outside the VPS.

## Consequences

- A private Image's link works for whoever holds it until it expires: losing
  access (a Membership, a placement) stops new links, not ones already given.
- Turning a public Image private renames its file, so its never-expiring
  links answer 404 at once.
- An Image that must be public somewhere and secret elsewhere is two Images.
- The API holds the signing key and salt (`STORAGE_IMAGE_SERVER_KEY`,
  `STORAGE_IMAGE_SERVER_SALT`); imgproxy accepts several pairs, so the key can
  rotate without breaking links already handed out.
- A cache holding signed links never outlives them: the Back Office's Users
  list expires within the hour.
- `ImageApp.public` goes; `Image.access` arrives. Production is rebuilt, so
  nothing migrates.
- Supersedes ADR 0020's public placements and its "served by key without a
  Session"; its placements and Admin rules stand.
