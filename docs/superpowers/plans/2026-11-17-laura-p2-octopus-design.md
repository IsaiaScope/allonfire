# Octopus / Sea Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Laura its own Design, ocean (octopus, sea; light and dark), with the Laura App's product context, stylesheet, logo colours, card-back art and floating-frame tokens, chosen by the owner through `/aof-design new` and checked by tests.

**Status:** implemented (uncommitted) @ 2026-11-18T16:54:29+0100

**Architecture:** A new `packages/design/src/designs/ocean/` folder holds the Design's source (DESIGN.md, `theme.css`, fonts) and the constants generated images read (image colours, image font, share-card look, email look, mark, card back). `packages/design/src/apps/laura/` holds Laura's `PRODUCT.md` and `styles.css`, which imports the Design; `pnpm design:sync` copies the Design into it. The Brand (the AOF monogram) is unchanged: Laura's logo stays the Brand plus a banner in the Design's colours. The Design supplies tokens to the shared frame and never a component (ADR 0022, ADR 0033).

**Tech Stack:** CSS (Tailwind 4 `@theme inline`, shadcn token names), TypeScript constants, Vitest (unit), tsx (`design:sync`), self-hosted OFL fonts (Nunito by default, copied as files: no npm dependency added), impeccable through `/aof-design`.

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 2)

## Global Constraints

- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`. A constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers (`objectKeys`, `parseJson`, ...).
- Constants are one nested object per owner (`API`, `AUTH`, `IMAGE`, ...). A path or an error code is never a string literal, tests included (a font's `new URL("./fonts/x", import.meta.url)` is the one literal a bundler needs, as in `designs/japan/image-fonts.ts`).
- A Tailwind class list is never a constant: `cva`, or inline in `cn`.
- A package never imports an App. Files go in `src/{environment,shared,features}` (the design package keeps its own `src/{apps,brand,designs}` layout, `package-layout.md`).
- `packages/shadcn` is written only by the shadcn CLI. Pages are built through `/aof-design`, never plain `/impeccable`. `packages/design` holds no components and no React (ADR 0022).
- Components shared by Apps live in `packages/ui`, named `AOF...`; what a Design changes in one is data (colours, face, edge) or CSS tokens, never a fork.
- Exports only through `packages/design/package.json` keys, one per file read outside the package; no barrel files.
- exFAT drive: macOS writes `._*` sidecars; a new tool that scans folders ignores `**/._*`.
- Every text-on-surface pair of the Design is WCAG AA in light and dark, and each new pair goes in its `theme.test.ts` (`design-system.md`, `aof-design`).
- Names: "Design" (never theme, skin, look or palette, for the concept), "Image" and "Gallery" (never photo or picture), "Favorite" (never heart or like), "Back Office", "Laura", "AllOnFire" (`CONTEXT.md`).
- Docs and plan prose are plain English, no emoji; permission and possibility are written can, is allowed to, might.
- Variants, never forks: a shared component serves every App and Design through a `variant` (set by the App's descriptor), a slot or a CSS token the Design supplies, each read with a fallback so a Design that declares none is unchanged. No component is copied per App or per Design (owner rule, 2026-11-18).
- No `git commit`/`git add` in this plan: the owner commits by hand.

## Review Focus

1. **A colour pair below AA in one scheme** (a Design that passes in light and fails in dark, or an input edge, Favorite colour or banner stop that vanishes): pinned by `ocean/tests/theme.test.ts` (Task 4) and `ocean/tests/logo.test.ts` (Task 6), run over both `:root` and `.dark`.
2. **A token a shared component reads is missing from the Design** (ui's toaster draws `bg-toast-*`, the sidebar reads `--sidebar-*`, a chart reads `--chart-*`; Laura would render them transparent): pinned by `designs/shared/tests/design-contract.test.ts` (Task 2), which runs over every folder under `src/designs`.
3. **Image colours drift from `theme.css`** (the `theme-color`, manifest, launch screens, share card and emails disagree with the page): pinned by `ocean/tests/image-colors.test.ts` (Task 6), which compares each constant to the token it copies.
4. **An image font Satori cannot read** (WOFF2 or a variable font passed to `ImageResponse` fails at render time, in Phase 3, far from the cause): pinned by `designs/shared/tests/image-fonts.test.ts` (Task 3), which checks the file signatures of both Designs' loaders.
5. **Card back or wave edge unreadable or unrenderable** (the ink card back vanishes on the dark ground at 1.11:1; an SVG filter or an external reference fails in Satori): pinned by `ocean/tests/card-back.test.ts` (Task 7) and `ocean/tests/share-card-look.test.ts` (Task 8).

---

## File structure

Created (all new):

- `packages/design/src/designs/shared/tests/theme-css.ts`: test helpers every Design's theme test shares (token reading, contrast, the common pairs, the contrast suite).
- `packages/design/src/designs/shared/tests/design-contract.test.ts`: what every Design under `src/designs` must declare.
- `packages/design/src/designs/shared/tests/image-fonts.test.ts`: both Designs' image-font loaders.
- `packages/design/src/designs/shared/image-font-file.ts`: the one reader of an image-font file (Japan's private `bytes`, moved) and the `ImageFont` type.
- `packages/design/src/designs/ocean/DESIGN.md`: the Design's source of truth in words (frontmatter tokens, sections as Japan's).
- `packages/design/src/designs/ocean/theme.css`: tokens in `:root` and `.dark`, `@theme inline`, `@font-face`, frame tokens.
- `packages/design/src/designs/ocean/fonts/`: `nunito-latin.woff2` (the page text), `fraunces-latin.woff2` (the page headings), `nunito-400.woff` and `nunito-700.woff` (generated images), `OFL-Nunito.txt`, `OFL-Fraunces.txt`, `README.md`.
- `packages/design/src/designs/ocean/image-colors.ts`, `image-font.ts`, `image-fonts.ts`, `share-card-look.ts`, `email-look.ts`: what generated images, `theme-color`, the manifest and emails read.
- `packages/design/src/designs/ocean/ocean-mark.ts`: the octopus pictogram as SVG markup.
- `packages/design/src/designs/ocean/card-back.ts`: the Memory game's card back as SVG and data URL.
- `packages/design/src/designs/ocean/tests/{theme,image-colors,logo,card-back,share-card-look,email-look}.test.ts`.
- `packages/design/src/apps/laura/PRODUCT.md`, `styles.css`, and `DESIGN.md` (generated by `design:sync`, never edited by hand).
- `packages/design/src/apps/tests/apps.test.ts`: every App folder is wired (export key, styles import, context file).
- `apps/api/src/features/mail/tests/email-look.test.ts`: Laura's emails wear the Design.

Modified:

- `packages/design/src/designs/japan/image-fonts.ts` (reads files through the shared reader), `japan/tests/theme.test.ts` (onto the shared helpers; same tests).
- `packages/design/package.json` (export keys).
- `apps/api/src/features/mail/constants/email.ts` (`EMAIL.LOOK[App.LAURA]` wears the Design).
- `packages/design/README.md`, `docs/guides/design-system.md`, `.claude/skills/aof-design/SKILL.md`, `CONTEXT.md`, `knip.jsonc`.
- Only if Phase 1 left them behind (Task 10 reconcile): `packages/ui/src/styles/base.css` and `packages/design/src/apps/back-office/styles.css` (two App-agnostic CSS rules move).

Not created here (deferred on purpose):

- `packages/design/src/designs/ocean/DESIGN.json` and `apps/laura/DESIGN.json`: impeccable's `document` scan writes the sidecar from a real page wearing the Design (`aof-design new`, step 6). Laura has no page until Phase 3, which runs it (Contract, item 9).
- The Laura App side of `new` step 1 (`package.json` dependency, `transpilePackages`, `globals.css`): Laura's workspace re-entry is Phase 3.
- `public/favicon.ico`, the `/logo` routes, icons and launch screens: Laura's routes are Phase 3; this plan produces the constants they read.

---

### Task 1: Owner decision, name and direction (STOP and ask)

**This task is a gate: the executor stops here and asks the owner before touching any file.** It is `aof-design`'s rule for a new Design: the owner picks a direction from previews with the structured question tool (`AskUserQuestion`), in the same turn, never by ending the turn to wait. Nothing is built before the answer. After the pick there is one build and one screenshot round (Task 11), no review loops, no critique subagents (`feedback_design_budget`).

**Files:** none changed. The answers go into the four lines below, then into Task 4's `theme.css`, Task 10's `DESIGN.md` and Task 12's skill section.
**Interfaces:** Produces the decision record (`NAME`, `DIRECTION`, `TYPE`, `SHAPE`) that Tasks 3 to 12 read. Everything below writes `ocean`/`Ocean`/`OCEAN` (the owner chose the name before the gate; the other plans and the spec were renamed the same way).

- [x] Step 1: Reconcile. Re-read `packages/design/src/designs/japan/theme.css` and `docs/guides/design-system.md` (the Design must define every token a shared component reads); check `ls packages/design/src/designs` shows only `japan` (a `ocean` folder from an earlier run means resume, not restart).
- [x] Step 2: The name is decided: the owner chose **ocean** on 2026-11-18 (folder `ocean`, constants `OCEAN_`, files `ocean-*`; the pictogram stays an octopus). Ask the owner in ONE `AskUserQuestion` call with three questions, each with previews (markdown; recommendation first):
  1. **Direction** (header "Direction"), each option's preview a swatch table with the checked contrast numbers (all pairs below already pass AA; ratios computed with the same WCAG formula as `theme.test.ts`):
     - **A. Tide pool (recommended)**: cool sea-glass ground, deep teal primary, coral for the Favorite mark. Light: ground `#f2f8f8`, text `#0f2a30` (14.0:1), card `#ffffff`, primary `#0b6b7c` (white on it 6.2:1; on ground 5.7:1), muted text `#4a6168` (6.1:1), coral `#c93d3a` (5.0:1 on card). Dark: ground `#0c1b21`, text `#e8f2f3` (15.4:1), card `#142a32`, primary `#4fc3d4` (8.5:1), muted `#9db8be` (8.4:1), coral `#ff7a72` (5.9:1).
     - **B. Dusk octopus**: warm shell ground, octopus violet primary, rose coral. Light: ground `#faf5f2`, text `#2a1d33` (14.7:1), primary `#6a3d9a` (white 7.6:1), muted `#6a5870` (6.0:1), coral `#c4375a` (5.2:1). Dark: ground `#17121f`, text `#f1ebf5` (15.7:1), card `#221a2e`, primary `#c4a0ee` (8.4:1), muted `#b3a5bf` (7.9:1), coral `#ff7d9a` (6.9:1).
     - **C. Mediterranean**: sand ground, azure primary, terracotta. Light: ground `#faf6ee`, text `#14233a` (14.6:1), primary `#0a58ab` (white 7.0:1), muted `#58657a` (5.5:1), terracotta `#b8452a` (5.4:1). Dark: ground `#0e1a2b`, text `#eaf0f8` (15.3:1), card `#172538`, primary `#6eb2f2` (7.8:1), muted `#a2b2c8` (8.1:1), terracotta `#f08a6a` (6.3:1).
  2. **Type** (header "Typeface"), preview a sample line in words: `Nunito` alone (recommended: rounded, warm, one family, OFL, Latin covers English and Italian), `Fraunces` for headings with `Nunito` for text (softer, more romantic, a second face to ship; sets `--font-heading`), `Atkinson Hyperlegible Next` (Japan's face reused: no new files, no distinct voice).
  3. **Shape** (header "Corners and frame"): soft (`--radius` 0.75rem, floating frame corners 1.35rem, recommended for a photo app), tidy (`--radius` 0.5rem, frame corners 0.9rem). The floating sidebar's gap is 0.5rem in both (shadcn's own `p-2`).
