# Video Pipeline CLI v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unbuilt XState-based foundation with a clionfire-style 6-command CLI (`install`, `download`, `transcribe`, `translate`, `overlay`, `list`) that takes a YouTube URL through to a content-rich `overlay.md` ready for recording — all filesystem-driven, no Prisma, no FSM.

**Architecture:** Each stage = independent command + isolated `pipeline/<stage>.ts` module. Project state lives in `<project>/metadata.json` (tri-state stages). Stages are idempotent (skip if done unless `--force`). Folder layout: `$VIDEO_WORK_DIR/{shorts,normal}/<YYYY-MM-DD>-<slug>/`. LLM driver = Claude Code CLI subprocess (`claude -p`). Speech engine = `whisper.cpp large-v3` (auto-installed). Downloader = `yt-dlp`. UI = Ink + chalk + ink-spinner. Dep install command isolates `brew`/`winget`/`curl` per OS.

**Tech Stack:**
- TypeScript ~5.8, Node 22, pnpm 9, ESM
- Commander 12 (CLI args)
- Ink 6 + ink-spinner 5 + ink-text-input 6 + chalk 5 (UI)
- React 19 (Ink runtime)
- Vitest 4 (tests)
- Biome via Ultracite (lint/format)
- `yt-dlp`, `ffmpeg`, `whisper-cpp` (external binaries, auto-installed)
- `claude` CLI (Claude Code, assumed installed)

**Out of scope (deferred to later plans):** chromakey, Remotion composition, YT publishing, recording UX, captions burn-in, composition modes, multi-source aggregation.

---

## File Structure

```
packages/video-pipeline/
├── package.json                                 [modify: drop xstate, add ink/react/chalk]
├── tsconfig.json                                [modify: jsx react-jsx]
├── vitest.config.ts                             [keep]
├── README.md                                    [rewrite: new design]
└── src/
    ├── index.ts                                 [rewrite: minimal public exports]
    ├── env.ts                                   [rewrite: VIDEO_WORK_DIR + VIDEO_MUSIC_DIR + WHISPER_MODEL]
    ├── errors.ts                                [rewrite: PipelineError, ToolMissingError, LockHeldError]
    ├── lib/
    │   ├── paths.ts                             [create: folder layout helpers]
    │   ├── paths.test.ts                        [create]
    │   ├── slug.ts                              [create: italian title slugifier]
    │   ├── slug.test.ts                         [create]
    │   ├── metadata.ts                          [create: read/write metadata.json]
    │   ├── metadata.test.ts                     [create]
    │   ├── lock.ts                              [create: .lock file + SIGINT]
    │   ├── lock.test.ts                         [create]
    │   ├── platform.ts                          [create: OS detect]
    │   ├── platform.test.ts                     [create]
    │   ├── claude.ts                            [create: claude -p subprocess]
    │   ├── claude.test.ts                       [create: mock spawn]
    │   ├── deps.ts                              [create: check/install per OS]
    │   ├── deps.test.ts                         [create]
    │   ├── resolve.ts                           [create: hybrid project arg resolver]
    │   └── resolve.test.ts                      [create]
    ├── pipeline/
    │   ├── types.ts                             [create: shared pipeline types]
    │   ├── download.ts                          [create: yt-dlp wrapper]
    │   ├── download.test.ts                     [create]
    │   ├── transcribe.ts                        [create: ffmpeg + whisper.cpp]
    │   ├── transcribe.test.ts                   [create]
    │   ├── translate.ts                         [create: 2-pass via Claude]
    │   ├── translate.test.ts                    [create]
    │   ├── overlay.ts                           [create: overlay.md generator]
    │   └── overlay.test.ts                      [create]
    ├── prompts/
    │   ├── translate-verbatim.md                [create]
    │   ├── rewrite-script.md                    [create]
    │   └── overlay-gen.md                       [create]
    └── cli/
        ├── cli.ts                               [rewrite: 6 subcommands]
        ├── cli.test.ts                          [rewrite]
        ├── components/
        │   ├── header.tsx                       [create]
        │   ├── progress-bar.tsx                 [create]
        │   ├── status-badge.tsx                 [create]
        │   └── install-row.tsx                  [create]
        └── commands/
            ├── install.tsx                      [create]
            ├── download.tsx                     [create]
            ├── transcribe.tsx                   [create]
            ├── translate.tsx                    [create]
            ├── overlay.tsx                      [create]
            └── list.tsx                         [create]

packages/database/prisma/schema.prisma                                  [modify: drop video enums + models]
packages/database/src/services/video-project.service.ts                 [delete]
packages/database/src/__tests__/services/video-project.service.test.ts  [delete]
packages/database/src/services/index.ts                                 [modify: drop service export]
CONTEXT.md                                                              [modify: drop FSM stages, add v1 CLI section]
docs/adr/0002-all-local-video-pipeline.md                               [modify: remove FSM checkpointing]
docs/adr/0003-clionfire-pure-cli.md                                     [create]
docs/superpowers/plans/2026-05-12-video-pipeline-foundation.md          [delete: obsoleted]
```

**Files deleted (foundation FSM/runner/registry):**

```
packages/video-pipeline/src/fsm/
packages/video-pipeline/src/runner/
packages/video-pipeline/src/stages/
packages/video-pipeline/src/cli/commands/new.ts
packages/video-pipeline/src/types.ts
```

Responsibilities, one file at a time:

- `lib/paths.ts` — single source of truth for `<projectRoot>/{video.mp4, transcript.md, ...}` paths.
- `lib/slug.ts` — pure function: italian title → URL/filesystem-safe slug.
- `lib/metadata.ts` — schema (TypeScript type) + reader/writer/updater for `metadata.json`.
- `lib/lock.ts` — acquire/release `.lock` file with pid + SIGINT cleanup. `withLock(folder, fn)` wrapper.
- `lib/platform.ts` — returns `'macos' | 'linux' | 'windows'`.
- `lib/claude.ts` — runs `claude -p --output-format text`, pipes input via stdin, returns stdout.
- `lib/deps.ts` — `checkTool(name)` returns `{ installed, version?, path? }`. `installCommand(platform, name)` dispatches per OS.
- `lib/resolve.ts` — accepts abs path, `<kind>/<slug>`, bare slug, or cwd; returns absolute project folder.
- `pipeline/download.ts` — yt-dlp metadata + video download (1080p cap) + EN captions.
- `pipeline/transcribe.ts` — ffmpeg audio extract + whisper.cpp run + parse JSON + write markdown + lang detect.
- `pipeline/translate.ts` — `translate()` does verbatim (if source≠IT) + always rewrite to `script-it.md`.
- `pipeline/overlay.ts` — `generateOverlays(folder, title, count?)` via `claude.ts`.
- `cli/commands/*.tsx` — thin Ink render layer per command, validates args, calls pipeline, updates metadata.
- `cli/cli.ts` — Commander program registering subcommands, no business logic.

---

## Task 0: Remove unused foundation (FSM, Runner, Registry, Prisma video models)

The foundation work created XState-based scaffolding plus 5 Prisma tables. The clionfire-pure design throws away all of that.

**Files:**
- Delete: `packages/video-pipeline/src/fsm/machine.ts`
- Delete: `packages/video-pipeline/src/fsm/machine.test.ts`
- Delete: `packages/video-pipeline/src/runner/runner.ts`
- Delete: `packages/video-pipeline/src/runner/runner.test.ts`
- Delete: `packages/video-pipeline/src/stages/registry.ts`
- Delete: `packages/video-pipeline/src/stages/registry.test.ts`
- Delete: `packages/video-pipeline/src/stages/noop.ts`
- Delete: `packages/video-pipeline/src/cli/commands/new.ts`
- Delete: `packages/video-pipeline/src/types.ts`
- Delete: `packages/database/src/services/video-project.service.ts`
- Delete: `packages/database/src/__tests__/services/video-project.service.test.ts`
- Delete: `docs/superpowers/plans/2026-05-12-video-pipeline-foundation.md`
- Modify: `packages/database/prisma/schema.prisma` (drop video enums + models + `User.videoProjects` relation)
- Modify: `packages/database/src/services/index.ts` (drop service export)

- [ ] **Step 1: Delete the FSM/runner/registry directories.**

```bash
rm -rf packages/video-pipeline/src/fsm
rm -rf packages/video-pipeline/src/runner
rm -rf packages/video-pipeline/src/stages
rm packages/video-pipeline/src/cli/commands/new.ts
rm packages/video-pipeline/src/types.ts
```

- [ ] **Step 2: Delete the obsolete Prisma service files.**

```bash
rm packages/database/src/services/video-project.service.ts
rm packages/database/src/__tests__/services/video-project.service.test.ts
```

- [ ] **Step 3: Remove the service export from the services barrel.**

Open `packages/database/src/services/index.ts`. Delete the line:

```ts
export * from "./video-project.service";
```

- [ ] **Step 4: Drop video pipeline enums + models from the Prisma schema.**

Open `packages/database/prisma/schema.prisma`. Delete the entire block starting with `// ============ Video pipeline ============` through the end of `model Publication { ... }`. Also delete the `videoProjects VideoProject[]` line inside `model User`.

Confirm via `grep`:

```bash
grep -cE "VideoProject|VideoStage|RenderTarget|RecordingMode|OverlayEngine|PublishTarget|SourceReference|model Recording|model Render|model Publication" packages/database/prisma/schema.prisma
```

Expected: 0.

- [ ] **Step 5: Format the schema.**

Run: `pnpm --filter @allonfire/database exec prisma format`
Expected: schema rewritten in canonical style, no errors.

- [ ] **Step 6: Regenerate the Prisma client.**

Run: `pnpm --filter @allonfire/database exec prisma generate`
Expected: `Generated Prisma Client` message, no `VideoProject` model in `packages/database/generated/prisma/models/`.

- [ ] **Step 7: Delete the obsolete foundation plan file.**

```bash
rm docs/superpowers/plans/2026-05-12-video-pipeline-foundation.md
```

- [ ] **Step 8: Type-check the database package.**

```bash
cd packages/database && pnpm exec tsc --noEmit && cd ../..
```

Expected: no output (exit 0).

- [ ] **Step 9: Commit the cleanup.**

```bash
git add packages/database packages/video-pipeline/src docs/superpowers/plans
git commit -m "chore(video-pipeline): remove unused FSM/Prisma foundation"
```

---

## Task 1: Update CONTEXT.md and write ADR-0003

**Files:**
- Modify: `CONTEXT.md`
- Modify: `docs/adr/0002-all-local-video-pipeline.md`
- Create: `docs/adr/0003-clionfire-pure-cli.md`

- [ ] **Step 1: Update CONTEXT.md "Resolved decisions" table.**

Open `CONTEXT.md`. Find the rows with `Orchestration` and `Data model`. Replace them with:

```markdown
| Orchestration | 6-command CLI (`install`, `download`, `transcribe`, `translate`, `overlay`, `list`) under `@allonfire/video-pipeline`. Stage-per-command, idempotent, filesystem-driven. No FSM, no Prisma. |
| Data model | `<projectRoot>/metadata.json` per project. Tri-state stages: `null` / `{at}` / `{failedAt, error}`. Artifacts colocated: `video.mp4`, `captions-en.vtt`, `transcript.md`, `transcript.json`, `transcript-it.md`, `script-it.md`, `overlay.md`. |
| Project layout | `$VIDEO_WORK_DIR/{shorts,normal}/<YYYY-MM-DD>-<italian-slug>/`. Env `VIDEO_WORK_DIR` default `/Volumes/Crucial-4T/video`. |
```

- [ ] **Step 2: Add the v1 CLI section to CONTEXT.md.**

Append before the `## Open branches` section:

```markdown
## v1 CLI commands

| Command | Purpose | Inputs | Outputs |
|---|---|---|---|
| `install` | Auto-install `yt-dlp`, `ffmpeg`, `whisper-cpp` + download whisper model. Per-OS dispatch: brew/winget/curl. | `[tool...]` `[--check]` `[--force]` | binaries on PATH; `~/.allonfire/models/ggml-large-v3.bin` |
| `download` | Fetch source YT video (1080p cap) + EN captions + metadata.json scaffold. | `<yt-url> --kind <shorts\|normal> --title "<IT title>" [--date YYYY-MM-DD] [--quality 4k\|1080p\|720p]` | `video.mp4`, `captions-en.vtt?`, `metadata.json` |
| `transcribe` | Extract audio via ffmpeg, run whisper.cpp `large-v3`, write verbatim source transcript. Auto-detect source language. | `<project> [--force]` | `transcript.md`, `transcript.json`, updates `metadata.source.language` |
| `translate` | Pass 1: if source ≠ IT, translate verbatim via Claude Code CLI. Pass 2 (always): rewrite into IT extempore voice. | `<project> [--force]` | `transcript-it.md`, `script-it.md` |
| `overlay` | Generate overlay library: independent items drawn from source content, prose "moment" anchors, closed kind list. | `<project> [--force] [--count N]` | `overlay.md` |
| `list` | Filesystem walk of all projects. Table view with stage checkboxes. | `[--kind ...] [--status pending\|failed\|done]` | stdout |
```

