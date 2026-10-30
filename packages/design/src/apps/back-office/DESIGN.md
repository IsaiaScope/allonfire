---
name: Japan
description: Station wayfinding for the AllOnFire Apps: every App a line, every access a route.
colors:
  information-blue: "#006fb3"
  information-blue-night: "#3a9ee0"
  enamel-white: "#f6f7f8"
  card-white: "#ffffff"
  sign-black: "#1a1a1a"
  concourse-grey: "#e7eaee"
  platform-grey: "#5c6570"
  rail-border: "#d9dde2"
  rail-input: "#c9ced5"
  night-panel: "#16191d"
  night-card: "#20252b"
  night-concourse: "#2f3640"
  night-text: "#eef0f2"
  night-muted: "#a3acb6"
  night-border: "#3b434d"
  night-input: "#56606c"
  signal-red: "#c8102e"
  signal-red-night: "#f0605a"
  line-green: "#00a650"
  line-orange: "#f39700"
  led-amber: "#ffb21a"
  led-dim: "#6b4a0a"
  led-panel: "#0d0d0d"
  tactile-yellow: "#f2c200"
  hanko-vermilion: "#e04a32"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.55
  body:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
  led:
    fontFamily: "DotGothic16, ui-monospace, monospace"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.25
  brush:
    fontFamily: "Yuji Syuku, serif"
    fontSize: "min(76vw, 48svh)"
    fontWeight: 400
    lineHeight: 1
rounded:
  sm: "0.15rem"
  md: "0.2rem"
  lg: "0.25rem"
  xl: "0.35rem"
spacing:
  xs: "4px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.information-blue}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-gate:
    backgroundColor: "{colors.information-blue}"
    textColor: "{colors.card-white}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    height: "64px"
    width: "100%"
  button-ghost:
    textColor: "{colors.platform-grey}"
    rounded: "{rounded.lg}"
    size: "32px"
  input-primary:
    textColor: "{colors.sign-black}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 48px 0 52px"
    height: "48px"
  field-icon-tile:
    backgroundColor: "{colors.night-panel}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.sm}"
    width: "36px"
  station-sign:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.sign-black}"
    rounded: "{rounded.lg}"
    width: "28rem"
  station-sign-band:
    backgroundColor: "{colors.led-panel}"
    textColor: "{colors.night-text}"
    padding: "12px"
  departure-board:
    backgroundColor: "{colors.led-panel}"
    textColor: "{colors.led-amber}"
    typography: "{typography.led}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  control-bar:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.lg}"
    padding: "4px"
  language-current:
    backgroundColor: "{colors.led-panel}"
    textColor: "{colors.led-amber}"
    typography: "{typography.led}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
  hanko:
    textColor: "{colors.hanko-vermilion}"
    size: "48px"
  eki-stamp:
    textColor: "{colors.hanko-vermilion}"
    typography: "{typography.display}"
    size: "224px"
---
<!-- Generated from src/designs/japan/DESIGN.md by design:sync. Edit through /aof-design. -->

# Design System: Japan

## Overview

**Creative North Star: "The Station"**

Japan borrows the grammar of Japanese railway wayfinding (JR and Tokyo Metro
signage), seen at night: enamel sign panels, an amber LED departure board,
vermilion ink stamps and line colours. Each AllOnFire App is a line with its
own colour, and an interface built in Japan reads like a station: you always
know which line you are on, where you are, and where the exit is. Density is
welcome, decoration is not; a colour appears because it names a line, a state
or a piece of station furniture.

Every page so far is a station moment rather than a tool: the Sign in is the
ticket gate (改札), the loading page the platform as a train comes in, the
error pages a line that has stopped or a station that is not on it. Each is
one centred column on the theme's ground, with one Japanese word brushed
huge and faint across the wall behind it. Japanese is signage, never a
translation the visitor has to read: the page's own words carry the meaning,
and every Japanese mark is hidden from assistive tech.

It rejects the generic SaaS admin (grey sidebar, white cards, blue buttons that
could belong to any product) and anything that slows the task.

**Key Characteristics:**
- One centred column of sign-width content on a quiet ground.
- Station furniture (the LED board, the sign band, the field tiles) stays
  night in both themes.
- Vermilion ink for what is pressed on: the hanko seal, the eki stamp.
- One brushed kanji, huge and faint, on the wall behind a page.
- Day (enamel white) and night (backlit sign black) grounds, following the OS.

## Colors

Colour strategy: restrained ground with committed station furniture. Neutrals
carry reading; amber, vermilion and line colours appear only as the material
they name.

### Primary

- **Information Blue** (by day; Information Blue Night after dark): the one
  action per view, links, focus rings, the text caret and the text selection.
  By day white text sits on it (5.4:1) and it reads as link text on the ground
  (5.0:1); at night the lighter blue reads on the dark ground (6.0:1) and
  carries dark text (6.0:1).

