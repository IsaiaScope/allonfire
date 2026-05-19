# DESIGN — Catppuccin Mocha for video overlays

Overrides Impeccable's default responsive-web instincts. Loaded by `node load-context.mjs` alongside PRODUCT.md.

## 1. Canvas rules (NOT a responsive page)

- Output is **one fixed-canvas frame**, sized to the orientation specified in the prompt.
- `<html>` and `<body>` must be **exactly** the target dimensions (1080×1920 portrait OR 1920×1080 landscape), `margin: 0`, `padding: 0`, `overflow: hidden`. No scrollbars at any zoom level.
- **No `<meta name="viewport">`**. No mobile scaling shims.
- **No `clamp()`, no `min()`/`max()` in sizing, no `vw`/`vh` units, no `min-width` media queries.** Absolute `px` only.
- **No JS.** No CSS transitions, no `@keyframes`. Motion is added later in Remotion.
- Wrap content in one root `<div>` with **safe-area padding** of 60–80px on every edge (portrait 60px, landscape 72px default — overridden per prompt).
- The frame must look complete and balanced as a still image.

## 2. Color strategy

Register = `product`. Strategy = **Restrained** with one accent ≤ 10% of surface area (per-template accent token). Neutrals are tinted toward indigo/violet (Catppuccin's hue). Never pure black or pure white.

## 3. Catppuccin Mocha tokens

Hex for HTML mockups, OKLch alongside for later Remotion translation.

### Neutrals (surfaces and text)

| Token        | Hex       | OKLch                       |
| ------------ | --------- | --------------------------- |
| `--base`     | `#1e1e2e` | `oklch(0.231 0.024 282)`    |
| `--mantle`   | `#181825` | `oklch(0.198 0.022 282)`    |
| `--crust`    | `#11111b` | `oklch(0.157 0.018 282)`    |
| `--surface0` | `#313244` | `oklch(0.329 0.029 281)`    |
| `--surface1` | `#45475a` | `oklch(0.413 0.031 280)`    |
| `--surface2` | `#585b70` | `oklch(0.498 0.032 279)`    |
| `--overlay0` | `#6c7086` | `oklch(0.582 0.033 277)`    |
| `--overlay1` | `#7f849c` | `oklch(0.658 0.034 274)`    |
| `--overlay2` | `#9399b2` | `oklch(0.732 0.036 274)`    |
| `--subtext0` | `#a6adc8` | `oklch(0.792 0.034 274)`    |
| `--subtext1` | `#bac2de` | `oklch(0.853 0.034 274)`    |
| `--text`     | `#cdd6f4` | `oklch(0.902 0.034 274)`    |

### Accents (assign per template / per column)

| Token         | Hex       | OKLch                       | Role                                |
| ------------- | --------- | --------------------------- | ----------------------------------- |
| `--lavender`  | `#b4befe` | `oklch(0.822 0.078 281)`    | Neutral primary accent              |
| `--blue`      | `#89b4fa` | `oklch(0.776 0.108 256)`    | Information / links                 |
| `--sapphire`  | `#74c7ec` | `oklch(0.804 0.094 230)`    | Secondary info                      |
| `--sky`       | `#89dceb` | `oklch(0.866 0.072 213)`    | Tertiary info                       |
| `--teal`      | `#94e2d5` | `oklch(0.876 0.074 184)`    | Positive secondary                  |
| `--green`     | `#a6e3a1` | `oklch(0.876 0.111 145)`    | Win / success                       |
| `--yellow`    | `#f9e2af` | `oklch(0.921 0.092 92)`     | Caution / pending                   |
| `--peach`     | `#fab387` | `oklch(0.815 0.115 51)`     | Warm primary accent                 |
| `--maroon`    | `#eba0ac` | `oklch(0.794 0.082 17)`     | Soft warning                        |
| `--red`       | `#f38ba8` | `oklch(0.762 0.119 7)`      | Lose / failure                      |
| `--mauve`     | `#cba6f7` | `oklch(0.776 0.124 296)`    | Creative / generative               |
| `--pink`      | `#f5c2e7` | `oklch(0.857 0.082 321)`    | Highlight / decorative              |
| `--flamingo`  | `#f2cdcd` | `oklch(0.876 0.034 12)`     | Soft highlight                      |
| `--rosewater` | `#f5e0dc` | `oklch(0.913 0.026 17)`     | Soft highlight                      |

## 4. Default role assignments

- Frame background: `--base`, optional 135° gradient to `--mantle` for depth.
- Panel / card background: `--mantle`, optional 145° gradient `linear-gradient(145deg, --mantle, --base)`.
- Panel border: `1px solid --surface0`, or `2px solid --<accent>` when emphasized.
- Body text: `--text`. Muted / labels: `--subtext0`. Eyebrows / meta in mono: an accent token.
- Verdict tones: `--green` (win), `--red` (lose), `--overlay1` (neutral).
- **Never** use `#000000` or `#ffffff`. Tint with `--crust` or `--rosewater`.

## 5. Typography

- Display: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.
- Mono: `'JetBrains Mono', 'SFMono-Regular', Consolas, "Liberation Mono", monospace`.
- Weights: 400, 600, 700, 800, 900. No light weights.
- Letter spacing: `0` for display, `0.12em` uppercase for eyebrows/meta.

### Type scale (absolute px)

| Slot         | Portrait | Landscape |
| ------------ | -------- | --------- |
| Eyebrow      | 22       | 20        |
| Title        | 88       | 96        |
| Subtitle     | 36       | 32        |
| Body         | 28       | 24        |
| Meta / chip  | 22       | 20        |
| Footer hint  | 24       | 22        |

Line height: `1.0` on display, `1.3` on body. No fluid type.

## 6. Visual rules

- **Border radius**: panels 24px, chips 16px, pills 999px.
- **Borders**: 1px `--surface0` baseline, 2px accent for emphasis. No double borders.
- **Shadows**: panels can use `0 30px 90px rgba(0, 0, 0, 0.45)`. No inner shadows.
- **Gradients**: allowed on panel backgrounds (subtle, mantle→base) and on the frame background. Not allowed on text, not allowed on borders.
- **Dividers**: a 1px `--surface0` rule. No dotted, no dashed.
- **Icons / emoji**: avoid emoji. Use Unicode geometric symbols sparingly (▲ ▼ ✓ ✕ → ◆) tinted with the accent.

## 7. Component primitives

- **Card**: rounded 24px, `--mantle` background, `1px solid --surface0`, internal padding 32–48px, optional 2px accent edge (top in portrait, left in landscape).
- **Chip**: rounded 999px, `--surface0` background, accent text, 6px×14px padding, mono.
- **Pill / tag**: rounded 999px, `--mantle` background, `1px solid --<accent>`, accent text, 4px×12px padding, mono uppercase.
- **Verdict chip**: rounded 16px, accent background at 16% opacity, accent text at full opacity, 1px accent border, display weight 800.
- **Bullet marker**: solid `--<accent>` dot, 8px diameter, 16px left gap to text.
- **Hair rule**: 1px `--surface0` horizontal line, full content width.

## 8. Composition heuristics

- One clear hero per frame. Rank everything else beneath it visually (size, weight, contrast).
- Limit accent colors per frame to **three** plus the neutrals.
- Keep total text on screen under ~120 words.
- Generous interior padding (32–48px inside panels). Tight outer rhythm between related rows (12–20px).
- Perfect alignment to a 4px grid is mandatory.

## 9. Absolute bans (per Impeccable's shared design laws)

- No side-stripe gradient borders (>1px `border-left`/`border-right` as a decorative accent on a card).
- No glassmorphism (`backdrop-filter`, frosted overlays).
- No gradient text (`background-clip: text`).
- No hero-metric + stat-card SaaS cliché.
- No identical 3-column card grids unless the template IS explicitly a comparison.
- No modal-on-page constructs — the overlay IS the page.
- No `:hover`, `:focus`, `:active` states.
- No fluid type (`clamp`, `vw`, `vh` for sizing).
- No em dashes (`—` or `--`). Use commas, colons, semicolons, periods, or parentheses.
- No bouncy/elastic easing language in the mockup (motion lives in Remotion).