- [ ] **Step 3: Revise ADR-0002.**

Open `docs/adr/0002-all-local-video-pipeline.md`. Find any paragraph referencing "XState FSM", "Prisma checkpoints", or "VideoProject row" and replace them with:

> Stage state lives in `<project>/metadata.json` (tri-state per stage). Each CLI command is idempotent and self-contained; rerun = skip if done unless `--force`. No FSM, no Prisma — filesystem is ground truth.

- [ ] **Step 4: Create ADR-0003.**

Create `docs/adr/0003-clionfire-pure-cli.md`:

```markdown
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
```

- [ ] **Step 5: Commit docs.**

```bash
git add CONTEXT.md docs/adr/0002-all-local-video-pipeline.md docs/adr/0003-clionfire-pure-cli.md
git commit -m "docs(video): rewrite design — clionfire-pure CLI, no FSM/Prisma"
```

---

## Task 2: Rewrite `package.json` — drop xstate, add Ink/React/chalk

**Files:**
- Modify: `packages/video-pipeline/package.json`
- Modify: `packages/video-pipeline/tsconfig.json`

- [ ] **Step 1: Replace the package manifest.**

Overwrite `packages/video-pipeline/package.json` with:

```json
{
  "name": "@allonfire/video-pipeline",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./env": "./src/env.ts"
  },
  "bin": {
    "video-pipeline": "./src/cli/cli.ts"
  },
  "scripts": {
    "test": "vitest run",
    "check-types": "tsc --noEmit",
    "video": "tsx --env-file=../../.env src/cli/cli.ts"
  },
  "dependencies": {
    "@t3-oss/env-core": "^0.13.10",
    "chalk": "^5.6.2",
    "commander": "^12.1.0",
    "ink": "^6.8.0",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "react": "^19.2.4",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "tsx": "^4.19.0",
    "typescript": "~5.8.2",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: Update `tsconfig.json` to support JSX.**

Overwrite `packages/video-pipeline/tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Preserve",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 3: Install new deps + prune old.**

Run: `pnpm install --filter @allonfire/video-pipeline`
Expected: `xstate` gone; `ink`, `react`, `chalk` present in `pnpm-lock.yaml`.

- [ ] **Step 4: Commit.**

```bash
git add packages/video-pipeline/package.json packages/video-pipeline/tsconfig.json pnpm-lock.yaml
git commit -m "chore(video-pipeline): switch deps to ink/react/chalk, drop xstate"
```

---

## Task 3: Rewrite `errors.ts`

**Files:**
- Modify: `packages/video-pipeline/src/errors.ts`

- [ ] **Step 1: Replace contents.**

Overwrite `packages/video-pipeline/src/errors.ts` with:

```ts
export class PipelineError extends Error {
  readonly stage: string;
  readonly projectFolder: string;
  readonly cause?: unknown;

  constructor(
    stage: string,
    projectFolder: string,
    message: string,
    cause?: unknown
  ) {
    super(`[${stage}] ${message}`);
    this.stage = stage;
    this.projectFolder = projectFolder;
    this.cause = cause;
    this.name = "PipelineError";
  }
}

export class ToolMissingError extends Error {
  readonly tool: string;

  constructor(tool: string) {
    super(
      `Required tool '${tool}' not found. Run \`pnpm video install ${tool}\` to install it.`
    );
    this.tool = tool;
    this.name = "ToolMissingError";
  }
}

export class LockHeldError extends Error {
  readonly projectFolder: string;
  readonly holderPid: number;

