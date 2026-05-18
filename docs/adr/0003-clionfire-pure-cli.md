# ADR-0003 — clionfire-pure CLI design (no FSM, no Prisma)

Date: 2026-05-13

## Status

Accepted.

## Context

The initial foundation built an XState 18-stage FSM plus 5 Prisma tables to checkpoint progress. After grilling, we realised:

- The pipeline is a linear 4-stage DAG (download → transcribe → translate → overlay) with no parallel branches.
- Each stage produces a single artifact file. Filesystem itself is the natural state.
- Prisma rows add round-trips with no extra information value over `metadata.json`.
- XState is overkill for a 4-step linear flow with idempotent skip-if-done semantics.
- The reference project `clionfire` runs an almost identical pipeline (yt-dlp → whisper.cpp → cuts) with bare TypeScript + filesystem and is highly ergonomic.

## Decision

Adopt the clionfire model wholesale for orchestration:

1. Each pipeline stage is its own CLI subcommand: `download`, `transcribe`, `translate`, `overlay`, plus `install` (deps) and `list` (status).
2. Project state lives in `<project>/metadata.json`. Stages are recorded as tri-state (`null` / `{at}` / `{failedAt, error}`).
3. Commands are idempotent: skip if the stage is `done` unless `--force` passed.
4. A project-wide `.lock` file (pid + timestamp + SIGINT cleanup) prevents concurrent stage runs on the same project.
5. The `install` command isolates package-manager dispatch (`brew` / `winget` / `curl`) and binary detection.
6. UI = Ink + chalk + ink-spinner.

## Consequences

- The XState dependency and the 5 Prisma tables added in the foundation work are deleted.
- The pipeline becomes filesystem-portable: a project folder is fully self-describing.
- Future work (chromakey, render, publish) can either keep adding subcommands or introduce a thin `run` orchestrator that walks the DAG.

## Out of scope

- Composition modes (deferred to recording-phase plan).
- Multi-source projects (single source per project for v1).
- Whisper model alternatives (`large-v3` only; override via `WHISPER_MODEL` env).
