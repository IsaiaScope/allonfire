# AllOnFire Context

Living glossary of domain terms. Update inline as concepts crystallise.

## Bounded contexts

- **Social publishing** — text/image posts to Twitter, LinkedIn (existing).
- **Video pipeline** — automated YouTube long-form + Shorts production (planned).

---

## Video pipeline glossary

### Video Project
A single unit of video work, owned by a user. Has one **Source Recording** and produces one **Long-form Render** + N **Short Renders**.

### Source Recording
Raw webcam capture shot against a physical green screen, with live audio. Recorded extempore (the creator speaks about a topic they know). Long-form 16:9, used as the master from which Shorts are derived.

### Long-form Render
Final 16:9 publishable YouTube video. Composited from:
- Chroma-keyed webcam (green removed via FFmpeg `chromakey`)
- Auto-generated **Overlays** (diagrams, flows, text, code) timed to spoken content
- Burned-in **Captions**
- Background music

### Short Render
9:16 derivative of a Long-form Render, ≤60s. Highlight-extracted from transcript, reframed to keep webcam visible. Uploaded to YouTube Shorts (and later TT/IG/X).

### Transcript
Whisper-generated word-level timestamped text of the Source Recording. Drives both the **Cut List** and the **Overlay Spec List**.

### Cut List
LLM-produced set of `[start, end]` ranges to remove from the Source Recording. Targets: silence/dead points, filler ("um", "uh", "like"), repetitions, mistakes / retakes, off-topic detours.

### Overlay Spec List
LLM-produced set of `{timestamp, durationMs, engine, type, content, position}` items describing visual aids to render at specific moments.
- `engine`: `mermaid` (auto-layout structured) | `excalidraw` (freeform hand-drawn) | `text` (pure typography callout) | `code` (syntax-highlighted snippet)
- `type` (when `engine=mermaid`): `flowchart` | `sequence` | `erd` | `state` | `class`
- `type` (when `engine=excalidraw`): `concept` | `sketch` | `annotated` | `callout`
- `position`: `fullscreen` | `side` | `inset` | `lower-third`

### Overlay
Single visual aid rendered and composited onto the video at a timestamp. Distinct from generic "b-roll" — Overlays are *information-bearing*, tied to what the creator just said.

### Captions
Auto-generated burned-in subtitles, derived from the Transcript after Cut List is applied.

### Source Reference
External content used as topic input. Primary type: YouTube video URL (single or multiple). Secondary: article URL, manual notes, RSS feed item.

### Topic Brief
AI-produced artifact preceding recording, derived from one or more Source References. Contains:
- **Speech Draft** — paragraph-level talking points the creator should roughly cover (not a verbatim script — extempore-friendly)
- **Knowledge Brief** — key notions, facts, terminology, common misconceptions to internalise before recording
- **Suggested Overlay Hints** — early hints to the Overlay Spec stage about diagrams worth showing
- **Suggested Hook + CTA** — opening hook line(s) + closing call-to-action

Stored as `brief.md` colocated in the project folder. Generated locally via:
1. `yt-dlp` → download captions/audio of Source Reference
2. `whisper.cpp` if no captions
3. Claude Code CLI headless pass → `Topic Brief`

### Highlight
A `[start, end]` range of the cleaned Long-form Render selected by LLM as a self-contained moment suitable for a Short.

### Render Target
Per-job dispatch flag, chosen at job creation. One of:
- `LONG` — produce only the Long-form Render
- `SHORTS` — produce only Short Renders (extracted from raw, no long publish)
- `BOTH` — produce Long-form Render and derive Short Renders from it

### Recording Mode
Constrains valid Render Targets:
- `SHORT_FORM_RAW` (≤60s raw) — compatible only with `SHORTS` (single short, no extraction)
- `LONG_FORM_RAW` (multi-minute raw) — compatible with `LONG`, `SHORTS`, or `BOTH`

---

## Resolved decisions (so far)