  constructor(projectFolder: string, holderPid: number) {
    super(
      `Project '${projectFolder}' is locked by another process (pid ${holderPid}).`
    );
    this.projectFolder = projectFolder;
    this.holderPid = holderPid;
    this.name = "LockHeldError";
  }
}
```

- [ ] **Step 2: Commit.**

```bash
git add packages/video-pipeline/src/errors.ts
git commit -m "feat(video-pipeline): define PipelineError/ToolMissingError/LockHeldError"
```

---

## Task 4: Rewrite `env.ts`

**Files:**
- Modify: `packages/video-pipeline/src/env.ts`

- [ ] **Step 1: Replace contents.**

Overwrite `packages/video-pipeline/src/env.ts` with:

```ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    VIDEO_WORK_DIR: z.string().min(1).default("/Volumes/Crucial-4T/video"),
    VIDEO_MUSIC_DIR: z
      .string()
      .min(1)
      .default("/Volumes/Crucial-4T/video/sound"),
    WHISPER_MODEL: z.string().min(1).default("large-v3"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

- [ ] **Step 2: Commit.**

```bash
git add packages/video-pipeline/src/env.ts
git commit -m "feat(video-pipeline): expose VIDEO_WORK_DIR/VIDEO_MUSIC_DIR/WHISPER_MODEL env"
```

---

## Task 5: `lib/paths.ts` — folder layout helpers (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/paths.ts`
- Create: `packages/video-pipeline/src/lib/paths.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/paths.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  audioPath,
  captionsPath,
  lockPath,
  metadataPath,
  overlayPath,
  projectFolder,
  scriptItPath,
  transcriptItPath,
  transcriptJsonPath,
  transcriptPath,
  videoPath,
} from "./paths";

const WORK = "/work";

describe("paths", () => {
  it("computes project folder under <work>/<kind>/<date>-<slug>", () => {
    expect(projectFolder(WORK, "normal", "2026-05-13", "fsm-spiegata")).toBe(
      "/work/normal/2026-05-13-fsm-spiegata"
    );
    expect(projectFolder(WORK, "shorts", "2026-05-13", "tldr")).toBe(
      "/work/shorts/2026-05-13-tldr"
    );
  });

  it("computes per-artifact paths inside the project folder", () => {
    const f = "/work/normal/2026-05-13-x";
    expect(videoPath(f)).toBe("/work/normal/2026-05-13-x/video.mp4");
    expect(audioPath(f)).toBe("/work/normal/2026-05-13-x/audio.wav");
    expect(captionsPath(f, "en")).toBe(
      "/work/normal/2026-05-13-x/captions-en.vtt"
    );
    expect(transcriptPath(f)).toBe("/work/normal/2026-05-13-x/transcript.md");
    expect(transcriptJsonPath(f)).toBe(
      "/work/normal/2026-05-13-x/transcript.json"
    );
    expect(transcriptItPath(f)).toBe(
      "/work/normal/2026-05-13-x/transcript-it.md"
    );
    expect(scriptItPath(f)).toBe("/work/normal/2026-05-13-x/script-it.md");
    expect(overlayPath(f)).toBe("/work/normal/2026-05-13-x/overlay.md");
    expect(metadataPath(f)).toBe("/work/normal/2026-05-13-x/metadata.json");
    expect(lockPath(f)).toBe("/work/normal/2026-05-13-x/.lock");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- paths.test.ts`
Expected: `Cannot find module './paths'`.

- [ ] **Step 3: Implement `lib/paths.ts`.**

Create `packages/video-pipeline/src/lib/paths.ts`:

```ts
import { join } from "node:path";

export type ProjectKind = "shorts" | "normal";

export function projectFolder(
  workDir: string,
  kind: ProjectKind,
  date: string,
  slug: string
): string {
  return join(workDir, kind, `${date}-${slug}`);
}

export function videoPath(folder: string): string {
  return join(folder, "video.mp4");
}

export function audioPath(folder: string): string {
  return join(folder, "audio.wav");
}

export function captionsPath(folder: string, lang: string): string {
  return join(folder, `captions-${lang}.vtt`);
}

export function transcriptPath(folder: string): string {
  return join(folder, "transcript.md");
}

export function transcriptJsonPath(folder: string): string {
  return join(folder, "transcript.json");
}

export function transcriptItPath(folder: string): string {
  return join(folder, "transcript-it.md");
}

export function scriptItPath(folder: string): string {
  return join(folder, "script-it.md");
}

export function overlayPath(folder: string): string {
  return join(folder, "overlay.md");
}

export function metadataPath(folder: string): string {
  return join(folder, "metadata.json");
}

export function lockPath(folder: string): string {
  return join(folder, ".lock");
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- paths.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/paths.ts packages/video-pipeline/src/lib/paths.test.ts
git commit -m "feat(video-pipeline): add filesystem layout helpers"
```

---

## Task 6: `lib/slug.ts` — italian title slugifier (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/slug.ts`
- Create: `packages/video-pipeline/src/lib/slug.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and dash-separates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips italian accents", () => {
    expect(slugify("Perché così è")).toBe("perche-cosi-e");
    expect(slugify("È più bello")).toBe("e-piu-bello");
  });

  it("drops punctuation", () => {
    expect(slugify("FSM, spiegata bene!")).toBe("fsm-spiegata-bene");
  });

  it("collapses repeated dashes", () => {
    expect(slugify("a  --  b")).toBe("a-b");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("  --hello-- ")).toBe("hello");
  });

  it("throws on empty result", () => {
    expect(() => slugify("!!!")).toThrow(/empty slug/i);
    expect(() => slugify("")).toThrow(/empty slug/i);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- slug.test.ts`
Expected: `Cannot find module './slug'`.

- [ ] **Step 3: Implement `lib/slug.ts`.**

Create `packages/video-pipeline/src/lib/slug.ts`:

```ts
export function slugify(input: string): string {
  const normalized = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (normalized.length === 0) {
    throw new Error(`Empty slug produced from input: ${JSON.stringify(input)}`);
  }
  return normalized;
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- slug.test.ts`
Expected: 6 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/slug.ts packages/video-pipeline/src/lib/slug.test.ts
git commit -m "feat(video-pipeline): add italian-aware slugifier"
```

---

## Task 7: `lib/metadata.ts` — metadata.json read/write (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/metadata.ts`
- Create: `packages/video-pipeline/src/lib/metadata.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/metadata.test.ts`:

```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  initMetadata,
  markStageDone,
  markStageFailed,
  type ProjectMetadata,
  readMetadata,
  updateSourceLanguage,
} from "./metadata";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "video-pipeline-metadata-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function initFakeProject(folder: string): void {
  initMetadata(folder, {
    kind: "normal",
    title: "X",
    slug: "x",
    date: "2026-05-13",
    source: {
      url: "https://youtu.be/x",
      youtubeId: "x",
      title: "X",
      duration: 60,
      thumbnail: undefined,
      language: null,
    },
  });
}

describe("metadata", () => {
  it("initialises a fresh metadata.json with stages all null", () => {
    initMetadata(tmp, {
      kind: "normal",
      title: "FSM Spiegata",
      slug: "fsm-spiegata",
      date: "2026-05-13",
      source: {
        url: "https://youtu.be/abc",
        youtubeId: "abc",
        title: "Why FSMs",
        duration: 743,
        thumbnail: "https://t.example/x.jpg",
        language: null,
      },
    });
    const m = readMetadata(tmp);
    expect(m).not.toBeNull();
    expect(m?.kind).toBe("normal");
    expect(m?.slug).toBe("fsm-spiegata");
    expect(m?.stages).toEqual({
      downloaded: null,
      transcribed: null,
      translated: null,
      overlayed: null,
    });
    expect(m?.source.language).toBeNull();
  });

  it("readMetadata returns null when file missing", () => {
    expect(readMetadata(tmp)).toBeNull();
  });

  it("markStageDone records timestamp on the given stage", () => {
    initFakeProject(tmp);
    markStageDone(tmp, "downloaded");
    const m = readMetadata(tmp) as ProjectMetadata;
    const rec = m.stages.downloaded;
    expect(rec).not.toBeNull();
    if (rec && "at" in rec) {
      expect(rec.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
    expect(m.stages.transcribed).toBeNull();
  });

  it("markStageFailed records error string + timestamp", () => {
    initFakeProject(tmp);
    markStageFailed(tmp, "transcribed", "whisper crashed");
    const m = readMetadata(tmp) as ProjectMetadata;
    const rec = m.stages.transcribed;
    expect(rec && "failedAt" in rec && rec.error === "whisper crashed").toBe(true);
  });

  it("updateSourceLanguage persists the detected language", () => {
    initFakeProject(tmp);
    updateSourceLanguage(tmp, "en");
    const m = readMetadata(tmp) as ProjectMetadata;
    expect(m.source.language).toBe("en");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- metadata.test.ts`
Expected: `Cannot find module './metadata'`.

- [ ] **Step 3: Implement `lib/metadata.ts`.**

Create `packages/video-pipeline/src/lib/metadata.ts`:

```ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ProjectKind } from "./paths";
import { metadataPath } from "./paths";

export type StageRecord =
  | null
  | { at: string }
  | { failedAt: string; error: string };

export type StageName =
  | "downloaded"
  | "transcribed"
  | "translated"
  | "overlayed";

export type ProjectMetadata = {
  kind: ProjectKind;
  title: string;
  slug: string;
  date: string;
  folder?: string;
  source: {
    url: string;
    youtubeId: string;
    title: string;
    duration: number;
    thumbnail?: string;
    language: string | null;
  };
  stages: Record<StageName, StageRecord>;
  createdAt: string;
  updatedAt: string;
};

export type InitInput = Omit<
  ProjectMetadata,
  "stages" | "createdAt" | "updatedAt" | "folder"
>;

export function initMetadata(folder: string, input: InitInput): ProjectMetadata {
  const now = new Date().toISOString();
  const m: ProjectMetadata = {
    ...input,
    folder,
    stages: {
      downloaded: null,
      transcribed: null,
      translated: null,
      overlayed: null,
    },
    createdAt: now,
    updatedAt: now,
  };
  writeMetadata(folder, m);
  return m;
}

export function readMetadata(folder: string): ProjectMetadata | null {
  const path = metadataPath(folder);
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf-8")) as ProjectMetadata;
}

export function writeMetadata(folder: string, m: ProjectMetadata): void {
  const updated = { ...m, updatedAt: new Date().toISOString() };
  writeFileSync(metadataPath(folder), JSON.stringify(updated, null, 2));
}

function mutate(
  folder: string,
  mutator: (m: ProjectMetadata) => void
): ProjectMetadata {
  const m = readMetadata(folder);
  if (!m) {
    throw new Error(`No metadata.json in ${folder}`);
  }
  mutator(m);
  writeMetadata(folder, m);
  return m;
}

export function markStageDone(folder: string, stage: StageName): void {
  mutate(folder, (m) => {
    m.stages[stage] = { at: new Date().toISOString() };
  });
}

export function markStageFailed(
  folder: string,
  stage: StageName,
  error: string
): void {
  mutate(folder, (m) => {
    m.stages[stage] = { failedAt: new Date().toISOString(), error };
  });
}

export function updateSourceLanguage(folder: string, lang: string): void {
  mutate(folder, (m) => {
    m.source.language = lang;
  });
}

export function isStageDone(stage: StageRecord): boolean {
  return stage !== null && "at" in stage;
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- metadata.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/metadata.ts packages/video-pipeline/src/lib/metadata.test.ts
git commit -m "feat(video-pipeline): add metadata.json schema + helpers"
```

---

## Task 8: `lib/lock.ts` — project-wide lock with SIGINT cleanup (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/lock.ts`
- Create: `packages/video-pipeline/src/lib/lock.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/lock.test.ts`:

```ts
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LockHeldError } from "../errors";
import { acquireLock, releaseLock, withLock } from "./lock";
import { lockPath } from "./paths";

let folder: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-lock-"));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("lock", () => {
  it("creates a .lock file with current pid", () => {
    acquireLock(folder);
    const content = readFileSync(lockPath(folder), "utf-8");
    expect(JSON.parse(content)).toMatchObject({ pid: process.pid });
    releaseLock(folder);
  });

  it("releaseLock removes the file", () => {
    acquireLock(folder);
    releaseLock(folder);
    expect(existsSync(lockPath(folder))).toBe(false);
  });

  it("throws LockHeldError when already locked by another live pid", () => {
    writeFileSync(
      lockPath(folder),
      JSON.stringify({ pid: process.pid + 1_000_000, at: new Date().toISOString() })
    );
    expect(() => acquireLock(folder)).toThrow(LockHeldError);
  });

  it("steals stale lock when holder pid is dead", () => {
    writeFileSync(
      lockPath(folder),
      JSON.stringify({ pid: 999_999, at: new Date().toISOString() })
    );
    acquireLock(folder);
    const content = readFileSync(lockPath(folder), "utf-8");
    expect(JSON.parse(content).pid).toBe(process.pid);
    releaseLock(folder);
  });

  it("withLock acquires, runs callback, releases — even on throw", async () => {
    await expect(
      withLock(folder, () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(existsSync(lockPath(folder))).toBe(false);
  });
});
```

NOTE on the "throws when locked by another live pid" test: `process.kill(pid, 0)` returns success only if the pid exists. Using `process.pid + 1_000_000` is heuristic — if you find this flaky, replace it with a child-process spawn that the test holds the pid of explicitly.

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- lock.test.ts`
Expected: `Cannot find module './lock'`.

- [ ] **Step 3: Implement `lib/lock.ts`.**

Create `packages/video-pipeline/src/lib/lock.ts`:

```ts
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { LockHeldError } from "../errors";
import { lockPath } from "./paths";

type LockFile = { pid: number; at: string };

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireLock(folder: string): void {
  const path = lockPath(folder);
  if (existsSync(path)) {
    const holder = JSON.parse(readFileSync(path, "utf-8")) as LockFile;
    if (holder.pid !== process.pid && isPidAlive(holder.pid)) {
      throw new LockHeldError(folder, holder.pid);
    }
    // Stale lock — steal it
  }
  const payload: LockFile = { pid: process.pid, at: new Date().toISOString() };
  writeFileSync(path, JSON.stringify(payload));
}

export function releaseLock(folder: string): void {
  const path = lockPath(folder);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export async function withLock<T>(
  folder: string,
  fn: () => T | Promise<T>
): Promise<T> {
  acquireLock(folder);
  const cleanup = () => {
    releaseLock(folder);
  };
  const onSigint = () => {
    cleanup();
    process.exit(130);
  };
  process.once("SIGINT", onSigint);
  try {
    return await fn();
  } finally {
    process.removeListener("SIGINT", onSigint);
    cleanup();
  }
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- lock.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/lock.ts packages/video-pipeline/src/lib/lock.test.ts
git commit -m "feat(video-pipeline): add project-wide lock with stale-pid stealing"
```

---

## Task 9: `lib/platform.ts` — OS detection (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/platform.ts`
- Create: `packages/video-pipeline/src/lib/platform.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/platform.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectPlatform } from "./platform";

describe("detectPlatform", () => {
  it("maps darwin to macos", () => {
    expect(detectPlatform("darwin")).toBe("macos");
  });

  it("maps linux to linux", () => {
    expect(detectPlatform("linux")).toBe("linux");
  });

  it("maps win32 to windows", () => {
    expect(detectPlatform("win32")).toBe("windows");
  });

  it("throws on unsupported platform", () => {
    expect(() => detectPlatform("aix")).toThrow(/unsupported platform/i);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- platform.test.ts`
Expected: `Cannot find module './platform'`.

- [ ] **Step 3: Implement `lib/platform.ts`.**

Create `packages/video-pipeline/src/lib/platform.ts`:

```ts
export type Platform = "macos" | "linux" | "windows";

export function detectPlatform(nodePlatform: string = process.platform): Platform {
  switch (nodePlatform) {
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      throw new Error(`Unsupported platform: ${nodePlatform}`);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- platform.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/platform.ts packages/video-pipeline/src/lib/platform.test.ts
git commit -m "feat(video-pipeline): add OS platform detection"
```

---

## Task 10: `lib/claude.ts` — Claude Code CLI subprocess (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/claude.ts`
- Create: `packages/video-pipeline/src/lib/claude.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/claude.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

import { runClaude } from "./claude";

function fakeProc(stdout: string, exitCode = 0) {
  return {
    stdout: {
      on(event: string, cb: (chunk: Buffer) => void) {
        if (event === "data") {
          setImmediate(() => cb(Buffer.from(stdout)));
        }
      },
    },
    stderr: {
      on(_event: string, _cb: (chunk: Buffer) => void) {
        // no-op
      },
    },
    stdin: {
      end: vi.fn(),
      write: vi.fn(),
    },
    on(event: string, cb: (code: number) => void) {
      if (event === "close") {
        setImmediate(() => cb(exitCode));
      }
    },
  };
}

describe("runClaude", () => {
  it("invokes `claude -p <prompt> --output-format text`", async () => {
    spawnMock.mockImplementationOnce(() => fakeProc("translated text\n"));
    const out = await runClaude({ prompt: "translate this", input: "hello" });
    expect(out).toBe("translated text\n");
    expect(spawnMock).toHaveBeenCalledWith(
      "claude",
      ["-p", "translate this", "--output-format", "text"],
      expect.any(Object)
    );
  });

  it("rejects when claude exits non-zero", async () => {
    spawnMock.mockImplementationOnce(() => fakeProc("oops", 2));
    await expect(
      runClaude({ prompt: "x", input: "y" })
    ).rejects.toThrow(/exited with code 2/);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- claude.test.ts`
Expected: `Cannot find module './claude'`.

- [ ] **Step 3: Implement `lib/claude.ts`.**

Create `packages/video-pipeline/src/lib/claude.ts`:

```ts
import { spawn } from "node:child_process";

export type RunClaudeOptions = {
  prompt: string;
  input: string;
  cwd?: string;
};

export function runClaude({ prompt, input, cwd }: RunClaudeOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", prompt, "--output-format", "text"],
      { cwd, stdio: ["pipe", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `claude exited with code ${code}. stderr: ${stderr.slice(-500)}`
          )
        );
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- claude.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/claude.ts packages/video-pipeline/src/lib/claude.test.ts
git commit -m "feat(video-pipeline): add Claude Code CLI subprocess wrapper"
```

---

## Task 11: `lib/deps.ts` — check + install yt-dlp/ffmpeg/whisper-cpp per OS (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/deps.ts`
- Create: `packages/video-pipeline/src/lib/deps.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/deps.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const execMock = vi.fn();

vi.mock("node:child_process", () => ({
  exec: (cmd: string, cb: (err: Error | null, out?: { stdout: string }) => void) =>
    execMock(cmd, cb),
}));

import { checkTool, installCommand, KNOWN_TOOLS } from "./deps";

describe("checkTool", () => {
  it("returns installed=false when which fails", async () => {
    execMock.mockImplementation((_cmd, cb) => cb(new Error("not found")));
    const result = await checkTool("yt-dlp");
    expect(result).toEqual({ installed: false });
  });
});

describe("installCommand", () => {
  it("dispatches brew on macos", () => {
    expect(installCommand("macos", "yt-dlp")).toEqual([
      "brew",
      ["install", "yt-dlp"],
    ]);
  });

  it("dispatches winget on windows", () => {
    const [cmd, args] = installCommand("windows", "ffmpeg");
    expect(cmd).toBe("winget");
    expect(args).toContain("install");
    expect(args).toContain("-e");
  });

  it("dispatches sh -c on linux", () => {
    const [cmd, args] = installCommand("linux", "yt-dlp");
    expect(cmd).toBe("sh");
    expect(args[0]).toBe("-c");
    expect(args[1]).toContain("yt-dlp");
  });
});

describe("KNOWN_TOOLS", () => {
  it("lists yt-dlp, ffmpeg, whisper-cpp", () => {
    expect(KNOWN_TOOLS).toEqual(["yt-dlp", "ffmpeg", "whisper-cpp"]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- deps.test.ts`
Expected: `Cannot find module './deps'`.

- [ ] **Step 3: Implement `lib/deps.ts`.**

Create `packages/video-pipeline/src/lib/deps.ts`:

```ts
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Platform } from "./platform";

const execp = promisify(exec);

export const KNOWN_TOOLS = ["yt-dlp", "ffmpeg", "whisper-cpp"] as const;
export type Tool = (typeof KNOWN_TOOLS)[number];

export type ToolStatus =
  | { installed: false }
  | { installed: true; path: string; version: string };

const VERSION_ARGS: Record<Tool, string> = {
  "yt-dlp": "--version",
  ffmpeg: "-version",
  "whisper-cpp": "--help",
};

const BIN_NAMES: Record<Tool, string[]> = {
  "yt-dlp": ["yt-dlp"],
  ffmpeg: ["ffmpeg"],
  "whisper-cpp": ["whisper-cli", "whisper-cpp", "whisper"],
};

async function which(name: string): Promise<string | null> {
  try {
    const { stdout } = await execp(
      process.platform === "win32" ? `where ${name}` : `which ${name}`
    );
    return stdout.trim().split("\n")[0] ?? null;
  } catch {
    return null;
  }
}

async function detectVersion(bin: string, args: string): Promise<string> {
  try {
    const { stdout } = await execp(`"${bin}" ${args}`);
    const firstLine = stdout.trim().split("\n")[0] ?? "";
    const match = firstLine.match(/(\d+\.[\d.]+|\d{4}\.\d{2}\.\d{2})/);
    return match ? match[1] : firstLine.slice(0, 32);
  } catch {
    return "unknown";
  }
}

export async function checkTool(tool: Tool): Promise<ToolStatus> {
  for (const name of BIN_NAMES[tool]) {
    const path = await which(name);
    if (path) {
      const version = await detectVersion(name, VERSION_ARGS[tool]);
      return { installed: true, path, version };
    }
  }
  return { installed: false };
}

export function installCommand(
  platform: Platform,
  tool: Tool
): [string, string[]] {
  if (platform === "macos") {
    return ["brew", ["install", tool]];
  }
  if (platform === "windows") {
    const wingetId: Record<Tool, string> = {
      "yt-dlp": "yt-dlp.yt-dlp",
      ffmpeg: "Gyan.FFmpeg",
      "whisper-cpp": "ggerganov.whisper-cpp",
    };
    return [
      "winget",
      [
        "install",
        "--id",
        wingetId[tool],
        "-e",
        "--accept-source-agreements",
        "--accept-package-agreements",
      ],
    ];
  }
  // linux
  const linuxScript: Record<Tool, string> = {
    "yt-dlp":
      'mkdir -p "$HOME/.local/bin" && curl -L -o "$HOME/.local/bin/yt-dlp" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x "$HOME/.local/bin/yt-dlp"',
    ffmpeg:
      "(sudo apt-get update && sudo apt-get install -y ffmpeg) || (sudo dnf install -y ffmpeg)",
    "whisper-cpp":
      "git clone https://github.com/ggerganov/whisper.cpp /tmp/whisper.cpp && cd /tmp/whisper.cpp && make -j && sudo cp main /usr/local/bin/whisper-cli",
  };
  return ["sh", ["-c", linuxScript[tool]]];
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- deps.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/deps.ts packages/video-pipeline/src/lib/deps.test.ts
git commit -m "feat(video-pipeline): add tool check/install dispatch per OS"
```

---

## Task 12: `lib/resolve.ts` — hybrid project resolver (TDD)

**Files:**
- Create: `packages/video-pipeline/src/lib/resolve.ts`
- Create: `packages/video-pipeline/src/lib/resolve.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/lib/resolve.test.ts`:

```ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveProjectFolder } from "./resolve";

let work: string;

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "video-pipeline-resolve-"));
  mkdirSync(join(work, "normal", "2026-05-13-fsm-spiegata"), { recursive: true });
  mkdirSync(join(work, "shorts", "2026-05-13-cosi-fsm"), { recursive: true });
  writeFileSync(
    join(work, "normal", "2026-05-13-fsm-spiegata", "metadata.json"),
    "{}"
  );
  writeFileSync(
    join(work, "shorts", "2026-05-13-cosi-fsm", "metadata.json"),
    "{}"
  );
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

describe("resolveProjectFolder", () => {
  it("accepts absolute path verbatim", () => {
    const folder = join(work, "normal", "2026-05-13-fsm-spiegata");
    expect(resolveProjectFolder(folder, work)).toBe(folder);
  });

  it("accepts <kind>/<slug>", () => {
    expect(
      resolveProjectFolder("normal/2026-05-13-fsm-spiegata", work)
    ).toBe(join(work, "normal", "2026-05-13-fsm-spiegata"));
  });

  it("accepts bare slug — searches both kinds", () => {
    expect(resolveProjectFolder("2026-05-13-fsm-spiegata", work)).toBe(
      join(work, "normal", "2026-05-13-fsm-spiegata")
    );
    expect(resolveProjectFolder("2026-05-13-cosi-fsm", work)).toBe(
      join(work, "shorts", "2026-05-13-cosi-fsm")
    );
  });

  it("falls back to cwd when arg is empty", () => {
    const folder = join(work, "normal", "2026-05-13-fsm-spiegata");
    expect(resolveProjectFolder("", work, folder)).toBe(folder);
  });

  it("throws if slug unresolved", () => {
    expect(() => resolveProjectFolder("does-not-exist", work)).toThrow(
      /could not resolve/i
    );
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- resolve.test.ts`
Expected: `Cannot find module './resolve'`.

- [ ] **Step 3: Implement `lib/resolve.ts`.**

Create `packages/video-pipeline/src/lib/resolve.ts`:

```ts
import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { ProjectKind } from "./paths";

const KINDS: ProjectKind[] = ["normal", "shorts"];

export function resolveProjectFolder(
  arg: string,
  workDir: string,
  cwd: string = process.cwd()
): string {
  if (arg.length === 0) {
    if (existsSync(join(cwd, "metadata.json"))) {
      return cwd;
    }
    throw new Error(
      "No project arg and cwd is not a project folder (missing metadata.json)."
    );
  }

  if (isAbsolute(arg)) {
    if (!existsSync(arg)) {
      throw new Error(`Could not resolve project: ${arg} does not exist.`);
    }
    return arg;
  }

  const parts = arg.split("/");
  if (parts.length === 2 && (KINDS as string[]).includes(parts[0])) {
    const candidate = join(workDir, parts[0], parts[1]);
    if (existsSync(candidate)) {
      return candidate;
    }
    throw new Error(`Could not resolve project: ${candidate} does not exist.`);
  }

  for (const kind of KINDS) {
    const candidate = join(workDir, kind, arg);
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve project: ${arg}`);
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- resolve.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/lib/resolve.ts packages/video-pipeline/src/lib/resolve.test.ts
git commit -m "feat(video-pipeline): hybrid project resolver (path | kind/slug | slug | cwd)"
```

---

## Task 13: `pipeline/types.ts` — shared pipeline types

**Files:**
- Create: `packages/video-pipeline/src/pipeline/types.ts`

- [ ] **Step 1: Create the file.**

```ts
export type ProgressCallback = (percent: number, message: string) => void;

export type VideoInfo = {
  title: string;
  duration: number;
  youtubeId: string;
  thumbnail?: string;
};

export type DownloadResult = {
  folder: string;
  videoPath: string;
  info: VideoInfo;
  captionsPath?: string;
};

export type TranscriptSegment = {
  startTime: number;
  endTime: number;
  text: string;
};

export type TranscribeResult = {
  segments: TranscriptSegment[];
  language: string;
};
```

- [ ] **Step 2: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add packages/video-pipeline/src/pipeline/types.ts
git commit -m "feat(video-pipeline): define pipeline shared types"
```

---

## Task 14: `pipeline/download.ts` — yt-dlp wrapper (TDD)

**Files:**
- Create: `packages/video-pipeline/src/pipeline/download.ts`
- Create: `packages/video-pipeline/src/pipeline/download.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/pipeline/download.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractYoutubeId } from "./download";

describe("extractYoutubeId", () => {
  it("extracts from watch?v= URL", () => {
    expect(extractYoutubeId("https://www.youtube.com/watch?v=abc123XYZ_-")).toBe(
      "abc123XYZ_-"
    );
  });

  it("extracts from youtu.be short URL", () => {
    expect(extractYoutubeId("https://youtu.be/abc123XYZ_-")).toBe(
      "abc123XYZ_-"
    );
  });

  it("extracts from shorts URL", () => {
    expect(extractYoutubeId("https://youtube.com/shorts/abc123XYZ_-")).toBe(
      "abc123XYZ_-"
    );
  });

  it("extracts from embed URL", () => {
    expect(extractYoutubeId("https://youtube.com/embed/abc123XYZ_-")).toBe(
      "abc123XYZ_-"
    );
  });

  it("throws on non-YT URL", () => {
    expect(() => extractYoutubeId("https://vimeo.com/12345")).toThrow(
      /cannot extract/i
    );
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- download.test.ts`
Expected: `Cannot find module './download'`.

- [ ] **Step 3: Implement `pipeline/download.ts`.**

Create `packages/video-pipeline/src/pipeline/download.ts`:

```ts
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { captionsPath, videoPath } from "../lib/paths";
import type {
  DownloadResult,
  ProgressCallback,
  VideoInfo,
} from "./types";

const YT_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
];

export function extractYoutubeId(url: string): string {
  for (const pattern of YT_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  throw new Error(`Cannot extract YouTube video ID from: ${url}`);
}

export function getVideoInfo(url: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", ["--dump-json", "--no-download", url]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp metadata failed (${code}): ${stderr.slice(-300)}`));
        return;
      }
      try {
        const json = JSON.parse(stdout);
        resolve({
          title: json.title ?? "Untitled",
          duration: json.duration ?? 0,
          youtubeId: json.id ?? extractYoutubeId(url),
          thumbnail: json.thumbnail,
        });
      } catch (e) {
        reject(new Error(`Failed to parse yt-dlp JSON: ${e}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start yt-dlp: ${err.message}`))
    );
  });
}

