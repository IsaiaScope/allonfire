---
name: Japan
description: Station wayfinding for the AllOnFire Apps: every App a line, every access a route.
---

<!-- SEED: established with the user before implementation; re-run /aof-design document once there's code to capture actual tokens and components. -->

# Design System: Japan

## Overview

**Creative North Star: "The Station"**

Japan borrows the grammar of Japanese railway wayfinding (JR and Tokyo Metro
signage): enamel sign panels, line-colour bands, station-number badges and
bilingual labels. Each AllOnFire App is a line with its own colour and code, and
an interface built in Japan reads like a station: you always know which line you
are on, where you are, and where the exit is. Density is welcome, decoration is
not; a colour appears because it names a line or a state.

It rejects the generic SaaS admin (grey sidebar, white cards, blue buttons that
could belong to any product) and anything that slows the task.

**Key Characteristics:**
- Line colours as full-width bands, never as scattered accents.
- Station-number badges mark every App and section.
- Bilingual label pairs: primary language on top, secondary smaller beneath.
- Day (enamel white) and night (backlit sign black) grounds, following the OS.

## Colors

Colour strategy: Restrained ground with committed line bands. Neutrals carry
reading; line colours own whole regions where they appear.

### Primary

- **Information Blue** (#006fb3 by day, #3a9ee0 at night): the one action per
  view, links, focus rings. By day white text sits on it (5.4:1) and it reads
  as link text on the ground (5.0:1); at night the lighter blue reads on the
  dark ground (6.0:1) and carries dark text (6.0:1).

### Secondary

- **Line colours**, one per App: Back office green (#00a650), Laura orange
  (#f39700). Used as bands, badges and route markers; never as text on the
  ground, and green never carries white body text (3.2:1).

### Neutral

- **Enamel white** (#f6f7f8): the day ground. Not pure white.
- **Sign black** (#1a1a1a): day text, and the night panel family.
- **Night panel** (#16191d): the night ground. Not pure black.
- **Night text** (#eef0f2).

### Named Rules

**The Line Rule.** A line colour means an App. Never use one for decoration or
for a state.

**The Band Rule.** Colour commits at band or panel scale; a line colour that
would appear smaller than a badge is left out.

## Typography

Pairing: [to be resolved during implementation]. A signage grotesk with open
apertures and clear figures; not a display face from impeccable's default list.
Station codes and counts use tabular figures.

### Named Rules

**The Bilingual Rule.** Where a label pairs two languages, the secondary sits
beneath at about 60% size, never side by side.

## Layout

Mobile first, one column of sign-width content (about 28 to 36rem) with bands
running full-bleed behind it. On wider screens the concourse gains columns but
the band stays the top edge of every panel. Spacing follows a fixed module;
[module value to be resolved during implementation].

## Elevation & Depth

Flat. Panels sit on the ground without shadow, like enamel on a wall; depth is
expressed by bands and borders, and only overlays (menus, dialogs) lift.

## Shapes

Rectangular sign panels with small corners (about 4px). Station-number badges
are rounded squares; nothing is pill-shaped except a status chip.

## Do's and Don'ts

### Do:
- **Do** mark every App with its line colour and station badge.
- **Do** keep one Information Blue action per view.
- **Do** give every access state (allowed, denied, pending, revoked) its own
  shape and label, never colour alone.
- **Do** make browse and edit one keypress apart: records open in place.

### Don't:
- **Don't** build a generic SaaS admin: grey sidebar, white cards, blue buttons.
- **Don't** add costume Japan: cherry blossoms, torii, rising suns, brush fonts
  as decoration.
- **Don't** trade speed for beauty: no motion or ornament that delays a task.
- **Don't** ship pure white or pure black grounds.