### Secondary

- **Line colours**, one per App, from a palette: Line Green and Line Orange.
  Each App picks its own as `--line` in its styles.css (`bg-line`); the Back
  Office's is green. Used as bands, badges and route markers; never as text on
  the ground, and green never carries white body text (3.2:1); near-black text
  reads on it (5.5:1). **Line Green Deep** (`--line-green-deep`, #2e7a4f) is
  the green calmer and deeper, for a filled control labelled in white (5.2:1):
  the Back Office's chosen Role.

### Tertiary

- **LED Amber** on **LED Panel** black, with **LED Dim** for unlit cells and
  the board's frame: the departure board and anything that speaks in its
  voice (the current language, an error's reference, the loading status).
- **Hanko Vermilion** (朱肉, seal ink): the hanko and the eki stamp, nothing
  else.
- **Tactile Yellow**: the raised tactile paving, with its dot pattern
  (`pattern-tactile-dots`). In the Back Office's sidebar it marks only the
  current Section, a bar along its left edge and a faint wash behind the
  row; the sidebar's own edge stays a neutral border.

### Neutral

- **Enamel White**: the day ground. Not pure white.
- **Card White**: cards and popovers by day, a step above the ground.
- **Sign Black**: day text.
- **Concourse Grey** / **Night Concourse**: muted, secondary and hover fills.
- **Platform Grey** / **Night Muted**: secondary text.
- **Rail Border**, **Rail Input** / **Night Border**, **Night Input**: card
  edges and field strokes.
- **Night Panel**: the night ground, and the field icon tile in both themes.
  Not pure black.
- **Night Card**: cards at night.
- **Night Text**.
- **Signal Red** / **Signal Red Night**: errors only, as a border, an icon and
  a 10% wash, never a filled panel.

### Named Rules

**The Line Rule.** A line colour means an App. Never use one for decoration or
for a state.

**The Band Rule.** Colour commits at band or panel scale; a line colour that
would appear smaller than a badge is left out.

**The Furniture Rule.** A piece of station furniture (a board, a sign's band,
a field's icon tile) is night by day too: it scopes `.dark` on itself instead
of following the theme.

## Typography

**Body Font:** Atkinson Hyperlegible Next (with ui-sans-serif, system-ui),
self-hosted, weights 200 to 800.
**LED Font:** DotGothic16 (with ui-monospace), subset to ASCII, Latin-1, kana
and the kanji the pages print.
**Brush Font:** Yuji Syuku (with serif), subset to the kanji painted behind a
page.

**Character:** A signage grotesk built so no two characters read alike, which
emails, IDs and station codes need, set against a dot-matrix face that only
the board speaks and a brush that only paints the wall. Figures that count
are tabular.

### Hierarchy

- **Display** (800, 4.5rem, up to 6rem from `sm`; line-height 1): the eki
  stamp's figure (404, 停, 待). Nowhere else.
- **Headline** (700, 1.875rem): an error page's `h1`, balanced.
- **Title** (700, 1.125rem): the gate button's label.
- **Body** (400, 1rem): descriptions in Platform Grey, field values.
- **Label** (700, 0.875rem): a primary field's label; the eki stamp's station
  name in capitals tracked wide (0.3em).
- **LED** (400, 1.125rem; 0.875rem for a notice or a reference): everything
  on a board.
- **Brush** (400, sized by the screen: `min(76vw, 48svh)` top to bottom on a
  phone, `min(44vw, 80svh)` across from `lg`): the wall's kanji at 10% of the
  text colour, tilted 12 degrees; a button's kanji at 20% of its text colour,
  cut by its edges.

### Named Rules

**The Signage Rule.** Japanese is signage: kana and kanji appear on a board,
a stamp, a seal or the wall, always `aria-hidden` with `lang="ja"`, and the
page says the same in its own language. A board pairs them on one row, the
way a real board does; a field never carries a second-language label.

**The One Voice per Face Rule.** DotGothic16 is the board's voice and Yuji
Syuku the wall's; neither sets a sentence the visitor must read in the page's
language.

## Layout

Mobile first: one centred column (`AOFPage` `centered`) of sign-width content,
28rem for the Sign in, 24rem for the error pages, on a full-height ground that
clips the wall's kanji. Side gutters are 12px, 16px from `sm`. Stacks are
spaced in a 4px module: 16px inside a form, 24px between the board and the
sign, 32px between a stamp, its words and its button. Page-level controls
(language, theme) share one capsule pinned 32px from the bottom: bottom right
on a phone, centred from `lg`.

## Elevation & Depth

Mostly flat: grounds, boards and stamps sit on the wall without shadow, and
depth comes from the night furniture against the ground. Two things lift: the
station sign, which hangs off the wall, and the floating control capsule. The
see-through station sign (75% card) lets the brushed kanji show through it.

### Shadow Vocabulary

- **Sign lift** (Tailwind `shadow-lg`): the station sign only.
- **Capsule float** (Tailwind `shadow-sm`): the control bar only.

### Named Rules

**The Hung Sign Rule.** Only a sign or a floating control casts a shadow;
boards, stamps and fields never do.

## Shapes

Rectangular sign panels with small corners from `--radius` (0.25rem): the
sign and the capsule take the full radius, what sits inside them steps down
(controls and boards `rounded-md`, the field icon tile and the board's lamps
`rounded-sm`). Nothing is pill-shaped. Only what is round in the world it
depicts is round: the hanko seal and the eki stamp, both pressed on askew
(minus 6 degrees). Boards carry a 2px LED Dim frame and a 4px dot grid of
unlit cells (`pattern-led-grid`); `led-board` is the whole board: frame,
grid, panel and LED face.

## Components

### Buttons

Plain and sure, the shadcn button through `AOFButton`, with a pointer cursor.

- **Shape:** small corners (0.25rem).
- **Primary:** Information Blue with its foreground, 32px tall by default;
  hover drops it to 80%.
- **Gate:** the Sign in's one action as the gate's card reader: full width,
  64px tall, bold 1.125rem label with a contactless icon and the kanji 入
  brushed in its corner. An error page's button is the same idea at a field's height (40px under a
  mouse, 44px on touch),
  at least 16rem wide.
- **Hover / Focus:** a 3px ring in the ring colour at 50%; pressed it sinks
  1px. Disabled at 50% while pending, with a spinning loader and its own label.
- **Ghost / Outline:** the theme toggle and the reveal-password eye are ghost
  icon buttons in Platform Grey; sign out is outline.

### Cards / Containers

- **Station Sign:** the Back Office's card. A night band (LED Panel, an amber
  rule beneath, dim at night) carries the AllOnFire logo with the App's name,
  as the page's `h1` on the Sign in, and an optional seal at its far end; the
  body follows the theme, padded 12px. Card white with a Rail Border edge,
  or 75% card when something is painted behind it.

### Inputs / Fields

- **Style:** Rail Input stroke, transparent ground (30% input at night),
  small corners. The primary field is 48px tall at 1rem, its bold label
  above, and opens on a 36px night icon tile that stays night on focus.
- **Focus:** the stroke turns ring blue with a 3px ring at 50%.
- **Error:** the stroke and ring turn Signal Red; the message sits in a line
  kept free beneath (20px), so nothing moves. A form-level refusal is a Signal
  Red bordered note with a warning icon on a 10% red wash.

### Navigation

- **Language switch:** plain links, one per language, in DotGothic16 inside
  the control capsule. The current one is lit like the board (LED Amber on LED
  Panel); the others are Platform Grey and fill Concourse Grey on hover.

### Departure Board

The signature piece. LED Amber on a black dot-grid panel: platform (番線) and
status in kana on the top row, the status in the visitor's language at its
end, announced politely. A notice can run right to left on the bottom row
(24 seconds a lap), with a native checkbox to pause it, pausing under the
pointer too, and standing still for reduced motion. A one-row board, without
the platform, carries the loading status with three lamps lighting one after
another (1.2s, 200ms apart) as its ellipsis.

### Hanko and Eki Stamp

Vermilion ink, pressed on once: the stamp animation (360ms after 500ms,
landing from 1.8 times its size). The hanko is a 48px ringed seal at the
station sign's band, its characters stacked top to bottom. The eki stamp is a
224px double ring (256px from `sm`) with the App's name around the top, a
display figure, a rule and a word in kana; an error or loading page leads with
it, its words rising in after it lands (700ms), then its button (1s).

## Do's and Don'ts

### Do:
- **Do** mark an App with its line colour and station badge wherever Apps are
  listed.
- **Do** keep one Information Blue action per view.
- **Do** give every access state (allowed, denied, pending, revoked) its own
  shape and label, never colour alone.
- **Do** make browse and edit one keypress apart: records open in place.
- **Do** keep motion short (300 to 700ms), once on entry or on a state change,
  behind `motion-safe:`; only a board's notice or a loading lamp runs on, and
  a notice ships its pause.
- **Do** hide every Japanese mark from assistive tech (`aria-hidden`,
  `lang="ja"`) and say it in the page's own words.

### Don't:
- **Don't** build a generic SaaS admin: grey sidebar, white cards, blue buttons.
- **Don't** add costume Japan: cherry blossoms, torii, rising suns, or a brush
  face for anything but the one kanji on a wall or in a button.
- **Don't** trade speed for beauty: no motion or ornament that delays a task.
- **Don't** ship pure white or pure black grounds.
- **Don't** shade a board, a stamp or a field: only a sign or a floating
  control lifts.
