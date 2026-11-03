# Pages prefetch their data, and a User save is version-checked

Every App built on core's Next config uses Partial Prefetching: a `<Link>`
prefetches its destination's App Shell, and the links that are worth it
prefetch the data behind their address too (`prefetch={true}`, or on intent
for a long list's rows). A page's reads that need the visitor's Session go
through the API with their cookie, so they are `"use cache: private"`: kept
only in that visitor's browser, never on the server, and never keyed on the
Session. That made one User's page cacheable, which it was not before: its
edit form saves every Membership it shows, so an old copy could remove one
gained elsewhere. So a save now carries the User's version (a hash of the
User and their Roles in every App), and the API refuses it with 409 when the
User changed since; the form tells the Admin to reload.

The Version is generic, and every versioned save goes through one shared
check: core holds the hash (`versionOf`), the `version` field's schema, the
standard code `RESOURCE_CHANGED` (409) with one shared translation, and
`checkVersion(expected, actual)`, which throws `ResourceChangedError`. A
service runs it under the row lock its write already takes, before any write;
`ResourceChangedError` is a `CodedError`, so every host's `onError` answers it
as the 409 with no mapping in any module. Each resource decides only what its
version covers:

- a User: `updatedAt` and every (App, Role) pair. Their Avatar is part of
  them: `PUT` and `DELETE /users/:id/avatar` carry the User's Version too, and
  the Edit form sends its Avatar change with the Version its `PATCH` answered,
  so a change landing between the two requests is refused. Adding a User
  answers their first Version, which the Add form's Avatar carries.
- an Image: `updatedAt` (`Image.updatedAt`, moved by every change, its Apps'
  included), its access, its alt in each Language and its Apps, sorted. A
  `PATCH /images` item sends the full `apps` list and `alt`, so a save made on
  an older copy could drop an App or an alt set meanwhile; each item carries
  its Image's Version. A batch that would leave an Image in no App (another
  change took it out of its other Apps first) answers the same 409.

It travels in the JSON body (a form field for the Avatar's multipart `PUT`),
not as an `ETag`/`If-Match` header: the API has one typed client, and in the
body the compiler forbids forgetting it (as Kubernetes' `resourceVersion` and
GitHub's `sha` do).

## Considered Options

- `experimental.staleTimes.dynamic`: reuses a visited page on link clicks for
  some seconds. Covers only repeat visits, is experimental, and the Next
  skills never use it.
- Reading one User fresh on every visit (the old rule): safe, but the User
  page could never be prefetched, so every click waited on the API.
- Caching with the Session in the key (the old `readUsers`): cache keys are
  stored in plain text, and the docs say to keep tokens out of them.
- Hover-only prefetch on every list: phones have no hover; kept only for a
  list's rows, where a page can hold 100 links.

## Consequences

- Another Admin's change can show up to the read's `stale` (5 minutes) late;
  one's own save clears the browser's copies at once (`updateTag`).
- Any change to a User since the form was read refuses the save, a rename
  the User made themself included; the Admin reloads and saves again.
- Delete is not version-checked: it removes the person, it sets no fields.
  Nor is creating (a new User, an Image upload): there is nothing to
  overwrite.
- A long list's links prefetch on intent through ui's `useAOFIntentPrefetch`, props spread onto any `<Link>`, never a Link wrapper (the Next skills forbid an app-wide one).
- Navigation is verified only against a production build (`instant()` tests):
  `next dev` never prefetches.