- [x] Step 3: Record the answers here, in the plan file, then continue:
  - NAME: `ocean` (owner, 2026-11-18)   DIRECTION: `A. Tide pool`   TYPE: `Fraunces + Nunito` (Fraunces headings via `--font-heading`, Nunito text)   SHAPE: `soft` (`--radius` 0.75rem, `--frame-radius` var(--radius-2xl))   (chosen in the browser from a specimen, 2026-11-18)
- [x] Step 4: Constraint on the owner's answers: B and C are given as anchors only; Task 4 derives every other token from them with the recipe in Task 4, and its test is the judge. A typeface other than the three listed, or a direction with no anchors, is a new gate round (ask again), never a guess. Never add a Brand change: the Brand and its logo stay as `CONTEXT.md` defines them (see Contract, item 2).

---

### Task 2: Shared Design test helpers and the Design contract

**Files:**
- Create: `packages/design/src/designs/shared/tests/theme-css.ts`
- Create: `packages/design/src/designs/shared/tests/design-contract.test.ts`
- Modify: `packages/design/src/designs/japan/tests/theme.test.ts` (onto the helpers; behaviour unchanged)

**Interfaces:**
- Consumes: Japan's current `theme.test.ts` helpers (`block`, `tokens`, `luminance`, `contrast`, `TEXT_PAIRS`).
- Produces (all exported from `theme-css.ts`; test-only, tagged `@internal` where knip asks):
  - `AA = 4.5`, `GRAPHIC = 3`, `HEX: RegExp`
  - `designNames(): string[]`: the folders of `src/designs` that hold a `theme.css`
  - `readTheme(design: string): string`
  - `declarations(css: string, selector: ":root" | ".dark" | "@theme inline"): Map<string, string>`: every `--name: value`
  - `hexTokens(css: string, selector: ":root" | ".dark"): Map<string, string>`: only `#rrggbb` values
  - `contrast(a: string, b: string): number`
  - `COMMON_TEXT_PAIRS: readonly (readonly [text: string, surface: string])[]`: Japan's pairs that name no Japan furniture (foreground/background, muted, card, primary, destructive, sidebar, popover, toast and notice pairs)
  - `describeContrast(label: string, css: string, pairs: typeof COMMON_TEXT_PAIRS, graphics?: typeof COMMON_TEXT_PAIRS): void`: registers, for `:root` and `.dark`, one `it` per pair (AA), per graphic pair (3:1), per chart token (3:1 on card) and "draws the first series in the primary"

- [x] Step 1: Record the baseline: `pnpm --filter @allonfire/design exec vitest run src/designs/japan/tests/theme.test.ts` and note the test count (Japan's, before the refactor).
- [x] Step 2: Write `design-contract.test.ts` (first line `// @module-tag unit`) as `describe.each(designNames())("%s Design", ...)` with these tests:

```ts
const REQUIRED = [
  "background", "foreground", "card", "card-foreground", "popover",
  "popover-foreground", "primary", "primary-foreground", "secondary",
  "secondary-foreground", "muted", "muted-foreground", "accent",
  "accent-foreground", "destructive", "border", "input", "ring",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "sidebar",
  "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border",
  "sidebar-ring", "success", "warning", "info", "toast-foreground",
  "toast-success", "toast-warning", "toast-info", "toast-error",
] as const;
const MAPPED = ["success", "warning", "info", "toast-foreground", "toast-success",
  "toast-warning", "toast-info", "toast-error"] as const; // `--color-<name>` in @theme inline

it("declares every colour a shared component reads, in the light scheme", () => {
  for (const name of REQUIRED) expect(hexTokens(css, ":root").get(name)).toMatch(HEX);
});
it("declares the face and the corner", () => { /* --font-sans, --radius in :root */ });
it("maps the notice and toast colours for Tailwind", () => { /* --color-<name> in @theme inline = var(--<name>) */ });
it("declares a .dark scheme", () => { expect(css).toContain(".dark {"); });
it("ships every font its @font-face names", () => { /* each url("./fonts/x") exists on disk */ });
it("has a DESIGN.md that names the Design in its frontmatter", () => { /* /^name: .+$/m */ });
```

- [x] Step 3: Run `pnpm --filter @allonfire/design exec vitest run src/designs/shared`. Expected: FAIL (helper missing), then after Step 4 only Japan runs and passes.
- [x] Step 4: Implement `theme-css.ts` by lifting Japan's helpers verbatim (the regex block reader, `luminance`, `contrast`, the pair list minus LED and line pairs) and adding `declarations`, `designNames`, `readTheme`, `describeContrast`. Reading uses `readFileSync`/`readdirSync` with `new URL`/`import.meta.dirname`; the `._*` sidecars are skipped.
- [x] Step 5: Rewrite `japan/tests/theme.test.ts` as `describeContrast("Japan", readTheme("japan"), [...COMMON_TEXT_PAIRS, ["led","led-panel"], ["led-panel","line-green"], ["line-green-deep-foreground","line-green-deep"]])`. Run it: the test count must equal Step 1's (reconcile: if a Japan pair is not common, it stays in Japan's own list; no pair is dropped).
- [x] Step 6: Run `pnpm --filter @allonfire/design test` and `pnpm --filter @allonfire/design check-types`. Expected: PASS (Japan passes the contract; ocean does not exist yet).

**Built as:** `shared/tests/theme-css.ts` (helpers lifted from Japan, plus `declarations`, `designNames`, `readTheme`, `describeContrast`) and `design-contract.test.ts`; Japan's theme test is 64 tests before and after, the contract adds 7 for Japan; `check-types` green.

