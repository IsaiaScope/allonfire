# Apps are PWAs in browser display: offline page and static precache, no standalone, no push

**Display superseded by ADR 0025**: Apps now install in standalone display,
through an Install button. The rest stands.

Every App ships a manifest, icons, launch screens, an Offline page, a
precache of Next's static files and an Install hint, but keeps
`display: "browser"`: it opens in a browser tab, never its own window. Push
notifications are left out, since iOS allows Web Push only for a Home Screen
app in standalone display. The service worker is generated at build by
Workbox (`workbox-build`'s `generateSW`, registered through
`workbox-window`), not hand-written and not through Serwist, whose Next
plugin is webpack-only and whose Turbopack adapter is under the repo's
200k-downloads-a-week rule.

## Consequences

- Chrome never fires `beforeinstallprompt`, so the Install hint is text: the
  browser's own Add to Home screen or Create shortcut steps. It offers only
  ways that keep the browser: on iOS 26, Add to Home Screen with Open as
  Web App turned off; in Chrome, Create shortcut with Open as window
  unchecked. Edge's Install this site as an app and macOS Safari's Add to
  Dock always open a window of their own, so the hint skips both.
- Each App draws its own Install hint and offline banner in its Design and
  hands them to core's `AOFPwa`; core decides when they show.
- The worker caches no page and no data: a page loaded offline shows the
  Offline page, and losing the network mid-session is handled by Next's
  `useOffline`, which waits and retries.
- Moving to standalone, or adding push, means revisiting this ADR.
