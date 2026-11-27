# Writing

Comments, docs, READMEs, pull requests and user copy. Comment and wording rules for code: `conventions.md` ("Comments"). Docs generation: `.claude/skills/aof-documentation/SKILL.md`.

## Docs and diagrams

- Guides hold only what lives nowhere else; for the rest, one pointer line to the source. Example: `docs/guides/vps.md`.
- End a guide with `## History and gotchas`, one dated line each: symptom, cause, fix. Example: `docs/guides/vps-backups.md`.
- Draw text diagrams with plain arrows and indentation; box-drawing characters misalign across editors (`tooling.md`).
- Write placeholders such as `<vps-ip>`, never a real IP, bucket, email, token or internal ID: the repo is public (placeholder table in `vps.md`).

## READMEs

- A README is for a person: what this is, how to run it, where things are, what trips you up. Prefer a table, a tree or a numbered list to paragraphs, and drop a section the reader does not need.
- A README never retells a guide, an ADR or the code (setup walkthroughs, export references, design reasons): it links the guide. A fact that lives only in a README moves into a guide or a doc comment before it is cut.
- A Mermaid diagram has three boxes at most; anything bigger is a table or a list. An opening or About description is a couple of plain sentences, never a diagram. Write for apps still to come: outside the list of apps itself, say "the apps" or "a Next App", never a count and never one app's name where any app would do.
- The look follows `/aof-documentation`: centered header block, badges as HTML `<img>` in `<p align="center">`, emoji section headings, screenshots from `docs/screenshots/`. Example: `README.md`.

## Pull requests

- Fill `.github/pull_request_template.md`: Summary as bullets, Technical Details, Testing as prose; never a checkbox test plan.
