# 0002 — All-local, terminal-only video pipeline

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: @isaia

## Context

The new `@allonfire/video-pipeline` package automates the end-to-end production of YouTube long-form and Shorts videos from a single talking-head source recording (green-screen webcam + extempore audio), with auto-generated diagram/sketch overlays, auto-cut post-production, auto-captions, and YouTube publishing.

Three deployment shapes were available:

1. **SaaS-hybrid** — Descript / Recut for cuts, Remotion Lambda for render, Inngest/Trigger.dev for orchestration, n8n Cloud for triggers.
2. **Server-hosted in-house** — n8n + Postgres + a worker fleet on the existing VPS, similar to the social-publisher stack.
3. **All-local, terminal-only** — every stage runs on the channel owner's Mac, orchestrated by a TypeScript CLI with filesystem-driven state (`metadata.json`). No paid SaaS, no Lambda, no cloud queue.

## Decision

Adopt option **3 — all-local, terminal-only** for v1.

- Stage state lives in `<project>/metadata.json` (tri-state per stage). Each CLI command is idempotent and self-contained; rerun = skip if done unless `--force`. No FSM, no Prisma — filesystem is ground truth.
- Transcription: downloaded captions first, then local `whisper.cpp`. No Groq/OpenAI Whisper API and no managed Python ASR stack.
- VAD: Silero VAD (local, ONNX).
- LLM passes (Topic Brief, Cut List, Overlay Spec, Highlight selection): **Claude Code CLI headless** (`claude -p`). The Claude API is hit through the user's existing Claude Code installation, not through bespoke API integration in the pipeline.
- Codegen helpers (Remotion components, FFmpeg filtergraphs): Codex CLI when useful.
- Diagrams: `mermaid-cli` (Node, headless Chromium for rendering) and the Excalidraw MCP server, both producing SVG.
- Composition + render: Remotion local CLI render. No Remotion Lambda.
- Chroma key + encoding: FFmpeg local binary.
- Music: external folder `/Volumes/Crucial-4T/video/sound` indexed locally.
- Publish: YouTube Data API v3 from the local CLI (only network egress outside Claude Code traffic).
- The existing n8n stack stays in use for the Twitter / LinkedIn social workflows but is not part of the video pipeline. n8n re-enters Phase 2 only as a scraper / topic-feed producer that drops Source References into the pipeline's input table — execution stays local.

## Alternatives considered

- **SaaS-hybrid (option 1)** — rejected for v1. Faster to ship, but: monthly $ cost without revenue, vendor lock on the most subjective stages (cuts, render), dependency chain that breaks "I can iterate on a flight" UX.
- **Server-hosted in-house (option 2)** — rejected for v1. The pipeline must move multi-GB raw recordings; pushing them to a remote worker before render is the slowest possible path. Render machine == capture machine eliminates that copy. Revisit if the channel owner moves to a team or wants parallel renders.

## Consequences

- **Pro**: zero recurring cost, full privacy (raw footage never leaves the laptop), offline-capable except for publish, identical dev/prod environment.
- **Pro**: each stage is a normal CLI invocation, so debugging is `pnpm` + a stack trace, not log shipping from a worker.
- **Con**: render minutes per minute of video is bound by local CPU/GPU. A 10-minute long-form at 1080p may take 10–30 minutes to render on a Mac without GPU acceleration. Acceptable for v1 cadence (~1 video/day).
- **Con**: no parallel jobs. If batching N>1 videos becomes important, add BullMQ + Redis (still local) — this is the agreed escape hatch.
- **Con**: long-running CLI requires reliable stage checkpoints so a laptop sleep/crash doesn't restart from scratch. `metadata.json` tri-state (per-stage `{at}` / `{failedAt, error}`) is the ground truth; each command re-reads it on start.
- **Con**: n8n is intentionally not the orchestrator here, diverging from the social-publisher pattern. Future contributors must understand the split.

## Open questions

- When (if ever) to add BullMQ for parallel jobs.
- Should the pipeline support a `--worker remote` mode in Phase 3 for a beefier render box?
