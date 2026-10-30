# The signed-in frame is static, and each page gates itself

An App's signed-in Sections share one frame: the main menu (a sidebar that
collapses to icons, a drawer on a phone) and the header, drawn by the
`(signed-in)` route group's layout. The frame is static: built at build time,
the same for everyone, holding no data and reading no Session. Each page then
checks the Session itself (`withAppSession`) and renders only once it passes.
The App switcher and the account menu in the frame each read the Session on
their own, behind their own `<Suspense>`.

## Why

- The frame appears at once and stays mounted across navigations, so the
  sidebar keeps its state and only the page area changes.
- A layout does not re-render on a client navigation, so a check there would
  not run again on the next page; the check belongs to each page.
- The frame holds nothing anyone should not see: links to the Sections and
  their names. A visitor with an expired cookie sees it for a moment, then the
  page redirects; no page reaches them. A visit with no Session cookie is sent
  to Sign in by the proxy before anything renders.
- Drawing the frame inside each page, after the check, was rejected: nothing
  would show before the check, but the frame would be rebuilt on every
  navigation and the loading screen would cover it.

## Consequences

- A page's data still comes through the API, which checks the Session itself;
  the frame and the page's check decide what a visitor sees, the API what
  data leaves.
- UI state in the frame (the sidebar open or collapsed) is a typed URL param
  read on the client, never a cookie the server reads, which would make the
  frame dynamic.
- Each page gates itself inside its own `<Suspense>`, the loading screen as
  its fallback (`withAppSession(Page, fallback)`): a route group's
  `loading.tsx` sits above where sibling pages diverge, so a soft
  navigation between Sections would otherwise wait on the check outside any
  boundary.
- Every signed-in page is listed once by the App (its Sections), and a test
  checks that each page gates itself and that the proxy gates its path.

## Amended 2026-10-23: the check runs beside the page

With Cache Components every page behind the check waited on it, so each
visit showed the loading screen first. Following Next's guide to
authentication with Cache Components, `withAppSession` now runs the check
beside the page, behind its own `<Suspense fallback={null}>`, and the check
is `use cache: private`: the browser keeps a passed one for 30 minutes
(`AUTH.SESSION.PAGE_CHECK_STALE_S`), never the server, and a redirect is never
kept. A page with no request-time data of its own is in the static shell and
paints at once; the page keeps its own `<Suspense>` for the data it reads.
What changes: a visitor with a cookie the App refuses (an expired Session, a
Role under the floor) can see a page's static frame for a moment before the
redirect, as they already saw the frame's. Never its data: that still comes
through the API, which checks every request. A Role taken away still shows
pages for up to 30 minutes, with no data.
