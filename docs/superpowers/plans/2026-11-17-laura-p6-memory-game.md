# Laura Phase 6: Memory Game and Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Laura's Memory game (6 random Laura Images as 12 cards, the old rules, score ranked by fewest moves then time) and its one leaderboard are rebuilt on the API, the private cache and TanStack, with Quiz gone from the database, the API and the App.

**Architecture:** A Liquibase changeset makes `laura."GameScore"` Memory-only (QUIZ rows, `gameType`, the enum and unrankable rows go; `score` is read as `moves`). The database service ranks the best game of each current Laura Member in SQL; the API mounts `GET /v1/laura/games/memory/deck` (6 random Images, signed links, never cached), `POST /v1/laura/games/memory/scores` (plausibility-checked) and `GET /v1/laura/games/memory/leaderboard` behind `requireApp(App.LAURA)`. Laura's `/memory` and `/memory/leaderboard` are Back-Office-style pages: the leaderboard is hydrated from a `"use cache: private"` read and read back by TanStack, a score is an action then `updateTag(GAMES.CACHE.TAG)` then core's `invalidateStatic` on the leaderboard key (plain `invalidateQueries` never refetches a `staleTime: "static"` query: fixed by Phase 4, Task 1), and the deck is a client-only TanStack draw that no layer keeps.

