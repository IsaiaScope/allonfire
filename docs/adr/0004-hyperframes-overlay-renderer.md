# ADR-0004 — Hyperframes overlay renderer

Date: 2026-05-26

## Status

Accepted.

## Context

AllOnFire overlays were originally modeled as Remotion React compositions. That made sense while templates were hand-authored, but the pipeline now asks an agent to generate many short information overlays from transcript context. Hyperframes is a better fit for that authoring loop because the source is plain HTML with `data-*` timing attributes, CSS layout, and a paused GSAP timeline.

Open Design is installed locally and includes a Hyperframes skill, but requiring its daemon during `pnpm video overlay` would make the terminal pipeline less portable.

## Decision

Use Hyperframes as the production overlay renderer.

- `overlay.md` remains the human-readable overlay library.
- `<project>/overlays/overlay-spec.json` remains the render contract and declares `renderer: "hyperframes"`.
- The renderer writes self-contained Hyperframes projects under `<project>/overlays/compositions/`.
- Transparent reusable clips render as WebM/VP9 alpha; standalone review videos render as MP4/H.264.
- Open Design is optional authoring and review tooling only. The production CLI does not require Open Design, its daemon, or its project store.

## Consequences

- Agents can generate and revise overlays as HTML rather than React/Remotion components.
- The CLI keeps the same output folders, so downstream video composition can continue consuming `overlays/clips/`, `overlays/videos/`, and `overlays/manifest.json`.
- Remotion-specific template code is no longer part of the active overlay package build surface.
- Hyperframes, GSAP, Chrome, and FFmpeg become the local render dependency chain for overlays.
