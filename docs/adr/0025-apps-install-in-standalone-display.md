# Apps install in standalone display, through an Install button

Supersedes ADR 0023's display decision; the rest of 0023 (Workbox, the
Offline page, the static precache, no push yet) stands.

Every App's manifest says `display: "standalone"`: installed, an App opens
in its own window. Where the browser offers its own install dialog (Chrome,
Edge, Android: `beforeinstallprompt`), the Install hint is an Install
button that opens it, shows that it is installing until the browser
reports the App installed, and says so when the dialog fails. Where it
does not, the hint gives the browser's steps: iPhone and iPad (Share, then
Add to Home Screen) and macOS Safari (File, then Add to Dock).

## Why

- With `display: "browser"` no browser offers an install dialog, so the
  hint could only list menu paths, three of them on desktop Chrome.
- iOS 26 opens a site added to the Home Screen as a web app in its own
  window whatever the manifest says, so browser display never kept iPhone
  visitors in Safari anyway; keeping them there took one more step (turn
  off Open as Web App) that the owner did not want.

## Consequences

- An installed App has no browser toolbar: no back button, no address bar.
  Every page needs its own way back.
- Core listens for `beforeinstallprompt` from the moment its module loads
  and holds it back (no Android mini-infobar); the hint stays away until
  the browser fires it, and disappears once the App is installed.
- iOS Web Push becomes possible for an installed App; adding push still
  needs its own decision.
