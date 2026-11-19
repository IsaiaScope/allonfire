# Safari on iPhone

How every App meets iOS Safari's bars, notch and home indicator. Safe-area
gutters and their e2e guard live in `design-system.md`; this guide holds what
Safari itself does and the rules that follow. Apple documents none of the
Safari 26 behaviour below: it is reverse-engineered by developers, so check it
on a real phone, never only in Chromium or the Simulator.

## What Safari 26 does

- The viewport is `viewport-fit=cover` (core's `AOFBaseViewport`), the only way
  iOS reports the safe-area insets. The page can then draw under the status bar
  and the bottom toolbar, which is translucent glass.
- `theme-color` is ignored. Safari tints each bar from the page: a
  `position: fixed` or `sticky` element touching that edge (its own
  `background-color` only; a pseudo-element or an `absolute` child is never
  read), else the `html`/`body` background. A transparent root falls back to
  white.
- The mechanism, from WebKit's `LocalFrameView::fixedContainerEdges` as developers
  describe it (unconfirmed, no Apple document): Safari hit-tests a point a few px
  (4 to 8) inside each edge, climbs to the first fixed or sticky box at least
  about 90% of the viewport wide and over 10px thick, skips one nearly
  transparent (opacity under 0.1), and takes its plain `background-color`.
- A fixed element at the bottom edge makes Safari fill the whole toolbar band
  with its colour and clip the page above it: a solid band where Google's page
  shows its content through the glass. A toast, a dialog scrim or a sticky
  footer does the same while it is on screen, even at `opacity: 0` (use
  `display: none` when closed).
- Content under the toolbar comes from the document scrolling, not from a
  container. A fixed-height frame ends at the visible viewport, and the band
  below it is the root's colour.
- Hiding the toolbar (scrolling down) grows the visible height. `svh` stays the
  height with the toolbar up, so a frame sized by it leaves a band of ground
  under it once the toolbar hides; `dvh` follows the visible height; `lvh` is
  the largest and runs under the toolbar when it is shown.
- In landscape Safari moves its bar to the top and the notch sits on a side:
  the left and right insets are real, the bottom one is the home indicator
  (about 21px).

## Rules

- Backgrounds run under the insets, text and controls never do (`--gutter-*`).
- The root is never transparent: base.css sets `html` to `--background`, and the
  body wears it too (`AOFLocaleDocument`).
- Draw nothing fixed at the screen's bottom edge that is not content: no
  tint strip, no full-width footer bar, no scrim that stays mounted when
  hidden. A toast is the one fixed thing there; the toolbar takes its colour
  while it shows.
- A frame that must fill the screen uses `dvh` (`min-h-dvh`, `h-dvh`), never
  `svh` or `vh`. Phones scroll the document; only `md` and wider use an inner
  scroller (`AOFAppFrame`).
- A popup (menu, select, popover, tooltip) passes `collisionPadding` from
  `useSafeAreaPadding`, never Base UI's bare 5px (`design-system.md`).
- A card that floats (`variant="floating"`) offsets the card itself by the left
  inset, not its content; a docked rail pads its content and lets its colour run
  to the edge (`AOFSidebar`).
- iOS has no directional scroll lock: one scroller per axis. `WebkitBackdropFilter`
  beside `backdropFilter`, colours mixed `in srgb` (`code-style.md`).

## Checking

- Chromium covers the insets (`Emulation.setSafeAreaInsetsOverride`, the
  `safe-area` e2e on every App) but draws no Safari bars: it cannot show a band
  under the toolbar.
- For a bar or band change, ask the owner for an iPhone screenshot in four
  states: portrait with the toolbar shown and with the page scrolled (compact
  toolbar), landscape likewise. Compare with a page that behaves (Google).
- A unit test pins the classes that matter (`min-h-dvh`, no `svh`, no fixed
  strip in `AOFLocaleDocument`).

## Sources

- [WebKit bug 305546](https://bugs.webkit.org/show_bug.cgi?id=305546),
  [306465](https://bugs.webkit.org/show_bug.cgi?id=306465)
- [Ben Frain, iOS 26 tab tinting with fixed elements](https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/)
- [Safari 26 Liquid Glass: toolbar tinting, white bars, viewport bugs](https://1ar.io/updates/safari-26-liquid-glass-web/)
- [water-rs/waterui#2727](https://github.com/water-rs/waterui/issues/2727):
  with `viewport-fit=cover`, a fixed element is clipped to the unobscured area
- [99Front#8](https://github.com/ThibaultWalterspieler/99Front/pull/8): a fixed
  element's background tints the bars; `lvh` and overshoot are clipped
- [Apple Developer Forums 798014](https://developer.apple.com/forums/thread/798014)

## History and gotchas

- 2026-11-19: with a toast on screen (Laura's Install hint, the Back Office's
  Saved) the toolbar band takes the toast's colour: the sampled band matched the
  card's colour exactly. Normal Safari 26 behaviour for a fixed toast, the same in
  both Apps, gone when the toast goes. Kept by the owner: moving the hint into the
  page flow was tried and reverted, and a strip to hide it is what made the solid
  band.

- 2026-11-19: the Back Office showed a solid band under Safari's bottom toolbar
  where Google shows its content through it. Cause: `AOFEdgeTint`, a fixed strip
  at the bottom edge added to keep the toolbar the page's colour, made Safari
  fill the whole band and clip the page. Fix: the strip is gone, `html` carries
  the ground. Unverified on a phone at the time of writing.
- 2026-11-19: in landscape the frame ended above the bottom once Safari hid its
  toolbar. Cause: `h-svh` on the sidebar and the page area. Fix: `dvh`.
- 2026-11-19: a floating sidebar card started under the landscape notch because
  only its content was padded. Fix: the card offsets itself by the left inset.
- 2026-11-19: menus and selects opened under the landscape notch and into the
  home-indicator zone (14px past it in the Back Office), and the filter panel
  ran off a short landscape screen. Cause: Base UI keeps a popup 5px from the
  screen edge, shadcn's wrappers pass no `collisionPadding`, an item-aligned
  Select ignores it, and the panel had no height cap. Fix: vendor patches plus
  `useSafeAreaPadding` in the AOF wrappers; the panel scrolls as a whole.