export type Quality = "4k" | "1080p" | "720p";

const QUALITY_HEIGHT: Record<Quality, number> = {
  "4k": 2160,
  "1080p": 1080,
  "720p": 720,
};

export async function downloadVideo(
  url: string,
  folder: string,
  quality: Quality,
  onProgress: ProgressCallback
): Promise<DownloadResult> {
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }
  const info = await getVideoInfo(url);
  const target = videoPath(folder);

  if (existsSync(target)) {
    onProgress(100, "Video already downloaded");
    return { folder, videoPath: target, info };
  }

  onProgress(5, "Starting download…");

  const heightCap = QUALITY_HEIGHT[quality];
  const formatSelector = `bestvideo[height<=${heightCap}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${heightCap}][ext=mp4]/best`;

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("yt-dlp", [
      "-f",
      formatSelector,
      "--merge-output-format",
      "mp4",
      "--newline",
      "--progress",
      "-o",
      target,
      url,
    ]);
    let lastPct = 5;
    const onChunk = (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/\[download\]\s+(\d+\.?\d*)%/);
      if (match) {
        const pct = Math.min(Math.floor(Number.parseFloat(match[1])), 99);
        if (pct > lastPct) {
          lastPct = pct;
          onProgress(pct, `Downloading ${pct}%`);
        }
      }
    };
    proc.stdout.on("data", onChunk);
    proc.stderr.on("data", onChunk);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start yt-dlp: ${err.message}`))
    );
  });

  onProgress(100, "Download complete");
  return { folder, videoPath: target, info };
}

export function downloadCaptions(url: string, folder: string): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const target = captionsPath(folder, "en");
    if (existsSync(target)) {
      resolve(target);
      return;
    }
    const proc = spawn("yt-dlp", [
      "--write-auto-subs",
      "--write-subs",
      "--sub-langs",
      "en",
      "--sub-format",
      "vtt",
      "--skip-download",
      "-o",
      `${folder}/source.%(ext)s`,
      url,
    ]);
    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", () => {
      const candidates = [
        `${folder}/source.en.vtt`,
        `${folder}/source.en-US.vtt`,
        `${folder}/source.en-orig.vtt`,
      ];
      const found = candidates.find((p) => existsSync(p));
      if (!found) {
        resolve(undefined);
        return;
      }
      try {
        renameSync(found, target);
        resolve(target);
      } catch (e) {
        reject(new Error(`Failed to rename captions: ${e}. stderr: ${stderr.slice(-200)}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start yt-dlp captions: ${err.message}`))
    );
  });
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- download.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/pipeline/download.ts packages/video-pipeline/src/pipeline/download.test.ts
git commit -m "feat(video-pipeline): yt-dlp wrapper for video + EN captions"
```

---

## Task 15: `pipeline/transcribe.ts` — ffmpeg + whisper.cpp (TDD)

**Files:**
- Create: `packages/video-pipeline/src/pipeline/transcribe.ts`
- Create: `packages/video-pipeline/src/pipeline/transcribe.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/pipeline/transcribe.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  formatTimestamp,
  parseWhisperJson,
  renderTranscriptMarkdown,
} from "./transcribe";

describe("transcribe helpers", () => {
  it("parses whisper.cpp JSON with offsets in ms", () => {
    const raw = {
      transcription: [
        { offsets: { from: 0, to: 1500 }, text: " Hello world." },
        { offsets: { from: 1500, to: 3000 }, text: " Second." },
      ],
      result: { language: "en" },
    };
    const result = parseWhisperJson(raw);
    expect(result.language).toBe("en");
    expect(result.segments).toEqual([
      { startTime: 0, endTime: 1.5, text: "Hello world." },
      { startTime: 1.5, endTime: 3, text: "Second." },
    ]);
  });

  it("formatTimestamp produces HH:MM:SS", () => {
    expect(formatTimestamp(0)).toBe("00:00:00");
    expect(formatTimestamp(59.9)).toBe("00:00:59");
    expect(formatTimestamp(60)).toBe("00:01:00");
    expect(formatTimestamp(3725)).toBe("01:02:05");
  });

  it("renders transcript markdown with [HH:MM:SS] prefix per segment", () => {
    const md = renderTranscriptMarkdown(
      [
        { startTime: 0, endTime: 2, text: "Hello." },
        { startTime: 2, endTime: 5, text: "World." },
      ],
      "en"
    );
    expect(md).toContain("**Source language:** en");
    expect(md).toContain("[00:00:00] Hello.");
    expect(md).toContain("[00:00:02] World.");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- transcribe.test.ts`
Expected: `Cannot find module './transcribe'`.

- [ ] **Step 3: Implement `pipeline/transcribe.ts`.**

Create `packages/video-pipeline/src/pipeline/transcribe.ts`:

