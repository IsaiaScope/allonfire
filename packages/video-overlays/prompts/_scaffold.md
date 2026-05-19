# {Template name} — {orientation} ({W}×{H})

> Copy this file when starting a new template. Replace every `{placeholder}`.

## Context for Impeccable

Read `../../PRODUCT.md` and `../../DESIGN.md` in this folder tree before designing. They are not optional — they override Impeccable's default responsive-web instincts.

## Canvas

- Exact dimensions: **{W}px × {H}px**. Fixed canvas. No responsive behavior.
- Safe area: **{padding}px** inset from every edge.
- Output background: `--base` (`#1e1e2e`), optionally with a subtle 135° gradient toward `--mantle`.

## Intent

{One paragraph. What story does this overlay tell in one still frame? What is the viewer takeaway? What is the hero element?}

## Content slots

List every text or visual slot the template carries. Each becomes a prop in the Zod schema during translation. Provide example copy at realistic length.

- **{slot-name}** ({type}, {required/optional}) — {example copy}
- ...

## Layout brief

{2–3 sentences. Where does the hero sit? How are secondary slots ranked beneath it? Where does the footer / meta row go?}

## Palette assignment

- Surface: `--base`
- Panel: `--mantle`
- Primary accent: `--{token}`
- Per-item accents: {list}
- Verdict tones (if used): `--green` win / `--red` lose / `--overlay1` neutral

## Anti-patterns to avoid (template-specific)

Beyond the global anti-patterns in DESIGN.md:

- {extra rule 1}
- {extra rule 2}

## Output

- One self-contained `.html` file. Inline `<style>`. No external CSS, no external JS, no external assets.
- Image / icon slots = placeholder `<div>` with a subtle `--surface0` background and a dashed `--surface1` border, sized to the intended footprint. Label the placeholder with the slot name.
- File name: `mockup-{orientation}.html` (e.g. `mockup-portrait.html`).