---

### Task 3: Fonts and the image-font loader

**Files:**
- Create: `packages/design/src/designs/shared/image-font-file.ts`, `packages/design/src/designs/shared/tests/image-fonts.test.ts`
- Modify: `packages/design/src/designs/japan/image-fonts.ts`
- Create: `packages/design/src/designs/ocean/fonts/{nunito-latin.woff2, fraunces-latin.woff2, nunito-400.woff, nunito-700.woff, OFL-Nunito.txt, OFL-Fraunces.txt, README.md}`, `ocean/image-font.ts`, `ocean/image-fonts.ts`

**Interfaces:**
- Produces: `type ImageFont = { data: ArrayBuffer; name: string; style: "normal"; weight: 400 | 700 }`, `readImageFontFile(url: URL): Promise<ArrayBuffer>` (shared file); `OCEAN_IMAGE_FONT.FAMILY = "Nunito"` (`@allonfire/design/designs/ocean/image-font`, browser-safe); `loadOceanImageFonts(): Promise<ImageFont[]>` (`.../image-fonts`, server only).
- Consumes: Japan's `bytes` helper (moves out of its file).
- Task 1 chose **Fraunces + Nunito**: Fraunces is the page's heading face (`--font-heading`, one variable `fraunces-latin.woff2`, `font-weight: 100 900`), Nunito the text face. The generated images (share card, banner, launch screens) keep **Nunito** as `OCEAN_IMAGE_FONT.FAMILY`, static WOFF 400 and 700: Satori reads no variable font, and one image family keeps the loader at two weights. If the owner wants Fraunces in the images too, that is a later one-line change of this loader to two static Fraunces files (flagged in the Step 6 summary of this run).