```ts
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { env } from "../env";
import {
  audioPath,
  transcriptJsonPath,
  transcriptPath,
  videoPath,
} from "../lib/paths";
import type {
  ProgressCallback,
  TranscribeResult,
  TranscriptSegment,
} from "./types";

export function modelsDir(): string {
  return join(homedir(), ".allonfire", "models");
}

export function modelPath(name: string = env.WHISPER_MODEL): string {
  return join(modelsDir(), `ggml-${name}.bin`);
}

export async function ensureModel(
  name: string,
  onProgress: ProgressCallback
): Promise<string> {
  const path = modelPath(name);
  if (existsSync(path)) {
    return path;
  }
  mkdirSync(modelsDir(), { recursive: true });
  onProgress(0, `Downloading whisper model ${name} (~3 GB, one-time)…`);
  const url = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${name}.bin`;
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("curl", ["-L", "-o", path, url]);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to download model (curl exit ${code})`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start curl: ${err.message}`))
    );
  });
  return path;
}

export function extractAudio(
  folder: string,
  onProgress: ProgressCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = videoPath(folder);
    const output = audioPath(folder);
    if (!existsSync(input)) {
      reject(new Error(`Video file missing: ${input}`));
      return;
    }
    onProgress(5, "Extracting audio with ffmpeg…");
    const proc = spawn("ffmpeg", [
      "-i", input,
      "-vn",
      "-ar", "16000",
      "-ac", "1",
      "-f", "wav",
      "-y", output,
    ]);
    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        onProgress(30, "Audio extracted");
        resolve(output);
      } else {
        reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-200)}`));
      }
    });
    proc.on("error", (err) =>
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    );
  });
}

export function findWhisperBinary(): string {
  return "whisper-cli";
}

export function runWhisper(
  wav: string,
  modelBin: string,
  onProgress: ProgressCallback
): Promise<{ segments: TranscriptSegment[]; language: string }> {
  return new Promise((resolve, reject) => {
    const outBase = wav.replace(/\.wav$/, "");
    const args = [
      "-m", modelBin,
      "-oj",
      "-of", outBase,
      "-l", "auto",
      "-pp",
      wav,
    ];
    const proc = spawn(findWhisperBinary(), args);

    let stderr = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      const match = chunk.toString().match(/progress\s*=\s*(\d+)/);
      if (match) {
        const pct = 35 + Math.floor(Number.parseInt(match[1], 10) * 0.6);
        onProgress(Math.min(pct, 95), `Transcribing ${match[1]}%`);
      }
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`whisper-cli failed (${code}): ${stderr.slice(-300)}`));
        return;
      }
      const jsonPath = `${outBase}.json`;
      if (!existsSync(jsonPath)) {
        reject(new Error("whisper produced no JSON output"));
        return;
      }
      try {
        const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
        const parsed = parseWhisperJson(raw);
        resolve(parsed);
      } catch (e) {
        reject(new Error(`Failed to parse whisper JSON: ${e}`));
      }
    });

    proc.on("error", (err) =>
      reject(new Error(`Failed to start whisper-cli: ${err.message}`))
    );
  });
}

type WhisperRawSegment = {
  offsets?: { from: number; to: number };
  timestamps?: { from: string; to: string };
  start?: number;
  end?: number;
  text?: string;
};

export function parseWhisperJson(raw: {
  transcription?: WhisperRawSegment[];
  segments?: WhisperRawSegment[];
  result?: { language?: string };
}): { segments: TranscriptSegment[]; language: string } {
  const entries: WhisperRawSegment[] = raw.transcription ?? raw.segments ?? [];
  const segments: TranscriptSegment[] = entries.map((seg) => {
    const startTime =
      seg.offsets !== undefined
        ? seg.offsets.from / 1000
        : seg.timestamps !== undefined
          ? parseTs(seg.timestamps.from)
          : (seg.start ?? 0);
    const endTime =
      seg.offsets !== undefined
        ? seg.offsets.to / 1000
        : seg.timestamps !== undefined
          ? parseTs(seg.timestamps.to)
          : (seg.end ?? 0);
    return { startTime, endTime, text: (seg.text ?? "").trim() };
  });
  const language = raw.result?.language ?? "unknown";
  return { segments, language };
}

function parseTs(ts: string): number {
  const parts = ts.split(":");
  if (parts.length === 3) {
    return (
      Number.parseFloat(parts[0]) * 3600 +
      Number.parseFloat(parts[1]) * 60 +
      Number.parseFloat(parts[2])
    );
  }
  if (parts.length === 2) {
    return Number.parseFloat(parts[0]) * 60 + Number.parseFloat(parts[1]);
  }
  return Number.parseFloat(ts) || 0;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

export function renderTranscriptMarkdown(
  segments: TranscriptSegment[],
  language: string
): string {
  const header = `# Transcript (source verbatim)\n\n**Source language:** ${language}\n\n`;
  const body = segments
    .map((s) => `[${formatTimestamp(s.startTime)}] ${s.text}`)
    .join("\n\n");
  return `${header}${body}\n`;
}

export async function transcribe(
  folder: string,
  onProgress: ProgressCallback
): Promise<TranscribeResult> {
  const modelBin = await ensureModel(env.WHISPER_MODEL, onProgress);
  const wav = await extractAudio(folder, onProgress);
  onProgress(35, "Running whisper.cpp…");
  const { segments, language } = await runWhisper(wav, modelBin, onProgress);

  writeFileSync(transcriptPath(folder), renderTranscriptMarkdown(segments, language));
  writeFileSync(
    transcriptJsonPath(folder),
    JSON.stringify({ segments, language }, null, 2)
  );

  try {
    unlinkSync(wav);
  } catch {
    // already cleaned
  }
  try {
    unlinkSync(`${wav.replace(/\.wav$/, "")}.json`);
  } catch {
    // already cleaned
  }

  onProgress(100, `Transcribed (${segments.length} segments, lang=${language})`);
  return { segments, language };
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- transcribe.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/pipeline/transcribe.ts packages/video-pipeline/src/pipeline/transcribe.test.ts
git commit -m "feat(video-pipeline): ffmpeg+whisper.cpp transcribe pipeline"
```

---

## Task 16: Translation prompt files

**Files:**
- Create: `packages/video-pipeline/src/prompts/translate-verbatim.md`
- Create: `packages/video-pipeline/src/prompts/rewrite-script.md`
- Create: `packages/video-pipeline/src/prompts/overlay-gen.md`

- [ ] **Step 1: Create `translate-verbatim.md`.**

```markdown
You are translating a verbatim YouTube video transcript to Italian.

Rules:
- Translate sentence-by-sentence, preserving meaning and technical terms.
- Keep `[HH:MM:SS]` timestamp markers exactly as written, on the same line position.
- Keep paragraph and segment breaks identical to the source.
- Do not summarise, paraphrase, or add commentary.
- For technical terms with no clean Italian equivalent, leave them in English (e.g. "embedding", "FSM").
- Do not add a preamble. Output only the translated markdown.

The output will live at `transcript-it.md` and serve as a fidelity audit of the source.
```

- [ ] **Step 2: Create `rewrite-script.md`.**

```markdown
You are rewriting an Italian verbatim video transcript into a personal speaking script for the user to read while recording an extempore video.

User voice profile: sarcastic-but-precise, AI-focused Italian channel, audience = anyone interested in AI.

Rules:
- Convert verbatim translation into natural Italian spoken language, removing translator stiffness.
- Paragraph-level structure, no `[timestamps]`.
- Add light personality (rhetorical questions, mild sarcasm) WITHOUT inventing facts not in the source.
- Open with a 1-2 sentence hook, close with a brief CTA ("commenta", "iscriviti", or similar — pick one).
- Keep technical terms accurate.
- Target ~80% of the source word count (concise voiceover is better than verbose).
- Do not add a preamble. Output only the rewritten markdown.

The output will live at `script-it.md` and is what the user reads while recording.
```

- [ ] **Step 3: Create `overlay-gen.md`.**

```markdown
You are generating an overlay library for a YouTube video.

You receive two files concatenated below: the source video transcript (verbatim, with timestamps) and the Italian speaking script the creator will record. You must produce `overlay.md`, a list of independent visual overlays that will be inserted into the final video to enrich it.

Output format — strict, parser-fed. For each overlay, emit:

## <slug-id>
- kind: diagram | table | callout | list | chart | code | image-ref
- moment: <prose where in the narrative this overlay fits>
- purpose: <one-sentence audience-impact rationale>

<freeform markdown body describing the content of this overlay, drawn from the video information>

Allowed `kind` values (closed list):
- `diagram` — flowchart, arrows, relationships, state machine sketch
- `table` — comparison, specs, pros/cons
- `callout` — single bold statement, key term definition, quote
- `list` — numbered/bulleted key points
- `chart` — bar/line for numerical data (only if source has numbers)
- `code` — code snippet (only if source shows code)
- `image-ref` — "find an image of X" reference for the editor

Generation rules:
- Each overlay is independent — no temporal anchoring needed beyond the prose `moment`.
- Content of each overlay must be drawn from the video information; do not invent.
- Density target: roughly 1 overlay per 45 seconds of source content. If the user passes an explicit count, match it exactly. Quality over quantity.
- Use Italian for all overlay text content (`moment`, `purpose`, body).
- Do not add a preamble or footer. Output only the H1 title + the overlay blocks.

First line of output: `# Overlay library — <project title>`.
```

- [ ] **Step 4: Commit.**

```bash
git add packages/video-pipeline/src/prompts
git commit -m "feat(video-pipeline): add translate/rewrite/overlay prompt templates"
```

---

## Task 17: `pipeline/translate.ts` — 2-pass translate + rewrite (TDD)

**Files:**
- Create: `packages/video-pipeline/src/pipeline/translate.ts`
- Create: `packages/video-pipeline/src/pipeline/translate.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/pipeline/translate.test.ts`:

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runClaudeMock = vi.fn();

vi.mock("../lib/claude", () => ({
  runClaude: (...args: unknown[]) => runClaudeMock(...args),
}));

import {
  scriptItPath,
  transcriptItPath,
  transcriptPath,
} from "../lib/paths";
import { translate } from "./translate";

let folder: string;

beforeEach(() => {
  runClaudeMock.mockReset();
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-translate-"));
  writeFileSync(transcriptPath(folder), "# Transcript\n\n[00:00:00] Hello world.\n");
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("translate", () => {
  it("runs verbatim + rewrite when source ≠ it", async () => {
    runClaudeMock
      .mockResolvedValueOnce("# Trascrizione IT verbatim\n\n[00:00:00] Ciao mondo.\n")
      .mockResolvedValueOnce("# Script\n\nCiao a tutti, oggi parliamo di…\n");

    await translate(folder, "en");

    expect(runClaudeMock).toHaveBeenCalledTimes(2);
    expect(readFileSync(transcriptItPath(folder), "utf-8")).toContain(
      "Ciao mondo"
    );
    expect(readFileSync(scriptItPath(folder), "utf-8")).toContain(
      "Ciao a tutti"
    );
  });

  it("skips verbatim translation when source = it (aliases transcript-it.md)", async () => {
    runClaudeMock.mockResolvedValueOnce("# Script\n\nBenvenuti…\n");

    await translate(folder, "it");

    expect(runClaudeMock).toHaveBeenCalledTimes(1);
    expect(readFileSync(transcriptItPath(folder), "utf-8")).toBe(
      readFileSync(transcriptPath(folder), "utf-8")
    );
    expect(readFileSync(scriptItPath(folder), "utf-8")).toContain("Benvenuti");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- translate.test.ts`
Expected: `Cannot find module './translate'`.

- [ ] **Step 3: Implement `pipeline/translate.ts`.**

Create `packages/video-pipeline/src/pipeline/translate.ts`:

```ts
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runClaude } from "../lib/claude";
import {
  scriptItPath,
  transcriptItPath,
  transcriptPath,
} from "../lib/paths";

const PROMPT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompts"
);

function loadPrompt(name: string): string {
  return readFileSync(join(PROMPT_DIR, `${name}.md`), "utf-8");
}

export async function translate(folder: string, sourceLang: string): Promise<void> {
  const source = readFileSync(transcriptPath(folder), "utf-8");

  if (sourceLang === "it") {
    copyFileSync(transcriptPath(folder), transcriptItPath(folder));
  } else {
    const verbatim = await runClaude({
      prompt: loadPrompt("translate-verbatim"),
      input: source,
    });
    writeFileSync(transcriptItPath(folder), verbatim);
  }

  const itVerbatim = readFileSync(transcriptItPath(folder), "utf-8");
  const script = await runClaude({
    prompt: loadPrompt("rewrite-script"),
    input: itVerbatim,
  });
  writeFileSync(scriptItPath(folder), script);
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- translate.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/pipeline/translate.ts packages/video-pipeline/src/pipeline/translate.test.ts
git commit -m "feat(video-pipeline): 2-pass IT verbatim + script rewrite"
```

---

## Task 18: `pipeline/overlay.ts` — overlay.md generator (TDD)

**Files:**
- Create: `packages/video-pipeline/src/pipeline/overlay.ts`
- Create: `packages/video-pipeline/src/pipeline/overlay.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `packages/video-pipeline/src/pipeline/overlay.test.ts`:

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runClaudeMock = vi.fn();

vi.mock("../lib/claude", () => ({
  runClaude: (...args: unknown[]) => runClaudeMock(...args),
}));

import {
  overlayPath,
  scriptItPath,
  transcriptPath,
} from "../lib/paths";
import { generateOverlays } from "./overlay";

let folder: string;

beforeEach(() => {
  runClaudeMock.mockReset();
  folder = mkdtempSync(join(tmpdir(), "video-pipeline-overlay-"));
  writeFileSync(transcriptPath(folder), "# Transcript\n[00:00:00] hi\n");
  writeFileSync(scriptItPath(folder), "# Script\nciao\n");
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe("generateOverlays", () => {
  it("calls claude with both transcripts concatenated and writes overlay.md", async () => {
    runClaudeMock.mockResolvedValueOnce(
      "# Overlay library — Test\n\n## intro-diagram\n- kind: diagram\n- moment: apertura\n- purpose: orientamento\n\nDescrizione.\n"
    );
    await generateOverlays(folder, "Test", undefined);
    expect(runClaudeMock).toHaveBeenCalledTimes(1);
    const call = runClaudeMock.mock.calls[0][0];
    expect(call.input).toContain("# Transcript");
    expect(call.input).toContain("# Script");
    expect(readFileSync(overlayPath(folder), "utf-8")).toContain("## intro-diagram");
  });

  it("injects explicit count into the prompt when provided", async () => {
    runClaudeMock.mockResolvedValueOnce("# Overlay library — Test\n");
    await generateOverlays(folder, "Test", 7);
    const call = runClaudeMock.mock.calls[0][0];
    expect(call.prompt).toContain("exactly 7 overlays");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**

Run: `pnpm --filter @allonfire/video-pipeline test -- overlay.test.ts`
Expected: `Cannot find module './overlay'`.

- [ ] **Step 3: Implement `pipeline/overlay.ts`.**

Create `packages/video-pipeline/src/pipeline/overlay.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runClaude } from "../lib/claude";
import {
  overlayPath,
  scriptItPath,
  transcriptPath,
} from "../lib/paths";

