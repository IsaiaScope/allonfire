# The signed-in frame is static, and each page gates itself

An App's signed-in Sections share one frame: the main menu, the top bar and
the phone tab bar, drawn by the `(signed-in)` route group's layout. The frame
is static: built at build time, the same for everyone, holding no data and
reading no Session. Each page then checks the Session itself
(`withAppSession`) and renders only once it passes. The account menu in the
frame reads the Session on its own, behind its own `<Suspense>`.

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