**Tech Stack:** Prisma 7 + Liquibase, Hono + hono-openapi + zod, Next 16 (Cache Components), TanStack Query 5, TanStack Table (through ui's `AOFDataTable`), Base UI over shadcn (through ui), Tabler icons, CSS motion (tw-animate-css), Vitest (node, Chromium/WebKit browser), Playwright, MSW. No new dependency (framer-motion is not added: see Decisions).

**Spec:** docs/superpowers/specs/2026-11-17-laura-rebuild-design.md (Phase 6: "Memory game" bullet, decisions 5 and 8, Parity rule)

## Global Constraints

- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`. A constant's type comes from zod (`xSchema = z.enum(X)`, `type X = z.infer<typeof xSchema>`); a lookup table is `as const satisfies Record<K, V>`.
- Never `Object.keys/values/entries/fromEntries`, `JSON.parse/stringify`, `localStorage`/`sessionStorage`: use core's helpers.
- Constants are one nested object per owner (`API`, `AUTH`, `IMAGE`, ...). A path or an error code is never a string literal, tests included (statuses and methods through core's `HTTP`). A Tailwind class list is never a constant: `cva`, or inline in `cn`.
- An env var starts with its owner: `STORAGE_`, `DATABASE_`, `AUTH_`, `API_`. This phase adds none.
- A package never imports an App. Files go in `src/{environment,shared,features}`. A package's logic never names an App (ADR 0033); the database package catalogues Laura in `features/apps/laura/`, which is allowed.
- Server Components by default; `"use client"` only for hooks, event handlers, browser APIs or client libraries.
- A stored picture (Image, Avatar) in a Next App shows its blur while it loads, as `/storage/images` does, except under 40 px (`images.md`).
- Every form with fields is an AOF form (`useAOFForm`). This phase has no form with fields (a card is a button, the score is sent by the board).
- Components shared by Apps live in `packages/ui`, named `AOF...`. `packages/shadcn` is written only by the shadcn CLI. Pages are built through `/aof-design`, never plain `/impeccable`; one build and one screenshot round, no review loops.
- A page of any Next App that reads or writes the API follows the data checklist in `docs/guides/next-apps.md`; every page task below names each point.
- A page that waits has a skeleton at the loaded page's sizes with a browser test that compares heights at a wide and a phone width: change the page, change its skeleton in the same edit.
- Database changes are Liquibase changesets (`pnpm db:changeset`), never `prisma db push` or `prisma migrate`; never edit an applied changeset.
- Tests read copy from its source (`enT`/`itT`, `translate()`), never retyped text; tests sign in as a Fixture (`FIXTURE.USER.<App>.<Role>`), never a retyped email.
- exFAT drive: macOS writes `._*` sidecars; a new tool that scans folders ignores `**/._*`.
- Docs are plain English prose, no emoji, the word for possibility is "might", for permission "can" or "is allowed to"; text diagrams use arrows and indentation.
- Do not commit: the owner commits by hand. This plan has no `git commit` step.

## Review Focus

1. **The deck must be random every play and never kept or redrawn mid-game.** A private-cache copy would deal the same six photos for `stale`; a TanStack key shared across plays or refetched on focus, on reconnect or by any invalidation would reshuffle a board under the player. Pinned by Task 6 (the route answers `no-cache`, the dependency is called once per request), Task 13 (`deckQuery` is `staleTime: "static"`, `gcTime: 0`, its key outside `QUERY.GAMES.ALL`) and Task 14 (a score, a window focus and a hide-and-return never request a deck, a new game does).
2. **Data: the changeset keeps every rankable Memory row, and the leaderboard ranks them right.** Fewer moves first, then the faster time, then the earlier game; one row per current Laura Member; a User who left Laura is not listed or counted. Pinned by Task 1 (`changelog.integration.test.ts`: rows kept and removed, CHECK, rollback) and Task 3 (`game-score.integration.test.ts`).
3. **The plausibility rule never refuses the real game and refuses nonsense.** The floor (`MIN_MS_PER_MOVE`) sits under the board's own hold per move (`GAMES.MEMORY.HOLD_MS`); a refusal is the coded `IMPLAUSIBLE_SCORE`, never a 500 or a bare validation error, and the dialog tells it without a retry. Pinned by Task 2 (`memory-rule.test.ts`), Task 7 (`scores.test.ts`), Task 12 (hold against floor) and Task 14 (dialog states).
4. **Both copies refresh after a score, and only the leaderboard's.** The action calls the API then `updateTag(GAMES.CACHE.TAG)`; the mutation then core's `invalidateStatic` on `QUERY.GAMES.LEADERBOARD` (fixed by Phase 4, Task 1: the installed TanStack, query-core 5.103.2, skips an active `staleTime: "static"` query in `refetchQueries`, so a bare `invalidateQueries` would leave the badge and the page on the old numbers while looking correct), so the board's best badge and the leaderboard page both really refetch. Pinned by Task 13 (the mutation test asserts the mounted leaderboard query is refetched, the deck's is not), Task 14 and Task 19 (the leaderboard shows the game just played with no reload).
5. **Keyboard, announcements, reduced motion, landscape phone.** A matched card must not take focus away (it is `aria-disabled`, never `disabled`); a match and the end are announced in a polite live region; the flip is instant under reduced motion; all 12 cards fit a landscape phone at touch size. Pinned by Task 14 (browser tests) and Task 19 (Playwright).

---

## Decisions this plan takes (correctable)

- **The deck is its own route, not the Image list.** `GET /v1/images?app=laura` pages newest first (a run of neighbours, never six scattered photos), needs a `total` call to pick a random page, and answers `access`, `apps`, `key`, `bytes`, `version` a card never uses. `GET /v1/laura/games/memory/deck` answers only `id`, `alt`, `blurDataUrl`, `width`, `height` and the signed `srcSet` of 6 random Images the caller can see in Laura, and `needed: 6`.
- **A draw is not a read of stored state, so the checklist's point 1 is applied in part and the exception is written into the guide (Task 20).** TanStack yes (`useQuery`, `QUERY.GAMES.DECK(round)`, `staleTime: "static"`, `gcTime: 0`: nothing is kept after the board leaves, nothing is asked again on a clock, a focus or a reconnect, and one key per play); the private cache no, since its copy would repeat the same photos for `stale`. Consequence: the page has no request-time data of its own, so it is in the static shell and paints at once; the deck is asked by the browser after hydration, behind the board's skeleton. Not a server action: a draw changes nothing, so there is no `updateTag` to run, and a query keeps the Back Office's `AOFQueryView` states (skeleton, failed with retry, 403).
- **The leaderboard is top 25, no cursor.** It lists the best game of each current Member, so it is as long as Laura has Members who played; the old cap was 25. The body carries `me` (the caller's own best, plays and rank, which might be past 25) so a User outside the list still sees their place. A cursor would add a second page state to a table that never has two pages today.
- **`GameType` is removed, not kept as a one-value enum.** Memory is the only game (`CONTEXT.md`), so a one-value enum is a dead `gameType` parameter in every signature and index; the API path already names the game, and a second game later is one changeset adding a column with a default, as cheap as `ALTER TYPE ADD VALUE`. The changeset also drops the never-read `metadata` and tightens `score`/`timeMs` to `NOT NULL` after deleting rows the old leaderboard never listed (null time or score), and adds `CHECK ("score" >= 6 AND "timeMs" > 0)` (12 cards cannot be matched in fewer than 6 moves). The Prisma field is `moves` mapped to the column `score`, so no SQL rename and no code where a lower `score` is better.
- **Only current Laura Members rank.** The ranking joins `auth."Membership"` (`'laura'`): an Avatar is visible only to someone who shares an App with the User, and a leaderboard must not list who left. Their rows stay and count again if they return.
- **The leaderboard exposes no user id or email:** entries carry `isMe`, `name`, a signed Avatar link and its blur, `moves`, `timeMs`, `playedAt`; a null name is drawn as `Games.anonymous`.
- **Plausibility is physical, from the game's own rule.** The board holds every pair open `HOLD_MS` (800 ms) before it resolves, so a game of `moves` moves lasts at least `moves * HOLD_MS`; the API floor is `MIN_MS_PER_MOVE = 700` (under the hold, so rounding never refuses an honest game), `MIN_MOVES = 6`, `MAX_MOVES = 1000`, `MAX_TIME_MS` one day (fits the Int column). A determined cheater with believable numbers passes: the leaderboard is for a couple, and the API refuses only the impossible.
- **A retry after a lost answer can count a game twice** (no idempotency key): accepted, since a leaderboard of best games is unchanged by a duplicate and only `totalGames` moves by one.
- **Motion: no framer-motion.** Nothing in the Back Office or any package uses it, `/aof-design` says CSS only (tw-animate-css, keyframe tokens, each behind `motion-safe:`), and `code-style.md` asks for a library only for an animation that changes layout (width plus content plus timing). The flip is one property (`transform`) and the dialog and table entrance are the shadcn ones. A library with 200,000+ weekly downloads would pass the dependency rule but nothing here needs it. The 800 ms hold is a game rule (how long a pair rests), not animation coordination, so it is a timer in the state machine under `GAMES.MEMORY.HOLD_MS`.
- **Grid by fit, not by breakpoint.** `fitGrid` picks the layout of 3x4, 4x3 or 6x2 that gives the widest 3:4 card (the Design's card back is `300x400`) in the room the page leaves, which also covers a landscape phone; it replaces the old 640 px switch (a game rule is unchanged, a layout is not one).
- **The finished board is dismissible.** The complete dialog is an `AOFDialog` that Escape or its close button dismisses, leaving the final stats and a Play again button on the board (the old alert dialog trapped the player until a button).
- **A face is drawn on its own blur** (`images.md`): the face tile is painted with the Image's `blurDataUrl`, the picture is `object-contain` over it and takes `placeholder="empty"`.
- **Static queries refresh through `invalidateStatic`, and the leaderboard's boundary is plain.** `staleTime: "static"` is mandatory (a number reads the clock while the page prerenders), and the installed query-core (5.103.2) skips an active static query in `refetchQueries`, so `invalidateQueries` alone refreshes nothing on screen. Every refresh of a static query in this phase goes through core's `invalidateStatic` (fixed by Phase 4, Task 1): the score mutation on the leaderboard key, nothing else. The deck is never passed to it, and being outside `QUERY.GAMES.ALL` it is also outside any prefix a later `invalidateAll` on `ALL` would touch. Where a plain `invalidateStatic` removes an inactive static entry (the leaderboard page hidden in `<Activity>` when the score lands), the page's own mount or hydration refills it, at worst one skeleton frame.
- **Reconcile rule.** Phase 3 (shell), Phase 4 and Phase 5 are written in parallel and touch the same few files (Laura's `QUERY`/`MUTATION`/`LAURA` constants, both `Games`-adjacent translation files, `apps/api/src/app.ts` and `app-deps.ts`, the API README). Before each task re-read the file, edit only the lines the task names, and keep the others' lines.

## Reuse map (the Back Office mechanism each piece takes; the one new package piece)

| Piece | Mechanism it reuses |
|---|---|
| Laura's API calls | core `aofCreateApi` and `aofCreateServerApi` (Phase 1, Task 2) in Laura's `features/api/utils/{api,server-api}.ts` bindings (fixed by Phase 3); `aofRefusal` for `refusalOf` |
| Leaderboard hydration | the `storageOverviewHydration` pattern: `"use cache: private"`, `cacheTag`/`cacheLife` from `GAMES.CACHE`, `readSessionCookie`, `AOFGetQueryClient`, `dehydrate`; page side `AOFHydratedBoundary` (core) |
| Leaderboard and deck reads | `queryOptions` with `staleTime: "static"` and `retryUnlessRefused` (core, Phase 1 Task 4); drawn by ui `AOFQueryView`; the leaderboard's boundary is plain `AOFHydratedBoundary` (no `onlyMissing`: Decisions) |
| Score write | server action then `updateTag`, mutation then core's `invalidateStatic` (`invalidate-static.ts` beside `optimistic-mutation.ts`, fixed by Phase 4, Task 1: `invalidateAll` now calls it; a plain `invalidateQueries` skips an active `static` query). Not `optimisticMutation`: a score is not a click-driven toggle and its rank cannot be predicted |
| Errors told once | `AOFQueryProvider`, `aofErrorMeta(false)` where the component shows the error itself (the dialog, the board's notice) |
| Stored pictures | `AOFStorageImage` + `srcSetLoader` + `AOFPictureGuard` (ui), blur from `blurDataUrl`, face on its own blur tile; Avatars `AOFUserAvatar` (Phase 1 Task 9) |
| Leaderboard table | ui `AOFDataTable` + `aofColumnHelper` + `AOFDataTableSkeleton`, as the Users list; dates through `useDayFormat` (ui `features/data-table/hooks`, Phase 1 Task 5) |
| Complete dialog | ui `AOFDialog`/`AOFDialogContent` (safe-area centring included) |
| Fresh board each visit | ui `AOFFreshOnReturn` (the Add forms' reset of a hidden `<Activity>`) |
| Page frame, gate, title | Laura's `signedInPage`, Section page and `pageMetadata` bindings (fixed by Phase 3, mirroring the Back Office; Phase 1's `AOFSectionPage`, `aofAppMetadata`) |
| Tests | `renderInApp` (Phase 3 binding of Phase 1's `renderInUi`), core `fake-api`, Laura's MSW `handlers.ts`, `enT`/`itT`, ui `computed-style` and `emulated-media` (`withReducedMotion`), core `SCREEN` |
| New package piece | `AOFEmpty` in ui (shadcn `empty` under an AOF name, Task 10), for "needs more photos", "no scores", "failed", "forbidden". Reconcile: if Phase 4 or 5 already added one, reuse theirs and skip Task 10 |

---

## File structure

**Deleted by this phase:** in the database, the QUIZ rows, the `gameType` column, the `GameType` enum, `metadata`, and in the service `getScoreOrderBy`, `getGlobalBestScore`, `getUserBestScore`, `getUserGameStats`, `getGameStats` and `submitGameScore` (Tasks 1 and 3). Nothing under `apps/laura` is edited: Phase 3 empties `src/` and this phase never recreates Quiz or the old files.

**Old Laura files left to the rebuild (Phase 3 empties `src/`; this plan never recreates the Quiz ones):** under `apps/laura/src/`: `features/games/**` (all: `actions/{games,quiz,quiz-admin,quiz-form,leaderboard-cache}.ts`, `hooks/{use-memory-game,use-quiz-game,use-game-reset,use-memory-grid-size}.ts`, `components/*`, `utils/format-time.ts`, `CLAUDE.md`, `README.md`); `app/[locale]/(dashboard)/games/**` (hub, memory, quiz, edit, leaderboards, their `loading.tsx`); `lib/animation-variants.ts`, `components/motion-provider.tsx`, `components/animated-page.tsx` (framer); the quiz mentions in `opengraph-image.tsx`, `components/json-ld.tsx`, `lib/seo.ts`, `features/layout/components/nav-links.ts`, `features/layout/README.md`. The old games here were ported (names kept: `use-memory-game`, `use-memory-grid-size`, `memory-board`, `memory-card`, `game-complete-dialog`, `format-time`, `leaderboard-table`, `leaderboard-stats`, `global-best-badge`, `rank-badge` from `leaderboard-shared`).

**Left for Phase 7 (outside `src/`, so Phase 3 does not remove them):** `apps/laura/messages/{en,it}.json` (the `Games` and quiz keys), `apps/laura/public/memory-card-back-{light,dark}.png` (replaced by the Design's card back), the `framer-motion`, `lucide-react` and `react-hook-form` dependencies in `apps/laura/package.json`, `apps/laura/README.md` quiz lines, `docs/guides/laura.md` (quiz routes; Phase 3 rewrites it), `packages/design/src/apps/back-office/PRODUCT.md` line 43 ("Laura's photos and quiz": a design source file, so it changes with `pnpm design:sync`), and the example path in `docs/guides/code-style.md` that points at Laura's `motion-provider.tsx` (the rule stays, the example needs a new home). Phase 7 verifies with `git grep -n -i quiz` that only history and ADR text is left.

**Created (new):**

- Database: `packages/database/changelog/changesets/00NN-memory-only-game-scores.sql` (reconcile: `pnpm db:changeset` names it; Phase 0 used `0008`, Phase 4 adds `laura.Favorite`), `.../features/apps/laura/constants/memory-rule.ts` (+ test), `.../features/apps/laura/tests/game-score.integration.test.ts`, `.../features/image/tests/image-random.integration.test.ts`.
- API (`apps/api/src/features/laura/games/`): `constants/{games,schemas}.ts`, `routes/{index,routes,handlers}.ts`, `utils/deps.ts`, `games-deps.ts`, `tests/{stub-games-deps,schemas,deck,scores,leaderboard}.test.ts`-style files (named in tasks), `tests/games.integration.test.ts`.
- ui: `packages/ui/src/shared/components/aof-empty.tsx` (+ test).
- Laura (`apps/laura/src/`, reconcile with Phase 3's layout): `features/games/{constants,components,hooks,utils,actions,tests}/` (files named in tasks), `app/[locale]/(signed-in)/memory/page.tsx`, `app/[locale]/(signed-in)/memory/leaderboard/page.tsx`, `e2e/memory.spec.ts`.

**Modified:** `packages/database/prisma/schema/apps/laura.prisma`, `.../apps/laura/game-score.service.ts`, `.../features/image/image.service.ts`, `packages/database/package.json` (export keys), `packages/database/liquibase/tests/changelog.integration.test.ts`, `apps/api/src/{app.ts,index.ts}`, `apps/api/src/shared/constants/{api,error}.ts`, `apps/api/src/shared/tests/app-deps.ts`, `apps/api/package.json` (export key), `apps/api/src/features/i18n/{translations/en.json,translations/it.json,translation-values.ts}`, `apps/api/src/features/docs/tests/spec.test.ts`, Laura's `shared/constants/{laura,query,mutation}.ts` and both translation files, `knip.jsonc`, `packages/config/local/tests/package-exports.test.ts`, `apps/api/README.md`, `packages/database/README.md`, `docs/guides/{next-apps,api}.md`, `CONTEXT.md`.

---

### Task 0: Reconcile and baseline

**Files:** none changed.

**Interfaces:** Consumes the names the phases before this one fix (cite, never rename): Phase 0 (`Role` is `ADMIN | USER`; `requireApp(app, min?)`; `FIXTURE.USER.LAURA.USER`/`ADMIN`); Phase 1 (`aofCreateApi`, `aofRefusal`, `retryUnlessRefused`, `invalidateAll`, `AOFUserAvatar`, `AOFAppFrame`, `AOFSectionPage`, `useDayFormat`, `renderInUi`, `AppDescriptor`/`AppSection`/`AppSubPage`); Phase 2 (`POLPO_CARD_BACK = { WIDTH: 300, HEIGHT: 400, SVG, DATA_URL }` at `@allonfire/design/designs/polpo/card-back`: the Design's card back, name fixed by Phase 2 Task 7; if the owner renamed the Design, only the folder name changes); Phase 3 (`LAURA` descriptor at `apps/laura/src/shared/constants/laura.ts`, the API bindings, `signedInPage`, `pageMetadata`, `QUERY`/`MUTATION`, MSW, `enT`/`itT`, browser and e2e scripts, `LAURA.PAGE`); Phase 4 (`apps/api/src/features/laura/favorites/`, its `app.ts` deps entry; Task 1: core's `invalidateStatic(queryClient, queryKey): Promise<void>` at `@allonfire/core/features/next/query/utils/invalidate-static`, which `invalidateAll` now calls, and `AOFHydratedBoundary`'s `onlyMissing` prop; reconcile: if Phase 4 left `invalidateStatic` without an export key, add `./features/next/query/utils/invalidate-static` to core's `package.json` there, since Laura reads it).

- [ ] Step 1: `git status`, `git log -5 -- apps/api packages/database apps/laura`; read `docs/superpowers/plans/` for the Phase 3 to 5 plans once they exist and note any name that differs from this plan's "fixed by" citations; fix the citation in the task that uses it, not the other plan.
- [ ] Step 2: confirm `pnpm-workspace.yaml` no longer excludes `apps/laura` and `apps/laura/src` holds Phase 3's shell (if Phase 3 has not landed, stop: Tasks 11 to 19 need it; Tasks 1 to 10 do not).
- [ ] Step 3: baseline, record pass counts: `pnpm test:services`, `pnpm --filter @allonfire/database test`, `pnpm --filter @allonfire/api test`, `pnpm --filter @allonfire/ui test`, `pnpm --filter @allonfire/laura test`, `pnpm --filter @allonfire/laura test:browser`, `pnpm static:dupes`, `pnpm static:knip`. A red here is fixed or reported before the work starts.

### Task 1: The changeset and the Prisma schema (Memory-only `GameScore`)

**Files:**
- Modify: `packages/database/prisma/schema/apps/laura.prisma`, `packages/database/liquibase/tests/changelog.integration.test.ts`
- Create: `packages/database/changelog/changesets/00NN-memory-only-game-scores.sql` (via `pnpm db:changeset memory-only-game-scores`, then hand-edited)

**Interfaces:** Produces the table `laura."GameScore"` = `id`, `userId` (cascade), `score INT NOT NULL` (Prisma field `moves`), `timeMs INT NOT NULL`, `createdAt`; indexes `GameScore_score_timeMs_idx`, `GameScore_userId_score_timeMs_idx` (names as Prisma drafts them: reconcile); constraint `GameScore_plausible_check`; no `GameType` enum, no `gameType`, no `metadata`. Prisma model:

```prisma
model GameScore {
  id        String   @id @default(cuid(2))
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  /// Moves (two cards turned) it took to match every pair; fewer is better.
  moves     Int      @map("score")
  timeMs    Int
  createdAt DateTime @default(now())

  @@index([moves, timeMs])
  @@index([userId, moves, timeMs])
  @@schema("laura")
}
```

- [ ] Step 1: write the failing tests in `changelog.integration.test.ts`: a `describe` on its own throwaway database that applies the changelog up to the changeset before this one (reconcile: use the file's own helper for "update to a point", as its 0002 case seeds rows before a later changeset), inserts a User and these `GameScore` rows by SQL, then runs `update`: MEMORY `(score 8, timeMs 40000)` kept; a QUIZ row gone; a MEMORY row with `timeMs` NULL gone; a MEMORY row with `score` NULL gone; a MEMORY row with `score 3` gone (12 cards cannot match in 3 moves); then assert `information_schema.columns` for `laura."GameScore"` lists exactly `id, userId, score, timeMs, createdAt`; `pg_type` has no `GameType` in `laura`; an `INSERT` with `score 5` fails the check; `rollback-count` of this one changeset restores `gameType` (every surviving row `MEMORY`), `metadata`, the old indexes and the enum with `QUIZ`, and a second `update` ends as before. Also extend the empty-database test: `GameScore` still the only table of `laura` (`LAURA_TABLES` unchanged).
- [ ] Step 2: run, expected FAIL (the column and the type still exist): `pnpm test:services && pnpm --filter @allonfire/database exec vitest run liquibase/tests/changelog.integration.test.ts`
- [ ] Step 3: implement. Edit `laura.prisma` as above, then `pnpm db:changeset memory-only-game-scores` and hand-edit the file to this shape (Liquibase wraps it in a transaction; dropping `gameType` drops the three indexes that hold it; reconcile index names with Prisma's draft):

```sql
--liquibase formatted sql logicalFilePath:changesets/00NN-memory-only-game-scores.sql

--changeset isaia:00NN-memory-only-game-scores
--comment: Memory is Laura's only game (spec, decision 5): QUIZ scores, rows the old leaderboard never listed (no time or score) and rows no game can produce (under 6 moves) are deleted; the game type, its enum and the unused metadata go. Rolling back restores the shape and marks every row MEMORY, never the deleted rows.
DELETE FROM "laura"."GameScore" WHERE "gameType" = 'QUIZ' OR "score" IS NULL OR "timeMs" IS NULL OR "score" < 6 OR "timeMs" <= 0;
ALTER TABLE "laura"."GameScore" DROP COLUMN "gameType", DROP COLUMN "metadata";
ALTER TABLE "laura"."GameScore" ALTER COLUMN "score" SET NOT NULL, ALTER COLUMN "timeMs" SET NOT NULL;
ALTER TABLE "laura"."GameScore" ADD CONSTRAINT "GameScore_plausible_check" CHECK ("score" >= 6 AND "timeMs" > 0);
DROP TYPE "laura"."GameType";
CREATE INDEX "GameScore_score_timeMs_idx" ON "laura"."GameScore"("score", "timeMs");
CREATE INDEX "GameScore_userId_score_timeMs_idx" ON "laura"."GameScore"("userId", "score", "timeMs");
--rollback DROP INDEX "laura"."GameScore_userId_score_timeMs_idx";
--rollback DROP INDEX "laura"."GameScore_score_timeMs_idx";
--rollback CREATE TYPE "laura"."GameType" AS ENUM ('MEMORY', 'QUIZ');
--rollback ALTER TABLE "laura"."GameScore" DROP CONSTRAINT "GameScore_plausible_check";
--rollback ALTER TABLE "laura"."GameScore" ALTER COLUMN "score" DROP NOT NULL, ALTER COLUMN "timeMs" DROP NOT NULL;
--rollback ALTER TABLE "laura"."GameScore" ADD COLUMN "metadata" JSONB, ADD COLUMN "gameType" "laura"."GameType" NOT NULL DEFAULT 'MEMORY';
--rollback ALTER TABLE "laura"."GameScore" ALTER COLUMN "gameType" DROP DEFAULT;
--rollback CREATE INDEX "GameScore_gameType_timeMs_idx" ON "laura"."GameScore"("gameType", "timeMs");
--rollback CREATE INDEX "GameScore_gameType_score_idx" ON "laura"."GameScore"("gameType", "score");
--rollback CREATE INDEX "GameScore_userId_gameType_idx" ON "laura"."GameScore"("userId", "gameType");
```

  Then `pnpm --filter @allonfire/database db:generate` and `pnpm db:update` (Local gets it).
- [ ] Step 4: run, expected PASS: the Step 2 command, then `pnpm test:drift` (expected `No difference detected.`) and `pnpm --filter @allonfire/database exec vitest run liquibase/tests/backup.integration.test.ts` (it still finds `TABLE DATA laura GameScore`). The service file does not compile until Task 3: only the database tests that do not import it are expected green here.

### Task 2: The Memory rules shared by the API and the App

**Files:**
- Create: `packages/database/src/features/apps/laura/constants/memory-rule.ts`, `packages/database/src/features/apps/laura/tests/memory-rule.test.ts`
- Modify: `packages/database/package.json` (key `./features/apps/laura/constants/memory-rule`)

**Interfaces:** Produces `MEMORY_RULE = { PAIRS: 6, CARDS: 12, MIN_MOVES: 6, MAX_MOVES: 1000, MIN_MS_PER_MOVE: 700, MAX_TIME_MS: 86_400_000 }` (`CARDS = PAIRS * 2`, `MIN_MOVES = PAIRS`) and `isPlausibleScore(score: { moves: number; timeMs: number }): boolean`. The API reads it for the deck size and the refusal; Laura for the card count and the hold cross-check.

- [ ] Step 1: write the failing test (`// @module-tag unit`):

```ts
it.each([
  [{ moves: 6, timeMs: 6 * MEMORY_RULE.MIN_MS_PER_MOVE }, true],
  [{ moves: 5, timeMs: 60_000 }, false], // 12 cards need 6 moves at least
  [{ moves: 6, timeMs: 6 * MEMORY_RULE.MIN_MS_PER_MOVE - 1 }, false], // faster than the board lets a pair rest
  [{ moves: 10, timeMs: MEMORY_RULE.MAX_TIME_MS }, true],
  [{ moves: 10, timeMs: MEMORY_RULE.MAX_TIME_MS + 1 }, false],
  [{ moves: MEMORY_RULE.MAX_MOVES + 1, timeMs: MEMORY_RULE.MAX_TIME_MS }, false],
  [{ moves: 6.5, timeMs: 10_000 }, false],
  [{ moves: 6, timeMs: Number.NaN }, false],
])("%j is plausible: %s", (score, expected) => {
  expect(isPlausibleScore(score)).toBe(expected);
});
it("is 12 cards of 6 pairs", () => expect(MEMORY_RULE.CARDS).toBe(MEMORY_RULE.PAIRS * 2));
```

- [ ] Step 2: run, expected FAIL (module missing): `pnpm --filter @allonfire/database exec vitest run src/features/apps/laura/tests/memory-rule.test.ts`
- [ ] Step 3: implement the constant and the function (integers only, `moves` in `[MIN_MOVES, MAX_MOVES]`, `timeMs` in `[moves * MIN_MS_PER_MOVE, MAX_TIME_MS]`); the file comments say why 700 sits under the board's 800 ms hold.
- [ ] Step 4: run, expected PASS.

### Task 3: The game-score service, Memory only

**Files:**
- Modify: `packages/database/src/features/apps/laura/game-score.service.ts` (read it first: `submitGameScore`, `getLeaderboard`, `getGlobalBestScore`, `getUserBestScore`, `getUserGameStats`, `getGameStats`, `getScoreOrderBy` with its QUIZ branch all go), `packages/database/package.json` (key already exists)
- Create: `packages/database/src/features/apps/laura/tests/game-score.integration.test.ts`

**Interfaces:** Produces, in `@allonfire/database/features/apps/laura/game-score.service`:

```ts
export type MemoryScore = { moves: number; timeMs: number };
export type LeaderboardEntry = MemoryScore & {
  image: string | null; imageBlurDataUrl: string | null; name: string | null;
  playedAt: Date; rank: number; userId: string;
};
export type MemoryStats = { averageMs: number | null; fastestMs: number | null; totalGames: number; uniquePlayers: number };
export type UserMemoryStats = { bestMoves: number | null; bestTimeMs: number | null; rank: number | null; totalGames: number };
export type SubmittedScore = { id: string; isGlobalBest: boolean; isPersonalBest: boolean; rank: number };
export function submitMemoryScore(input: MemoryScore & { userId: string }): Promise<SubmittedScore>;
export function memoryLeaderboard(limit: number): Promise<LeaderboardEntry[]>;
export function memoryStats(): Promise<MemoryStats>;
export function userMemoryStats(userId: string): Promise<UserMemoryStats>;
```

`image` is `User.image` raw (the API signs it). Ranking is by `(moves, timeMs, playedAt, userId)` ascending over the best game of each current Laura Member (`auth."Membership"` `'laura'`); `rank` is 1-based without ties; `isPersonalBest` is strictly better than the User's earlier best (or a first game); `isGlobalBest` is `isPersonalBest && rank === 1`; `memoryStats` and `userMemoryStats.totalGames` count the games of current Members only; `fastestMs` is the quickest game of any, `averageMs` the mean rounded.

- [ ] Step 1: write the failing tests (`// @module-tag integration`, Fixture Users read by email from `FIXTURE.USER.LAURA.USER`, `LAURA.ADMIN`, `ADMIN_EVERYWHERE`; `BACK_OFFICE.ADMIN` is a non-Member; `beforeEach` deletes their `GameScore` rows). Tests, each one a name and the assertions:
  - "ranks by fewest moves, then the faster time": A `(8, 40_000)`, B `(7, 90_000)`, C `(7, 60_000)` gives C, B, A with `rank` 1, 2, 3.
  - "lists each Member once, by their best game": A plays `(9, 30_000)` then `(8, 50_000)`: one row for A with moves 8.
  - "an equal game ranks the earlier first": two Users with the same `(7, 60_000)`, the one inserted with the earlier `createdAt` through Prisma ranks 1.
  - "leaves out someone who is not a Member of Laura and does not count their games": the `BACK_OFFICE.ADMIN` row never appears and `memoryStats().totalGames` ignores it.
  - "`limit` cuts the list, not the rank": with 3 Members and `limit 2`, `userMemoryStats(third).rank` is 3.
  - `submitMemoryScore`: a first game is a personal and global best with `rank` 1; a worse later game of the same User is neither; a strictly better one is both; a game equal to the best is neither; a better game of a second User takes `isGlobalBest` and `rank` 1 and moves the first to 2.
  - `memoryStats`: `totalGames`, `uniquePlayers`, `fastestMs` (the quickest game even when it was not a best row) and `averageMs` rounded; with no rows, the counts are 0 and the times `null`.
  - "the database refuses a game no player can produce": `prisma.gameScore.create` with `moves: 5` rejects.
- [ ] Step 2: run, expected FAIL (old exports): `pnpm test:services && pnpm --filter @allonfire/database exec vitest run src/features/apps/laura/tests/game-score.integration.test.ts`
- [ ] Step 3: implement. The old `distinct` plus `orderBy` read every row and deduplicated in memory; ranking is one raw query, shared by the list, the rank lookup and `submitMemoryScore` (inside `prisma.$transaction`: read the User's best, insert, read the rank). The App is named by its stored value `'laura'` from one constant in the file:

```sql
WITH member AS (SELECT "userId" FROM "auth"."Membership" WHERE "app" = 'laura'),
best AS (
  SELECT DISTINCT ON (g."userId") g."userId", g."score" AS moves, g."timeMs", g."createdAt"
  FROM "laura"."GameScore" g JOIN member USING ("userId")
  ORDER BY g."userId", g."score", g."timeMs", g."createdAt"),
ranked AS (
  SELECT *, ROW_NUMBER() OVER (ORDER BY moves, "timeMs", "createdAt", "userId") AS rank FROM best)
```

  then `SELECT ... FROM ranked JOIN "auth"."User" u ... WHERE rank <= $limit ORDER BY rank` (the list) and `SELECT rank FROM ranked WHERE "userId" = $id` (the lookup); `rank` comes back `bigint`, converted with `Number`.
- [ ] Step 4: run, expected PASS: the Step 2 command, then `pnpm --filter @allonfire/database exec tsc --noEmit` is not needed: `pnpm --filter @allonfire/database check-types`.

### Task 4: Six random Images from the Image service

**Files:**
- Modify: `packages/database/src/features/image/image.service.ts` (beside `listImagesPage`; reuses `visibleImages`, `withPlacements`, `toRecord`)
- Create: `packages/database/src/features/image/tests/image-random.integration.test.ts`

**Interfaces:** Produces `randomImages({ app, count, enterable, random = Math.random }: { app: App; count: number; enterable: readonly App[]; random?: () => number }): Promise<ImageRecord[]>`: up to `count` distinct Images placed in `app` and visible to someone who enters `enterable` (ADR 0027), in a random order; fewer when the App holds fewer; `[]` for none. It reads the visible ids only, draws with a partial Fisher-Yates from `random`, then reads those rows.

- [ ] Step 1: write the failing tests (`// @module-tag integration`; copy the file's helpers from `image.integration.test.ts`: `image()`, `KEY_PREFIX` cleanup): "returns `count` distinct Images placed in the App" (8 Laura Images, `count 6`); "never returns an Image that is only in another App" (a Back Office-only private Image, `enterable: [LAURA]`); "returns a private Laura Image to someone who enters Laura and none to someone who does not and a public one to both" (`enterable: []` sees only public); "returns all there are when fewer than `count`" (2 Images, `count 6`, `length 2`); "`random: () => 0` and `random: () => 0.999` give different draws and each draw is deterministic" (same input twice, same ids).
- [ ] Step 2: run, expected FAIL (no export): `pnpm test:services && pnpm --filter @allonfire/database exec vitest run src/features/image/tests/image-random.integration.test.ts`
- [ ] Step 3: implement as in the Interfaces; keep the name `randomImages` and export it from `image.service.ts` (the API's games deps type is `typeof randomImages`).
- [ ] Step 4: run, expected PASS; also `pnpm --filter @allonfire/database exec vitest run src/features/image`.

### Task 5: The API's games contract: constants, schemas, the coded error, deps

**Files:**
- Create: `apps/api/src/features/laura/games/constants/games.ts` (exports `LAURA_GAMES`), `.../constants/schemas.ts`, `.../utils/deps.ts`, `.../tests/stub-games-deps.ts`, `.../tests/schemas.test.ts`
- Modify: `apps/api/src/shared/constants/api.ts` (`API.PATH.LAURA_GAMES`), `apps/api/src/shared/constants/error.ts` (code, status), `apps/api/src/features/i18n/translations/{en,it}.json`, `apps/api/src/features/i18n/translation-values.ts`, `apps/api/src/app.ts` (`AppDeps.games`), `apps/api/src/shared/tests/app-deps.ts` (`games: stubGamesDeps()`), `apps/api/package.json` (export key `./features/laura/games/constants/games`)

**Interfaces:** Produces

```ts
export const LAURA_GAMES = {   // the API feature's own; Laura's App constant is `GAMES`
  DOC: { /* summaries, descriptions, 200/201/400 texts */ },
  ERROR_CODE: { IMPLAUSIBLE_SCORE: "IMPLAUSIBLE_SCORE" },
  LEADERBOARD_TOP: 25,
  OPENAPI_TAG: "Laura games",
  PATH: { BASE: "/laura/games", DECK: "/memory/deck", LEADERBOARD: "/memory/leaderboard", SCORES: "/memory/scores" },
} as const;
// API.PATH.LAURA_GAMES = `${VERSION_PATH}${LAURA_GAMES.PATH.BASE}`
export type GamesDeps = {
  avatarLink: typeof avatarLink;                // @allonfire/storage avatar-key: signs a stored Avatar for an hour
  canPlay: CanManage;                           // Session still there, User read now, allowed into Laura
  memoryLeaderboard: typeof memoryLeaderboard; memoryStats: typeof memoryStats;
  randomImages: typeof randomImages; submitMemoryScore: typeof submitMemoryScore;
  userMemoryStats: typeof userMemoryStats;
};
```

Schemas (`.meta({ ref })` names `MemoryDeck`, `MemoryScoreInput`, `MemoryScore`, `MemoryLeaderboard`): `deckBodySchema = { images: deckImageSchema[], needed: int }` where `deckImageSchema = imageBodySchema.pick({ alt, blurDataUrl, height, id, srcSet, width })` (from `@allonfire/storage/features/image/constants/schemas`); `scoreInputSchema = { moves: int, timeMs: int }` (plausibility is the handler's coded refusal, not zod's, so a client can tell nonsense from a malformed body); `scoreBodySchema = { id, isGlobalBest, isPersonalBest, rank }`; `leaderboardBodySchema = { entries: { isMe, rank, name: string | null, image: string | null, imageBlurDataUrl: string | null, moves, timeMs, playedAt: ISO string }[], me: { bestMoves, bestTimeMs, rank, totalGames }, stats: { averageMs, fastestMs, totalGames, uniquePlayers } }` (the `UserMemoryStats` and `MemoryStats` shapes; no user id or email anywhere). `IMPLAUSIBLE_SCORE` is status 400 in `ERROR_CODE_STATUS` and spread into `ERROR_CODE`.

- [ ] Step 1: write the failing tests: `schemas.test.ts` (`// @module-tag unit`): `scoreInputSchema` accepts `{ moves: 8, timeMs: 40000 }`, rejects a string, a float, a missing field; `deckImageSchema` strips `key`, `access`, `apps`, `bytes`, `version` (parse an `ImageBody` fixture and `expect(parsed).not.toHaveProperty("key")` and the same for the other four); `leaderboardBodySchema` has no `userId` or `email` property. The type test and the i18n checks are the existing ones: `API.ERROR.CODE.IMPLAUSIBLE_SCORE` must map to a status and a message, so `pnpm --filter @allonfire/api check-types` fails until `error.ts`, both JSON files and `translation-values.ts` (`IMPLAUSIBLE_SCORE: never`) agree.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/api exec vitest run src/features/laura/games/tests/schemas.test.ts`, then `pnpm --filter @allonfire/api check-types` (red).
- [ ] Step 3: implement the files above. English `IMPLAUSIBLE_SCORE`: "That game could not have been played, so its score was not saved"; Italian written alike. `stubGamesDeps(overrides)` returns empty reads (`randomImages: () => Promise.resolve([])`), `canPlay: () => Promise.resolve(true)` and `avatarLink: () => null`; mounting the routes comes in Tasks 6 to 8 (`AppDeps.games` is required, `appDeps()` supplies the stub).
- [ ] Step 4: run, expected PASS: the Step 2 commands and `pnpm --filter @allonfire/api exec vitest run src/features/i18n`.

