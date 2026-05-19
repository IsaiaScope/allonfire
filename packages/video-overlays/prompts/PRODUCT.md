# PRODUCT — AllOnFire video overlays

## Register

`product` — design SERVES the underlying video content. Overlays are functional UI surfaced over footage, not standalone brand pages.

## What this is

A library of explanatory video overlay templates that render through Remotion. Each template is a single React composition that animates in over 5–12 seconds and either fills the frame or sits as a card on top of underlying footage.

Two delivery orientations:

- **Portrait 1080×1920** — YouTube Shorts, TikTok, Instagram Reels.
- **Landscape 1920×1080** — YouTube long-form, embedded explainers, lecture cuts.

## Who watches

- General viewers on phone screens (portrait) and laptop / TV screens (landscape).
- Mixed technical literacy: bright but distracted, 3–6 seconds to read each slot.
- Bilingual surface: Italian + English. Copy must work at both lengths (Italian ~20% longer than English).

## Voice and tone

- Confident, technical-but-warm, no corporate jargon.
- Direct sentences. No "leveraging", "unlock", "empower".
- Numbers and concrete claims beat adjectives.
- Headings are statements or questions, never single nouns.

## Strategic principles

1. **Fixed canvas, not responsive.** Each mockup targets one exact dimension (1080×1920 or 1920×1080). No fluid type, no media queries, no `clamp()`.
2. **Still-frame discipline.** Every mockup is the most information-dense moment of the overlay. Motion is added later in Remotion.
3. **Catppuccin Mocha only.** Palette tokens defined in `DESIGN.md`. No ad-hoc hex codes.
4. **One hero per frame.** Visual hierarchy is ruthless: hero → secondary rank → tertiary rank → meta footer.
5. **Multilingual elasticity.** Slots must absorb 20% Italian inflation without breaking layout.

## Anti-references

- Generic SaaS landing pages with hero-metric + 4 stat cards.
- Modern crypto / fintech "neon on black" or "navy + gold" reflexes.
- Corporate explainer templates with side-stripe accent borders and gradient text.
- TED-talk slide aesthetics (pure white, single sans-serif everywhere).
- Notion / Linear minimalism applied without conviction.

## Output contract

The skill produces a single self-contained `.html` file per invocation:

- `<html>` and `<body>` sized to the exact target dimensions, `overflow: hidden`, `margin: 0`.
- Inline `<style>`. No external CSS, no JS, no animations, no `:hover`/`:focus`/`:active`.
- Catppuccin Mocha tokens only (see DESIGN.md).
- Image / asset slots = placeholder `<div>` with `--surface0` background and dashed `--surface1` border, labeled with the slot name.
