# A picture leaves the Apps only as an Export: a signed-in, metadata-free JPEG, never a link

Laura's rebuild left Share out of the photo preview: a link to a private Image
works for anyone who holds it until it expires (ADR 0027), the cdn sends no
CORS header so the browser cannot read the bytes, and the Web Share API sends
files only in some browsers. The owner now wants Download and Share, so the
rule needs an answer that keeps the first reason and removes the other two.

A User who wants to keep or send an Image asks the API for an **Export**:
`GET /v1/images/:id/export`. The API checks the Session and the Image's
visibility exactly as a read does (`canSeeImage`, a hidden Image is a 404),
decodes the stored AVIF, writes a JPEG with no location or camera data, and
streams it with `Content-Disposition: attachment` and `Cache-Control: private,
no-store`. A browser saves it with a plain link, and shares it as a file
(`navigator.share` with `canShare({ files })`); a link to an Image is never
what is shared. A visitor cannot ask for one, even for a public Image: the
decode costs the server, and the route has its own rate limit.

## Considered Options

- **CORS on the cdn, the browser fetches a JPEG by `Accept`**: least code, but
  page JavaScript reads the bearer link, nginx caches the answer, two compose
  files change and the size is capped at the largest served width.
- **A route handler in Laura**: no CORS change, but a second copy of the access
  rule, Laura only, and Laura's server carries the bandwidth.
- **Share the signed link**: rejected by ADR 0027's own reasoning: a private
  Image would reach people who are not Members until the link expires.

## Consequences

- Every App reuses the one route; the Back Office's Image page can offer it
  later with no new server code.
- The API now does image work on request (one decode at a time per request, a
  dedicated limit), where before it only signed links.
- Where the browser cannot send files, Share is hidden and only Download shows;
  there is no link or clipboard fallback.
- If an installed iPhone app cannot take a link to another origin, Laura may
  proxy the same route from its own origin (`next.config` rewrite); the access
  check stays in the API either way.
- `docs/guides/images.md` loses "A photo has no Share button" and gains this rule.
