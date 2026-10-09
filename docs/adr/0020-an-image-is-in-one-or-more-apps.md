# An Image is in one or more Apps, and each placement can be public

ADR 0019 gave every Image exactly one App, so a picture two Apps show was
stored twice and edited twice. Each App's Admins curate their own App, so an
Image is now stored once and placed in any number of Apps through
`image."ImageApp"` rows (`imageId`, `app`, `public`). An App's Admin adds an
Image to their App or removes it from there; removing its last placement
deletes it. Changes every App sees at once, its alt text or deleting it
everywhere, need the Admin Role in every App it is in, which every Back office
Admin holds through the add-an-App rule. A placement can be public: the Image
then shows in that App to anyone, signed in or not, so the Image module's reads
need no Session and an App can have public pages.

## Considered Options

- **Back office Admin as a super Role for Images**: one rule to explain, but
  it brings back a Role reaching every App, future ones included, which ADR
  0019 removed.
- **A whole App public in `APP_SETTINGS`**: simpler, but all or nothing; a
  public page in Laura would expose every family photo.
- **Separate routes per App** (`PUT`/`DELETE /images/{id}/apps/{app}`): very
  explicit, but one call per Image and App, breaking the module's batches.

## Consequences

- An Image always has at least one placement: the API refuses an empty list,
  and removing the last one deletes the row and its file.
- Image files were already served by key without a Session; public placements
  rely on that, and private Images stay protected only by their random key.
- An App's list orders by upload date, not by the date the Image entered that
  App, so the cursor stays one shape.
- An Image comes back with every placement, including ones the caller cannot
  see: a PATCH sends the full new list, so its sender must see what it keeps.
  Anyone who sees the Image learns which other Apps hold it and whether it is
  public there, never anything else about those Apps.
