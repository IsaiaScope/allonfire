# Writing

Comments, docs, READMEs, pull requests and user copy. Comment and wording rules for code: `conventions.md` ("Comments"). Docs generation: `.claude/skills/aof-documentation/SKILL.md`.

## Docs and diagrams

- Guides hold only what lives nowhere else; for the rest, one pointer line to the source. Example: `docs/guides/vps.md`.
- End a guide with `## History and gotchas`, one dated line each: symptom, cause, fix. Example: `docs/guides/vps-backups.md`.
- Draw text diagrams with plain arrows and indentation; box-drawing characters misalign across editors (`tooling.md`).
- Write placeholders such as `<vps-ip>`, never a real IP, bucket, email, token or internal ID: the repo is public (placeholder table in `vps.md`).

## READMEs

- Follow `/aof-documentation`: centered header block, badges as HTML `<img>` in `<p align="center">`, screenshots from `docs/screenshots/`. Example: `README.md`.

## Pull requests

- Fill `.github/pull_request_template.md`: Summary as bullets, Technical Details, Testing as prose; never a checkbox test plan.