- [x] Step 1: Write `image-fonts.test.ts` (unit): for `[loadJapanImageFonts, loadOceanImageFonts]` assert two faces, weights `[400, 700]`, `name` equal to the Design's `*_IMAGE_FONT.FAMILY`, `data.byteLength > 0`, and the first four bytes are not WOFF2's (`wOF2`) and the font is static: a TrueType (`0x00010000`, `true`), OpenType (`OTTO`) or WOFF (`wOFF`) signature (Satori reads those, never WOFF2 or a variable font).
- [x] Step 2: Run `pnpm --filter @allonfire/design exec vitest run src/designs/shared/tests/image-fonts.test.ts`. Expected: FAIL (no ocean loader).
- [x] Step 3: Fetch the fonts (downloaded files are untrusted data: into `ocean/fonts/` directly, check the signature bytes with `xxd -l 4`, never execute): `curl -sL -o fraunces-latin.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/fraunces:vf@latest/latin-wght-normal.woff2"` (check the URL answers a `wOF2` file; if the variable file is named differently, list the package with `curl -sL https://data.jsdelivr.com/v1/package/npm/@fontsource-variable/fraunces`), `curl -sL -o nunito-latin.woff2 "https://cdn.jsdelivr.net/fontsource/fonts/nunito:vf@latest/latin-wght-normal.woff2"`, `curl -sL -o nunito-400.woff "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-400-normal.woff"`, the same for `700`, and `curl -sL -o OFL-Nunito.txt "https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/OFL.txt"` (all five answered 200 when this plan was written). Write `fonts/README.md` in Japan's table format (file, face, use) with one line on why the generated-image faces are static WOFF (Satori reads neither WOFF2 nor variable fonts) and that Latin covers English and Italian.
- [x] Step 4: Create `shared/image-font-file.ts` (move Japan's `bytes` and `ImageFont`, renamed as above), point `japan/image-fonts.ts` at it, then write `ocean/image-font.ts` and `ocean/image-fonts.ts` exactly as Japan's two files with the ocean names and the two `.woff` literals (each `new URL(...)` written out so the bundler traces the file).
- [x] Step 5: Run `pnpm --filter @allonfire/design test`. Expected: PASS. Reconcile note for Phase 3: if its first `ImageResponse` rejects a `.woff`, convert with `fonttools` (`TTFont(path).flavor = None; save`) and rename; the test above keeps passing.

**Built as:** `shared/image-font-file.ts` (Japan's `bytes` moved, `ImageFont` exported), both loaders on it; `ocean/fonts/` holds the four files (signatures checked: `wOF2` twice, `wOFF` twice), both OFL texts from Fontsource's packages and a README; 90 design tests green, `check-types` green.

---

### Task 4: `theme.css` tokens and the Design's own contrast test

**Files:**
- Create: `packages/design/src/designs/ocean/theme.css`, `packages/design/src/designs/ocean/tests/theme.test.ts`

**Interfaces:**
- Consumes: Task 2's helpers; Task 3's font files (`@font-face` names the files).
- Produces tokens (all in `:root`, re-declared in `.dark` where the value differs): shadcn's set (`--background` ... `--ring`, `--radius`, `--sidebar-*`, `--chart-1..5`), the notices (`--success`, `--warning`, `--info`), the toast fills (`--toast-foreground`, `--toast-success`, `--toast-warning`, `--toast-info`, `--toast-error`), `--font-sans` (and `--font-heading` for a two-face type choice), plus the Design's own: `--coral` (the Favorite mark, the share-card band, an accent: never text on the ground, never a state), `--ink` and `--ink-foreground` (the one dark furniture colour, the same in both schemes: the card back, like Japan's furniture). `@theme inline` maps `--color-coral`, `--color-ink`, `--color-ink-foreground` and the eight notice/toast names (`--color-success` ... `--color-toast-error`, each `var(--<name>)`).

- [x] Step 1: Write `ocean/tests/theme.test.ts`:

```ts
// @module-tag unit
describeContrast("Ocean", readTheme("ocean"), [
  ...COMMON_TEXT_PAIRS,
  ["foreground", "sidebar"], ["sidebar-foreground", "sidebar"],
  ["sidebar-accent-foreground", "sidebar-accent"],
  ["sidebar-primary-foreground", "sidebar-primary"], ["primary", "sidebar"],
  ["secondary-foreground", "secondary"], ["accent-foreground", "accent"],
  ["ink-foreground", "ink"],
], [
  // WCAG 1.4.11: a mark, a ring, a field's edge against what it sits on.
  ["coral", "card"], ["coral", "background"], ["ring", "background"],
  ["input", "card"],
]);
```

plus `it("keeps the ink the same in both schemes")` (`:root` and `.dark` give no `--ink`, or the same), and `it("is soft or tidy as the owner chose")` asserting `--radius` equals the Task 1 SHAPE value. The graphic list uses `GRAPHIC` (3:1), the text list `AA`.
- [x] Step 2: Run `pnpm --filter @allonfire/design exec vitest run src/designs/ocean/tests/theme.test.ts src/designs/shared`. Expected: FAIL (no `theme.css`; the contract now fails for `ocean`).
- [x] Step 3: Write `theme.css` as Japan's is laid out (header comment, `@font-face` for the page face, `:root`, `.dark`, `::selection` and caret in the primary, `@theme inline`), from Task 1's DIRECTION. Direction A in full (the default; each pair verified at 4.5:1 or better, input edges at 3:1 or better on a card):
  - Light: `--background #f2f8f8`, `--foreground #0f2a30`, `--card/--popover #ffffff` (+ `-foreground #0f2a30`), `--primary #0b6b7c` (`-foreground #ffffff`), `--secondary/--muted/--accent #e1eded` (`-foreground #0f2a30`; `--muted-foreground #4a6168`), `--destructive #b3261e`, `--border #cfdfe0`, `--input #78939a`, `--ring #0b6b7c`, `--sidebar #e8f1f1`, `--sidebar-accent #d9e8e8`, `--sidebar-border #cfdfe0`, `--sidebar-primary/-ring #0b6b7c`, `--success #1f7a4d`, `--warning #8f5200`, `--info #0b6b7c`, `--toast-foreground #ffffff` on `--toast-success #1b5e3b`, `--toast-warning #7a4600`, `--toast-info #0a5a69`, `--toast-error #a3231c`, charts `#0b6b7c #1f7a4d #8f5200 #4a6168 #0f2a30`, `--coral #c93d3a`, `--ink #0a2530`, `--ink-foreground #e8f2f3`.
  - Dark: `--background #0c1b21`, `--foreground #e8f2f3`, `--card/--popover/--sidebar #142a32`, `--primary #4fc3d4` (`-foreground #0c1b21`), `--secondary/--muted/--accent/--sidebar-accent #1f3a44`, `--muted-foreground #9db8be`, `--destructive #f0736d`, `--border/--sidebar-border #2b4650`, `--input #5d818c`, `--ring/--sidebar-primary/--sidebar-ring #4fc3d4`, `--success #46c487`, `--warning #f0a23a`, `--info #4fc3d4`, charts `#4fc3d4 #46c487 #f0a23a #9db8be #e8f2f3`, `--coral #ff7a72`.
  - Recipe for B and C (anchors from Task 1): ground, text, card, primary, muted and coral come from the anchors; border and input step from the ground (input at 3:1 on card), secondary/muted/accent one step off the ground, the notice colours keep their hue and only move in lightness until each reaches 4.5:1 on the popover, the toast fills keep the values above (white on them is 7.5:1 or more in any direction). Run the test after each block; it is the judge.
  - Type: `--font-sans: "Nunito", ui-sans-serif, system-ui, sans-serif` and one `@font-face` for `nunito-latin.woff2` (`font-weight: 200 1000`, `font-display: swap`); the owner chose two faces: add `--font-heading: "Fraunces", ui-serif, Georgia, serif` and one `@font-face` for `fraunces-latin.woff2` (`font-weight: 100 900`, `font-display: swap`), and map `--font-heading` for Tailwind in `@theme inline` as Japan maps its faces.
- [x] Step 4: Run Step 2's command. Expected: PASS (Ocean's pairs, the contract, Japan's tests).

**Built as (2026-11-18):** `ocean/theme.css` and `ocean/tests/theme.test.ts` as above, with the tests also asserting the two faces (`--font-heading` mapped as `var(--font-heading)`). The contract also needs `ocean/DESIGN.md` with `name:` frontmatter, so Task 4 wrote a minimal one; Task 10 expands it. 181 design tests green first run.

---

### Task 5: Floating frame tokens

The floating sidebar (shadcn `sidebar-04`, `variant="floating"`) hard-codes `p-2`, `rounded-lg`, `shadow-sm` and a ring; ADR 0033 has the Design supply these as tokens and the shared frame read them. The App (not the Design) sets `variant` and `collapsible` (`LAURA`, Phase 3): the spec's "the Design picks `variant`" is overruled by ADR 0033's "the App sets" (Contract, item 6).

**Reconciled with Phase 1 (2026-11-18):** Phase 1 prescribed no frame token names, and its `AOFSidebar` reads none: shadcn's floating variant still hard-codes `p-2`, `rounded-lg`, `shadow-sm` and the ring, and Phase 1 left "the visual pass of `variant="floating"`" to Phase 3. The owner decided the reads belong here (the variants rule: one component, an App picks the `variant`, a Design supplies tokens, never a fork), so this task has two halves: the Design's tokens (Steps 1 to 4) and the shared frame reading them with fallbacks (Steps 5 to 8). `packages/shadcn` stays untouched (written by the shadcn CLI only); the reads are classes on `AOFSidebar` and `AOFSidebarProvider`, reaching shadcn's inner parts with the child selector `AOFSidebar` already uses (`*:data-[sidebar=sidebar]:`).

**Files:**
- Modify: `packages/design/src/designs/ocean/theme.css`, `packages/design/src/designs/ocean/tests/theme.test.ts`
- Modify: `packages/ui/src/features/navigation/components/aof-sidebar.tsx`, `packages/ui/src/features/navigation/tests/aof-sidebar.browser.test.tsx`

**Interfaces:**
- Produces: `--frame-gap` (plain length, never `env()`: the frame adds the safe-area insets itself, `design-system.md`), `--frame-radius`, `--frame-shadow`. Names fixed here (Phase 1 prescribed none). Each is optional for a Design: the frame reads it with a fallback to shadcn's own value, so Japan, which declares none, is unchanged, and `design-contract.test.ts` does not list them in `REQUIRED`.
- Reads: `AOFSidebar` (floating variant only) and `AOFSidebarProvider` (the collapsed gap's width).

- [x] Step 1: Add to `theme.test.ts`:

```ts
describe("Ocean frame tokens", () => {
  const light = declarations(css, ":root");
  const dark = declarations(css, ".dark");
  it("gives the floating frame a gap as a plain length", () => {
    expect(light.get("frame-gap")).toMatch(/^\d+(\.\d+)?(rem|px)$/);
  });
  it("rounds the frame from the Design's radius scale", () => {
    expect(light.get("frame-radius")).toMatch(/^var\(--radius-(xl|2xl|3xl)\)$/);
  });
  it("casts a shadow in both schemes, deeper at night", () => {
    expect(light.get("frame-shadow")).toContain("rgb(");
    expect(dark.get("frame-shadow")).toContain("rgb(");
    expect(dark.get("frame-shadow")).not.toBe(light.get("frame-shadow"));
  });
});
```

(The scale steps `--radius-xl`, `--radius-2xl`, `--radius-3xl` are shadcn's `@theme` values, multiples of `--radius`; the step is the one Task 1's SHAPE answer names.)
- [x] Step 2: Run the ocean test file. Expected: FAIL.
- [x] Step 3: Add to `theme.css`: `--frame-gap: 0.5rem; --frame-radius: var(--radius-2xl);` (tidy: `var(--radius-xl)` with `--radius` 0.5rem) and a per-scheme `--frame-shadow` (light `0 10px 30px -12px rgb(10 37 48 / 0.28), 0 2px 8px rgb(10 37 48 / 0.08)`, dark `0 12px 32px -12px rgb(0 0 0 / 0.6), 0 2px 8px rgb(0 0 0 / 0.35)`). A named rule goes in Task 10's DESIGN.md: only the floating frame and floating controls cast a shadow.
- [x] Step 4: Run the ocean test file. Expected: PASS.
- [x] Step 5: Add to `aof-sidebar.browser.test.tsx` (same file, its helpers `computedValue` and `afterTransitions`), a `describe("a floating sidebar reads the Design's frame tokens")` of four tests, each rendering `AOFSidebarProvider` > `AOFSidebar variant="floating"` with `style` custom properties set on the provider:
  1. with `--frame-gap: 1rem`, the container (`data-slot="sidebar-container"`) pads `16px`; with no token it pads `8px` (shadcn's `p-2`).
  2. with `--frame-radius: 20px`, the inner part (`data-sidebar="sidebar"`) has `border-radius: 20px`; with no token it has the radius `rounded-lg` gives.
  3. with `--frame-shadow: 0 0 0 4px rgb(1 2 3)`, the inner part's `box-shadow` contains `rgb(1, 2, 3)`; with no token it keeps `shadow-sm`'s.
  4. collapsed to icons (`collapsible="icon"`, `data-state="collapsed"`), the gap element (`data-slot="sidebar-gap"`) is the rail plus twice the gap wide (`--sidebar-width-icon` + 2 x `--frame-gap`), so the page does not slide under or away from a frame with another gap.
  Plus one test that `variant="sidebar"` (the Back Office's) ignores the three tokens: set them, and its container padding, inner radius and shadow are unchanged.
- [x] Step 6: Run `pnpm --filter @allonfire/ui test:browser` for that file. Expected: the five tests FAIL (red for the right reason: the tokens are not read).
- [x] Step 7: In `AOFSidebar`, add to the container's `cn(...)` inline (a class list is never a constant): the floating padding `group-data-[variant=floating]:p-(--frame-gap,0.5rem)`, the icon-mode container width as the rail plus twice the gap plus shadcn's 2px (`group-data-[variant=floating]:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+2*var(--frame-gap,0.5rem)+2px)]`), and for the inner part `group-data-[variant=floating]:*:data-[sidebar=sidebar]:rounded-(--frame-radius,var(--radius-lg))` and its shadow from `--frame-shadow` falling back to shadcn's `shadow-sm` value (Tailwind's `shadow-[...]` reads a `var()` as a colour: if it does, set `box-shadow` through an arbitrary property, `[box-shadow:var(--frame-shadow,var(--shadow-sm))]`, and keep the test as the judge). In `AOFSidebarProvider`'s `cn(...)`, the collapsed gap element's width: `**:data-[slot=sidebar-gap]:group-data-[variant=floating]:group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+2*var(--frame-gap,0.5rem))]`. Reconcile the exact variant order against Tailwind's output through the tests; shadcn's package is not edited. Run Step 6's command again. Expected: PASS.
- [x] Step 8: Run the Back Office browser tests that mount its frame (`pnpm --filter @allonfire/back-office test:browser`, `app-frame` and `frame` files) and `pnpm --filter @allonfire/ui test`. Expected: PASS, no Back Office behaviour change (it uses `variant="sidebar"`).


**Built as (2026-11-18):** tokens in `ocean/theme.css` (3 tests), five browser tests in `aof-sidebar.browser.test.tsx` (the Design declares the tokens on `:root`, as a real one does; the rail is the known 54px). The shadow goes through `--tw-shadow` (not `box-shadow`), so shadcn's `ring-1` composed beside it stays. The collapsed gap rule sits on `AOFSidebarProvider` as `**:data-[slot=sidebar-gap]:group-data-[variant=floating]:group-data-[collapsible=icon]:w-[...]`; it worked first time, no reorder. Green: ui 328 unit, ui sidebar browser (chromium and webkit), Back Office 314 unit and 637 browser, `check-types`.
---

### Task 6: Image colours, the Laura banner and the logo

The Brand stays the AOF monogram on its dark ground; Laura's logo is the Brand plus a banner in the Design's colours carrying "Laura" (`CONTEXT.md`: Brand). Nothing in `brand/` changes: `aofLogoSvg`, `AOF_LOGO`, `BRAND` and `AppLogo` already take an App's name, banner and face. This task gives Phase 3's `LAURA.LOGO` its colours and face.

**Files:**
- Create: `packages/design/src/designs/ocean/image-colors.ts`, `packages/design/src/designs/ocean/tests/image-colors.test.ts`, `packages/design/src/designs/ocean/tests/logo.test.ts`

**Interfaces:**
- Produces: `OCEAN_IMAGE_COLOR` (`@allonfire/design/designs/ocean/image-colors`), shaped like Japan's so the shared pieces take either: `light` and `dark`, each `{ background, card, coral, foreground, mutedForeground, primary }` (hex strings; `background`, `foreground`, `mutedForeground`, `primary` are the four Japan has: `AOFBaseViewport({ schemeColors })` reads `background`), and `BANNER: readonly [string, string, string]` (the logo banner, left to right), `INK: string`. Satisfies `Record<ColorScheme, ...> & Record<string, unknown>` as Japan's does.
- Consumes: `AppLogo` (`@allonfire/design/brand/aof-logo`), `aofLogoSvg`, `AOF_LOGO`.

- [x] Step 1: Write `image-colors.test.ts` as Japan's is (read `theme.css`; `it.each` over `background`, `foreground`, `muted-foreground`, `primary`, `card`, `coral`: `[light, dark]` equals the token's two values in `:root` then `.dark`; `INK` equals `--ink`). Write `logo.test.ts`:

```ts
const APP = { banner: OCEAN_IMAGE_COLOR.BANNER, fontFamily: OCEAN_IMAGE_FONT.FAMILY, name: "Laura" } as const satisfies AppLogo;
it.each(layouts)("draws the %s logo in the Design's banner for every scheme", ...) // name, three stops, face present
it.each(OCEAN_IMAGE_COLOR.BANNER)("the banner stop %s carries white text at AA", (stop) => {
  expect(contrast("#ffffff", stop)).toBeGreaterThanOrEqual(AA);
});
it("steps the banner from deeper to lighter", ...) // luminance increases left to right
```

- [x] Step 2: Run both. Expected: FAIL (no module).
- [x] Step 3: Implement `image-colors.ts`: Direction A values copied from `theme.css`, `BANNER: ["#08505e", "#0b6b7c", "#0f7a8b"]` (white on each: 9.0, 6.2, 5.0:1; a banner stop never exceeds what white text can carry, so it is not the dark primary, unlike Back Office's), `INK: "#0a2530"`. B and C: stops from the owner's primary, deepened until white reaches 4.5:1.
- [x] Step 4: Run the two files and `pnpm --filter @allonfire/design check-types`. Expected: PASS.


**Built as (2026-11-18):** `ocean/image-colors.ts`, `tests/image-colors.test.ts`, `tests/logo.test.ts` as above (white on the three stops is checked by the test; the stop order by white's falling contrast). The `@allonfire/design/designs/ocean/image-colors` export key arrives with Task 10.
---

### Task 7: The mark and the Memory game's card back

**Files:**
- Create: `packages/design/src/designs/ocean/ocean-mark.ts`, `packages/design/src/designs/ocean/card-back.ts`, `packages/design/src/designs/ocean/tests/card-back.test.ts`

**Interfaces:**
- Produces: `oceanMarkMarkup(colors: { body: string; eye: string }): string` and `oceanMarkSvg(colors): string` (`@allonfire/design/designs/ocean/ocean-mark`; viewBox `0 0 64 64`); `OCEAN_CARD_BACK = { WIDTH: 300, HEIGHT: 400, SVG: string, DATA_URL: string }` (`@allonfire/design/designs/ocean/card-back`), one back for both schemes (the ink, like furniture), 3:4 so Phase 6's board lays it in a grid.
- Consumes: `OCEAN_IMAGE_COLOR`, core's `svgDataUrl`.

- [x] Step 1: Write `card-back.test.ts`:

```ts
it("is a 300 by 400 SVG with a viewBox of that size", ...)
it("sits on the ink in both schemes", () => expect(OCEAN_CARD_BACK.SVG).toContain(OCEAN_IMAGE_COLOR.INK));
it("draws the octopus in the dark scheme's coral, which reads on the ink", () => {
  expect(OCEAN_CARD_BACK.SVG).toContain(OCEAN_IMAGE_COLOR.dark.coral);
  expect(contrast(OCEAN_IMAGE_COLOR.dark.coral, OCEAN_IMAGE_COLOR.INK)).toBeGreaterThanOrEqual(GRAPHIC);
});
// The ink is 1.11:1 on the dark ground: an edge keeps the back visible there.
it("edges the card in the dark primary, 3:1 against the dark ground", () => {
  expect(OCEAN_CARD_BACK.SVG).toContain(`stroke="${OCEAN_IMAGE_COLOR.dark.primary}"`);
  expect(contrast(OCEAN_IMAGE_COLOR.dark.primary, OCEAN_IMAGE_COLOR.dark.background)).toBeGreaterThanOrEqual(GRAPHIC);
});
it("is renderable by Satori and a data URL", () => { // no <filter>, no external href, DATA_URL starts with data:image/svg+xml
```

and in a `ocean-mark` test block: the markup contains both colours, the SVG has `viewBox="0 0 64 64"`.
- [x] Step 2: Run `pnpm --filter @allonfire/design exec vitest run src/designs/ocean/tests/card-back.test.ts`. Expected: FAIL.
- [x] Step 3: Implement. Restraint is the owner's taste (`aof-design`: no heavy decoration, no filters, no large illustrations): the mark is five shapes in a 64 square, starting from this markup (adjust at the screenshot round, Task 11, only by hand-tuning curves): a head dome `<path d="M32 6c-11 0-19 8-19 18 0 6 3 10 6 13h26c3-3 6-7 6-13 0-10-8-18-19-18z"/>`, five tentacle strokes `<path d="M18 37c-4 6-4 12-10 15M25 37c-2 7-1 13-5 19M32 37v19M39 37c2 7 1 13 5 19M46 37c4 6 4 12 10 15" fill="none" stroke-width="4" stroke-linecap="round"/>` in `body`, two `<circle r="2.6">` eyes in `eye`. The card back is the 300x400 ink rounded rectangle, a 3px inset edge in the dark primary, two faint wave rows (`Q` curves in the dark primary at 0.35 opacity), and the mark centred at 96px in the dark coral with the ink as its eye colour. Every colour is read from `OCEAN_IMAGE_COLOR`, none retyped.
- [x] Step 4: Run the file again plus `check-types`. Expected: PASS.


**Built as (2026-11-18):** `ocean-mark.ts`, `card-back.ts`, `tests/card-back.test.ts` (the mark's two tests live in the same file, as the plan said). Waves are one `Q` then `T` curves; the mark is the plan's markup. 204 design tests green, `check-types` green. Tuned by eye at Task 11, if at all.
---

### Task 8: Share-card look

**Files:**
- Create: `packages/design/src/designs/ocean/share-card-look.ts`, `packages/design/src/designs/ocean/tests/share-card-look.test.ts`

**Interfaces:**
- Produces: `OCEAN_SHARE_CARD: { dark, light }` (`@allonfire/design/designs/ocean/share-card-look`), each `{ colors: { background, foreground, mutedForeground }, edge: { height: number; image: string }, fontFamily: string }`, structurally the `ShareCardLook` ui's `AOFShareCard` takes. The card's band is `OCEAN_IMAGE_COLOR[scheme].coral` (the App passes it as `band`).
- Consumes: `OCEAN_IMAGE_COLOR`, `OCEAN_IMAGE_FONT`, `svgDataUrl`.

- [x] Step 1: Write the test as Japan's is, per scheme: `toMatchObject({ colors: { background, foreground, mutedForeground }, fontFamily: OCEAN_IMAGE_FONT.FAMILY })`; and `it("runs a wave along the bottom edge in the scheme's primary")`: `edge.image` splits into `data:${HTTP.CONTENT_TYPE.SVG}` and an SVG whose decoded text contains that scheme's `primary`, contains no `<filter` and no `href`, and `edge.height` is 48 (the card is 1200 by 630). Differs from Japan's file enough that jscpd stays quiet; if it flags it, share the per-scheme `it.each` in `shared/tests`.
- [x] Step 2: Run it. Expected: FAIL.
- [x] Step 3: Implement `look(scheme)` as Japan's does; the edge is a 1200 by 48 SVG: a rect in the scheme's `background` and one wave path (`Q` curves, period 120px) filled with the scheme's `primary`, so the card's foot reads as the sea line. No pattern, no filter (Satori draws one gradient or an image).
- [x] Step 4: Run it. Expected: PASS. The rendered card is checked in Phase 3 (Contract, item 8): Satori cannot run in this package.


**Built as (2026-11-18):** `ocean/share-card-look.ts` and its test as above; the wave is generated (one `Q`, then `T` curves, 20 half-periods) not typed. 208 design tests green.
---

### Task 9: Email look and Laura's emails

**Files:**
- Create: `packages/design/src/designs/ocean/email-look.ts`, `packages/design/src/designs/ocean/tests/email-look.test.ts`, `apps/api/src/features/mail/tests/email-look.test.ts`
- Modify: `apps/api/src/features/mail/constants/email.ts` (the `[App.LAURA]` entry only)

**Interfaces:**
- Produces: `OCEAN_EMAIL_LOOK` (`@allonfire/design/designs/ocean/email-look`) = `{ accent, accentInk, dark: { card, ground, ink, muted }, ground, ink, muted }`, structurally the colour part of ui's `AOFEmailLook`; no `flourish` (Japan's seal and kanji have no ocean twin, and mail clients carry no web font: the email stays plain, in the Design's colours). The design package cannot import ui, so the type is local and the API's `satisfies Record<App, AOFEmailLook>` is the structural check.
- Consumes: `OCEAN_IMAGE_COLOR`; `EMAIL.LOOK`, `AOF_EMAIL_LOOK`, `App` (existing).

- [x] Step 1: Write `ocean/tests/email-look.test.ts`: accent is `light.primary` and `accentInk` white with AA between them; `dark.ground`/`ink`/`muted` equal the dark image colours and `ink` on `ground` and `muted` on `ground` meet AA in both schemes. Write the API test `email-look.test.ts` (unit): `EMAIL.LOOK[App.LAURA].accent === OCEAN_EMAIL_LOOK.accent`, `.brand === "Laura"`, `.dark.ground === OCEAN_IMAGE_COLOR.dark.background`, and `EMAIL.LOOK[App.BACK_OFFICE]` still carries Japan's flourish (guards the neighbour entry).
- [x] Step 2: Run `pnpm --filter @allonfire/design exec vitest run src/designs/ocean/tests/email-look.test.ts` and `pnpm --filter @allonfire/api exec vitest run src/features/mail/tests/email-look.test.ts`. Expected: FAIL.
- [x] Step 3: Implement `email-look.ts` from `OCEAN_IMAGE_COLOR` (`ground` the light background, `ink` the light foreground, `muted` the light muted text; `dark.card` the dark card). In `email.ts` change the entry to `[App.LAURA]: { ...AOF_EMAIL_LOOK, brand: "Laura", ...OCEAN_EMAIL_LOOK }`. Reconcile: re-read `email.ts` first; Phase 0 or Phase 1 might have touched the Back Office entry, never edit that one.
- [x] Step 4: Run both test files, then `pnpm --filter @allonfire/api exec vitest run src/features/mail`. Expected: PASS.


**Built as (2026-11-18):** the three files as above; `email.ts` changed on the Laura line only. The seven export keys the existing Ocean constant files need (`card-back`, `email-look`, `image-colors`, `image-font`, `image-fonts`, `ocean-mark`, `share-card-look`) were added to `packages/design/package.json` here, because the API imports `ocean/email-look`; Task 10 adds `theme.css` and `apps/laura/styles.css`, and its keys test covers all nine. 213 design tests, api mail 14 tests, api `check-types` green.
---

### Task 10: The Laura App folder, exports and `design:sync`

This is `aof-design new <name> --app laura`, steps 1 to 5.

**Files:**
- Create: `packages/design/src/apps/laura/PRODUCT.md`, `packages/design/src/apps/laura/styles.css`, `packages/design/src/designs/ocean/DESIGN.md`, `packages/design/src/apps/tests/apps.test.ts`; generated: `packages/design/src/apps/laura/DESIGN.md`
- Modify: `packages/design/package.json` (exports)
- Conditional (reconcile below): `packages/ui/src/styles/base.css`, `packages/design/src/apps/back-office/styles.css`

**Interfaces:**
- Produces export keys, all `./src/...` paths: `./apps/laura/styles.css`, `./designs/ocean/theme.css` (ui's browser tests can wear it, as they wear Japan's), `./designs/ocean/image-colors`, `./designs/ocean/image-font`, `./designs/ocean/image-fonts`, `./designs/ocean/share-card-look`, `./designs/ocean/email-look`, `./designs/ocean/ocean-mark`, `./designs/ocean/card-back`.
- Consumes: `wornDesigns`, `syncDesigns` (`scripts/sync-core.ts`), `REPO` (`@allonfire/config/local/repo`), `parseJson` (`@allonfire/core/shared/utils/json`).

- [x] Step 1: Write `apps/tests/apps.test.ts` (unit):

```ts
const exportsOf = parseJson<{ exports: Record<string, string> }>(readFileSync(PACKAGE_JSON, "utf8")).exports;
it("has an export key for every App stylesheet", ...)           // each src/apps/<app>/styles.css
it("has an export key and a theme.css for every Design", ...)   // each src/designs/<name>/theme.css
it("has an export key per ocean constant file", ...)            // every ocean/*.ts that is not a test
it("lets Laura wear ocean", () => expect(wornDesigns(REPO.ROOT).get("laura")).toBe("ocean"));
it("keeps every Design copy in step", () => expect(syncDesigns(REPO.ROOT, { check: true }).changed).toEqual([]));
describe("Laura's product context", () => {
  it("is impeccable's schema", ...)       // starts with the product-schema marker, has the nine headings of Back Office's PRODUCT.md
  it("speaks the domain's words", ...)    // contains Gallery, Favorite, Memory game, Admin, User
  it("keeps what was removed out", ...)   // no Viewer, no quiz (case-insensitive)
});
it("adds no rule Laura shares with the Back Office to its own stylesheet", () => {
  // styles.css is the Design import plus Laura-only rules: no scrollbar-width, no [data-sonner-toaster]
});
```

- [x] Step 2: Run `pnpm --filter @allonfire/design exec vitest run src/apps`. Expected: FAIL.
- [x] Step 3: Add the export keys. Write `styles.css`: a header comment (as Back Office's, naming Laura) and `@import "../../designs/ocean/theme.css";` (the exact path form `wornDesigns` matches). Laura-only rules: none in v1. **Reconcile:** `grep -n "scrollbar-width" packages/ui/src/styles/base.css`. If Phase 1 already moved Back Office's two App-agnostic rules (no scrollbars; Sonner's wider toaster) into ui's base.css, do nothing more. If not, move both verbatim into `base.css` (after the safe-area block) and delete them from `back-office/styles.css`: the Back Office imports base.css first, so its cascade is unchanged; run its tests in Task 13. Never copy them into Laura's stylesheet (dupes by hand, the Phase's anti-goal). Japan's `[lang="ja"]` rule stays Japan's: Laura ships no Japanese.
- [x] Step 4: Write `PRODUCT.md` through impeccable `init` (`IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/laura .claude/skills/impeccable/scripts/impeccable context --target packages/design/src/apps/laura/PRODUCT.md`, env and target rules of `aof-design`), answering its questions from this list, never asking the owner again; the file keeps Back Office's nine headings and schema marker: *Platform* web; *Users* the owner and the few people they add as Users, on a phone first, often in a sofa moment; *Product Purpose* a private place for the owner's own Images (Gallery, Favorites) and one game (Memory game, with a leaderboard); *Positioning* a small private App of AllOnFire with the Back Office's one sign-in; *Operating Context* English and Italian, phone first, installable, works offline to the Offline page, nobody registers (an Admin adds Users), Roles are Admin and User; *Capabilities and Constraints* browse the Gallery and Favorites, play and rank on the leaderboard, Admins also mark Favorites and upload (Upload Section), terminology fixed by `CONTEXT.md` (Gallery, Favorite, Memory game, Image, Admin, User; never album, like, heart, quiz, Viewer); *Brand Commitments* the AllOnFire Brand, Laura wears Ocean, fixed; *Evidence on Hand* no analytics, never invent people or counts; *Product Principles* the Image is the interface (chrome steps back), warmth over density, one thing per page, every flow one-handed; *Accessibility & Inclusion* WCAG 2.2 AA in English and Italian, motion only behind `motion-safe:`.
- [x] Step 5: Write `ocean/DESIGN.md` through impeccable `document` (seed flow, then the real tokens): frontmatter `name: Ocean`, a `description`, `colors:` with named colours (Tide Teal, Sea Glass, Coral, Ink, ...) whose hex values all come from `theme.css`, `typography`, `rounded`, `spacing`, `components`; sections as Japan's (Overview with the North Star, Colors with Named Rules, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts). Rules to carry from the Tasks above: **The Ink Rule** (the card back and any other dark furniture are ink in both schemes), **The Coral Rule** (coral marks a Favorite and nothing else; never text on the ground), **The Floating Frame Rule** (only the floating frame and floating controls cast a shadow; its gap, radius and shadow come from `--frame-*`), **The Quiet Image Rule** (chrome never competes with an Image). Then add this check to `apps.test.ts`'s Design block and run it red then green: every `#rrggbb` in `ocean/DESIGN.md`'s frontmatter occurs in `theme.css` (`theme.css` wins whenever the two disagree).
- [x] Step 6: Run `pnpm design:sync` (expected output: `synced packages/design/src/apps/laura/DESIGN.md`; no `DESIGN.json`: none exists yet, Contract item 9). Then `pnpm design:sync --check` (expected: no output, exit 0). Run `pnpm --filter @allonfire/design test`. Expected: PASS.
- [x] Step 7: Cleanup (`aof-design` step 9): delete `apps/laura/.impeccable/`, `apps/laura/PRODUCT.md`, `apps/laura/DESIGN.md` and the repo root's `.impeccable/` if impeccable left them (all gitignored), then `find packages/design -name '._*' -newer packages/design/package.json` is empty of anything the plan made.


**Built as (2026-11-18):** all files as above. Reconcile found the two shared rules (no scrollbars, Sonner's wider toaster) still in `back-office/styles.css`: moved verbatim into `packages/ui/src/styles/base.css` before the Base UI inert rule, and deleted from the Back Office (`[lang="ja"]` stays Japan's). `PRODUCT.md` and `ocean/DESIGN.md` were written by hand to impeccable's schema (the test compares `PRODUCT.md`'s headings with the Back Office's and the DESIGN.md frontmatter's hex values with `theme.css`), not through the interactive `init`/`document` flows. `design:sync` wrote `apps/laura/DESIGN.md` (tracked, as the Back Office's is); `--check` exits 0. The `.impeccable/` folders found are the tracked P1 review artefacts and an excluded hook cache, not this plan's. 258 design tests green.
---

### Task 11: Specimen and the one screenshot round (STOP and ask)

**This task is a gate again: the executor stops, shows the owner the build, and asks.** One build, one screenshot round, no review loops.

**Files:** a throwaway specimen in the scratchpad (never in the repo: ADR 0022 allows no draft area, and Laura has no page until Phase 3). Nothing is committed.
**Interfaces:** none.

- [x] Step 1: Write a script in the scratchpad that, run from `packages/design` with `pnpm exec tsx <abs script path>`, imports the Design's constants and writes `specimen/index.html` linking the repo's `theme.css` by absolute `file://` path (the `@font-face` urls resolve beside it): the page face at body and heading sizes, a card, a primary button, an input and its edge, a toast-colour row (all four), the five chart colours, the Favorite coral mark, the octopus mark (`oceanMarkSvg`), the card back at 3:4 beside a card face, the Laura logo square and horizontal (`aofLogoSvg` with `BANNER`), and a mock floating sidebar using `--frame-gap`, `--frame-radius`, `--frame-shadow`, `--sidebar*` beside a content card. Both schemes switch with `prefers-color-scheme` (the `.dark` class set by a one-line toggle in the file).
- [x] Step 2: Drive the browser through `/iso-browser` first (driver order and the Allow announcement as its skill and `feedback_browser_testing` say; announce Chrome's Allow in the same message): take the owner's open tab (never a new window), navigate it to the specimen, screenshot at 390 by 844 and 1280 by 800, light and dark, show the four images, then reset the emulation. If the guard refuses, stop and use guided mode: `open` the file for the owner.
- [x] Step 3: Fix only what the screenshots show (small edits to `theme.css`, `card-back.ts`, `ocean-mark.ts`; re-run the Design package tests after each), once. No second round unless the owner asks.
- [x] Step 4: Ask the owner with `AskUserQuestion` (same turn): **Keep** (continue), **Change one thing** (their words; one fix pass, then continue), **Decline** (revert: delete `packages/design/src/designs/ocean` and `packages/design/src/apps/laura` and `apps/api/src/features/mail/tests/email-look.test.ts`, restore `email.ts` and `package.json` from git (the shared helpers and the contract test stay: they are Design-agnostic), and return to Task 1 for another direction).
- [x] Step 5: Run `pnpm --filter @allonfire/design test`. Expected: PASS.


**Built as (2026-11-18):** the specimen builder is `build-specimen.ts` in the session scratchpad (it inlines the repo's `theme.css` and fonts as data URLs, because a `file://` page cannot load fonts across folders). Screenshots: 1280 wide light and dark, 390 wide light and dark, in the owner's `localhost:3400` tab (restored afterwards, emulation reset). Step 3: nothing to fix; one note for the owner: the ink furniture (pill, sidebar brand chip) nearly disappears on the dark ground (ink is 1.1:1 there, by the Ink Rule), which is why the card back carries an edge. Step 4 answered (2026-11-18): **Keep, with changes** ("the look overall was great"). Changes asked and built: (1) the logo stays the AOF logo exactly as the Back Office wears it, with Ocean's teal banner behind the label (already so: `aofLogoSvg` + `BANNER`); (2) the octopus is the Memory game card back's mascot only, redrawn as my own chunky six-arm octopus (no licence), coral body, **dizzy** face (owner picked B3 + E9 from a 12-face board; other faces are one function each in `ocean-mark.ts` when a page needs one): `oceanMarkMarkup({ body, ink })`, 200 square; (3) one sea element, W1 the single wave line: `sea-wave.ts` (`oceanWavePath`, now also the share card's foot); (4) three solid sea icons: crab (game-icons.net, CC BY 3.0), jellyfish and lighthouse (Material Design Icons, Apache 2.0): `sea-icons.ts`, credits in `ocean/SOURCES.md`; (5) "the blur should come directly from the image": the stored-picture blur is the real `blurDataUrl` of Phase 3's `AOFStorageImage` (`images.md`), never a stand-in gradient; nothing to build in this package. Export keys for `sea-icons` and `sea-wave` added; 266 design tests green.
---

### Task 12: Docs, the skill's taste section and knip

**Files:**
- Modify: `packages/design/README.md`, `docs/guides/design-system.md`, `.claude/skills/aof-design/SKILL.md`, `CONTEXT.md`, `knip.jsonc`

**Interfaces:** none produced; documents the Contract below.

- [x] Step 1: `packages/design/README.md`: reword "Japan is the first" to name the second Design, add the ocean files to the Layout block and one row per new export in the Exports table (colours, font, fonts, share-card look, email look, mark, card back, `theme.css`, Laura's `styles.css`), and note that `DESIGN.json` of an App is written by its first real page's `document` scan. Reconcile: re-read it first; Phase 1 might have added exports.
- [x] Step 2: `docs/guides/design-system.md`: one pointer line under "Pointers" (the token set every Design defines for shared pieces is `designs/shared/tests/design-contract.test.ts`; the floating frame's `--frame-*` tokens, their names as Task 5 fixed them; a new Design copies nothing from Japan's test: it calls `describeContrast`); amend the line "Laura joins once rebuilt" only if Phase 3 has not.
- [x] Step 3: `.claude/skills/aof-design/SKILL.md`: under "Owner's taste" add a short "Ocean Design (Laura)" section with the Task 1 answers (name, direction, typeface, corners) and the four rules from Task 10's DESIGN.md (Ink, Coral, Floating Frame, Quiet Image); in `## new` step 4 replace "copy Japan's test for a new Design" with "call `describeContrast` from `designs/shared/tests/theme-css`" (the owner's rule: a must-step goes in the skill the same turn).
- [x] Step 4: `CONTEXT.md`, the **Design** entry: "Japan (the Back Office's) and Ocean (Laura's)". Reconcile: `CONTEXT.md` is already modified in the working tree by the rebuild's spec work; re-read, edit only that sentence, keep the rest.
- [x] Step 5: Run `pnpm static:knip-production` and `pnpm static:knip` and read what they report for `packages/design`. Accept in `knip.jsonc` only the ocean files they name (the constants Laura reads in Phase 3), each as `ignoreIssues` for that file and only the issue types it has, under one `//` reason: "Ocean's constants are read by the Laura App, rebuilt in Phase 3 of the Laura rebuild; delete these entries when it lands". Never a folder glob; never a reason that says only tests read it (`packages/config/local/tests/knip-config.test.ts`).
- [x] Step 6: Run `pnpm --filter @allonfire/config exec vitest run local/tests/knip-config.test.ts` and `pnpm static:knip`, `pnpm static:knip-production`. Expected: PASS, exit 0.


**Built as (2026-11-18):** README, `design-system.md` pointer, aof-design skill (an "Ocean Design (Laura)" section with the owner's rules and the "show many options with codes" preference, and step 4 now says `describeContrast`), `CONTEXT.md` Design entry; knip: five Ocean files accepted for `exports` under one reason (`oceanWavePath` and `OCEAN_MARK` are read in production code, so they need none). `static:knip-production` exit 0, `static:knip` clean but for a pre-existing `tsx` binary hint, config test 3 green.
---

### Task 13: Review checkpoint

**Files:** none.

- [x] Step 1: `pnpm static:fix` (Biome, then the Back Office's `tailwind:fix`), then `pnpm static:lint`.
- [x] Step 2: `pnpm static:dupes` (expected: no clone; the Japan and ocean tests share the helpers by design; if the share-card or contrast tests are flagged, merge into `designs/shared/tests`, never accept).
- [x] Step 3: `pnpm static:knip` and `pnpm static:knip-production`; `pnpm static:design` (`design:sync --check`, expected exit 0).
- [x] Step 4: `pnpm turbo run check-types test --filter=@allonfire/design --filter=@allonfire/api`. If Task 10's reconcile moved the two CSS rules: add `--filter=@allonfire/ui --filter=@allonfire/back-office` and run the Back Office's `pnpm --filter @allonfire/back-office test:browser` (the scrollbar and toast-width rules).
- [x] Step 5: Docs touched: README, design-system.md, aof-design SKILL.md, CONTEXT.md, `DESIGN.md` of Ocean and its Laura copy (`pnpm design:sync --check` green). Confirm no `._*` files, no `packages/design/.impeccable/design.json`, no `apps/laura/PRODUCT.md`/`DESIGN.md`/`.impeccable/` remain, and the plan's four Decision-record lines in Task 1 are filled. Stamp the plan done and stop: the owner reviews every change and commits by hand.

---

## Contract with Phase 1 and Phase 3

Produced by this plan (exact names; Phase 1 is built: its `AppDescriptor` and `AOFAppFrame` hold `variant`, `collapsible` and the slots, and the notes below are checked against them):

1. **Frame tokens** (role: dressing of the floating `AppFrame`): CSS custom properties `--frame-gap`, `--frame-radius`, `--frame-shadow` in `ocean/theme.css` (`:root`, shadow also in `.dark`). Phase 1 prescribed no names, so these are fixed here, and Task 5 (Steps 5 to 8) makes `AOFSidebar` read them with a fallback (`var(--frame-radius, var(--radius-lg))`, gap `var(--frame-gap, 0.5rem)`, shadow `var(--frame-shadow, var(--shadow-sm))`) so Japan, which declares none, is unchanged. The gap is a plain length: the frame adds the safe-area insets itself.
2. **Brand and logo**: the Brand is not touched; Laura's logo is the Brand plus a banner. `OCEAN_IMAGE_COLOR.BANNER` (three stops), `OCEAN_IMAGE_FONT.FAMILY` and the name "Laura" are what Phase 3's `LAURA.LOGO` (an `AppLogo`) is built from; `aofLogoSvg`, `AOFBrandLogo`, `AOFIconImage` and the launch-screen route need no change. `public/favicon.ico` is Laura's own file (Phase 3, from the flat square logo), as the Back Office's is.
3. **Image colours** (role: `theme-color`, manifest, launch-screen ground, `AOFBaseViewport`): `OCEAN_IMAGE_COLOR` at `@allonfire/design/designs/ocean/image-colors`, shaped like Japan's, so `schemeColors` takes it whole. Also `.light.coral` (the share card's `band`), `.INK`, `.BANNER`.
4. **Image fonts**: `OCEAN_IMAGE_FONT.FAMILY` (`.../image-font`, browser-safe) and `loadOceanImageFonts()` (`.../image-fonts`, server only; the App caches it under `"use cache"` and `cacheLife("max")` as the Back Office does). Static WOFF, not WOFF2.
5. **Share card**: `OCEAN_SHARE_CARD[scheme]` at `.../share-card-look`, spread into ui's `AOFShareCard` (`colors`, `edge`, `fontFamily`), unchanged component.
6. **Who sets `variant` and `collapsible`**: the App's descriptor (ADR 0033: Laura `floating` and `icon`), not the Design. This overrules the spec's wording "the Design picks `variant`"; the Design only supplies the tokens in item 1. Phase 1's descriptor holds them; no `OCEAN_` constant carries them.
7. **Stylesheet**: `@allonfire/design/apps/laura/styles.css` (imports `ocean/theme.css`, holds no Laura-only rule in v1). Phase 3's `globals.css` is `@import "@allonfire/ui/styles/base.css";`, then this, then its own `@source "../";` (`aof-design new` step 1, App side), plus `@allonfire/design` in Laura's `package.json` and `transpilePackages`. The App-agnostic rules (no scrollbars, wider toaster) are in ui's `base.css` after Task 10; if Phase 1 moved them first, nothing changes.
8. **Card back and mark** (role: the Memory game's card back, special-page ornaments): `OCEAN_CARD_BACK` (`{ WIDTH: 300, HEIGHT: 400, SVG, DATA_URL }`, ink in both schemes with a dark-primary edge) and `oceanMarkSvg(colors)`/`oceanMarkMarkup(colors)` (viewBox 64). Phase 6 lays the card back in `AOFImage`/`img` as a data URL (painted with the HTML, like `aofLogoDataUrl`). **Phase 3** renders the share card, icons and launch screens once their routes exist and shows them to the owner: Satori cannot run in this package, so this plan only unit-tests their inputs.
9. **`DESIGN.json`**: absent on purpose. Phase 3's first task wearing the Design (the shell page) runs `/aof-design document` in scan mode for Laura (`aof-design` step 7 and 8), then `pnpm design:sync --from laura`, which writes the sidecar for the Design and its Apps.
10. **Email**: `OCEAN_EMAIL_LOOK` is wired into `EMAIL.LOOK[App.LAURA]` here (the API already had the Laura entry); Laura needs nothing further. Back Office's entry is untouched.
11. **Token contract for any future Design**: `designs/shared/tests/design-contract.test.ts` lists the tokens shared pieces read (ui's toaster, the sidebar, charts). Phase 1 should extend `REQUIRED` there when a moved piece starts reading a new token.
12. **Knip**: ocean's constants carry accept entries in `knip.jsonc` with the reason "read by the Laura App in Phase 3"; Phase 3 deletes them when Laura imports the files (its Review checkpoint will show them as stale).
13. **`design:sync`**: no script change was needed (`wornDesigns` finds Laura by its `styles.css` import); the repo-level guard is `apps/tests/apps.test.ts` plus `pnpm static:design`.

## Implementation Log
- Implemented: 2026-11-18T16:54:29+0100
- Workspace: current-branch — feat/laura-p0-drop
- Committed: no — awaiting user review
- Owner changes at the Task 11 gate (2026-11-18): Keep, with the octopus redrawn as a coral dizzy mascot on the card back, the Laura logo kept as the AOF logo with Ocean's banner, one wave (W1) and three solid sea icons (crab, jellyfish, lighthouse); blur-from-the-picture is Phase 3's `AOFStorageImage`.
- After sign-off the owner asked for different octopuses and chose the "kawaii blob" body (S1: round body, four tiny feet) from a board of 8 body styles and 12 poses; `ocean-mark.ts` now draws it. The poses and extra faces were not picked, so they are not built.
- The owner then chose full-colour emoji from two sets, Noto and Firefox (both Apache 2.0), over the one-colour packs: `sea-emoji.ts` names one per thing the app shows (no ship), and `--emoji-shadow` (ink-tinted by day, a light rim at night, two thin layers at 0.5px blur) lifts them on both grounds, since most fall under 3:1 on the light ground. Picked by eye from `emoji-contrast.html`; no Satori use (filters do not render there).
- Decision to review: generated images use Nunito (static WOFF), Fraunces is page headings only.