const PROMPT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "prompts"
);

export async function generateOverlays(
  folder: string,
  title: string,
  count: number | undefined
): Promise<void> {
  const basePrompt = readFileSync(
    join(PROMPT_DIR, "overlay-gen.md"),
    "utf-8"
  );
  const prompt =
    count !== undefined
      ? `${basePrompt}\n\nProduce exactly ${count} overlays.`
      : basePrompt;

  const transcript = readFileSync(transcriptPath(folder), "utf-8");
  const script = readFileSync(scriptItPath(folder), "utf-8");
  const input =
    `# Project title\n\n${title}\n\n` +
    `# Source transcript (verbatim)\n\n${transcript}\n\n` +
    `# Italian script (what creator will say)\n\n${script}\n`;

  const md = await runClaude({ prompt, input });
  writeFileSync(overlayPath(folder), md);
}
```

- [ ] **Step 4: Run the test to verify it passes.**

Run: `pnpm --filter @allonfire/video-pipeline test -- overlay.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/video-pipeline/src/pipeline/overlay.ts packages/video-pipeline/src/pipeline/overlay.test.ts
git commit -m "feat(video-pipeline): overlay.md generator via Claude Code CLI"
```

---

## Task 19: Ink UI components

**Files:**
- Create: `packages/video-pipeline/src/cli/components/header.tsx`
- Create: `packages/video-pipeline/src/cli/components/progress-bar.tsx`
- Create: `packages/video-pipeline/src/cli/components/status-badge.tsx`
- Create: `packages/video-pipeline/src/cli/components/install-row.tsx`

- [ ] **Step 1: Create `header.tsx`.**

```tsx
import { Box, Text } from "ink";
import type React from "react";

export const Header: React.FC<{ title: string; subtitle?: string }> = ({
  title,
  subtitle,
}) => (
  <Box flexDirection="column" marginBottom={1}>
    <Text bold color="cyan">
      ▸ {title}
    </Text>
    {subtitle ? <Text dimColor>{subtitle}</Text> : null}
  </Box>
);
```

- [ ] **Step 2: Create `progress-bar.tsx`.**

```tsx
import { Box, Text } from "ink";
import type React from "react";

export const ProgressBar: React.FC<{
  percent: number;
  message: string;
  width?: number;
}> = ({ percent, message, width = 30 }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return (
    <Box>
      <Text color="green">{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
      <Text> {clamped.toString().padStart(3)}% </Text>
      <Text dimColor>{message}</Text>
    </Box>
  );
};
```

- [ ] **Step 3: Create `status-badge.tsx`.**

```tsx
import { Text } from "ink";
import type React from "react";

export type BadgeState = "pending" | "running" | "done" | "failed";

const SYMBOL: Record<BadgeState, string> = {
  pending: "·",
  running: "⏳",
  done: "✓",
  failed: "✗",
};

const COLOR: Record<BadgeState, string> = {
  pending: "gray",
  running: "yellow",
  done: "green",
  failed: "red",
};

export const StatusBadge: React.FC<{ state: BadgeState }> = ({ state }) => (
  <Text color={COLOR[state]}>{SYMBOL[state]}</Text>
);
```

- [ ] **Step 4: Create `install-row.tsx`.**

```tsx
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { StatusBadge, type BadgeState } from "./status-badge";

export type InstallRowProps = {
  tool: string;
  state: BadgeState;
  detail?: string;
};

export const InstallRow: React.FC<InstallRowProps> = ({ tool, state, detail }) => (
  <Box>
    <Box width={4}>
      {state === "running" ? (
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
      ) : (
        <StatusBadge state={state} />
      )}
    </Box>
    <Box width={16}>
      <Text bold>{tool}</Text>
    </Box>
    <Text dimColor>{detail ?? ""}</Text>
  </Box>
);
```

- [ ] **Step 5: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 6: Commit.**

```bash
git add packages/video-pipeline/src/cli/components
git commit -m "feat(video-pipeline): Ink UI components (header, progress, badge, install row)"
```

---

## Task 20: `cli/commands/install.tsx`

**Files:**
- Create: `packages/video-pipeline/src/cli/commands/install.tsx`

- [ ] **Step 1: Create the file.**

```tsx
import { spawn } from "node:child_process";
import { Box, Text, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { checkTool, installCommand, KNOWN_TOOLS, type Tool } from "../../lib/deps";
import { detectPlatform } from "../../lib/platform";
import { Header } from "../components/header";
import { InstallRow } from "../components/install-row";
import type { BadgeState } from "../components/status-badge";

type RowState = {
  tool: Tool;
  state: BadgeState;
  detail?: string;
};

type Props = {
  tools: Tool[];
  checkOnly: boolean;
  force: boolean;
};

function runInstaller(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-200)}`));
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

export const InstallView: React.FC<Props> = ({ tools, checkOnly, force }) => {
  const { exit } = useApp();
  const [rows, setRows] = useState<RowState[]>(
    tools.map((tool) => ({ tool, state: "pending" }))
  );

  useEffect(() => {
    const platform = detectPlatform();
    let cancelled = false;

    const update = (tool: Tool, patch: Partial<RowState>) => {
      if (cancelled) return;
      setRows((prev) =>
        prev.map((r) => (r.tool === tool ? { ...r, ...patch } : r))
      );
    };

    (async () => {
      for (const tool of tools) {
        update(tool, { state: "running", detail: "checking…" });
        const status = await checkTool(tool);

        if (status.installed && !force) {
          update(tool, {
            state: "done",
            detail: `installed (${status.version}) ${status.path}`,
          });
          continue;
        }

        if (checkOnly) {
          update(tool, {
            state: "failed",
            detail: "missing (use without --check to install)",
          });
          continue;
        }

        update(tool, { state: "running", detail: `installing via ${platform}…` });
        try {
          const [cmd, args] = installCommand(platform, tool);
          await runInstaller(cmd, args);
          const after = await checkTool(tool);
          update(tool, {
            state: after.installed ? "done" : "failed",
            detail: after.installed
              ? `installed (${after.version})`
              : "post-install check still failing",
          });
        } catch (err) {
          update(tool, {
            state: "failed",
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      }
      exit();
    })();

    return () => {
      cancelled = true;
    };
  }, [tools, checkOnly, force, exit]);

  return (
    <Box flexDirection="column">
      <Header
        title="install"
        subtitle={checkOnly ? "check only — no install" : "auto-install per OS"}
      />
      {rows.map((r) => (
        <InstallRow
          key={r.tool}
          tool={r.tool}
          state={r.state}
          detail={r.detail}
        />
      ))}
      <Box marginTop={1}>
        <Text dimColor>
          Tools: {KNOWN_TOOLS.join(", ")}. Whisper model autoloaded on first transcribe.
        </Text>
      </Box>
    </Box>
  );
};
```

- [ ] **Step 2: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add packages/video-pipeline/src/cli/commands/install.tsx
git commit -m "feat(video-pipeline): install command with Ink dashboard"
```

---

## Task 21: `cli/commands/download.tsx`

**Files:**
- Create: `packages/video-pipeline/src/cli/commands/download.tsx`

- [ ] **Step 1: Create the file.**

```tsx
import { existsSync, mkdirSync } from "node:fs";
import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { useEffect, useState } from "react";
import { env } from "../../env";
import { ToolMissingError } from "../../errors";
import { checkTool } from "../../lib/deps";
import { withLock } from "../../lib/lock";
import {
  initMetadata,
  markStageDone,
  markStageFailed,
  readMetadata,
} from "../../lib/metadata";
import { projectFolder, type ProjectKind } from "../../lib/paths";
import { slugify } from "../../lib/slug";
import {
  downloadCaptions,
  downloadVideo,
  extractYoutubeId,
  getVideoInfo,
  type Quality,
} from "../../pipeline/download";
import { Header } from "../components/header";
import { ProgressBar } from "../components/progress-bar";
import { StatusBadge } from "../components/status-badge";

type Props = {
  url: string;
  kind: ProjectKind;
  title: string;
  date: string;
  quality: Quality;
  force: boolean;
};

export const DownloadView: React.FC<Props> = ({
  url,
  kind,
  title,
  date,
  quality,
  force,
}) => {
  const { exit } = useApp();
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("Starting…");
  const [step, setStep] = useState<
    "check" | "info" | "video" | "captions" | "done" | "fail"
  >("check");
  const [folder, setFolder] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captions, setCaptions] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStep("check");
        const yt = await checkTool("yt-dlp");
        if (!yt.installed) throw new ToolMissingError("yt-dlp");

        const slug = slugify(title);
        const folderPath = projectFolder(env.VIDEO_WORK_DIR, kind, date, slug);
        setFolder(folderPath);

        if (!existsSync(folderPath)) {
          mkdirSync(folderPath, { recursive: true });
        }

        await withLock(folderPath, async () => {
          const existing = readMetadata(folderPath);
          if (existing?.stages.downloaded && "at" in existing.stages.downloaded && !force) {
            setStep("done");
            setMessage("already downloaded — pass --force to redo");
            return;
          }

          setStep("info");
          setMessage("Fetching source metadata via yt-dlp…");
          const info = await getVideoInfo(url);

          if (!existing) {
            initMetadata(folderPath, {
              kind,
              title,
              slug,
              date,
              source: {
                url,
                youtubeId: info.youtubeId || extractYoutubeId(url),
                title: info.title,
                duration: info.duration,
                thumbnail: info.thumbnail,
                language: null,
              },
            });
          }

          setStep("video");
          try {
            await downloadVideo(url, folderPath, quality, (p, m) => {
              if (cancelled) return;
              setPct(p);
              setMessage(m);
            });
          } catch (err) {
            markStageFailed(
              folderPath,
              "downloaded",
              err instanceof Error ? err.message : String(err)
            );
            throw err;
          }

          setStep("captions");
          setMessage("Pulling EN captions if available…");
          const capPath = await downloadCaptions(url, folderPath);
          setCaptions(capPath);

          markStageDone(folderPath, "downloaded");
          setStep("done");
          setMessage("Download complete");
        });
      } catch (err) {
        if (cancelled) return;
        setStep("fail");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        exit();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, kind, title, date, quality, force, exit]);

  return (
    <Box flexDirection="column">
      <Header title="download" subtitle={url} />
      {folder ? (
        <Text>
          <Text dimColor>folder: </Text>
          {folder}
        </Text>
      ) : null}
      <Box marginTop={1}>
        {step === "video" ? (
          <ProgressBar percent={pct} message={message} />
        ) : step === "fail" ? (
          <Box>
            <StatusBadge state="failed" />
            <Text color="red"> {errorMsg}</Text>
          </Box>
        ) : step === "done" ? (
          <Box>
            <StatusBadge state="done" />
            <Text> {message}</Text>
            {captions ? <Text dimColor> (captions ✓)</Text> : null}
          </Box>
        ) : (
          <Box>
            <Text color="yellow">
              <Spinner type="dots" />
            </Text>
            <Text> {message}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
```

- [ ] **Step 2: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add packages/video-pipeline/src/cli/commands/download.tsx
git commit -m "feat(video-pipeline): download command (yt-dlp + captions + metadata init)"
```

---

## Task 22: `cli/commands/transcribe.tsx`

**Files:**
- Create: `packages/video-pipeline/src/cli/commands/transcribe.tsx`

- [ ] **Step 1: Create the file.**

```tsx
import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { useEffect, useState } from "react";
import { ToolMissingError } from "../../errors";
import { checkTool } from "../../lib/deps";
import { withLock } from "../../lib/lock";
import {
  markStageDone,
  markStageFailed,
  readMetadata,
  updateSourceLanguage,
} from "../../lib/metadata";
import { transcribe } from "../../pipeline/transcribe";
import { Header } from "../components/header";
import { ProgressBar } from "../components/progress-bar";
import { StatusBadge } from "../components/status-badge";

type Props = { folder: string; force: boolean };

export const TranscribeView: React.FC<Props> = ({ folder, force }) => {
  const { exit } = useApp();
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("Starting…");
  const [step, setStep] = useState<"check" | "run" | "done" | "fail" | "skip">("check");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meta = readMetadata(folder);
        if (!meta) {
          throw new Error("No metadata.json — run `download` first");
        }
        if (meta.stages.transcribed && "at" in meta.stages.transcribed && !force) {
          setStep("skip");
          setMessage("already transcribed — pass --force to redo");
          return;
        }

        const ff = await checkTool("ffmpeg");
        if (!ff.installed) throw new ToolMissingError("ffmpeg");
        const wh = await checkTool("whisper-cpp");
        if (!wh.installed) throw new ToolMissingError("whisper-cpp");

        setStep("run");
        await withLock(folder, async () => {
          try {
            const result = await transcribe(folder, (p, m) => {
              setPct(p);
              setMessage(m);
            });
            updateSourceLanguage(folder, result.language);
            markStageDone(folder, "transcribed");
          } catch (err) {
            markStageFailed(
              folder,
              "transcribed",
              err instanceof Error ? err.message : String(err)
            );
            throw err;
          }
        });
        setStep("done");
      } catch (err) {
        setStep("fail");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        exit();
      }
    })();
  }, [folder, force, exit]);

  return (
    <Box flexDirection="column">
      <Header title="transcribe" subtitle={folder} />
      {step === "run" ? (
        <ProgressBar percent={pct} message={message} />
      ) : step === "fail" ? (
        <Box>
          <StatusBadge state="failed" />
          <Text color="red"> {errorMsg}</Text>
        </Box>
      ) : step === "done" || step === "skip" ? (
        <Box>
          <StatusBadge state="done" />
          <Text> {message}</Text>
        </Box>
      ) : (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Checking deps…</Text>
        </Box>
      )}
    </Box>
  );
};
```

- [ ] **Step 2: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add packages/video-pipeline/src/cli/commands/transcribe.tsx
git commit -m "feat(video-pipeline): transcribe command (Ink + whisper.cpp)"
```

---

## Task 23: `cli/commands/translate.tsx`

**Files:**
- Create: `packages/video-pipeline/src/cli/commands/translate.tsx`

- [ ] **Step 1: Create the file.**

```tsx
import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { useEffect, useState } from "react";
import { withLock } from "../../lib/lock";
import { markStageDone, markStageFailed, readMetadata } from "../../lib/metadata";
import { translate } from "../../pipeline/translate";
import { Header } from "../components/header";
import { StatusBadge } from "../components/status-badge";

type Props = { folder: string; force: boolean };

export const TranslateView: React.FC<Props> = ({ folder, force }) => {
  const { exit } = useApp();
  const [step, setStep] = useState<"check" | "run" | "done" | "fail" | "skip">("check");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meta = readMetadata(folder);
        if (!meta) throw new Error("No metadata.json — run `download` first");
        if (!meta.source.language) {
          throw new Error("Source language unknown — run `transcribe` first");
        }
        setLang(meta.source.language);

        if (meta.stages.translated && "at" in meta.stages.translated && !force) {
          setStep("skip");
          return;
        }

        setStep("run");
        await withLock(folder, async () => {
          try {
            await translate(folder, meta.source.language ?? "unknown");
            markStageDone(folder, "translated");
          } catch (err) {
            markStageFailed(
              folder,
              "translated",
              err instanceof Error ? err.message : String(err)
            );
            throw err;
          }
        });
        setStep("done");
      } catch (err) {
        setStep("fail");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        exit();
      }
    })();
  }, [folder, force, exit]);

  return (
    <Box flexDirection="column">
      <Header
        title="translate"
        subtitle={`${folder}${lang ? ` — source: ${lang}` : ""}`}
      />
      {step === "run" ? (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Calling Claude Code CLI (verbatim + rewrite)…</Text>
        </Box>
      ) : step === "fail" ? (
        <Box>
          <StatusBadge state="failed" />
          <Text color="red"> {errorMsg}</Text>
        </Box>
      ) : step === "done" ? (
        <Box>
          <StatusBadge state="done" />
          <Text> Wrote transcript-it.md + script-it.md</Text>
        </Box>
      ) : step === "skip" ? (
        <Box>
          <StatusBadge state="done" />
          <Text> already translated — pass --force to redo</Text>
        </Box>
      ) : (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Checking metadata…</Text>
        </Box>
      )}
    </Box>
  );
};
```

- [ ] **Step 2: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add packages/video-pipeline/src/cli/commands/translate.tsx
git commit -m "feat(video-pipeline): translate command (verbatim + script)"
```

