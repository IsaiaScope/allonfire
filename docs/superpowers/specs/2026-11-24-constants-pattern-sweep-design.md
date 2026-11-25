# Constants pattern sweep — design

## Intent

`packages/ui/src/features/image/upload/constants/image-upload.ts` (`IMAGE_UPLOAD`)
was called "the wrong pattern" by the owner. The API's constants
(`apps/api/src/shared/constants/api.ts`, `features/*/constants`) are the model.
Bring every constants file in the repo to that model, and write the rules down
so the next constants object starts right.

## The model (what the API does today)

- One exported nested object per owner; a sub-owner is a key of its parent
  (`LAURA = { FAVORITES: LAURA_FAVORITES, GALLERY: LAURA_GALLERY, … }`).
- Keys grouped by role (`CODE`, `DOC`, `LIMIT`, `PATH`, `ERROR`), sorted A–Z.
- Units live inside a group (`LIMIT.REQUEST_TIMEOUT_MS`, `DEFAULT.DRAIN_TIMEOUT_MS`).
- A lookup is a keyed record, `as const satisfies Record<K, V>`; no tuple arrays.
- A file-local `const` exists only for a piece shared inside the literal.

## Decisions (owner's, from the brainstorm)

1. **Scope: every constants file** in `apps/*` and `packages/*` (about 90 files), not only `IMAGE_UPLOAD`.
2. **All five fixes apply:** keyed records instead of tuple arrays; error values; nested groups instead of verb-prefixed flat keys (`ADD_KANJI` → `KANJI.ADD`, `EDIT_ERROR` → `EDIT.ERROR`); owner naming; units inside a group.
3. **Owner nesting: `IMAGE.UPLOAD`.** In doubt, nest; and expand an owner object that already exists rather than adding a sibling. (Owner's words: "in doubt always nesting, maybe expanding already present ones".)
4. **Error values stay camelCase** (`TOO_LARGE: "tooLarge"`). They are translation JSON keys in every `en.json` / `it.json`; value casing follows the data format, key casing follows the constant rule. Researched: no source backs UPPER_SNAKE for translation keys; enum-like objects take their value casing from the external format.

5. **Where a constant goes (owner's rule):** if it involves one package, expand the owner inside that package; if it spans packages, expand the parent owner. So `IMAGE.UPLOAD` (the form's error kinds, notice, API-code table) is ui-only vocabulary and lives in `packages/ui` as `IMAGE.UPLOAD`, in one `packages/ui/src/features/image/constants/image.ts`; the storage `IMAGE` is imported under an alias in the rare file that needs both. `image-upload.ts` is deleted.
6. **Fewer constants files:** a sub-feature's constants file merges into its parent owner's one file (`LAURA_GALLERY`, `LAURA_FAVORITES` → `LAURA.GALLERY`, `LAURA.FAVORITES` in `laura.ts`; sub-feature files deleted). A file stays split only past 300 lines or when a sub-feature is its own package or route module.
7. **Non-constants move out in the same phase:** JSX dressing, `cva` class lists, helper functions, and schemas/types beside an owner leave `constants/` (next to their component, `utils/`, or the file that needs the schema). A loose side export that feeds one owner folds into it (`SECTION` + `SECTIONS`, `APP_ENTRY` + `APP_OPTIONS`, `PROBE_PATHS`).
8. **No guard test, docs only.** The five rules and the merge rule go in `docs/guides/conventions.md`, each with an API example.

## My calls (the owner can overrule at review)

- **Doc text keys nest by verb:** `IMAGE.DOC.GET_200` / `GET_DESCRIPTION` / `GET_SUMMARY` become `IMAGE.DOC.GET.RESPONSE[200]`-style nested groups (`DOC.GET = { DESCRIPTION, SUMMARY, … }`); the builder picks the status-key spelling once and applies it everywhere (OpenAPI doc routes read them). Follows "in doubt, nest".
- **Unit keys:** ceilings and counts go in `LIMIT`, fall-backs in `DEFAULT`, waits in a `DELAY`/`TIMEOUT` group of the owner; the API's names win when a kind exists there.
- **`UploadError`** type is `z.infer<typeof uploadErrorSchema>`, `uploadErrorSchema = z.enum(IMAGE.UPLOAD.ERROR)`.
- **The API model file is itself not clean** (loose `HEALTH`/`READY`, `PROBE_PATHS`, `SERVICES.DOC` verb-prefixed): it is swept like the rest, not treated as untouchable.
- **No ADR, no `CONTEXT.md` change:** the shape is reversible and `CONTEXT.md` is a glossary; the rules live in `conventions.md`.

## Audit (2026-11-24, ~100 files, read-only)

Drift found: 2 tuple lookups; 14 files with flat prefix groups (the `*_KANJI`, `ADD_/EDIT_/SAVE_` and DOC `GET_*` families); 22 unit keys loose at an owner's top; 15 loose or second exports; 2–3 unsorted objects; 9 other (cva or JSX or helpers inside `constants/`, `LAURA.entries` duplicating `APP_ENTRY`). Packages hit: back-office, laura, api, auth, storage, core, database, ui.

## Goals / non-goals / anti-goals

- Goal: one shape for every constants object; call sites read `OWNER.GROUP.KEY`.
- Goal: `docs/guides/conventions.md` states the five rules with an API example each.
- Non-goal: changing any value that reaches the wire, the database or a translation file.
- Non-goal: moving constants between packages beyond decision 3.
- Anti-goal: a rename that compiles but changes behaviour (a key that was a string in a test, a JSON key renamed). Tests stay green at every phase.

## Approaches

| | How | Trade-off |
|---|---|---|
| A. One sweep per rule across the repo | five passes, each touching every package | each pass is small, but five passes re-open every file and the call sites move five times |
| **B. One phase per package, dependency order** | core → storage → auth → database → ui → api → back-office → laura; all five rules per file | one pass over each file; a package's call sites in apps move once; each phase ends green |
| C. Codemod | script the renames | the shapes are semantic (which keys group), a script gets the easy 80% and the owner reviews the rest anyway |

Pick **B**: apps import packages, so fixing a package first means each app is edited once for all its imports. The `IMAGE_UPLOAD` / Back Office `IMAGES` work comes inside its phases (storage, ui, back-office).

## Constraints

- The branch `feat/laura-p0-drop` has uncommitted work in the same files (`IMAGES`, `image-upload.ts`, `with-image-uploads.ts`). The plan reconciles with it and never reverts it.
- TDD, repo rules: tests first, `// @module-tag` first line, no `as` casts except `as const`, no string-literal paths in tests.
- Docs: a rule moves into `conventions.md` the same phase it is applied.

## Left to the builder

- Group names where two readings fit (`SIZE` vs `LIMIT` for `THUMB_PX`): pick the one the API already uses for that kind of value; sort A–Z.
- Order of files inside a phase.
