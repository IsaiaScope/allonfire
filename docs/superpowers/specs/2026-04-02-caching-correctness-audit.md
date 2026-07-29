# Caching Correctness Audit — cacheComponents Migration

**Date:** 2026-04-02
**Scope:** Both apps (Laura + Social)
**Status:** Audit complete, one bug found and fixed

## Configuration

Both apps use identical caching config in `next.config.ts`:

```ts
cacheComponents: true,
experimental: {
  staleTimes: { dynamic: 300 },  // 5-minute client-side RSC cache
}
```

- Pages are **dynamic by default** (no explicit caching needed)
- Opt INTO caching with `"use cache"` directive
- Tag cached data with `cacheTag()`, invalidate with `updateTag()` or `revalidateTag()`

## Bug Found & Fixed: Game Completion Dialog

**Problem**: `submitScoreAction` called `revalidatePath("/games/memory/leaderboard")` while user was on `/games/memory`. Server actions automatically refetch the current page's RSC payload. Combined with `key={Date.now()}` on the game components, this caused the game board to remount, destroying the completion dialog.

**Root cause chain:**
1. Server action completes → Next.js refetches current page RSC
2. `revalidatePath` additionally invalidates entire client router cache
3. `key={Date.now()}` produces new timestamp → React unmounts/remounts component
4. Game state (including "complete" + dialog) is destroyed

**Fix:**
1. Created `leaderboard-cache.ts` with `getCachedLeaderboardData()` using `"use cache"` + `cacheTag`
2. Replaced `revalidatePath` with `updateTag` in score submission actions
3. Removed `key={Date.now()}` from game page components

**Files changed:**
- `apps/laura/src/features/games/actions/leaderboard-cache.ts` (new)
- `apps/laura/src/features/games/actions/games.ts`
- `apps/laura/src/features/games/actions/quiz.ts`
- `apps/laura/src/app/[locale]/(dashboard)/games/memory/page.tsx`
- `apps/laura/src/app/[locale]/(dashboard)/games/quiz/page.tsx`

## Audit: All revalidatePath Calls

### Laura App — All Correct

| Call | Target | User's page | Status |
|------|--------|-------------|--------|
| Score submit (memory) | `updateTag("leaderboard-memory")` | `/games/memory` | **FIXED** |
| Score submit (quiz) | `updateTag("leaderboard-quiz")` | `/games/quiz` | **FIXED** |
| Quiz create | `/games/quiz/edit` | `/games/quiz/edit/new` | OK — navigates away after |
| Quiz update | `/games/quiz/edit` | `/games/quiz/edit/[id]` | OK — navigates away after |
| Quiz delete | `/games/quiz/edit` | `/games/quiz/edit` | OK — self-revalidation intended |

### Social App — Server Actions — All Correct

| Call | Target(s) | User's page | Status |
|------|-----------|-------------|--------|
| Generate trigger | `/generate`, `/` | `/generate` | OK — self-revalidation |
| Prompt delete/note/rate | `/generate` (layout) | `/generate/[topicId]` | OK — layout scope |
| Publish | `/`, `/generate` | `/publish` | OK — different pages, no ephemeral state |
| Topic select/delete | `/discover`, `/generate`, `/` | `/discover` | OK — self-revalidation |
| Bulk delete topics | `/generate`, `/` | `/generate` | OK — self-revalidation |
| Admin user CRUD | `/admin/users` | `/admin/users` | OK — self-revalidation |
| Admin provider CRUD | `/admin/providers`, `/publish`, `/settings` | `/admin/providers` | OK — cascading, no state to lose |

### Social App — API Routes (Webhooks) — All Correct

| Route | Caller | Target(s) | Status |
|-------|--------|-----------|--------|
| `/api/webhooks/generate` | n8n (background) | `/generate`, `/` | OK — busts stale cache |
| `/api/webhooks/topics` | n8n (background) | `/discover`, `/` | OK — busts stale cache |
| `/api/rerank-and-prune` | n8n (background) | `/discover`, `/` | OK — busts stale cache |
| `/api/publish/oauth/[platform]` | OAuth popup | `/publish`, `/settings` | OK — popup window |

## Decision Guide: When to Use Each Pattern

### Use `revalidatePath(path)` when:

- User is **ON** the page being revalidated (self-revalidation after mutation)
- Background webhook needs to bust stale cache for future visitors
- Server action navigates user away immediately after (e.g., `router.push()`)

### Use `"use cache"` + `cacheTag(tag)` + `updateTag(tag)` when:

- User is on a **DIFFERENT** page than the data being invalidated
- Current page has **ephemeral state** (dialogs, game progress, form state, animations)
- You need **surgical invalidation** that doesn't trigger a current-page refetch

### Key insight

`revalidatePath` invalidates the **entire client router cache**, not just the specified path. Any server action call also triggers a refetch of the current page's RSC payload. These two behaviors combine to cause unexpected page refreshes.

`updateTag` only expires server-side cached data tagged with that specific tag. It does **not** trigger a current-page refetch or invalidate the client router cache.

## Known Trade-off

Removing `key={Date.now()}` from game pages means client-side navigation back to a game within the 5-minute `staleTimes.dynamic: 300` window shows cached game state instead of fresh random cards. "Play Again" still works via `resetGame()` which fetches fresh data from the server.

## Minor Inefficiency (No Action Needed)

Webhook routes for `generate` and `topics` revalidate `/` unnecessarily — the overview page data only changes meaningfully after `rerank-and-prune`. Harmless extra cache bust.