---

## Task 24: `cli/commands/overlay.tsx`

**Files:**
- Create: `packages/video-pipeline/src/cli/commands/overlay.tsx`

- [ ] **Step 1: Create the file.**

```tsx
import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import type React from "react";
import { useEffect, useState } from "react";
import { withLock } from "../../lib/lock";
import { markStageDone, markStageFailed, readMetadata } from "../../lib/metadata";
import { generateOverlays } from "../../pipeline/overlay";
import { Header } from "../components/header";
import { StatusBadge } from "../components/status-badge";

type Props = { folder: string; force: boolean; count?: number };

export const OverlayView: React.FC<Props> = ({ folder, force, count }) => {
  const { exit } = useApp();
  const [step, setStep] = useState<"check" | "run" | "done" | "fail" | "skip">("check");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meta = readMetadata(folder);
        if (!meta) throw new Error("No metadata.json — run `download` first");
        if (!meta.stages.translated || !("at" in meta.stages.translated)) {
          throw new Error("Translate stage not complete — run `translate` first");
        }
        if (meta.stages.overlayed && "at" in meta.stages.overlayed && !force) {
          setStep("skip");
          return;
        }

        setStep("run");
        await withLock(folder, async () => {
          try {
            await generateOverlays(folder, meta.title, count);
            markStageDone(folder, "overlayed");
          } catch (err) {
            markStageFailed(
              folder,
              "overlayed",
              err instanceof Error ? err.message : String(err)
            );
            throw err;
          }
        });
        setStep("done");
      } catch (err) {
        setStep("fail");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      } finally {
        exit();
      }
    })();
  }, [folder, force, count, exit]);

  return (
    <Box flexDirection="column">
      <Header
        title="overlay"
        subtitle={`${folder}${count !== undefined ? ` — count=${count}` : ""}`}
      />
      {step === "run" ? (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Generating overlay library…</Text>
        </Box>
      ) : step === "fail" ? (
        <Box>
          <StatusBadge state="failed" />
          <Text color="red"> {errorMsg}</Text>
        </Box>
      ) : step === "done" ? (
        <Box>
          <StatusBadge state="done" />
          <Text> Wrote overlay.md</Text>
        </Box>
      ) : step === "skip" ? (
        <Box>
          <StatusBadge state="done" />
          <Text> already done — pass --force to redo</Text>
        </Box>
      ) : (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> Checking deps…</Text>
        </Box>
      )}
    </Box>
  );
};
```

- [ ] **Step 2: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add packages/video-pipeline/src/cli/commands/overlay.tsx
git commit -m "feat(video-pipeline): overlay command (Claude-driven generation)"
```

---

## Task 25: `cli/commands/list.tsx`

**Files:**
- Create: `packages/video-pipeline/src/cli/commands/list.tsx`

- [ ] **Step 1: Create the file.**

```tsx
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Box, Text, useApp } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { env } from "../../env";
import {
  isStageDone,
  type ProjectMetadata,
  readMetadata,
  type StageName,
} from "../../lib/metadata";
import type { ProjectKind } from "../../lib/paths";
import { Header } from "../components/header";

const STAGES: StageName[] = ["downloaded", "transcribed", "translated", "overlayed"];

