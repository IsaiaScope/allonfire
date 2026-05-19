# @allonfire/video-pipeline

CLI-only video pipeline. Take a YouTube URL → produce: source transcript, IT translation, IT speaking script, and an overlay library for B-roll enrichment.

## Quick start

```bash
# 1. Install default tools
# all OS: yt-dlp, ffmpeg, whisper-cpp
pnpm video install

# Check installed tools without changing the machine
pnpm video install --check

# Remove one explicit tool, or omit the tool name to remove the default profile
pnpm video uninstall yt-dlp
pnpm video uninstall --check

# 2. Download a source video
# The project slug defaults to the YouTube title, or pass --title to override it.
pnpm video download https://youtu.be/XXX

# 3. Transcribe (captions first, whisper.cpp fallback)
pnpm video transcribe 2026-05-13-fsm-spiegata

# 4. Translate to IT + rewrite as speaking script
pnpm video translate 2026-05-13-fsm-spiegata

# 5. Generate overlay library
pnpm video overlay 2026-05-13-fsm-spiegata
```

## Project layout

```
$VIDEO_WORK_DIR/                                  (default /Volumes/Crucial-4T/video)
└── <YYYY-MM-DD>-<slug>/
    └── raw/
        ├── <slug>.mp4
        ├── captions-en.vtt?
        ├── transcript.md          (source verbatim, [HH:MM:SS] markers)
        ├── transcript.json        (normalized segments + detected language)
        ├── transcript-it.md       (IT verbatim, alias if source=IT)
        ├── script-it.md           (speaker-friendly cue script, always)
        ├── overlay.md             (overlay library)
        └── metadata.json          (project state, tri-state stages)
```

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `VIDEO_WORK_DIR` | `/Volumes/Crucial-4T/video` | Video workspace root; each project stores raw pipeline files in `raw/` |
| `VIDEO_MUSIC_DIR` | `/Volumes/Crucial-4T/video/sound` | Background music (reserved) |
| `WHISPER_MODELS_DIR` | `/Volumes/Crucial-4T/repo/allonfire/models` | Whisper.cpp model cache |
| `WHISPER_MODEL` | `large-v3` | Whisper.cpp model name |
| `LOCAL_ASR_ENGINE` | `auto` | Local fallback when captions are missing: `auto` or `whisper-cpp` |
| `TRANSCRIPT_REPAIR_AGENT` | `auto` | Local agent cleanup for repeated ASR loops: `auto`, `claude`, `codex`, or `off` |

## Transcription strategy

`transcribe` stays local-first and OS-independent. It reads downloaded `captions-*.vtt` first. When captions are missing, `LOCAL_ASR_ENGINE=auto` uses `whisper.cpp`. Before ASR, media preflight verifies that the video exists, is non-empty, has an audio stream, and has a known duration; extracted audio is rejected when empty or mostly silent.

Every transcript writes `transcript-quality.json` before acceptance. The quality gate checks empty output, suspiciously short transcripts for the media duration, repeated text loops, missing timestamps, timestamp regressions, duration overflow, source-language mismatch, low word density, and suspicious captions. If quality remains bad after repair, the stage fails instead of marking `transcribed` done.

`install` keeps that fallback path simple. With no tool names, it installs `yt-dlp`, `ffmpeg`, and `whisper-cpp`. It does not create or manage a Python ASR venv.

When `TRANSCRIPT_REPAIR_AGENT=auto`, repeated or unstable local ASR output can be cleaned by an installed local `claude` or `codex` CLI. The repair step only removes obvious duplicate loops or invalid timing, preserves source words, and may mark uncertain retained text. It does not translate, summarize, rewrite, add facts, or invent content for an empty transcript.

## See also

- `docs/adr/0002-all-local-video-pipeline.md`
- `docs/adr/0003-clionfire-pure-cli.md`
- `CONTEXT.md` — domain glossary
