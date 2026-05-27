# Open Design Hyperframes Handoff

Use this only for manual review or design exploration. The production `pnpm video overlay` command renders Hyperframes compositions directly and does not require Open Design.

## When to Use

- Use Open Design when an overlay needs a visual direction pass before it becomes a reusable generated template.
- Do not use Open Design as a required pipeline stage.
- Do not store Open Design project files inside video project folders.

## Handoff Prompt

Paste this into Open Design with the Hyperframes skill selected:

```text
Create a Hyperframes HTML composition for an AllOnFire video overlay.

Context:
- Product: Italian AI-tool explainer overlays.
- Aspect: {16x9 or 9x16}.
- Duration: {seconds}.
- Overlay purpose: {purpose}.
- Viewer takeaway: {takeaway}.
- Visual content:
  {overlay body}

Constraints:
- Use a fixed canvas: 1920x1080 for 16x9 or 1080x1920 for 9x16.
- Use local/offline-safe assets only.
- Root must use data-composition-id="main", data-width, data-height, and finite data-duration.
- Every visible timed element must have class="clip", data-start, data-duration, and data-track-index.
- Register a paused GSAP timeline as window.__timelines["main"].
- Dark AllOnFire stage: #0f0f0f background, #f7f1e8 text, #ff6b00 accent.
- Avoid decorative filler; the overlay must communicate the explanation quickly.

Output only the Hyperframes index.html composition.
```

## Bringing It Back

If the Open Design result is approved, translate the useful structure into the generator in `src/render-overlays.ts`; do not paste a one-off composition into the pipeline output by hand unless it is a deliberate manual override.
