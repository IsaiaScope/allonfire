# video-overlays prompts

Prompt library for drafting new Hyperframes overlay templates and Open Design review passes.

## Files

- `PRODUCT.md` — required by the Impeccable loader. Product brief, register, audience, voice, output contract.
- `DESIGN.md` — required by the Impeccable loader. Catppuccin Mocha tokens, canvas rules, typography, anti-patterns.
- `_scaffold.md` — blank prompt template. Copy when adding a new template.
- `_translation-guide.md` — legacy HTML mockup → Remotion `.tsx` recipe. Do not use for the active Hyperframes renderer.
- `open-design-hyperframes.md` — optional Open Design handoff for manually drafting or refining a Hyperframes composition.
- `templates/{name}/prompt-portrait.md` + `prompt-landscape.md` — per-template design briefs (one per orientation).
- `templates/{name}/invoke-portrait.md` + `invoke-landscape.md` — **paste-ready user messages** for invoking Impeccable in another Claude Code shell.
- `templates/{name}/notes.md` — props sketch + edge cases for the later Hyperframes composition.

## Why PRODUCT.md + DESIGN.md sit at this folder root

Impeccable's loader script (`load-context.mjs`) hard-requires PRODUCT.md (will block and run `impeccable teach` if missing) and strongly recommends DESIGN.md. Its default search path is the project root → `.agents/context/` → `docs/`. We override that with `IMPECCABLE_CONTEXT_DIR=packages/video-overlays/prompts` in the invocation prompts.

## The flow

```
invoke-{orientation}.md  ──> paste into fresh Claude Code shell ──> Impeccable craft ──> mockup-{orientation}.html
                                                                                           │
                                                                                           ▼
                                                                                  translate to Hyperframes HTML
                                                                                           │
                                                                                           ▼
                                                                              overlays/compositions/{id}/{aspect}/index.html
```

Each template ships **two invocations** (portrait 1080×1920, landscape 1920×1080). Video overlays are fixed-canvas, not responsive web. The production renderer emits self-contained Hyperframes projects and renders them through the local Hyperframes CLI.

## Adding a new template

1. Copy `templates/comparison-split/` to `templates/{new-name}/`.
2. Edit **Intent**, **Content slots**, **Layout brief**, **Palette assignment**, **Anti-patterns** in both `prompt-{orientation}.md` files.
3. Update both `invoke-{orientation}.md` files: replace the inline brief block with the new prompt's content.
4. Update `notes.md` with the new props sketch.
