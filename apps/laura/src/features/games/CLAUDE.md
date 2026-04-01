# Games Feature -- Claude Guide

## Feature Scope

**Owns:** Memory card game, quiz game, leaderboards for both, game hub, quiz question CRUD (create/edit/delete with image uploads), game-related server actions, game state hooks, game utilities.

**Does not own:** Photo storage/upload (uses `@allonfire/storage`), authentication (uses `@/lib/auth` and `@allonfire/auth/guard`), database queries (uses `@allonfire/database`), animation variant definitions (uses `@/lib/animation-variants`), file validation (uses `@/lib/file-validation`), HEIC conversion (uses `@/lib/convert-heic`), i18n message definitions (uses next-intl `Games` namespace), user role context (uses `@/components/user-role-provider`).

## File Responsibilities

| File | Purpose |
|------|---------|
| `actions/games.ts` | Server actions: fetch memory photos (Fisher-Yates shuffle), submit memory score, get best time, get leaderboard data. Exports `MemoryCard`, `LeaderboardData` types. |
| `actions/quiz.ts` | Server actions: fetch quiz questions, submit quiz score, quiz CRUD (create/update/delete questions), list all questions, get question by ID. Image processing and upload for questions/answers. Exports `QuizQuestionData`, `QuizQuestionListItem`, `QuizQuestionDetail` types. |
| `hooks/use-memory-game.ts` | Client hook: card flip state machine (idle/playing/checking/complete), match detection, timer, move counter, auto-submit score, reset with new photos, retry submit. |
| `hooks/use-quiz-game.ts` | Client hook: quiz state machine (idle/playing/complete), answer selection/confirmation, question progression with transitions, timer, auto-submit score, mistake tracking with `useMemo`. Exports `PlayerAnswer` type. |
| `hooks/use-memory-grid-size.ts` | Client hook: responsive grid calculation via `ResizeObserver`. Returns `ref`, `cols`, `rows`, `gap`, `cardSize`, `ready`. Mobile 3x4 / tablet+ 4x3 at 640px breakpoint. |
| `utils/format-time.ts` | Pure function: formats milliseconds to `"M:SS"` string. Used by all game and leaderboard components. |
| `components/game-hub.tsx` | Game selection page with animated cards for memory and quiz. Shows quiz edit link for admins only via `useIsAdmin()`. |
| `components/game-complete-dialog.tsx` | AlertDialog for memory game completion. Shows time, moves, new record badge, submit status, play again / leaderboard buttons. |
| `components/memory-board.tsx` | Memory game wrapper: wires `useMemoryGame` + `useMemoryGridSize`, renders header stats, card grid, and completion dialog. |
| `components/memory-card.tsx` | Single memory card with CSS 3D flip transform, blur placeholder, light/dark card back images. Accessible with aria-labels. |
| `components/quiz-board.tsx` | Quiz game wrapper: wires `useQuizGame`, renders progress bar, question with answer feedback animation (bounce/shake), confirm button. Switches to `QuizResults` on complete. |
| `components/quiz-question.tsx` | Renders question text, optional image, and answers. Auto-detects image vs text layout. Contains `TextAnswerList` and `ImageAnswerGrid` sub-components. |
| `components/quiz-results.tsx` | Quiz completion screen: score summary, time, accuracy percentage or new record badge, submit status, mistakes toggle, play again. |
| `components/quiz-mistakes.tsx` | Mistake review: lists wrong answers with side-by-side AnswerCard comparison (red wrong / green correct), includes question images. |
| `components/leaderboard-shared.tsx` | Server component with shared utilities: `getInitials()` for avatar fallbacks, `RankBadge` component (gold/silver/bronze badges for top 3). |
| `components/leaderboard-table.tsx` | Memory leaderboard table: columns are rank, player (avatar), time, moves, date. Animated rows via Framer Motion. Highlights current user. |
| `components/quiz-leaderboard-table.tsx` | Quiz leaderboard table: columns are rank, player (avatar), score/10, time, date. Same animation pattern as memory table. |
| `components/leaderboard-stats.tsx` | 4-card stats grid: total games, unique players, best time, average time. Animated with stagger. |
| `components/quiz-question-list.tsx` | Admin question list: search filter, new question button, question rows with thumbnail/text/answer count/edit/delete. Delete confirmation dialog with `useTransition`. |
| `components/quiz-question-form.tsx` | Admin question form: handles both create and edit modes via `initialData` prop. Question text + image, 2-4 answer slots with text + image each, correct answer toggle. HEIC conversion, image preview portals, FormData serialization. Contains `AnswerRow` sub-component. |

## Modification Guide

### 1. Add a new game type

1. Add the game type to the `GameType` enum in the Prisma schema (`packages/database/prisma/schema.prisma`)
2. Create a new server action file in `actions/` for game-specific logic (photo/question fetching, score submission)
3. Create a game state hook in `hooks/` following the pattern of `use-memory-game.ts` or `use-quiz-game.ts`
4. Create game components in `components/`
5. Add a card to `game-hub.tsx` with link to the new game route
6. Create a leaderboard table component if the ranking differs from existing ones
7. Add routes under `app/[locale]/(dashboard)/games/<game-name>/`
8. Add i18n keys to the `Games` namespace in all locale files

### 2. Add a column to a leaderboard table

1. Add the data field to `LeaderboardData` type in `actions/games.ts`
2. Fetch the data in `getLeaderboardAction()`
3. Add a `<th>` and `<td>` to the relevant table component (`leaderboard-table.tsx` or `quiz-leaderboard-table.tsx`)
4. Add the i18n key for the column header

### 3. Add a new quiz question field

