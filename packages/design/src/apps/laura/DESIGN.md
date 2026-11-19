---
name: Ocean
description: A tide pool for Laura: calm teal over sea glass by day, deep water by night, one coral for what is loved.
colors:
  tide-teal: "#0b6b7c"
  tide-teal-night: "#4fc3d4"
  sea-glass: "#f2f8f8"
  foam: "#ffffff"
  deep-water: "#0f2a30"
  shallows: "#e1eded"
  slate-sea: "#4a6168"
  rim: "#cfdfe0"
  reed: "#78939a"
  coral: "#c93d3a"
  coral-night: "#ff7a72"
  ink: "#0a2530"
  ink-pale: "#e8f2f3"
  kelp: "#1f7a4d"
  amber-weed: "#8f5200"
  riptide: "#b3261e"
  night-water: "#0c1b21"
  night-card: "#142a32"
  night-shallows: "#1f3a44"
  night-muted: "#9db8be"
  night-border: "#2b4650"
  night-input: "#5d818c"
typography:
  display:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.15
  headline:
    fontFamily: "Fraunces, ui-serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.5
  body:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.tide-teal}"
    textColor: "{colors.foam}"
    rounded: "{rounded.lg}"
    height: "40px"
  card:
    backgroundColor: "{colors.foam}"
    textColor: "{colors.deep-water}"
    rounded: "{rounded.xl}"
    padding: "16px"
  floating-frame:
    backgroundColor: "{colors.shallows}"
    textColor: "{colors.deep-water}"
    rounded: "{rounded.2xl}"
    padding: "8px"
  favorite-mark:
    textColor: "{colors.coral}"
    size: "24px"
  card-back:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.coral-night}"
    rounded: "{rounded.xl}"
    width: "300px"
    height: "400px"
  ink-pill:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-pale}"
    rounded: "{rounded.lg}"
    padding: "4px 12px"
---
<!-- Generated from src/designs/ocean/DESIGN.md by design:sync. Edit through /aof-design. -->

# Design System: Ocean

## Overview

**Creative North Star: "The Tide Pool"**

Ocean is Laura's Design: a small, clear pool where the pictures are the
treasures. By day the ground is sea glass, pale and a little green, with white
foam cards resting on it and one deep teal for what can be pressed. By night
the pool goes to deep water, and the teal turns bright enough to find in the
dark. A single coral, the colour of what is loved, marks Favorites and nothing
else. An octopus is its mascot, drawn as a kawaii blob (a round body on four
tiny feet) with a face that can change. The Laura logo is not the octopus: it is the AOF
logo as the Back Office wears it, with the teal banner behind its label.

It is warm without being childish: Nunito's round letters for reading, a soft
serif (Fraunces) only for page headings, soft corners, one hand's reach for
every control. It rejects the gallery that shouts (heavy frames, drop shadows
on every tile, decoration around the picture) and the admin look the Back
Office wears: density is not welcome here.

**Key Characteristics:**
- The Image is the interface; the chrome steps back.
- A floating frame: the sidebar is a card on the pool, with a gap round it.
- Sea glass by day, deep water by night, following the OS.
- Coral for Favorites only.
- One dark, the ink, shared by both schemes.

## Colors

The palette is teal water with one warm accent. Every value lives in
`theme.css`, which wins whenever this file and it disagree.

### Primary
- **Tide Teal** (`#0b6b7c`): the one pressed colour by day: primary buttons,
  links, the focus ring, the first chart series.
- **Tide Teal Night** (`#4fc3d4`): the same role at night, brighter.

### Secondary
- **Coral** (`#c93d3a`, `#ff7a72` at night): a Favorite, and the share card's
  band. Drawn at 3:1 on the ground and the card, never read as text.

### Neutral
- **Sea Glass** (`#f2f8f8`) the day ground; **Foam** (`#ffffff`) cards and
  popovers; **Shallows** (`#e1eded`) secondary, muted and accent fills;
  **Deep Water** (`#0f2a30`) text; **Slate Sea** (`#4a6168`) second lines;
  **Rim** (`#cfdfe0`) borders; **Reed** (`#78939a`) a field's edge (3:1 on a
  card).
