# Translation guide — HTML mockup → Remotion overlay

End state: a new `{template-kebab}-overlay.tsx` registered in `root.tsx` with a Zod schema entry in `spec.ts`. One component handles both orientations via a layout helper.

Reference implementation to mimic: `packages/video-overlays/src/linear-diagram-overlay.tsx` + the matching entry in `spec.ts`.

## Steps

### 1. Inventory the mockup

Open both Impeccable HTML files (portrait + landscape). For every text node and every visual slot, write a row in `notes.md`:

```
slot              type           required   notes
----              ----           --------   -----
eyebrow           string         yes        all-caps, mono
title             string         yes
columns[i].label  string         yes        2–3 items
columns[i].body   string[]       yes        2–5 bullet lines
```

This is the schema in human form. Promote it to Zod next.

### 2. Add the Zod schema in `spec.ts`

Follow `linearDiagramPropsSchema` shape:

```ts
export const {template}PropsSchema = z.object({
  // content props
  eyebrow: z.string(),
  title: z.string(),
  // ...
  // theme block — required on every template
  theme: z.object({
    base: z.string(),
    mantle: z.string(),
    surface: z.string(),
    text: z.string(),
    muted: z.string(),
    accent: z.string(),
    // ...per-template extras
  }),
});

export const {template}OverlaySpecSchema = z.object({
  durationFrames: z.number().int().positive(),
  fps: z.number().int().positive(),
  overlay: z.object({
    id: z.string(),
    kind: z.string(),
    moment: z.string(),
    purpose: z.string(),
    template: z.literal("{template-kebab}"),
  }),
  projectTitle: z.string(),
  props: {template}PropsSchema,
  sourceFolder: z.string(),
});

export type {Template}Props = z.infer<typeof {template}PropsSchema>;
```

Add the new spec schema to the `overlaySpecSchema = z.union([...])` at the bottom of the file.

### 3. Create the component

`packages/video-overlays/src/{template-kebab}-overlay.tsx`:

```tsx
import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { {Template}Props } from "./spec";

const UI_EASE = Easing.bezier(0.16, 1, 0.3, 1);
const MONO_FONT = '"JetBrains Mono", "SFMono-Regular", Consolas, monospace';
const SYSTEM_FONT = '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';

export type {Template}Layout = {
  isVertical: boolean;
  shellWidth: number;
  shellHeight: number;
  shellPadding: string;
  titleFontSize: number;
  // ...token-per-slot
};

export function get{Template}Layout(width: number, height: number): {Template}Layout {
  const isVertical = height > width;
  return {
    isVertical,
    shellWidth: Math.round(isVertical ? width * 0.86 : width * 0.88),
    shellHeight: Math.round(isVertical ? height * 0.82 : height * 0.78),
    shellPadding: isVertical ? "60px 56px" : "72px 84px",
    titleFontSize: isVertical ? 88 : 96,
    // ...
  };
}

function enterProgress(frame: number, startFrame: number, duration: number) {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    easing: UI_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export const {Template}Overlay: React.FC<{Template}Props> = (props) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const layout = get{Template}Layout(width, height);
  const entrance = enterProgress(frame, 0, 24);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, oklch(0.231 0.024 282), oklch(0.198 0.022 282))",
        color: props.theme.text,
        display: "flex",
        fontFamily: SYSTEM_FONT,
        justifyContent: "center",
      }}
    >
      {/* component body — translate the HTML structure */}
    </AbsoluteFill>
  );
};
```

### 4. Convert styles

For each inline `<style>` rule in the mockup HTML:

- Promote to a React `style={}` object on the matching JSX node.
- Numeric px values become bare numbers (`fontSize: 88`). Shorthand (padding, margin) stays a string.
- Replace every hex color with the **OKLch equivalent** from `DESIGN.md` (the rest of the codebase uses OKLch — stay consistent).
- Strip every `:hover`, `:focus`, `@media`, `@keyframes`, `transition`, `animation`. These do not belong in a Remotion frame.
- Replace `position: fixed` / `vh` / `vw` units with the layout helper's absolute px values.

### 5. Layer in entrance motion

The mockup is one still frame; the component animates *into* that frame. Default pattern:

```tsx
const entrance = enterProgress(frame, 0, 24);   // 0 → 1 over first 24 frames
const y = interpolate(entrance, [0, 1], [18, 0]);

<div style={{
  opacity: entrance,
  transform: `translateY(${y}px)`,
  // ...
}} />
```

For multi-slot reveals (e.g. columns landing in sequence), stagger:

```tsx
const reveal = enterProgress(frame, 12 + index * 4, 16);
```

### 6. Register in `root.tsx`

Add two `<Composition>` entries — one for portrait, one for landscape — following the pattern of the existing `linear-diagram-overlay` entries. Both share the same component but pass different `width` / `height`.

### 7. Verify

```bash
pnpm --filter @allonfire/video-overlays dev          # opens Remotion Studio
pnpm --filter @allonfire/video-overlays render <folder>   # writes an mp4
```

Manual check: the Studio preview at both 1080×1920 and 1920×1080 looks like the corresponding mockup once the entrance animation settles (after ~30 frames).