| Topic | Decision |
|---|---|
| Format scope | Both 16:9 long-form + 9:16 shorts, shorts derived from long |
| Content kind | Expository talking-head with composited Overlays |
| Background | Physical green screen → FFmpeg chroma key |
| Recording mode | Extempore (no teleprompter), AI handles post-prod cleanup |
| Render dispatch | Per-job `Render Target` flag: LONG / SHORTS / BOTH |
| Overlay engine | Remotion composer + Mermaid (structured graphs, auto-layout) + Excalidraw via MCP (freeform sketches, hand-drawn) — both → SVG → Remotion `<Img>` |
| Cut detection | Silero VAD + `whisper.cpp` `large-v3` (local) + Claude Code CLI headless LLM pass |
| Stack philosophy | Full-local terminal tooling, top-star OSS only, no paid SaaS |
| LLM driver | Claude Code CLI (`claude -p`) for transcript→cut-list, →overlay-spec, →highlights; Codex for codegen helpers |
| Render compute | Local (Mac/Linux), FFmpeg + Remotion CLI render; no Lambda |
| Recording modes | Both `LONG_FORM_RAW` and `SHORT_FORM_RAW`; user flags per job |
| Publish targets (v1) | YouTube only (long + Shorts), single OAuth (YT Data API v3). TT/IG/X = Phase 2 |
| Orchestration | 6-command CLI (`install`, `download`, `transcribe`, `translate`, `overlay`, `list`) under `@allonfire/video-pipeline`. Stage-per-command, idempotent, filesystem-driven. No FSM, no Prisma. |
| Review gates | Configurable per job (`--auto` / `--review-at cut,publish`). Default = pause before publish. |
| Topic source | Primary = YT URL → yt-dlp → transcript → Claude Code → **Topic Brief**. Secondary = manual input, article URL, RSS. Existing n8n `topic-discovery` reusable as feed (Phase 2). |
| Channel concept | "AI-focused Italian channel, sarcastic-but-precise voice" — content arbitrage of non-Italian AI YT (e.g. @Chase-H-AI style) → Italian version. Audience: anyone interested in AI. |
| Output language | **Italian** — `whisper.cpp` `large-v3` model, LLM prompts in IT, captions IT, YT metadata IT |
| Visual brand | Dark mode (~#0F0F0F bg, light text). Font: Roboto family (Roboto for body/headings, Roboto Mono for code overlays). Accent: AllOnFire orange `#FF6B00` (default; revisitable). |
| Music library | External folder `/Volumes/Crucial-4T/video/sound` (env `VIDEO_MUSIC_DIR`). Subfolders by mood. LLM mood-picks per Topic Brief. Tracks pre-curated from YT Audio Library. |
| Data model | `<projectRoot>/metadata.json` per project. Tri-state stages: `null` / `{at}` / `{failedAt, error}`. Artifacts colocated: `video.mp4`, `captions-en.vtt`, `transcript.md`, `transcript.json`, `transcript-it.md`, `script-it.md`, `overlay.md`. |
| Project layout | `$VIDEO_WORK_DIR/<YYYY-MM-DD>-<italian-slug>/`. Env `VIDEO_WORK_DIR` default `/Volumes/Crucial-4T/video`. |

## v1 CLI commands

| Command | Purpose | Inputs | Outputs |
|---|---|---|---|
| `install` | Install the default binary dependency profile: `yt-dlp`, `ffmpeg`, and `whisper-cpp`. Explicit tool names manage individual binaries. | `[tool...]` `[--check]` `[--force]` | binaries on PATH; models download lazily during `transcribe` |
| `download` | Fetch source YT video (1080p cap) + EN captions + metadata.json scaffold. | `<yt-url> --title "<IT title>" [--date YYYY-MM-DD] [--quality 4k\|1080p\|720p]` | `video.mp4`, `captions-en.vtt?`, `metadata.json` |
| `transcribe` | Extract audio via ffmpeg, run whisper.cpp `large-v3`, write verbatim source transcript. Auto-detect source language. | `<project> [--force]` | `transcript.md`, `transcript.json`, updates `metadata.source.language` |
| `translate` | Pass 1: if source ≠ IT, translate verbatim via Claude Code CLI. Pass 2 (always): rewrite into IT extempore voice. | `<project> [--force]` | `transcript-it.md`, `script-it.md` |
| `overlay` | Generate overlay library: independent items drawn from source content, prose "moment" anchors, closed kind list. | `<project> [--force] [--count N]` | `overlay.md` |
| `list` | Filesystem walk of all projects. Table view with stage checkboxes. | `[--status pending\|failed\|done]` | stdout |

## Open branches (deferred, not blocking v1)

- Accent color final pick (default `#FF6B00`, revisitable)
- Topic Brief similarity check (n-gram overlap threshold vs source — ADR-0001 follow-up)
- Phase 2: n8n scraper for YT channels/videos → feeds Source References into pipeline input table (execution stays local — see ADR-0002)
- Phase 2: TT / IG Reels / X publish adapters
- Phase 2: BullMQ + Redis if parallel batched jobs needed
- Phase 2: Recording UX (record in Next.js social app vs OBS + manual upload)
- Phase 2: optional `--remote-render` worker mode for beefier render box