- **Night Water** (`#0c1b21`) the night ground; **Night Card** (`#142a32`);
  **Night Shallows** (`#1f3a44`); **Night Muted** (`#9db8be`); **Night
  Border** (`#2b4650`); **Night Input** (`#5d818c`).

### Notices
- **Kelp** (`#1f7a4d`) success, **Amber Weed** (`#8f5200`) warning, **Riptide**
  (`#b3261e`) failure; each is AA on a popover and so can carry text. A toast
  is filled in a deeper step of each, white on it, the same in both schemes.

### Named Rules
**The Ink Rule.** The card back and any other dark furniture are ink
(`#0a2530`, pale text `#e8f2f3`) in both schemes: it does not follow the
theme, like a station sign that stays lit.

**The Coral Rule.** Coral marks a Favorite and the octopus on the Memory game's
card back, and nothing else. It is never text on the ground and never a state
(success, warning and failure have their own colours).

## Typography

**Heading Font:** Fraunces (self-hosted, `--font-heading`), for page headings
only.
**Body Font:** Nunito (self-hosted, `--font-sans`), for everything else,
including the images the App generates (Satori reads no variable or WOFF2
fonts, so the images use static Nunito).

- **Display** (600, 2.25rem): a page's one heading.
- **Headline** (600, 1.5rem): a section.
- **Title** (700, 1.125rem): a card's name.
- **Body** (400, 1rem, 1.55): reading, in English and Italian.
- **Label** (700, 0.875rem): fields and buttons.

## Layout

One column on a phone, a floating sidebar and a page on a desk. Pages keep to
the gutter tokens (`--page-gutter` and the safe-area insets) and the Image
gets the room: a grid of pictures, one per tap target.

## Elevation & Depth

Flat by default: depth comes from the ground and the card, a hairline of Rim.

**The Floating Frame Rule.** Only the floating frame and floating controls cast
a shadow (an emoji has only its own tight `--emoji-shadow`). The frame's gap, radius and shadow come from `--frame-gap`,
`--frame-radius` and `--frame-shadow`, which the shared sidebar reads with
shadcn's values as fallback.

## Shapes

Soft: `--radius` is 0.75rem; cards step to `xl` (1.05rem) and the frame to
`2xl` (1.35rem). A capsule is only a pill that carries text.

## Components

- **Button.** Tide Teal, white label, 40px (44px on a finger).
- **Card.** Foam on Sea Glass, `xl`; at night Night Card on Night Water.
- **Floating frame.** The sidebar as a card with a gap round it.
- **Favorite mark.** Coral, 24px.
- **Card back.** The Memory game's card: ink, an edge in the night teal, two
  rows of waves, the dizzy octopus in night coral.
- **Sea line.** One wave (`sea-wave.ts`): the share card's foot, a divider.
- **Sea icons.** Solid and single-colour: crab, jellyfish, lighthouse
  (`sea-icons.ts`, credits in `SOURCES.md`).
- **Emoji.** Noto and Firefox, full colour, one per thing the app shows
  (`sea-emoji.ts`), each with `filter: var(--emoji-shadow)`: a tight shadow,
  ink-tinted on the light ground and a light rim at night. No ship.

## Do's and Don'ts

### Do
- **Do** let the Image fill its space; the chrome is the frame, not the
  picture.
- **Do** check a new colour against `theme.test.ts`: AA for text, 3:1 for a
  mark.
- **Do** keep motion behind `motion-safe:`.
- **Do** give the octopus a face for the moment (`OCEAN_FACE`: dizzy for the
  card back and an error, lost for a 404, sleepy offline, happy at the door
  and while waiting, a wink and wide eyes in toasts); a new face is a new
  function in `ocean-mark.ts`.

### Don't
- **Don't** put coral on text, or on anything but a Favorite.
- **Don't** add a shadow to a tile, a card or a button (**The Quiet Image
  Rule**: chrome never competes with an Image).
- **Don't** draw the octopus as a large illustration or with filters: plain
  paths, two colours.
- **Don't** show Japanese or station furniture here: that is Japan's.