function discover(kindFilter?: ProjectKind): ProjectMetadata[] {
  const kinds: ProjectKind[] = kindFilter ? [kindFilter] : ["normal", "shorts"];
  const out: ProjectMetadata[] = [];
  for (const kind of kinds) {
    const root = join(env.VIDEO_WORK_DIR, kind);
    let entries: string[] = [];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }
    for (const name of entries) {
      const folder = join(root, name);
      try {
        if (!statSync(folder).isDirectory()) continue;
        const meta = readMetadata(folder);
        if (meta) {
          out.push({ ...meta, kind, folder });
        }
      } catch {
        // skip unreadable folder
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function stageMark(m: ProjectMetadata, s: StageName): string {
  const record = m.stages[s];
  if (record === null) return "·";
  if ("failedAt" in record) return "✗";
  if (isStageDone(record)) return "✓";
  return "·";
}

function statusLabel(m: ProjectMetadata): string {
  for (const s of STAGES) {
    const r = m.stages[s];
    if (r === null) return s;
    if ("failedAt" in r) return `${s}!`;
  }
  return "done";
}

type Props = {
  kindFilter?: ProjectKind;
  statusFilter?: "pending" | "failed" | "done";
};

export const ListView: React.FC<Props> = ({ kindFilter, statusFilter }) => {
  const { exit } = useApp();
  const [rows, setRows] = useState<ProjectMetadata[]>([]);

  useEffect(() => {
    let projects = discover(kindFilter);
    if (statusFilter === "done") {
      projects = projects.filter((m) => statusLabel(m) === "done");
    } else if (statusFilter === "failed") {
      projects = projects.filter((m) => statusLabel(m).endsWith("!"));
    } else if (statusFilter === "pending") {
      projects = projects.filter(
        (m) => statusLabel(m) !== "done" && !statusLabel(m).endsWith("!")
      );
    }
    setRows(projects);
    exit();
  }, [kindFilter, statusFilter, exit]);

  return (
    <Box flexDirection="column">
      <Header title="list" subtitle={`projects in ${env.VIDEO_WORK_DIR}`} />
      <Box>
        <Box width={8}><Text bold>KIND</Text></Box>
        <Box width={12}><Text bold>DATE</Text></Box>
        <Box width={10}><Text bold>STAGES</Text></Box>
        <Box width={14}><Text bold>STATUS</Text></Box>
        <Text bold>SLUG / TITLE</Text>
      </Box>
      {rows.length === 0 ? (
        <Text dimColor>No projects found.</Text>
      ) : (
        rows.map((m) => (
          <Box key={`${m.kind}/${m.slug}`}>
            <Box width={8}><Text>{m.kind}</Text></Box>
            <Box width={12}><Text>{m.date}</Text></Box>
            <Box width={10}>
              <Text>{STAGES.map((s) => stageMark(m, s)).join("")}</Text>
            </Box>
            <Box width={14}><Text>{statusLabel(m)}</Text></Box>
            <Text>
              {m.slug}
              <Text dimColor> — {m.title}</Text>
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
};
```

- [ ] **Step 2: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 3: Commit.**

```bash
git add packages/video-pipeline/src/cli/commands/list.tsx
git commit -m "feat(video-pipeline): list command (filesystem walk + Ink table)"
```

---

## Task 26: Rewrite `cli/cli.ts` — Commander program wiring 6 subcommands

**Files:**
- Modify: `packages/video-pipeline/src/cli/cli.ts`
- Modify: `packages/video-pipeline/src/cli/cli.test.ts`

- [ ] **Step 1: Replace contents of `cli.ts`.**

```tsx
#!/usr/bin/env tsx
import { Command, InvalidArgumentError } from "commander";
import { render } from "ink";
import type React from "react";
import { env } from "../env";
import { KNOWN_TOOLS, type Tool } from "../lib/deps";
import { resolveProjectFolder } from "../lib/resolve";
import { DownloadView } from "./commands/download";
import { InstallView } from "./commands/install";
import { ListView } from "./commands/list";
import { OverlayView } from "./commands/overlay";
import { TranscribeView } from "./commands/transcribe";
import { TranslateView } from "./commands/translate";

const QUALITIES = ["4k", "1080p", "720p"] as const;
const KINDS = ["normal", "shorts"] as const;
const STATUSES = ["pending", "failed", "done"] as const;

function parseEnum<T extends string>(allowed: readonly T[]) {
  return (value: string): T => {
    if (!(allowed as readonly string[]).includes(value)) {
      throw new InvalidArgumentError(`Expected one of: ${allowed.join(", ")}`);
    }
    return value as T;
  };
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function mount(element: React.ReactElement): Promise<void> {
  const { waitUntilExit } = render(element);
  await waitUntilExit();
}

export function buildCli(): Command {
  const program = new Command();
  program
    .name("video")
    .description("AllOnFire video pipeline CLI")
    .version("1.0.0");

  program
    .command("install [tools...]")
    .option("--check", "report only, do not install", false)
    .option("--force", "reinstall even if present", false)
    .action(async (tools: string[], opts: { check: boolean; force: boolean }) => {
      const selected = (tools.length > 0 ? tools : [...KNOWN_TOOLS]).map((t) => {
        if (!(KNOWN_TOOLS as readonly string[]).includes(t)) {
          throw new InvalidArgumentError(
            `Unknown tool '${t}'. Allowed: ${KNOWN_TOOLS.join(", ")}`
          );
        }
        return t as Tool;
      });
      await mount(
        <InstallView tools={selected} checkOnly={opts.check} force={opts.force} />
      );
    });

  program
    .command("download <url>")
    .requiredOption("--kind <kind>", `(${KINDS.join("|")})`, parseEnum(KINDS))
    .requiredOption("--title <title>", "italian title for the project")
    .option("--date <yyyy-mm-dd>", "date prefix for folder", todayDate())
    .option(
      "--quality <q>",
      `video quality cap (${QUALITIES.join("|")})`,
      parseEnum(QUALITIES),
      "1080p" as (typeof QUALITIES)[number]
    )
    .option("--force", "redo even if marked done", false)
    .action(
      async (
        url: string,
        opts: {
          kind: (typeof KINDS)[number];
          title: string;
          date: string;
          quality: (typeof QUALITIES)[number];
          force: boolean;
        }
      ) => {
        await mount(
          <DownloadView
            url={url}
            kind={opts.kind}
            title={opts.title}
            date={opts.date}
            quality={opts.quality}
            force={opts.force}
          />
        );
      }
    );

  for (const [name, View] of [
    ["transcribe", TranscribeView],
    ["translate", TranslateView],
  ] as const) {
    program
      .command(`${name} [project]`)
      .option("--force", "redo even if marked done", false)
      .action(async (project: string | undefined, opts: { force: boolean }) => {
        const folder = resolveProjectFolder(project ?? "", env.VIDEO_WORK_DIR);
        await mount(<View folder={folder} force={opts.force} />);
      });
  }

  program
    .command("overlay [project]")
    .option("--force", "redo even if marked done", false)
    .option(
      "--count <n>",
      "explicit overlay count",
      (v) => Number.parseInt(v, 10)
    )
    .action(
      async (
        project: string | undefined,
        opts: { force: boolean; count?: number }
      ) => {
        const folder = resolveProjectFolder(project ?? "", env.VIDEO_WORK_DIR);
        await mount(
          <OverlayView folder={folder} force={opts.force} count={opts.count} />
        );
      }
    );

  program
    .command("list")
    .option("--kind <kind>", `(${KINDS.join("|")})`, parseEnum(KINDS))
    .option(
      "--status <s>",
      `(${STATUSES.join("|")})`,
      parseEnum(STATUSES)
    )
    .action(
      async (opts: {
        kind?: (typeof KINDS)[number];
        status?: (typeof STATUSES)[number];
      }) => {
        await mount(<ListView kindFilter={opts.kind} statusFilter={opts.status} />);
      }
    );

  return program;
}

const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1]));

if (invokedDirectly) {
  buildCli()
    .parseAsync(process.argv)
    .catch((err) => {
      process.stderr.write(
        `${err instanceof Error ? err.message : String(err)}\n`
      );
      process.exit(1);
    });
}
```

Note: rename file extension to `.tsx` so JSX literals compile. `git mv src/cli/cli.ts src/cli/cli.tsx` first, then update `package.json` `bin` and `scripts.video` to reference `src/cli/cli.tsx`.

- [ ] **Step 2: Replace `cli.test.ts` with parser-level test.**

Create `packages/video-pipeline/src/cli/cli.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCli } from "./cli";

describe("buildCli", () => {
  it("registers all 6 subcommands", () => {
    const program = buildCli();
    const names = program.commands.map((c) => c.name()).sort();
    expect(names).toEqual([
      "download",
      "install",
      "list",
      "overlay",
      "transcribe",
      "translate",
    ]);
  });

  it("rejects unknown --kind on download", () => {
    const program = buildCli();
    program.exitOverride();
    expect(() =>
      program.parse(
        [
          "node",
          "cli",
          "download",
          "https://youtu.be/x",
          "--kind",
          "WRONG",
          "--title",
          "T",
        ],
        { from: "node" }
      )
    ).toThrow();
  });
});
```

- [ ] **Step 3: Run the tests.**

Run: `pnpm --filter @allonfire/video-pipeline test -- cli.test.ts`
Expected: 2 tests pass.

- [ ] **Step 4: Commit.**

```bash
git add packages/video-pipeline/src/cli/cli.tsx packages/video-pipeline/src/cli/cli.test.ts packages/video-pipeline/package.json
git rm packages/video-pipeline/src/cli/cli.ts 2>/dev/null || true
git commit -m "feat(video-pipeline): wire 6-command Commander CLI with Ink render"
```

---

## Task 27: Rewrite `index.ts` + `README.md`

**Files:**
- Modify: `packages/video-pipeline/src/index.ts`
- Modify: `packages/video-pipeline/README.md`

- [ ] **Step 1: Replace `index.ts`.**

```ts
// biome-ignore-all lint/performance/noBarrelFile: package public surface
export { env } from "./env";
export {
  LockHeldError,
  PipelineError,
  ToolMissingError,
} from "./errors";
export {
  isStageDone,
  type ProjectMetadata,
  readMetadata,
  type StageName,
  type StageRecord,
} from "./lib/metadata";
export { type ProjectKind } from "./lib/paths";
export { resolveProjectFolder } from "./lib/resolve";
```

- [ ] **Step 2: Replace `README.md`.**

````markdown
# @allonfire/video-pipeline

CLI-only video pipeline. Take a YouTube URL → produce: source transcript, IT translation, IT speaking script, and an overlay library for B-roll enrichment.

## Quick start

```bash
# 1. Install external tools (yt-dlp, ffmpeg, whisper-cpp)
pnpm video install

# 2. Download a source video
pnpm video download https://youtu.be/XXX \
  --kind normal --title "FSM Spiegata"

# 3. Transcribe (whisper.cpp large-v3, auto-downloaded on first run)
pnpm video transcribe 2026-05-13-fsm-spiegata

# 4. Translate to IT + rewrite as speaking script
pnpm video translate 2026-05-13-fsm-spiegata

# 5. Generate overlay library
pnpm video overlay 2026-05-13-fsm-spiegata

# Browse all projects
pnpm video list
```

## Project layout

```
$VIDEO_WORK_DIR/                                  (default /Volumes/Crucial-4T/video)
└── <normal|shorts>/<YYYY-MM-DD>-<slug>/
    ├── video.mp4
    ├── captions-en.vtt?
    ├── transcript.md          (source verbatim, [HH:MM:SS] markers)
    ├── transcript.json        (whisper raw output)
    ├── transcript-it.md       (IT verbatim, alias if source=IT)
    ├── script-it.md           (rewritten in your voice, always)
    ├── overlay.md             (overlay library)
    └── metadata.json          (project state, tri-state stages)
```

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `VIDEO_WORK_DIR` | `/Volumes/Crucial-4T/video` | Project root |
| `VIDEO_MUSIC_DIR` | `/Volumes/Crucial-4T/video/sound` | Background music (reserved) |
| `WHISPER_MODEL` | `large-v3` | Whisper.cpp model name |

## See also

- `docs/adr/0002-all-local-video-pipeline.md`
- `docs/adr/0003-clionfire-pure-cli.md`
- `CONTEXT.md` — domain glossary
````

- [ ] **Step 3: Type-check.**

Run: `pnpm --filter @allonfire/video-pipeline check-types`
Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add packages/video-pipeline/src/index.ts packages/video-pipeline/README.md
git commit -m "docs(video-pipeline): refresh public exports + README for CLI v1"
```

---

## Task 28: Workspace lint, type-check, tests

- [ ] **Step 1: Run lint.**

Run: `pnpm dlx ultracite check`
Expected: 0 errors.

- [ ] **Step 2: If lint errors exist, auto-fix.**

Run: `pnpm dlx ultracite fix && pnpm dlx ultracite check`
Expected: 0 errors after fix.

- [ ] **Step 3: Workspace type-check.**

Run: `pnpm check-types`
Expected: all packages pass.

- [ ] **Step 4: Workspace tests.**

Run: `pnpm test`
Expected: all green; new pipeline tests count ≈ 30+.

- [ ] **Step 5: Commit any lint fixes.**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore(video-pipeline): apply biome lint fixes"
```

---

## Task 29: Manual end-to-end smoke

Validate the full pipeline against a real (short) YouTube URL.

- [ ] **Step 1: Install deps.**

```bash
pnpm video install
```

Expected: yt-dlp, ffmpeg, whisper-cpp all `✓`.

- [ ] **Step 2: Pick a short test video and download.**

Use a ~2-min English video (e.g. a `youtube.com/shorts/...` URL).

```bash
pnpm video download "<URL>" --kind shorts --title "Test Smoke"
```

Expected: progress bar reaches 100%, `video.mp4` + `metadata.json` written under `$VIDEO_WORK_DIR/shorts/<YYYY-MM-DD>-test-smoke/`.

- [ ] **Step 3: Transcribe.**

```bash
pnpm video transcribe test-smoke
```

NOTE: bare slug = `<YYYY-MM-DD>-test-smoke`. Use the full slug — `test-smoke` alone will fail because the folder name includes the date prefix. Try `pnpm video transcribe $(ls $VIDEO_WORK_DIR/shorts | grep test-smoke | head -1)` if you need shell help.

Expected: whisper model auto-downloads on first run (one-time ~3GB), then transcription completes. `transcript.md` + `transcript.json` created. `metadata.source.language` populated.

- [ ] **Step 4: Translate.**

```bash
pnpm video translate <slug>
```

Expected: `transcript-it.md` + `script-it.md` produced. Claude Code CLI called twice (verbatim + rewrite) — or once if source is IT.

- [ ] **Step 5: Generate overlays.**

```bash
pnpm video overlay <slug>
```

Expected: `overlay.md` produced with at least one `## <id>` block, kind from the closed list.

- [ ] **Step 6: List.**

```bash
pnpm video list
```

Expected: row with `shorts | <date> | ✓✓✓✓ | done | <slug> — Test Smoke`.

- [ ] **Step 7: Document the run.**

If anything failed: capture the error, add a tiny test reproducing the failure, fix, repeat.

If all green: do not commit the smoke artifacts (project folder lives under `$VIDEO_WORK_DIR`, which is outside the repo by default).

---

## Self-review checklist

- **Spec coverage:**
  - Install command w/ per-OS dispatch → Task 11 (lib) + Task 20 (UI) ✓
  - Download w/ 1080p cap + captions + metadata.json scaffold → Task 14 (lib) + Task 21 (UI) ✓
  - Transcribe (whisper.cpp large-v3, auto-DL, ffmpeg audio extract) → Task 15 (lib) + Task 22 (UI) ✓
  - Translate (2-pass, source=IT skip) → Task 17 (lib) + Task 23 (UI) ✓
  - Overlay (Claude-driven, closed kind list, prose moment) → Task 18 (lib) + Task 24 (UI) ✓
  - List w/ filesystem walk + Ink table → Task 25 ✓
  - Project resolution (hybrid) → Task 12 ✓
  - Concurrency lock w/ SIGINT cleanup → Task 8 ✓
  - Idempotency (`--force`) → wired in each command stage ✓
  - Ink UI + chalk + spinner → Task 19 + commands ✓
  - Cross-platform binary install → Task 11 ✓
  - Foundation FSM/Prisma removal → Task 0 ✓
  - Docs (CONTEXT.md, ADR-0003) → Task 1 ✓

- **Placeholders:** none — every code block complete.

- **Type/method consistency:** all function names referenced across tasks (`slugify`, `projectFolder`, `readMetadata`, `markStageDone`, `markStageFailed`, `updateSourceLanguage`, `acquireLock`/`releaseLock`/`withLock`, `checkTool`/`installCommand`, `runClaude`, `extractYoutubeId`/`downloadVideo`/`downloadCaptions`, `transcribe`/`parseWhisperJson`/`renderTranscriptMarkdown`, `translate`, `generateOverlays`, `resolveProjectFolder`, `buildCli`) match signatures across tasks.

- **Out of scope:** chromakey, render, publish, composition modes, multi-source — deferred and documented in CONTEXT.md "Open branches" + ADR-0003.
