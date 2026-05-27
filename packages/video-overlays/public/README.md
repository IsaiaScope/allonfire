# `public/` — reliable SVG injection library

Static asset folder for Hyperframes overlay compositions. Every SVG here is a stable, reusable graphic that templates can inject into a frame.

## Folder convention

```
public/
├── brand-marks/     ─ Vendor logos (OpenAI, Anthropic, Claude, ChatGPT, Codex, Claude Code)
├── mascots/         ─ Character art, organized per-character (clawd-pixel-*)
└── decorations/     ─ Generic motifs reused across templates: numerals, arrows,
                       backdrop patterns, geometric forms, frame ornaments
```

## How templates reference these

- **In a still HTML mockup** (`mockup-*.html`): SVGs are inlined verbatim so the file stays self-contained. The inline copy must be **visually identical** to a sibling SVG file in `public/`. If a decorative motif used in a mockup doesn't yet have a `public/decorations/*.svg` counterpart, add it.
- **In a Hyperframes composition**: copy the asset into the composition's local `assets/` folder or inline the SVG markup when it needs timeline animation.

## Naming

- Lowercase, kebab-case. No camelCase, no spaces.
- Brand marks named after the company/product: `anthropic.svg`, `chatgpt.svg`.
- Mascots: `<character>/<character>-<variant>.svg`, e.g. `claude-code/clawd-pixel-blink.svg`.
- Decorations: `<motif>-<variant>.svg`, e.g. `numeral-01.svg`, `arrow-chevron-right.svg`, `dot-grid-32.svg`.

## SVG authoring rules

- Use Catppuccin Mocha tokens via CSS custom properties on `<svg>` root, e.g. `stroke: var(--surface1)`. Never hardcode hex inside an SVG that's meant to live across multiple templates.
- For motifs that need to be tinted by the consumer, expose strokes/fills as `currentColor` and let the host element set color.
- Keep `viewBox` clean (`0 0 100 100` style preferred for motifs; intrinsic dimensions OK for brand marks).
- Strip Illustrator/Figma metadata. No `<title>` clutter, no `xmlns:xlink`, no `data-name`.
- No raster fallbacks. SVG-only.