1. Update the Prisma schema for `QuizQuestion` or `QuizAnswer`
2. Update the types in `actions/quiz.ts` (`QuizQuestionData`, `QuizQuestionDetail`, `QuizQuestionListItem`)
3. Update `validateQuestionForm()` and `parseAnswer()` in `actions/quiz.ts`
4. Update `createQuestionAction()` and `updateQuestionAction()` in `actions/quiz.ts`
5. Update the form UI in `quiz-question-form.tsx` (and `serializeAnswerToFormData` if answer-level)
6. Update display components if the field is shown during gameplay

### 4. Change the memory grid size

1. Edit `MOBILE` and `TABLET` constants in `hooks/use-memory-grid-size.ts`
2. Update the photo count in `getMemoryPhotosAction()` (currently hardcoded to 6 = cols*rows/2)
3. Update the `metadata` in `submitScoreAction()` to reflect the new grid size

### 5. Add image support to a component

1. Process images via `processAndUploadImage()` in `actions/quiz.ts` (reuse or extract to shared util)
2. Use `@allonfire/storage` for `processPhoto` + `uploadFile` + `blurHashToDataURL`
3. Use `convertHeicToJpeg` from `@/lib/convert-heic` for client-side HEIC handling
4. Use `validateImageFile` from `@/lib/file-validation` for validation
5. Preview with `URL.createObjectURL()` and clean up with `URL.revokeObjectURL()` on unmount

## Gotchas

- **Fisher-Yates shuffle runs server-side:** The card shuffle in `getMemoryPhotosAction()` uses a `for` loop with `let` (not `for...of`) because it needs index-based swapping. This is intentional despite Ultracite's preference for `for...of`.

- **800ms match check delay:** `use-memory-game.ts` uses a `setTimeout(fn, 800)` in the checking effect to let players see the second flipped card before resolving the match. The timeout is cleaned up in the effect return.

- **300ms quiz transition:** `use-quiz-game.ts` uses a `setTimeout(fn, 300)` for the slide transition between questions. The `isTransitioning` flag prevents answer selection during the animation.

- **Score submission in effects:** Both game hooks fire score submission inside `useEffect` / callbacks using `.then().catch()` chains rather than `await`, because they run inside state update callbacks where async/await would complicate the flow.

- **movesRef sync:** `use-memory-game.ts` keeps a `movesRef` in sync with the `moves` state via a separate `useEffect`, because the completion check runs inside a timeout closure that would capture a stale `moves` value.

- **Viewer role dual check:** Memory photos use `checkAppAccess` (viewers get all users' photos), while score submission uses `checkMutationAccess` (viewers are blocked). The client also checks `useIsViewer()` to skip submission and show a notice.

- **Quiz CRUD admin-only:** All quiz create/update/delete actions use `checkAdminAccess`, which is stricter than `checkMutationAccess`. The game hub shows the edit link only when `useIsAdmin()` returns true.

- **FormData serialization for quiz CRUD:** The form uses `FormData` (not JSON) because it includes `File` objects for image uploads. Answer fields are indexed (`answer-0-text`, `answer-0-correct`, etc.). Edit mode adds `keepExistingImage` and `existingImageUrl` fields per answer for image retention logic.

- **Image preview portals:** `quiz-question-form.tsx` uses `createPortal(overlay, document.body)` for fullscreen image previews. Escape key closes the overlay via a `useEffect` listener. Body scroll is locked while the preview is open.

- **Object URL cleanup:** `quiz-question-form.tsx` tracks all created object URLs in a `previewUrlsRef` Set and revokes them on unmount to prevent memory leaks.

- **leaderboard-shared.tsx is a Server Component:** Unlike most components in this feature, `leaderboard-shared.tsx` has no `"use client"` directive. It exports pure functions and a simple Badge-based component that work in both server and client contexts.

- **Quiz "new best" logic differs from memory:** Memory compares time only. Quiz compares correctCount first, then time as tiebreaker. Both live in their respective action files.

## Dependencies

| Package | Why |
|---------|-----|
| `@allonfire/database` | All DB queries: photos, scores, leaderboard, quiz questions CRUD |
| `@allonfire/auth/guard` | `checkAppAccess`, `checkMutationAccess`, `checkAdminAccess` for server action authorization |
| `@allonfire/storage` | `blurHashToDataURL`, `processPhoto`, `uploadFile` for image handling |
| `@allonfire/utils` | `formatErrorMessage` for error normalization in quiz CRUD |
| `@allonfire/ui` | Button, Card, Badge, AlertDialog, Avatar, Input, Label, cn utility |
| `framer-motion` | Answer feedback animations (bounce/shake), leaderboard row stagger, game hub card animations |
| `lucide-react` | Icons: Gamepad2, BrainCircuit, Trophy, Clock, MousePointerClick, Plus, Pencil, Trash2, Search, ArrowLeft, ImagePlus, Check, X, Loader2 |
| `next/image` | Memory card photos, quiz question/answer images, question list thumbnails |
| `next-intl` | `useTranslations("Games")` for all user-facing text |
| `sonner` | Toast notifications for quiz CRUD success/error |
| `@/components/user-role-provider` | `useIsViewer()` and `useIsAdmin()` for client-side role checks |
| `@/lib/animation-variants` | `fadeInUp`, `staggerContainer`, `gameCardVariant`, `leaderboardRow`, `correctBounce`, `wrongShake` |
| `@/lib/file-validation` | `validateImageFile`, `ACCEPTED_INPUT_STRING` for quiz image uploads |
| `@/lib/convert-heic` | `convertHeicToJpeg` for HEIC/HEIF image conversion on upload |
| `@/i18n/navigation` | `Link` component for locale-aware routing in quiz CRUD |