### Task 6: `GET /v1/laura/games/memory/deck`

**Files:**
- Create: `apps/api/src/features/laura/games/routes/{index,routes,handlers}.ts` (`gamesRoutes(deps)`, chained `new Hono<AuthEnv>()`; `describeRoute` per route; `createFactory<AuthEnv>().createHandlers`), `apps/api/src/features/laura/games/tests/deck.test.ts`
- Modify: `apps/api/src/app.ts` (`.route(API.PATH.LAURA_GAMES, gamesRoutes(deps.games))` after the Session loader)

**Interfaces:** Consumes `GamesDeps` (Task 5), `requireApp(App.LAURA)`, `enterableApps(user)` (`@allonfire/database/features/auth/access/access`), `pictureSrcSet`, `privateLinkExpiry` (`@allonfire/storage/features/image-server/sign`), `ImageAccess`. Produces `GET ${API.PATH.LAURA_GAMES}${LAURA_GAMES.PATH.DECK}`: 200 `deckBodySchema` with `needed: MEMORY_RULE.PAIRS`, `images` from `deps.randomImages({ app: App.LAURA, count: MEMORY_RULE.PAIRS, enterable })` (a private Image's links expire like the Image module's, a public one's never), header `Cache-Control: HTTP.CACHE_CONTROL.NO_CACHE` (reconcile: if `securityHeaders` already sends it, the test only pins it); 401 without a Session, 403 for a User Laura does not let in; documented with `problemResponses(401, 403)`.

- [ ] Step 1: write the failing tests (`// @module-tag unit`, `createApp(appDeps({ auth: apiAuth({ getSession }), games: stubGamesDeps({ ... }) }))`, sessions from `sessionFor`, Laura User by `memberships: membershipsIn(Role.USER)` for Laura as Phase 0's helper allows): anonymous 401; a Back Office-only User 403; a Laura User 200 with `images` as drawn, `needed` equal to `MEMORY_RULE.PAIRS`, each image holding exactly `alt`, `blurDataUrl`, `height`, `id`, `srcSet`, `width`; `randomImages` is called with `{ app: App.LAURA, count: MEMORY_RULE.PAIRS, enterable: [App.LAURA] }`; "fewer than six is still a 200": a stub returning 2 Images answers `images.length` 2 and `needed` 6; "nothing is kept": two requests call `randomImages` twice and a stub answering different Images the second time gives a different body; "signs a private Image's links to expire and a public one's never" (`vi.setSystemTime`, expected `pictureSrcSet(key, privateLinkExpiry(now))` and `pictureSrcSet(key)`); the answer carries `Cache-Control` equal to `HTTP.CACHE_CONTROL.NO_CACHE`.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/api exec vitest run src/features/laura/games/tests/deck.test.ts`
- [ ] Step 3: implement the route, its handler and the mounting.
- [ ] Step 4: run, expected PASS; `pnpm --filter @allonfire/api check-types`.

### Task 7: `POST /v1/laura/games/memory/scores`

**Files:**
- Modify: `apps/api/src/features/laura/games/routes/{routes,handlers}.ts`
- Create: `apps/api/src/features/laura/games/tests/scores.test.ts`

**Interfaces:** Consumes `isPlausibleScore`, `submitMemoryScore`, `CodedError` (`@allonfire/core/features/errors/coded-error`, with `LAURA_GAMES.ERROR_CODE.IMPLAUSIBLE_SCORE`, status 400), `manageGuard(deps.canPlay)` from `@allonfire/auth/features/hono/guards/utils/manage-guard` (generic over the Host's check, so the write asks the Session fresh as `api.md` requires; its name says Admin only because that was its first user). Produces: 201 `scoreBodySchema` for the Session's User; body `scoreInputSchema`, validated through the shared `invalidHook` (400 `VALIDATION_FAILED`); a plausible-by-shape but impossible game answers 400 `IMPLAUSIBLE_SCORE` and writes nothing.

- [ ] Step 1: write the failing tests (`// @module-tag unit`): anonymous 401; a Back Office-only User 403; "a Session that is gone or a User Laura no longer lets in is refused even with a fresh-looking cookie": `canPlay` answering `false` gives 403 and `submitMemoryScore` is not called; a good game `{ moves: 8, timeMs: 8 * MEMORY_RULE.MIN_MS_PER_MOVE }` answers `HTTP.STATUS.CREATED` with the stub's `SubmittedScore`; `submitMemoryScore` receives the Session's `user.id` even when the body also carries a `userId` of someone else; a body `{ moves: "8" }` answers 400 `ERROR.CODE.VALIDATION_FAILED`; `{ moves: 3, timeMs: 60_000 }`, `{ moves: 8, timeMs: 1000 }` and `{ moves: 8, timeMs: MEMORY_RULE.MAX_TIME_MS + 1 }` each answer 400 with `code` `API.ERROR.CODE.IMPLAUSIBLE_SCORE` and the translated `detail` (through `translate()`, never retyped text) and never call `submitMemoryScore`.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/api exec vitest run src/features/laura/games/tests/scores.test.ts`
- [ ] Step 3: implement the route, the guard line and the handler (`isPlausibleScore` first, then `deps.submitMemoryScore({ ...body, userId })`, `c.json(result satisfies ScoreBody, HTTP.STATUS.CREATED)`).
- [ ] Step 4: run, expected PASS.

### Task 8: `GET /v1/laura/games/memory/leaderboard`

**Files:**
- Modify: `apps/api/src/features/laura/games/routes/{routes,handlers}.ts`
- Create: `apps/api/src/features/laura/games/tests/leaderboard.test.ts`

**Interfaces:** Consumes `requireApp(App.LAURA)`, `deps.memoryLeaderboard(LAURA_GAMES.LEADERBOARD_TOP)`, `deps.memoryStats()`, `deps.userMemoryStats(userId)`, `deps.avatarLink`. Produces 200 `leaderboardBodySchema`, header `Cache-Control` `NO_CACHE` (per-User body: `isMe`).

- [ ] Step 1: write the failing tests (`// @module-tag unit`): 401 and 403 as in Task 6; the list is asked with `LAURA_GAMES.LEADERBOARD_TOP`; each entry's `image` is `avatarLink(image)` (a stub returning `signed:<name>`), `isMe` is true only for the Session's user id, `playedAt` is an ISO string, and `JSON` of the body contains neither a user id nor an email (assert the parsed body against `leaderboardBodySchema` and that no entry has a `userId` key); `me` and `stats` pass through from the service stubs; an empty Laura answers `entries: []`, `me` with `rank: null` and null times.
- [ ] Step 2: run, expected FAIL.
- [ ] Step 3: implement (the three reads in `Promise.all`).
- [ ] Step 4: run, expected PASS.

### Task 9: The real stack, OpenAPI and the API README

**Files:**
- Create: `apps/api/src/features/laura/games/games-deps.ts`, `apps/api/src/features/laura/games/tests/games.integration.test.ts`
- Modify: `apps/api/src/index.ts` (add `games: gamesDeps` beside `userUsage`), `apps/api/src/features/docs/tests/spec.test.ts`, `apps/api/README.md`

**Interfaces:** Produces `gamesDeps: GamesDeps` on the real stack: `avatarLink` from `@allonfire/storage/features/avatar/utils/avatar-key`; `canPlay` = `accessUserById(userId)` and `sessionAlive(sessionId)` in parallel, true when the session lives and `canEnterApp(user, App.LAURA)` (the shape of `canManageUsers` in `features/users/user-deps.ts`); the database service functions.

- [ ] Step 1: write the failing tests. `games.integration.test.ts` (`// @module-tag integration`, `createApp(appDeps({ auth, games: gamesDeps }))` with the real auth as `image-test-app.ts` builds it; Fixture sessions through `cookieFor`): "a Laura User draws six distinct Images placed in Laura" (the test creates 6 Laura Images with `createImages` under a key prefix and removes them after; assert on Laura-placement, not on the exact set, since other files upload meanwhile); "the Back Office Admin is refused (403)"; "two draws can differ" is not asserted (it is chance); "plays, then the leaderboard shows the game": POST `(8, 8 * MIN_MS_PER_MOVE)` as `LAURA.USER` answers 201 with `rank` 1, then GET leaderboard lists that User with `isMe: true` and `moves: 8`; a second User's better game takes rank 1 and `isMe` follows the caller; an implausible game answers 400 and leaves the leaderboard unchanged; `beforeEach` deletes the Fixture Users' `GameScore` rows. `spec.test.ts`: the document lists the three operations with tag `LAURA_GAMES.OPENAPI_TAG`, the `MemoryDeck`, `MemoryScoreInput`, `MemoryScore` and `MemoryLeaderboard` components, and the 400, 401, 403 problem refs (follow the file's `paths[...]` pattern; reconcile its helpers).
- [ ] Step 2: run, expected FAIL: `pnpm test:services && pnpm --filter @allonfire/api exec vitest run src/features/laura/games src/features/docs`
- [ ] Step 3: implement `games-deps.ts` and wire `index.ts`. `apps/api/README.md`: a "Laura games" section with the endpoint table (three rows: path, guard, does), the 6-Image deck and its `no-cache`, the plausibility rule with its numbers read from `MEMORY_RULE`, the leaderboard's members-only top 25 and `me`, and one line that a Laura Admin has no extra power here.
- [ ] Step 4: run, expected PASS: the Step 2 command, then `pnpm --filter @allonfire/api test` and `pnpm --filter @allonfire/api check-types` (the `hc<AppType>` client types still resolve: `src/client.test-d.ts` is green).

### Task 10: `AOFEmpty` in ui

**Files:**
- Create: `packages/ui/src/shared/components/aof-empty.tsx`, `packages/ui/src/shared/tests/aof-empty.test.tsx`
- Modify: `packages/ui/package.json` (key `./shared/components/aof-empty`)

**Interfaces:** Produces `AOFEmpty`, `AOFEmptyHeader`, `AOFEmptyMedia`, `AOFEmptyTitle`, `AOFEmptyDescription`, `AOFEmptyContent`: shadcn's `empty` parts under AOF names (the `aof-card.tsx` pattern: no behaviour, `// ponytail:` comment). Reconcile first: skip the task if Phase 4 or 5 shipped one.

- [ ] Step 1: write the failing test (`// @module-tag unit`, `aof-card.test.tsx` as the model): the parts render a title, a description and a button in one container; the title is findable by role/text.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/ui exec vitest run src/shared/tests/aof-empty.test.tsx`
- [ ] Step 3: implement (re-exports of `@allonfire/shadcn/components/empty`); add the export key.
- [ ] Step 4: run, expected PASS; `pnpm --filter @allonfire/ui check-types`.

### Task 11: Laura's games constants, copy and pure helpers

**Files (Laura, `apps/laura/src/`; reconcile paths with Phase 3):**
- Create: `features/games/constants/games.ts`, `features/games/utils/{format-time,deal-cards,fit-grid}.ts`, tests beside (`features/games/utils/tests/*.test.ts`)
- Modify: `shared/constants/query.ts`, `shared/constants/mutation.ts`, `shared/constants/laura.ts` (`PAGE.MEMORY`, `PAGE.MEMORY_LEADERBOARD` if Phase 3 left them out, and the Memory Section's `pages: [{ icon: IconTrophy, label: "leaderboard", path: LAURA.PAGE.MEMORY_LEADERBOARD }]`), `features/i18n/translations/{en,it}.json`

**Interfaces:** Produces

```ts
export const GAMES = {
  CACHE: { LIFE: { expire: 3600, revalidate: 1800, stale: 300 }, TAG: "games" }, // in seconds, via UNIT; as USERS.CACHE: the rows hold Avatar links signed for an hour
  LEADERBOARD: { RETRIES: 1 },
  MEMORY: {
    CARD: { MIN_TARGET_PX: 44, RATIO: POLPO_CARD_BACK.WIDTH / POLPO_CARD_BACK.HEIGHT },
    DECK: { RETRIES: 1 },
    GAP_PX: { LANDSCAPE: 8, PORTRAIT: 6 },
    HOLD_MS: 800, // how long a pair rests face up before it resolves
    LAYOUTS: [{ cols: 3, rows: 4 }, { cols: 4, rows: 3 }, { cols: 6, rows: 2 }],
  },
  SUBMIT_ERROR: { FAILED: "failed", IMPLAUSIBLE: "implausible", REFUSED: "refused" },
} as const;
// QUERY.GAMES = { ALL: [GAMES], LEADERBOARD: [GAMES, "leaderboard"] as const, DECK: (round: number) => ["memory-deck", round] as const }
//   DECK sits outside ALL on purpose: ALL is "what a change refreshes", and a score never redraws a deck.
// MUTATION.GAMES = { SUBMIT_SCORE: [...QUERY.GAMES.ALL, "submit-score"] }
export const formatTime: (ms: number) => string;                 // 65_000 -> "1:05"
export type MemoryCard = { cardId: string; image: DeckImage; imageId: string };
export const dealCards: (images: readonly DeckImage[], random?: () => number) => MemoryCard[]; // 2 cards per Image (`${id}-a`, `${id}-b`), Fisher-Yates
export const fitGrid: (room: { height: number; width: number }) => { cardHeight: number; cardWidth: number; cols: number; rows: number; gap: number };
```

`DeckImage` is the API's `deckImageSchema` type (through `@allonfire/api/client`'s `hc` response type, as the Back Office reads `ImageBody`: reconcile). Copy: namespace `Games` in both files with the keys `title`, `moves`, `time`, `bestTime`, `rank`, `player`, `date`, `play`, `newGame`, `playAgain`, `leaderboard`, `viewLeaderboard`, `gameComplete`, `newRecord`, `personalBest`, `yourRank` (`{rank}`), `submitting`, `saved`, `submitError`, `notRecorded`, `retry`, `cardFaceDown` (`{position}`), `cardFaceUp` (`{position}`, `{alt}`), `cardMatched` (`{position}`, `{alt}`), `announceMatch` (`{alt}`), `announceMiss`, `announceComplete` (`{moves}`, `{time}`), `needMoreTitle`, `needMoreBody` (`{needed}`, `{have}`), `deckFailed`, `leaderboardFailed`, `forbidden`, `noScoresTitle`, `noScoresBody`, `anonymous`, `yourStats`, `globalStats`, `gamesPlayed`, `yourBestMoves`, `yourBestTime`, `totalGames`, `uniquePlayers`, `fastestTime`, `averageTime`, `leaderboardLabel` (the table's name).

- [ ] Step 1: write the failing tests (`// @module-tag unit`): `format-time`: `0 -> "0:00"`, `59_999 -> "0:59"`, `65_000 -> "1:05"`, `3_600_000 -> "60:00"`; `deal-cards`: 6 Images give 12 cards, two per `imageId`, `cardId` unique, the same input and `random` give the same order, `random: () => 0` and `() => 0.99` give different orders, and the 12 cards hold each Image twice (a count by `imageId`); `fit-grid` (table of rooms to the expected layout): `{ width: 390, height: 600 }` gives 3x4; `{ width: 900, height: 600 }` gives 4x3; `{ width: 800, height: 250 }` (a landscape phone's room) gives 6x2; every result keeps `cardWidth / cardHeight` equal to `GAMES.MEMORY.CARD.RATIO` within 1 px, `cols * rows` is 12, the grid fits inside the room, and a room too small for 44 px cards still answers positive sizes; `games.test.ts`: `GAMES.MEMORY.HOLD_MS >= MEMORY_RULE.MIN_MS_PER_MOVE` (the client cannot produce a score the API refuses), `GAMES.MEMORY.LAYOUTS` all multiply to `MEMORY_RULE.CARDS`, `GAMES.CACHE.LIFE.stale >= 300` and `expire <= IMAGE_SERVER.PRIVATE_LINK_HOURS * UNIT.SECONDS_PER_HOUR`, `QUERY.GAMES.DECK(0)` does not start with `QUERY.GAMES.ALL[0]`; the translations test (Phase 3's, extended to `Games`): both languages have the same keys and the same ICU arguments per key.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run src/features/games`
- [ ] Step 3: implement. `fitGrid` tries each `LAYOUTS` entry, takes the widest card that fits the room by width and by height, ties to the earlier entry; `dealCards` takes `random` (default `Math.random`) so a test fixes it. Neither runs during prerender: `dealCards` is called only once the deck has arrived in the browser (Cache Components rejects `Math.random()` while prerendering). Write the English and the Italian copy (Italian the owner's language; the translations test is the check).
- [ ] Step 4: run, expected PASS; `pnpm static:i18n`.

### Task 12: `useMemoryGame`, the state machine

**Files:**
- Create: `apps/laura/src/features/games/hooks/use-memory-game.ts`, `apps/laura/src/features/games/hooks/tests/use-memory-game.test.tsx` (`renderHook` through `vitest-browser-react` or the unit setup Phase 3 uses: reconcile; fake timers)

**Interfaces:** Consumes `MemoryCard`, `GAMES.MEMORY.HOLD_MS`. Produces `useMemoryGame(cards: readonly MemoryCard[], options: { onComplete: (score: { moves: number; timeMs: number }) => void; now?: () => number }): { announcement: MemoryAnnouncement | null; cards: CardView[]; elapsedMs: number; flip: (index: number) => void; moves: number; status: "idle" | "playing" | "checking" | "complete" }` with `CardView = MemoryCard & { index: number; isFaceUp: boolean; isMatched: boolean }` and `MemoryAnnouncement = { kind: "match"; imageId: string } | { kind: "miss" } | { kind: "complete"; moves: number; timeMs: number }`. The rules are the old game's, unchanged: the first flip starts the clock; every second flip is one move and holds both cards `HOLD_MS` before it resolves (a match stays face up and matched, a miss turns both down); flips are ignored while checking, after completion, on a face-up card and on a matched card; the game is complete when every pair is matched, at which `onComplete` runs once with the moves and the time from the first flip. There is no network here and no reset: a new game is a new deck, so the board remounts the hook with new cards. The clock shown ticks every second (display only); `timeMs` is read from `now()` at completion.

- [ ] Step 1: write the failing tests (`// @module-tag unit`, `vi.useFakeTimers()`, a fixed 12-card deck): "the first flip starts playing and costs no move"; "the second flip is one move and the board is checking: a third flip is ignored"; "a match stays up after the hold, the status returns to playing and the announcement is a match with that Image"; "a miss turns both cards down after the hold and announces a miss"; "flipping a face-up card again does nothing and costs no move"; "a matched card cannot be flipped"; "completing the sixth pair calls `onComplete` once with `moves: 6` and `timeMs` equal to `6 * HOLD_MS` for a perfect game flipped with no thinking time, and the status is complete"; "`onComplete` runs once under `StrictMode`"; "after complete, flips are ignored".
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run src/features/games/hooks`
- [ ] Step 3: implement (a reducer for the cards and counters, one effect owning the hold timer, cleaned up on unmount so a hidden board leaves no timer; the clock interval only while playing or checking).
- [ ] Step 4: run, expected PASS.

### Task 13: Reads, the score action, the mutation and the hydration

**Files:**
- Create: `apps/laura/src/features/games/utils/{deck-queries,leaderboard-queries,leaderboard-hydration,games-mutations}.ts`, `apps/laura/src/features/games/actions/submit-memory-score.ts`, tests beside each (`.../utils/tests/`, `.../actions/tests/`), `apps/laura/src/features/games/tests/{deck-body,leaderboard-body}.ts` (builders for the browser tests and MSW)

**Interfaces:** Consumes Phase 3's `api`, `serverApi`, `sessionApi` and `refusalOf` bindings, `API.VERSION.CURRENT`, `readSessionCookie`, `AOFGetQueryClient`, `retryUnlessRefused`, `invalidateStatic` (Phase 4, Task 1). Produces:

```ts
export const fetchDeck: (client: ApiClient) => Promise<DeckBody>;            // GET .../memory/deck via parseResponse
export const deckQuery: (client: ApiClient, round: number) => UseQueryOptions;
//   queryKey QUERY.GAMES.DECK(round), staleTime: "static", gcTime: 0, retry: retryUnlessRefused(GAMES.MEMORY.DECK.RETRIES), meta: aofErrorMeta(false)
export const fetchLeaderboard: (client: ApiClient) => Promise<LeaderboardBody>;
export const leaderboardKey;                                                  // queryOptions<LeaderboardBody>({ queryKey: QUERY.GAMES.LEADERBOARD }).queryKey
export const leaderboardQuery: (client: ApiClient) => UseQueryOptions;       // staleTime: "static", retry: retryUnlessRefused(GAMES.LEADERBOARD.RETRIES), meta: aofErrorMeta(false)
export const leaderboardHydration: () => Promise<DehydratedState>;            // "use cache: private", cacheTag(GAMES.CACHE.TAG), cacheLife(GAMES.CACHE.LIFE)
export type SubmitAnswer = { ok: true; score: ScoreBody } | { ok: false; reason: ValueOf<typeof GAMES.SUBMIT_ERROR> };
export const submitMemoryScore: (score: { moves: number; timeMs: number }) => Promise<SubmitAnswer>; // "use server"
export const submitScoreMutation: (queryClient: QueryClient) => UseMutationOptions<SubmitAnswer, Error, { moves: number; timeMs: number }>;
```

`submitMemoryScore` calls `serverApi()` then `POST .../memory/scores`; on 201 it runs `updateTag(GAMES.CACHE.TAG)` and answers `{ ok: true, score }`; a 400 with `API.ERROR.CODE.IMPLAUSIBLE_SCORE` answers `IMPLAUSIBLE`, a 401 or 403 `REFUSED`, anything else `FAILED`: a value, never a throw (production hides a thrown message). The mutation's `mutationKey` is `MUTATION.GAMES.SUBMIT_SCORE`, `meta: aofErrorMeta(false)` (the dialog tells the error), `onSuccess` on `ok` runs `invalidateStatic(queryClient, QUERY.GAMES.LEADERBOARD)` and nothing else (awaited, so the mutation settles after the refetch; the deck's key is never passed to it).

- [ ] Step 1: write the failing tests. `deck-queries.test.ts` (`// @module-tag unit`): the options hold `staleTime: "static"`, `gcTime: 0`, key `QUERY.GAMES.DECK(round)`, a different key per round, and `fetchDeck` through core's `fake-api` returns the body; "a refusal is not retried" (a 403 `DetailedError`, `retryUnlessRefused`). `leaderboard-queries.test.ts`: the options hold `staleTime: "static"` and the key `QUERY.GAMES.LEADERBOARD`; `leaderboardHydration` (mock `next/cache`, `session-cookie`, the API binding; see the Back Office's `storage-overview-hydration` test): it tags `GAMES.CACHE.TAG`, lives `GAMES.CACHE.LIFE`, dehydrates under `leaderboardKey`, and a refusal is thrown, never kept. `submit-memory-score.test.ts` (mock `@/features/api/utils/server-api`, `next/cache`): 201 answers `ok: true`, calls `updateTag` once with `GAMES.CACHE.TAG`; a 400 coded `IMPLAUSIBLE_SCORE` answers `IMPLAUSIBLE` and never `updateTag`; 403 `REFUSED`; 500 `FAILED`; a network error answers `FAILED` (no throw). `games-mutations.test.ts` (real `QueryClient`, an active `useQuery`/`QueryObserver` on `leaderboardQuery(client)` with a fake API counting calls, and an active observer on `deckQuery(client, 0)`): after an `ok` answer the **active leaderboard query is refetched** (its fetch count goes from 1 to 2 and its data is the second answer: the regression test for the static-skip), the deck's fetch count stays 1 and its data is the same object; with the leaderboard unmounted (inactive) the static entry is removed so the next mount fetches; after a `{ ok: false }` answer nothing is refetched.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run src/features/games/utils src/features/games/actions`
- [ ] Step 3: implement, following the Back Office's `storage-overview-hydration.ts`, `storage-overview-queries.ts`, `delete-images.ts` and `images-mutations.ts` line for line in structure; the builders return a valid `DeckBody` (6 images) and `LeaderboardBody` from the API's own schemas.
- [ ] Step 4: run, expected PASS; `pnpm --filter @allonfire/laura check-types`.

### Task 14: The board: card, grid, round, dialog, states, skeleton

**Files:**
- Create: `apps/laura/src/features/games/components/{memory-card,memory-grid,memory-board,memory-board-skeleton,game-complete-dialog,global-best-badge,games-notice}.tsx`, `apps/laura/src/features/games/hooks/use-memory-grid-size.ts`, tests in `.../components/tests/` (`memory-card.browser.test.tsx`, `memory-board.browser.test.tsx`, `memory-skeleton.browser.test.tsx`, `game-complete-dialog.browser.test.tsx`)
- Modify: Laura's MSW `shared/tests/msw/handlers.ts` (deck, scores and leaderboard handlers over `API.PATH.LAURA_GAMES` and `LAURA_GAMES.PATH`, never retyped paths)

**Interfaces:** Consumes Tasks 11 to 13, `AOFQueryView`, `AOFStorageImage`, `AOFEmpty`, `AOFDialog`, `AOFDialogContent`, `AOFDialogTitle`, `AOFDialogFooter`, `AOFFreshOnReturn` (used by the page), `AOFBadge`, `POLPO_CARD_BACK.DATA_URL`, the Design's tokens (no raw colours). Produces (client components):

```ts
MemoryBoard: () => JSX                          // useQuery(deckQuery(api, round)) inside AOFQueryView; round state; `New game` = round + 1
MemoryRound: ({ images, onNewGame }) => JSX     // dealCards once (lazy useState), useMemoryGame, the submit mutation, the live region, the grid, the dialog
MemoryCardButton: ({ card, position, isFaceUp, isMatched, onFlip, language }) => JSX
MemoryGrid: ({ children }) => JSX               // useMemoryGridSize + fitGrid: one layout shared by the cards and the skeleton
MemoryBoardSkeleton: () => JSX                  // 12 card-back slots in the same MemoryGrid, the same header; role="status"
GameCompleteDialog: ({ open, onOpenChange, moves, timeMs, submit, onPlayAgain }) => JSX
GlobalBestBadge: ({ best: { moves, timeMs } | null }) => JSX   // from the leaderboard's first entry; reads useQuery(leaderboardQuery(api)) with meta aofErrorMeta(false)
```

Behaviour that tests pin: every card is a `<button>` in DOM (row-major) order whose label is `cardFaceDown`, `cardFaceUp` or `cardMatched` with the Image's alt in the page's language; a matched or checking card is `aria-disabled` and ignores a click but is never `disabled` (focus must stay on it); the flip is a `transform` transition under `motion-safe:` and instant (opacity swap, duration `0s`) under `motion-reduce`; a face is the Image on its own blur tile through `AOFStorageImage` (`placeholder="empty"`, `object-contain`) with the card back (`POLPO_CARD_BACK.DATA_URL`, `AOFImage`) on the other side; one `<p role="status" className="sr-only">` (polite) carries the latest announcement (`announceMatch`, `announceMiss`, `announceComplete`), the clock is `role="timer"` outside it so it is never read each second; the header shows moves and time and, while playing, `New game`; the board's states are `AOFQueryView`'s: skeleton while the deck is read, an `AOFEmpty` `deckFailed` with a retry for any non-403 failure (no toast: a first load shows its own error), the `forbidden` notice for a 403, and for `images.length < needed` an `AOFEmpty` `needMoreTitle`/`needMoreBody` (an Admin also gets a link to the Upload Section, `LAURA.PAGE.UPLOAD`, which Phase 3's frame shows only to Admins: the link is drawn only for `Role.ADMIN` through the Session's Role as Phase 3 exposes it, reconcile). The dialog opens when the game completes (`submit` is `idle | submitting | saved | failed | notRecorded`); it shows time, moves, `newRecord` for `isGlobalBest`, `personalBest` for `isPersonalBest`, `yourRank`, a Retry on `failed` (the same score again), `notRecorded` with no retry on `IMPLAUSIBLE`, a link to `LAURA.PAGE.MEMORY_LEADERBOARD`, Play again; Escape closes it and leaves Play again in the header.

- [ ] Step 1: write the failing browser tests (`// @module-tag integration`, `renderInApp`, MSW answering the API; the `AOFStorageImage` mock as in the Back Office's `image-skeletons.browser.test.tsx`):
  - `memory-card`: a face-down card is a button named by `cardFaceDown` (read through `enT`); turned up it is named `cardFaceUp` with the alt; matched it is `aria-disabled="true"` and not `disabled`; a click on a matched card does not call `onFlip`; under `withReducedMotion` the flip's computed `transitionDuration` is `0s`, otherwise greater than 0 (Chromium only: `CAN_EMULATE_MEDIA`).
  - `memory-board`: while the deck loads the skeleton shows; the deck request is made once per round; playing by keyboard (focus a card, `Enter`, `Space`) turns it up; a matched pair keeps `document.activeElement` on the card; the live region holds the match text after a match and the complete text at the end; **a finished game posts the score, then the leaderboard is read again and the deck is not** (count requests: deck 1, scores 1, leaderboard 2); **a window focus event and a hide-and-return of the page do not request a deck, a New game does** (wrap the board in `AOFFreshOnReturn` inside `<Activity>`: returning shows an idle board and asks a new deck); a deck of 3 Images shows the `needMoreTitle` state and no cards; a failing deck shows `deckFailed` and its retry asks again; a 403 shows the forbidden notice and no toast.
  - `game-complete-dialog`: the saved state shows rank, record and personal-best badges from the answer; `failed` shows Retry and it posts the same score again; `IMPLAUSIBLE` shows `notRecorded` and no Retry; Escape closes it and Play again stays in the board; the dialog stays inside the safe edges (`SAFE_AREA.CENTRED` classes come from `AOFDialogContent`, asserted by the ui test, not here).
  - `memory-skeleton`: renders the real `MemoryBoard` (deck answered, cards shown) and `MemoryBoardSkeleton` inside a fixed-size `@container` at a wide page (900 x 700), a phone (360 x 640) and a landscape phone (`SCREEN.VIEWPORT.PHONE_LANDSCAPE`, 926 x 428 inside the frame's room) and asserts the grid's rect and the first card's rect are equal (the board fills the room it is given, so the card size is the arbiter), and that at the landscape size every card is at least `GAMES.MEMORY.CARD.MIN_TARGET_PX` on both sides and inside the container.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts src/features/games/components`
- [ ] Step 3: implement. The structure is fixed by the tests; build the visual in Task 18 (the tests use only roles, text and computed sizes). `useMemoryGridSize` (`use-memory-grid-size.ts`, the old file's name) is a `ResizeObserver` over the grid's parent feeding `fitGrid`, `ready` false until measured, rendering nothing positioned before then; `MemoryBoardSkeleton` shares `MemoryGrid` and the header's markup, with `Bar`/`ink` (`@allonfire/ui/shared/utils/skeleton-ink`) for the numbers and the card-back image for each card, `role="status"`, `aria-busy`, a screen-reader line, its parts `aria-hidden`.
- [ ] Step 4: run, expected PASS; run the WebKit project as well (the browser config runs both).

### Task 15: The Memory page `/memory` (data checklist)

**Files:**
- Create: `apps/laura/src/app/[locale]/(signed-in)/memory/page.tsx`, `apps/laura/src/features/games/components/tests/memory-page.browser.test.tsx`
- Modify: none (the Section row already exists from Phase 3; Task 11 gave it its sub-page)

**Interfaces:** Consumes `signedInPage`, Laura's Section page component, `pageMetadata(LAURA.PAGE.MEMORY, "Navigation.memory")` (the key Phase 3 gives the Section; reconcile), `AOFHydratedBoundary`, `leaderboardHydration`, `AOFFreshOnReturn`, `MemoryBoard`, `MemoryBoardSkeleton`.

The page is `signedInPage(MemoryPage)`: the Section page wrapper with an `sr-only` `<h1>` (the breadcrumb names the page on screen), then `<Suspense fallback={<MemoryBoardSkeleton />}><AOFHydratedBoundary hydration={leaderboardHydration}><AOFFreshOnReturn><MemoryBoard /></AOFFreshOnReturn></AOFHydratedBoundary></Suspense>`.

Data checklist, point by point:

1. **Reads.** The best-score badge reads the leaderboard: hydrated from the private cache (`leaderboardHydration`) and read back with `useQuery(leaderboardQuery(api))` under `QUERY.GAMES.LEADERBOARD`, `staleTime: "static"`. The deck is the one deliberate exception: TanStack but no private cache, no hydration, `staleTime: "static"` plus `gcTime: 0` (a draw is not a read of stored state; Decisions, and the guide bullet of Task 20). The page has no request-time data of its own, so it is in the static shell and paints at once; the leaderboard's hydration sits behind the board's skeleton and never throws past `AOFHydratedBoundary` (a refused read leaves the badge empty, the game plays). The boundary is the plain one, not `onlyMissing`: Phase 4 needs `onlyMissing` because a re-render after an action would put an infinite feed with N loaded pages back to its first page, but the leaderboard is one body with no loaded pages, a hydrated copy replaces the client's only when it is newer (the copy read after `updateTag` includes the game just played, and another Member's game shows on a navigation), and the board's game state lives in client component state that a boundary re-render never touches.
2. **Both copies refreshed.** The page writes one thing, a score: `submitMemoryScore` (`updateTag(GAMES.CACHE.TAG)`, the server's copy) then the mutation's `invalidateStatic` on `QUERY.GAMES.LEADERBOARD` (this browser's copy; fixed by Phase 4, Task 1, since `invalidateQueries` alone skips an active `static` query), so the badge and the leaderboard page both move; the deck is not refreshed by it (Review Focus 1). No `optimisticMutation`: a score is not a toggle and its rank cannot be predicted.
3. **Resource protection, twice.** The page gates itself with `signedInPage` (a Session and Laura's floor, `minRole` absent); the API gates each route (`requireApp(App.LAURA)` on the reads, `canPlay` with a fresh Session read on the write). A refusal shows as the dialog's `failed` or the board's forbidden notice, never a pre-check.
4. **Resource changed.** No Version: a score is an insert, there is no form that saves a copy of something read. The leaderboard and the badge are read-only: their staleness is `GAMES.CACHE.LIFE.stale`, their refresh is the score action or a reload.
5. **Lost and gone.** There is no page of one resource. A deck Image deleted or removed from Laura while the board is open draws its blur tile (`AOFPictureGuard`) and the pair still matches by `imageId`; a Member removed from Laura is refused by the API (403) and by the next page check.
6. **Skeleton.** `MemoryBoardSkeleton` (Task 14), the Suspense fallback and the deck's loading state, kept in step by `memory-skeleton.browser.test.tsx` at a wide, a phone and a landscape-phone width (measured with ui's `heightAtIn`, fixed by Phase 1, Task 6).

- [ ] Step 1: write the failing test (`memory-page.browser.test.tsx`, `// @module-tag integration`, mocks as the Back Office's page tests use for `signedInPage` and hydration): the page renders the skeleton first (the deck pending, `role="status"`) and then the cards; its title is read from the translation; the hydrated leaderboard's best entry shows in `GlobalBestBadge` before any client request (MSW's leaderboard handler is not hit on mount when hydration is given: `expect(leaderboardRequests).toBe(0)`); with an empty leaderboard no badge shows; "a re-render after a score does not disturb the game": rerender the page with a newer hydrated leaderboard (a better best) while two cards are face up and assert the badge shows the new best and the cards, moves and clock are unchanged.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts src/features/games/components/tests/memory-page.browser.test.tsx`
- [ ] Step 3: implement the page file as written above.
- [ ] Step 4: run, expected PASS; `pnpm --filter @allonfire/laura check-types`.

### Task 16: The leaderboard components

**Files:**
- Create: `apps/laura/src/features/games/components/{leaderboard-view,leaderboard-table,leaderboard-stats,rank-badge,leaderboard-skeleton}.tsx`, tests in `.../components/tests/` (`leaderboard.browser.test.tsx`, `leaderboard-skeleton.browser.test.tsx`)

**Interfaces:** Consumes `leaderboardQuery`, `AOFQueryView`, `AOFDataTable`, `aofColumnHelper`, `useAOFTable`, `AOFDataTableSkeleton`, `AOFUserAvatar` (`initialClassName` from the Design's primary tint), `AOFBadge`, `AOFEmpty`, `useDayFormat`, `formatTime`. Produces: `LeaderboardView` (client: `useQuery(leaderboardQuery(api))` inside `AOFQueryView` with the skeleton, an `AOFEmpty` `leaderboardFailed` with retry, the forbidden notice), `LeaderboardTable({ entries })` (columns: rank as `RankBadge`, player as avatar plus `name ?? t("anonymous")` with the caller's row marked and `aria-current="true"`, moves, time, date; below `md` each row is a card through `AOFDataTable`'s `card`; `states.empty` is an `AOFEmpty` `noScoresTitle`/`noScoresBody`; the table's `label` is `leaderboardLabel`), `LeaderboardStats({ me, stats })` (two `dl` grids, each value under its own small label: your stats then global stats, `font-mono tabular-nums` for numbers, `—` for null, no separator characters, as `code-style.md` says), `RankBadge({ rank })` (a `cva` over `AOFBadge`: ranks 1 to 3 wear Design tokens, never the old hard-coded yellow, grey and amber; others a plain number), `LeaderboardSkeleton`.

- [ ] Step 1: write the failing browser tests: `leaderboard.browser.test.tsx` renders `LeaderboardView` with the hydrated `leaderboardBody()` (from Task 13's builder): rows are in the body's order with `rank` 1, 2, 3; the caller's row (`isMe`) has `aria-current`; a null name shows `Games.anonymous`; an avatar's image is the entry's signed link and a row with `image: null` shows the initial; moves and `formatTime(timeMs)` show; the stats show `—` for null times; an empty `entries` shows the empty state and the stats still render; a 403 shows the forbidden notice, a 500 shows `leaderboardFailed` and its retry asks again; a score submitted elsewhere (`invalidateStatic` on `QUERY.GAMES.LEADERBOARD`, the call the mutation makes) re-reads the mounted view and shows the new row; no request is made on mount when hydrated data is present; the table has no horizontal overflow at 360 px (`scrollWidth <= clientWidth`). `leaderboard-skeleton.browser.test.tsx`: renders the real `LeaderboardView` and `LeaderboardSkeleton` in a `@container` at a wide (900) and a phone (360) width with 25 entries and with 3, and asserts equal heights for the 25-row case (the skeleton draws the loaded list's row count, `GAMES`' `LEADERBOARD_TOP` read from the API constants `LAURA_GAMES.LEADERBOARD_TOP` through `@allonfire/api/features/laura/games/constants/games`) and, for the table, an equal column count with no column hidden. If a short list (3 rows) cannot match a fixed-height skeleton, the skeleton is the 25-row maximum and the test says so: reconcile with how `AOFDataTableSkeleton` and the Users skeleton test treat a short page.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts src/features/games/components/tests/leaderboard.browser.test.tsx src/features/games/components/tests/leaderboard-skeleton.browser.test.tsx`
- [ ] Step 3: implement. Icons are Tabler (`IconTrophy`, `IconClock`, `IconClick`, `IconUsers`, `IconDeviceGamepad2`; reconcile each name against the installed package), replacing the old lucide ones; the old Framer Motion entrance is dropped (the table needs none; `/aof-design` can add a `motion-safe:` fade).
- [ ] Step 4: run, expected PASS (Chromium and WebKit).

### Task 17: The leaderboard page `/memory/leaderboard` (data checklist)

**Files:**
- Create: `apps/laura/src/app/[locale]/(signed-in)/memory/leaderboard/page.tsx`, `apps/laura/src/features/games/components/tests/leaderboard-page.browser.test.tsx`

**Interfaces:** Consumes `signedInPage`, the Section page wrapper, `pageMetadata(LAURA.PAGE.MEMORY_LEADERBOARD, "Games.leaderboard")`, `AOFHydratedBoundary`, `leaderboardHydration`, `LeaderboardView`, `LeaderboardSkeleton`, Laura's navigation `Link`.

The page is `signedInPage(LeaderboardPage)`: the wrapper, an `sr-only` `<h1>` (`leaderboard`), a link to `LAURA.PAGE.MEMORY` (`play`), then `<Suspense fallback={<LeaderboardSkeleton />}><AOFHydratedBoundary hydration={leaderboardHydration}><LeaderboardView /></AOFHydratedBoundary></Suspense>`.

Data checklist, point by point:

1. **Reads.** The leaderboard, `me` and `stats` in one body: hydrated by `leaderboardHydration` (`"use cache: private"`, `GAMES.CACHE`), read back by `useQuery(leaderboardQuery(api))` under `QUERY.GAMES.LEADERBOARD`, `staleTime: "static"`. Entries carry Avatar links signed for an hour, hence the cache's `expire` of one hour and `stale` of five minutes. A page of one body, not a list: no infinite feed (top 25).
2. **Both copies refreshed.** Read-only page. What moves its numbers: a submitted score. The action clears the server's copy (`updateTag(GAMES.CACHE.TAG)`); the mutation clears this browser's (`invalidateStatic` on `QUERY.GAMES.LEADERBOARD`, fixed by Phase 4, Task 1). Another Member's game shows after `stale`, on a reload or a navigation, not live.
3. **Resource protection, twice.** `signedInPage`; the API's `requireApp(App.LAURA)` on the read (401 without a Session, 403 outside Laura). A 403 draws the forbidden notice, never a toast.
4. **Resource changed.** Read-only and Version-free: no save exists on this page.
5. **Lost and gone.** No resource id. A Member who left Laura disappears from the list at the next read.
6. **Skeleton.** `LeaderboardSkeleton` with `leaderboard-skeleton.browser.test.tsx` (Task 16, measured with ui's `heightAtIn`, fixed by Phase 1, Task 6), the Suspense fallback and the view's loading state.

- [ ] Step 1: write the failing test (`leaderboard-page.browser.test.tsx`, `// @module-tag integration`): with hydrated data the first paint shows the rows with no leaderboard request; a play link goes to the game's address (built from `LAURA.PAGE.MEMORY`); the document title heading exists for screen readers.
- [ ] Step 2: run, expected FAIL: `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts src/features/games/components/tests/leaderboard-page.browser.test.tsx`
- [ ] Step 3: implement the page file as written above.
- [ ] Step 4: run, expected PASS; `pnpm --filter @allonfire/laura check-types`.

### Task 18: The design pass (`/aof-design`)

**Files:** the components of Tasks 14 and 16 (class lists only: `cva`/inline `cn`), Laura's `globals.css` only if a Design token is missing (then the token goes into the Design through `design:sync`, never a raw colour in a class).

**Interfaces:** none produced. The structure, roles, labels and sizes are fixed by the tests; this task dresses them.

- [ ] Step 1: run `/aof-design craft` for the Memory page and the leaderboard page together on the polpo Design (Phase 2: tokens, the card back, `--coral`, the floating frame): one build. Taste constraints that already exist: restraint, no heavy decoration, no filters, motion only behind `motion-safe:` and short; a face sits on its own blur; cards at the card back's 3:4; a flip is the only animated thing on the board; tokens, never raw colours; the board fills the room the frame leaves (flex height chain, no `100dvh` calc: `code-style.md`); `-webkit-backdrop-filter` beside any `backdrop-filter`.
- [ ] Step 2: one screenshot round through `/iso-browser` (the user's own Chrome, mobile portrait, landscape phone, desktop, light and dark; the dialog open; the leaderboard with 3 and with 25 entries). Fix what the round shows, once; no review loop.
- [ ] Step 3: re-run every browser test of Tasks 14 to 17 (they are the guard that the dressing kept the structure): `pnpm --filter @allonfire/laura exec vitest run --config vitest.browser.config.ts src/features/games`, expected PASS.
- [ ] Step 4: Phase 3's one-time `/aof-design document` scan (it writes `DESIGN.json`) is not repeated here; if the shell page did not run it yet, run it now on the first real page and `pnpm design:sync --from laura` (`pnpm static:design` green).

### Task 19: End to end: keyboard play, landscape fit, the leaderboard after a game

**Files:**
- Create: `apps/laura/e2e/memory.spec.ts`, and a helper `apps/laura/e2e/laura-images.ts` that uploads 6 Images as the Laura Admin through `POST /v1/images` in a `beforeAll` (alt `Memory test <n>`, each different so a pair is told by its label). Reconcile: if Phase 4 or 5 already seeds Laura Images for its e2e (a helper or Fixtures), reuse it; the two Laura Fixture Images are too few.
- Modify: none. `apps/laura/e2e/safe-area.spec.ts` (Phase 3) visits every page under `src/app`, so `/memory` and `/memory/leaderboard` join it on their own; verify they appear in its run.

**Interfaces:** Consumes `FIXTURE.USER.LAURA.USER`, `LAURA.ADMIN`, `E2E`, `SCREEN`, Laura's sign-in helper (Phase 3).

- [ ] Step 1: write the specs (each runs on the four Playwright projects; the Chromium-only ones take `E2E.TAG.CHROMIUM_ONLY`): "plays a whole game from the keyboard": sign in as the Laura User, open `/memory`, wait for 12 card buttons; Tab order visits the 12 cards in DOM order; a solver reads each card's label after turning it (the alt shows when face up), remembers pairs, and finishes the game with `Enter`/`Space` only; after a match the focused element is still that card; the live region holds `announceMatch` text with the alt, then `announceComplete`; the dialog opens, Escape closes it and `New game` or `playAgain` is reachable; "the leaderboard shows the game just played": follow the dialog's leaderboard link, the User's row is marked as the caller's with the moves the solver counted, and a reload still shows it (server copy cleared by `updateTag`); "fits a landscape phone": at `SCREEN.VIEWPORT.PHONE_LANDSCAPE` all 12 cards are inside the viewport, each at least `GAMES.MEMORY.CARD.MIN_TARGET_PX` on both sides, and the page does not scroll vertically; the same on `SCREEN.VIEWPORT.PHONE`; "a Back Office-only User is not let in": proxy and API refuse (the Phase 3 sign-in gate), asserted through the status the helper reads; the deck's request count per visit is 1 and the leaderboard page does not ask the deck.
- [ ] Step 2: run, expected FAIL until the pages exist; once Tasks 14 to 17 are in, any red is a real defect: `pnpm test:services && pnpm --filter @allonfire/laura exec playwright test e2e/memory.spec.ts e2e/safe-area.spec.ts` (reconcile: use the Back Office's `test:e2e` form Phase 3 mirrors; e2e serves the production build).
- [ ] Step 3: fix what the run shows, in the owning task's files, with its test first.
- [ ] Step 4: run, expected PASS on `chromium`, `webkit`, `mobile-chrome`, `mobile-safari`.

### Task 20: Docs, glossary, knip and exports

**Files:**
- Modify: `docs/guides/next-apps.md`, `docs/guides/api.md`, `packages/database/README.md`, `CONTEXT.md`, `knip.jsonc`, `packages/config/local/tests/package-exports.test.ts`

**Interfaces:** none produced; documents Tasks 1 to 19.

- [ ] Step 1: tests that already guard this: `package-exports.test.ts` fails once `./features/apps/laura/game-score.service` has a reader outside the package (the API) and still sits in `KEPT.database`; delete that entry (and the `./features/apps/laura/constants/memory-rule` key has two readers, the API and Laura, so it needs none). Run it first: `pnpm --filter @allonfire/config exec vitest run local/tests/package-exports.test.ts`, expected FAIL until the entry is removed.
- [ ] Step 2: edit: `knip.jsonc` drops the `game-score.service.ts` accept entry and its "held only by Laura" comment (the API reads it now); `packages/database/README.md` fixes line 24 (`laura` holds `GameScore` only: the Quiz tables went in changeset 0003, `GameType` in this one), the services row (`submitMemoryScore`, `memoryLeaderboard`, `memoryStats`, `userMemoryStats`, `randomImages` under the Image service row, `MEMORY_RULE`) and its `import { getLeaderboard }` example; `docs/guides/api.md` one bullet under "Guards, env, Redis, i18n": the Laura games routes (`features/laura/games`), the deck is never cached (`no-cache`, a client draw), a score's write asks the Session fresh through `canPlay`, and `IMPLAUSIBLE_SCORE`; `docs/guides/next-apps.md` one bullet under "Reading and changing data": "A read whose point is randomness (Laura's Memory deck) is a TanStack `useQuery` with `staleTime: "static"`, `gcTime: 0` and a key per play outside the prefix a change refreshes, never hydrated from the private cache (its copy would repeat the draw), asked by the browser behind the page's skeleton; the checklist's point 1 applies to the TanStack half only"; `CONTEXT.md` Memory game entry gains "ranked by fewest moves, then the faster time, the best game of each current Member of Laura; a game that no player could have produced is refused".
- [ ] Step 3: `pnpm static:i18n`, `pnpm static:knip`, `pnpm static:knip-production`; any export only a test reads is tagged `/** @internal */` (`tooling.md`), never accepted file-wide.
- [ ] Step 4: run `pnpm --filter @allonfire/config exec vitest run local/tests/package-exports.test.ts`, expected PASS.

### Task 21: Review checkpoint

**Files:** none new.

- [ ] Step 1: `pnpm static:fix`, then `pnpm static:lint`.
- [ ] Step 2: `pnpm static:dupes` (expected no clone: the leaderboard and Users tables share ui's kit; a clone with the Back Office is merged into ui, never accepted).
- [ ] Step 3: `pnpm static:knip` and `pnpm static:knip-production`; `pnpm static:i18n`; `pnpm static:design` if Task 18 touched a Design.
- [ ] Step 4: `pnpm test:services`, then `pnpm turbo run check-types test --filter=@allonfire/database --filter=@allonfire/api --filter=@allonfire/ui --filter=@allonfire/laura --filter=@allonfire/config`; then `pnpm test:drift` and Laura's `pnpm --filter @allonfire/laura test:browser`, `pnpm --filter @allonfire/laura test:e2e` (Chromium, WebKit, both phones); then the Back Office's `pnpm --filter @allonfire/back-office test:browser` (the shared kit is untouched but the API's `app.ts` is).
- [ ] Step 5: docs touched: `docs/guides/{next-apps,api}.md`, `packages/database/README.md`, `apps/api/README.md`, `CONTEXT.md`. Confirm no `._*` files were created, no `Viewer`, `quiz` or `GameType` is left in what this phase wrote (`git grep -n -i "quiz\|GameType" -- apps/api packages docs/guides CONTEXT.md` prints only history and ADR text), and no `framer-motion` import exists in `apps/laura/src`. Stamp the plan done and stop: the owner reviews every change and commits by hand.
