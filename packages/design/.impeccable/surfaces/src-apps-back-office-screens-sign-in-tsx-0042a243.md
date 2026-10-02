---
version: 1
slug: "src-apps-back-office-screens-sign-in-tsx-0042a243"
primary_target: "packages/design/src/apps/back-office/screens/sign-in.tsx"
related_targets: []
---

# Sign-in (Back office)

Scope: the Back office sign-in Screen, `packages/design/src/apps/back-office/screens/sign-in.tsx`, rendered by the App's `/sign-in` route. Visitor mode: Operate.

Audience and job: the owner and technical colleagues signing in with email and password before changing access across the AllOnFire Apps. Frequent, fast, often on a phone. Sign-up does not exist; only Admins enter; a wrong password is rate limited by the API (10 per 15 minutes).

Constraints: EN and IT copy of equal length budget; WCAG 2.2 AA; no generic SaaS admin look; nothing that slows the task. `app` is the App's name (Back office), `repository` is the repository name (AllOnFire); neither is a brand.

## Direction contract

THESIS: Signing in is arriving at a Tokyo station at night. The Back office is a station on its own line; the visitor reads the station sign, passes the gate, and the train arrives. It refuses the centred card on a blank page, and the first build's flat sign on an empty ground.

OWN-WORLD: Night only, whatever the OS theme: a real Tokyo night-rail photograph as the full-bleed backdrop under a night scrim; a JR-style enamel station-name sign (katakana バックオフィス large in a heavy Japanese gothic, the App name beneath, the green line band with the BO 01 badge, the operator's line name AllOnFire and a Transfer chip to Laura's orange LA line); an amber LED dot-matrix departure board in DotGothic16 with kana and a standing notice (never scrolling: WCAG 2.2.2; kana half from sm up); the yellow tactile paving strip as the platform edge; an automatic ticket gate (entry indicator, glowing IC reader, steel flaps; red only for the error ×) housing the form; the train dimmed below the lit sign; lucide icons in one stroke; Information Blue for the one action.

STORY: The visitor sees which station they are at, reads on the board that only Admins board here and sign-up is closed, enters email and password at the gate, and the train pulls in.

FIRST VIEWPORT: Mobile first. Departure board pinned at the top edge; the station sign hangs over the photograph above the rail; the tactile strip, then the ticket gate: its head (indicator, Sign in / 改札, IC reader), email and password fields with icons and one full-width blue Sign in button within thumb reach, flaps across its foot. On desktop the photograph fills the left with the board top-left and the sign hanging bottom-left over the tracks, because a station sign faces the trains, not the gate; the gate stands on the platform floor at the foot of the right column, level with the rail, behind a vertical tactile edge; its fields sit directly under its head.

FORM: Station wayfinding at night (JR, Tokyo Metro), position 1 on the ordered list, pinned by the user ("Tokyo night station", 2026-10-01) over the earlier pick; seed key cdb8aece.

Signature interaction: the sign's fluorescent tube flickers on at load; while submitting, the board flips to まもなく, the gate indicator turns amber and the platform rail pulses line green; on error the indicator shows a red cross; on signed-in an SVG E235-style train at night value slides in from the right, brakes, opens its green doors on lit interiors, the gate flaps retract, the board reads 到着 and the button reads Signed in. Reduced motion: instant states, no travel, no pulse.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Sign-in action wiring to the API's Better Auth client (frontend refactor); states are props until then.
- The Japan Design's "no costume Japan" rule is dropped by the user (2026-10-01); DESIGN.md is rewritten at finish.
