# AllOnFire Overlay Design System

## Register

Product UI for AI-tool explainer overlays. Design serves comprehension and timing inside video.

## Scene

An Italian viewer watches an AI workflow explanation on a laptop at night or on a phone during a break. The overlay appears for a few seconds, so hierarchy must be immediate, compact, and readable over source video.

## Theme

- Base: dark mineral product UI, not pure black.
- Color strategy: restrained neutrals with AllOnFire orange as the primary accent, plus small semantic colors for success, warning, info, and working states.
- Accent: AllOnFire orange, close to `#FF6B00`, expressed as OKLCH in implementation.
- Typography: Roboto for labels and prose, Roboto Mono for terminal, code, ids, and timestamps.
- Shape: small radii, hard-working panels, visible dividers, no soft marketing cards.
- Motion: short stateful transitions only, 150-220ms ease-out. No decorative page choreography.

## Video Safety

- Every archetype must support 16:9 and 9:16.
- Each mockup must have standalone and over-video modes.
- Over-video mode must show safe-area boundaries and a dim source-video placeholder.
- Text must remain readable at 1920x1080 and 1080x1920.
- Layout must avoid the lower caption band unless the overlay is explicitly a lower-third.

## Component Vocabulary

- Panels: structured content regions, used when they carry distinct information.
- Rails: compact side or top metadata strips.
- Chips: short state labels only.
- Code blocks: mono typography with visible prompt/output distinction.
- Flow nodes: labeled process steps connected by simple rules, not decorative arrows.

## Bans

- No gradient text.
- No side-stripe accent borders.
- No nested cards.
- No pure black or pure white.
- No generic purple-blue AI palette.
- No visible instructional copy inside the overlay itself.
