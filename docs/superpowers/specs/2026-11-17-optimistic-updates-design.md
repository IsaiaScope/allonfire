# Optimistic updates for Back Office (design)

Status: implemented (uncommitted) 2026-11-17; brainstormed and grilled the same day. Scope narrowed by the owner to two
real optimistic updates, in Back Office only ("ignore Laura").

## Intent and why

The owner wants Back Office to feel instant on the writes that the server almost
never refuses. No page is known to be slow today: this is polish. The owner
first asked for a shared layer for the Laura rewrite, then said to ignore
Laura; so the helpers live in Back Office and move to `packages/core` when the
rewrite needs them (a move of two files and their tests).

## The two updates (owner's list)

| # | Write | What the visitor sees |
|---|---|---|
| 1 | **Bulk delete** (Images, Users) | The rows leave the list the moment Delete is confirmed; the list's `total` and `pageCount` follow. A refusal puts the rows back and toasts. Today the rows only fade until the refetch. |
| 2 | **Service on/off switch** | The switch already flips at once in local state. It now writes `QUERY.SERVICES.LIST(type)` first, so the cache is the single truth, with rollback and toast on a refusal. No new pixel; it is the clean small example of the pattern. |

## What exists already (verified 2026-11-17)

- `keepPreviousData` on the Images and Users tables: nothing to do.
- Bulk delete today: `bulkDeleteMutation` plus `useBeingDeleted` fade rows until
  the fresh list has them gone. This is replaced by the optimistic removal.
- Edit pages are hydrated from the private cache and prefetched by their
  `<Link>`s; edit forms use `useActionState`. Untouched.

## Goals

1. `optimisticUpdate`: cancel the queries under a key, snapshot every cached
   query under it, patch each with a typed updater, return one rollback.
2. `optimisticMutation`: a factory over it that owns the refusal-as-null rule,
   rollback on error, `onSettled` awaiting every invalidation, and an optional
   `scope` so two quick toggles run in order. `bulkDeleteMutation` and the new
   `serviceEnabledMutation` are built on it.
3. Bulk delete removes the named rows from every cached page of its list and
   lowers `total` and `pageCount`; `useBeingDeleted` and the `deleting` fade
   are removed.
4. The Service switch becomes a mutation on `QUERY.SERVICES.LIST(type)`.

## Non-goals and anti-goals

- Laura: not touched, not designed for.
- Edit image and edit user: no optimistic write and no write-through. A
  refusal (version conflict, own-role) would arrive after the form is gone, so
  the Admin would lose what they typed. They stay as they are.
- Add image, add user, provider form save, test send: the server decides.
- The Home overview cards (Storage, Users): not patched. They are not on the
  screen where a deletion happens; they are refreshed by the invalidation as
  today, and by the time Home is opened the fresh copy is in.
- `ONE(id)` reads are never patched or removed: they carry the Version a form
  saves on, and the edit page that deletes its own Image is still showing it.
- Anti-goal: a state the API later contradicts without telling the visitor.
  Every refusal rolls back and toasts.

## Constraints

- The data checklist of `docs/guides/next-apps.md` binds every change (see the
  plan's section).
- A mutation always toasts through `aofErrorCaches` with `meta:
  aofErrorMeta(...)`, never an `aofToast` in `onError`. A mutation's options
  live in the feature's `utils/<feature>-mutations.ts`.
- Package rules: tests first with `// @module-tag`; no `as` casts except `as
  const`; no `Object.keys/values/entries/fromEntries`, no `JSON.parse/stringify`.
- `staleTime: "static"` queries stay static.

## Decisions (owner's answers)

- Bulk delete becomes truly optimistic (reverses the first "keep the fade").
- The Service switch is converted.
- Edit forms stay as they are (their write-through was dropped).
- Helpers in Back Office `shared/utils`, not in core.

## Calls made by the planner (marked as mine)

- Click-driven writes use `useMutation` (TanStack's path); forms keep
  `useActionState` (Next's path). The rule goes into `next-apps.md`, no ADR.
- A page of a list is patched only when removing leaves it non-empty (or it is
  page 1): emptying page 3 of 3 would show the empty state while the view steps
  back. Such a page keeps its rows until the refetch.
- `total` drops by the rows actually removed from that cached page, since the
  rows of other pages are unknown; `pageCount` is recomputed from the page size
  in the list's own key.
- The short page after a delete (rows removed, refill rows still on the server)
  follows the TanStack docs' pattern: remove the rows, refetch, accept the
  refill. On top, the owner chose to hold the table's height while the delete is
  pending so the pager and footer do not jump. No exit animation, no pulling
  rows from the next cached page.
- Two quick switch toggles run in order through `scope`; each rollback restores
  its own snapshot. The Service `enabled` has no Version: last write wins.
- `ServiceSwitch` stays a `useAOFForm` field; the cache drives its value
  through `form.setFieldValue(..., { dontRunListeners: true })`.
- Naming (owner's ask, added 2026-11-17): better names in the touched files and
  their Images, Users and Services neighbours, folded into each task, not a
  separate pass. Shared helpers use neutral words, features use domain words;
  generics are `T`-prefixed, a `QueryClient` is `queryClient`, no abbreviations.
  The table is in the plan's Naming section. `QUERY.IMAGES/USERS.LIST` become
  `PAGE` (they key one page); `optimisticUpdate`/`optimisticMutation` keep
  TanStack's own word.
- No CONTEXT.md term added. No skeleton changes: no layout moves.
