# Optimistic Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make Back Office's bulk delete (Images, Users) remove rows from the list at once, and the Service on/off switch write the cache first, both with rollback and a toast on a refusal.

**Status:** implemented (uncommitted) @ 2026-11-17T15:14:51+01:00

**Architecture:** Two small helpers in Back Office `shared/utils`: `optimisticUpdate` (snapshot, patch, rollback over every cached query under a key) and `optimisticMutation` (a mutation factory over it). `bulkDeleteMutation` and a new `serviceEnabledMutation` are built on the factory; the row-removal updater is one function per list feature.

**Tech Stack:** TanStack Query 5.103 (`mutationOptions`, `QueryClient`), Next 16 server actions (unchanged), React 19, Vitest (unit, and browser tests in Back Office).

**Spec:** `docs/superpowers/specs/2026-11-17-optimistic-updates-design.md`

## Global Constraints

- Tests first. A test file's first line is `// @module-tag unit` or `// @module-tag integration`; Vitest globals, no `from "vitest"`.
- No `as` casts except `as const`; no `Object.keys/values/entries/fromEntries`, no `JSON.parse/stringify`: use core's helpers.
- Constants are one nested object per owner; a path or an error code is never a string literal, tests included.
- A mutation's options live in the feature's `utils/<feature>-mutations.ts`. A failed mutation toasts only through `aofErrorCaches` and `meta: aofErrorMeta(...)`, never an `aofToast` in `onError`.
- `staleTime: "static"` queries stay static. `QUERY.X.ONE(id)` is never patched or removed (it carries the Version a form saves on; the edit page that deletes its own Image still shows it).
- Server actions are not changed (`updateTag` stays). No page layout moves, so no skeleton changes.
- Work alongside the uncommitted changes already in the tree (`feat/list-sort-view`, the keep-alive fix); never commit, the owner does.
- Next.js: read `packages/core/node_modules/next/dist/docs/` first; TanStack docs through Context7 (`/tanstack/query`).

## Data checklist (`docs/guides/next-apps.md`)

1. Reads through TanStack, hydrated from the private cache: unchanged, no new read.
2. Every change refreshes both copies: the actions' `updateTag` is untouched; the factory's `onSettled` invalidates (`QUERY.IMAGES.ALL`, `QUERY.STORAGE.ALL`, `QUERY.USERS.ALL`, `QUERY.SERVICES.ALL`) and returns the refetch, so the mutation stays pending until fresh reads are in. The Home overview cards are not patched; the invalidation refreshes them as today.
3. Resource protection: untouched; a refusal is a toast and a rollback.
4. Resource changed: neither write carries a Version (a delete names ids, the Service `enabled` is last write wins, as today). The edit forms, which do, are untouched.
5. Lost and gone: a row already gone counts as deleted (the action answers a count); unchanged.
6. Skeletons: no layout change, none touched.

## Naming (owner's ask: better names across the code, generic where the code is shared)

Scope: the files the tasks touch **and** their feature neighbours in Images, Users and Services (hooks, components, actions, constants, utils, and the tests that name them). Not the rest of Back Office, not `packages/*`, not Laura. Each task renames what it touches, in the same edit; no separate rename pass. A rename changes no behaviour: the tests that cover the file stay green before and after.

Rules (planner's calls):

- Shared code (`shared/*`) uses neutral words: no `image`, `user` or `service` in a helper's names or doc. A feature's code uses its domain words (CONTEXT.md terms: Image, User, Service, Admin).
- A generic type parameter is `T` plus a word: `TData`, `TVariables`, `TResult`, `TKey`, `TParams`, `TType`; never `Key`, `P`, `T`.
- A `QueryClient` is `queryClient`; a bare `client` stays for the API client (`ApiClient`), so a file holding both never confuses them.
- No abbreviation: `res` becomes `response`, `vars` is `variables`. A `t` that is next-intl's translator stays.
- A function that derives a value from another follows the repo's `xOf` / `xFor` / `xWithout` style (`queryOf`, `altFor`, `providerChangeOf`).
- An id list says whose: `selectedIds` (the rows ticked), not `ids` or `selected`, wherever a component or hook holds the selection; the shared bulk-delete helper keeps `ids` (it is any id).

| Where | Now | Becomes |
|---|---|---|
| `shared/utils/bulk-delete.ts` | generic `Key` | `TKey` |
| same | `settled` (and `settled[4]`) | `callbackArgs`, destructured: `const [, , , , { client: queryClient }] = callbackArgs` |
| same | new option `remove` | `removeRows` |
| `optimistic-mutation.ts` | option `optimistic`; `vars` | `patchCache`; `variables` |
| `optimistic-update.ts` | `queryKey`, `update`, `data`, `Promise<() => void>` | `prefix`, `patch`, `cached`, `Promise<Rollback>`, with `export type Rollback = () => void` |
| `shared/constants/query.ts` | generics `P`, `T`; `IMAGES.LIST`, `USERS.LIST`, planned `LISTS` | `TParams`, `TType`; `IMAGES.PAGE`, `USERS.PAGE` (they key one page), planned prefix `PAGES`; the key string `"list"` becomes `"page"`. `SERVICES.LIST(type)` keeps its name: it is the whole answer for a type |
| `images-queries.ts`, `users-queries.ts` and their callers | `imagesListKey`, `usersListKey` | `imagesPageKey`, `usersPageKey` |
| new row-removal helpers | `imagesWithout`, `usersWithout`, files `images-without.ts`, `users-without.ts` | `imagesPageWithout`, `usersPageWithout`, files `images-page-without.ts`, `users-page-without.ts` |
| `use-bulk-delete-flow.ts` | `selected`; `sent` | `selectedIds`; `named` (the ids the delete named) |
| `delete-images.tsx`, `delete-users.tsx`, `use-delete-images-flow.ts`, `use-delete-users-flow.ts` | `ids` / `selected` | `selectedIds` |
| `images-table.tsx`, `users-table.tsx` | `list` (the query), `state`, `words`, `FILL`, `objectKeys(selection)` | `pageQuery`, `tableState`, `paginationWords`, `FILL_COLUMNS`, a `selectedIds` constant |
| `service-switch.tsx` | `value` in `onChange`; `otherChoice`, `saved`, `refresh` | `choice`; the last three go with the hand rollback |
| `use-refresh-services.ts`, `invalidateImages`, `edit-image.tsx`, `add-image.tsx` | `client` for a `QueryClient` | `queryClient` |
| `features/*/actions/*.ts` in the three features | `res` | `response` |
| `services/actions/services.ts` | `FIELDS` | `PROVIDER_FIELDS` |

Kept on purpose: `optimisticUpdate`, `optimisticMutation` (TanStack's own word, so the docs read straight onto them), `invalidates` (says exactly what it does), `perPage` (the URL parameter's name), `bulkDeleteMutation`, `ask`/`asking`/`confirm`.

How to rename without breaking anything: for each row, grep the old name across `apps/back-office` (src, e2e, tests) first, change the declaration and every use together, then run `pnpm --filter @allonfire/back-office check-types`; a miss is a compile error. A name that appears inside a string, a translation key or a URL parameter is not renamed (only the identifier).

## Review Focus

- A rename left no old name behind (grep each "Now" name: no hit outside strings and translation keys) and moved no behaviour: `check-types` and the tests are green after each task (all tasks).

- Two quick Service toggles (off then on) while the first is pending: the second waits (`scope`), and each failure restores its own snapshot (Tasks 2, 4).
- The action throws (network) versus answers `null` (refusal): both roll back and fail the mutation (Task 2).
- The mutation fires while the cache holds nothing under the key: no crash, nothing written, nothing to roll back (Tasks 1, 4).
- Deleting every row of the last page (page > 1): the page keeps its rows until the refetch, so the empty state never flashes; deleting every row of page 1 empties it (Task 3).
- While a delete is pending the table holds the height it had when Delete was confirmed, so the pager and footer do not jump up and down; the refill rows appear at the bottom when the refetch lands, and the height is released then (Task 3).
- A list cached under another search or page size is patched by its own rows and its own page size; a list that holds none of the ids is unchanged (Task 3).
- Deleting an Image from its own edit page: the edit page keeps showing (its `ONE` read is not removed) until the redirect (Task 3).

## File Structure

- Create `apps/back-office/src/shared/utils/optimistic-update.ts`, `optimistic-mutation.ts` (tests in `shared/utils/tests/`).
- Modify `apps/back-office/src/shared/utils/bulk-delete.ts` (built on the factory; the fade hook leaves).
- Modify `apps/back-office/src/shared/constants/query.ts` (`IMAGES.PAGE`/`USERS.PAGE` renamed from `LIST`, new `PAGES` prefixes, `TParams`/`TType` generics), `mutation.ts` (`SERVICES.ENABLED(type)`).
- Renames only (Naming section): the three features' hooks, components, actions and tests that use a renamed name; `use-refresh-services.ts`, `edit-image.tsx`, `add-image.tsx`.
- Create `features/images/utils/images-page-without.ts`, `features/users/utils/users-page-without.ts`; modify `images-mutations.ts`, `users-mutations.ts`, `images-table.tsx`, `users-table.tsx` and whatever else tsc names once `useBeingDeleted` is gone.
- Create `features/services/utils/services-mutations.ts`; modify `components/service-switch.tsx`.
- Modify `docs/guides/next-apps.md`.

---

### Task 1: `optimisticUpdate`

**Files:**
- Create: `apps/back-office/src/shared/utils/optimistic-update.ts`
- Test: `apps/back-office/src/shared/utils/tests/optimistic-update.test.ts`

**Interfaces:**
- Produces: `export type Rollback = () => void` and `optimisticUpdate<TData>(queryClient: QueryClient, prefix: QueryKey, patch: (cached: TData, key: QueryKey) => TData): Promise<Rollback>`. Applies to every cached query whose key starts with `prefix` and holds data; the resolved function restores every snapshot it took.

- [x] **Step 1: Write the failing test** (`// @module-tag unit`, a bare `QueryClient`): patches one cached query and the rollback restores it exactly; patches every query under a prefix (`["things","list",{page:1}]`, `{page:2}`) and the rollback restores both; `patch` receives each query's own key as its second argument; a query outside the prefix is untouched; queries under the key without data are skipped (`getQueryData` stays `undefined`); an empty cache neither throws nor writes; `queryClient.cancelQueries` is called with `{ queryKey: prefix }` before the patch.
- [x] **Step 2: Run** `pnpm --filter @allonfire/back-office exec vitest run src/shared/utils/tests/optimistic-update.test.ts`. Expected: FAIL, module not found.
- [x] **Step 3: Implement** the signature above: `await queryClient.cancelQueries({ queryKey: prefix })`, collect `queryClient.getQueriesData<TData>({ queryKey: prefix })`, `setQueryData` each non-undefined entry with `patch(cached, key)`, return a rollback that sets every snapshot back.
- [x] **Step 4: Run** the same command. Expected: PASS.

### Task 2: `optimisticMutation`

**Files:**
- Create: `apps/back-office/src/shared/utils/optimistic-mutation.ts`
- Test: `apps/back-office/src/shared/utils/tests/optimistic-mutation.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Rollback`) through the caller's `patchCache` function.
- Produces: `optimisticMutation<TVariables, TResult, TKey extends QueryKey>(options: { action: (variables: TVariables) => Promise<TResult | null>; invalidates: readonly QueryKey[]; mutationKey: TKey; patchCache?: (queryClient: QueryClient, variables: TVariables) => Promise<Rollback>; scope?: string })`, returning `mutationOptions` where: `null` throws (a refusal fails the mutation); `onMutate` runs `patchCache` and keeps its rollback; `onError` calls it; `onSettled` returns the promise of every `invalidateQueries`; `scope` becomes `{ id: scope }` when given; never retried.

- [x] **Step 1: Write the failing tests** (build and `execute` the mutation on a `QueryClient`, as `bulk-delete.test.ts` does): answers the action's result; `null` rejects; a throwing action rejects; every key in `invalidates` is invalidated and the mutation resolves only after those refetches finish (a refetch gated on a promise); `patchCache` runs before the action (assert order) and its rollback runs on `null` and on a throw, never on success; two mutations with the same `scope` run one after the other.
- [x] **Step 2: Run** the test file. Expected: FAIL.
- [x] **Step 3: Implement** it from `bulkDeleteMutation`'s body (`shared/utils/bulk-delete.ts`), which is the behaviour to keep: TanStack hands its `context` (holding the `QueryClient`) last in each callback: name it, never index it (`callbackArgs`, destructured with holes; the `context` argument in `onMutate`/`onError`).
- [x] **Step 4: Run.** Expected: PASS.

### Task 3: Bulk delete removes rows at once

**Files:**
- Create: `features/images/utils/images-page-without.ts`, `features/users/utils/users-page-without.ts` (under `apps/back-office/src/`)
- Modify: `shared/constants/query.ts` (rename `LIST` to `PAGE` with its key string `"page"`; add `PAGES: [IMAGES, "page"] as const`, same for `USERS`; generics `TParams`), `shared/utils/bulk-delete.ts`, `features/images/utils/images-mutations.ts`, `features/users/utils/users-mutations.ts`, `images-table.tsx`, `users-table.tsx`
- Test: `features/images/utils/tests/images-page-without.test.ts`, `features/users/utils/tests/users-page-without.test.ts` (unit), `shared/utils/tests/bulk-delete.test.ts` (existing; extend), `features/images/components/tests/images-table.browser.test.tsx`, `features/users/components/tests/users-table.browser.test.tsx` (existing; adapt)

**Interfaces:**
- Consumes: `optimisticMutation`, `optimisticUpdate`; the list page types (`{ images: ImageBody[]; total: number; pageCount: number }`, `{ users: UserBody[]; total; pageCount }`).
- Produces: `imagesPageWithout(page: ImagesPage, ids: ReadonlySet<string>, perPage: number): ImagesPage` and `usersPageWithout(...)` likewise: drops the named rows, lowers `total` by the rows actually dropped, recomputes `pageCount` as `max(1, ceil(total / perPage))`, and returns the page unchanged when dropping would empty it while `total` stays above 0 (the empty state must not flash). `bulkDeleteMutation` takes a new `removeRows: (queryClient, ids) => Promise<Rollback>` and keeps its other options; `perPage` is read from the cached query's key params with a type guard (no cast).

- [x] **Step 1: Failing unit tests** for `imagesPageWithout` and `usersPageWithout`: drops named rows and keeps order; `total` lowers by the rows found on that page only; `pageCount` follows; ids absent from the page change nothing; emptying a page leaves it unchanged. Run both files. Expected: FAIL.
- [x] **Step 2: Implement both**, run. Expected: PASS.
- [x] **Step 3: Failing tests in `bulk-delete.test.ts`:** with two cached list pages seeded, the rows are gone from both while the action is still pending; a `null` answer and a throw put them back; `QUERY.IMAGES.ONE(id)` stays cached; the mutation stays pending until the refetches finish. Run. Expected: FAIL.
- [x] **Step 4: Rebuild `bulkDeleteMutation`** on `optimisticMutation` with the new `removeRows` option (the action adapter turns a `null` count into `null` and a count into `{ deleted }`); each feature's mutations file passes `removeRows` built from `optimisticUpdate(queryClient, QUERY.X.PAGES, (page, key) => xPageWithout(page, new Set(ids), perPageOf(key)))`. Apply the Naming rows for these files (`TKey`, `callbackArgs`, `selectedIds`, `named`, the tables' `pageQuery`/`tableState`/`paginationWords`/`FILL_COLUMNS`, `imagesPageKey`/`usersPageKey` and their callers). Delete `useBeingDeleted`, `useImagesBeingDeleted`, `useUsersBeingDeleted` and the `deleting` prop wherever `pnpm --filter @allonfire/back-office check-types` names it; remove the tests that assert the fade.
- [x] **Step 5: Hold the table's height while a delete is pending** (the TanStack docs cover removing rows and refetching, not the short page that follows, so this is this repo's own polish). First read how `packages/ui/src/features/data-table` and the two tables set their height; if a full page of rows is already reserved, skip the rest of this step and say so in the task notes. Otherwise add `useDeletePending(mutationKey: QueryKey): boolean` to `shared/utils/bulk-delete.ts` (over `useIsMutating`, replacing `useBeingDeleted`), and have each table (in its renamed form) measure its body height with a ref when the flag turns true and apply it as an inline `minHeight` style until the flag turns false (a measured value, so a style prop, not a constant class list). Test it in the table browser tests: while the delete is pending the table's height equals its height before the delete; once settled the min-height is gone.
- [x] **Step 6: Adapt the two table browser tests:** after confirming a delete the rows are gone from the table before the action resolves, and come back with a toast when it is refused. Run `pnpm --filter @allonfire/back-office test:browser -- images-table users-table`. Expected: PASS.

### Task 4: Service switch through the cache

**Files:**
- Create: `apps/back-office/src/features/services/utils/services-mutations.ts`
- Modify: `shared/constants/mutation.ts` (`SERVICES: { ENABLED: (type: ServiceType) => [...QUERY.SERVICES.ALL, "enabled", type] as const }`), `features/services/components/service-switch.tsx`
- Test: `features/services/utils/tests/services-mutations.test.ts` (new, unit), `features/services/components/tests/service-switch.browser.test.tsx` (existing; rework)

**Interfaces:**
- Consumes: `optimisticMutation`, `optimisticUpdate`; `setServiceEnabled(type, enabled): Promise<boolean>` (unchanged); `servicesListKey(type)`, `ServiceList`.
- Produces: `serviceEnabledMutation(type: ServiceType)`: `optimisticMutation` options with variables `boolean`; `patchCache` flips `services[type].enabled` under `servicesListKey(type)`; `invalidates: [QUERY.SERVICES.ALL]`; `scope` unique per type; the action adapter answers `{ enabled }` or `null`.

- [x] **Step 1: Failing unit test:** with MAIL `enabled: true` cached, the cache already reads `false` while the action is pending; a `false` answer and a throw put it back to `true`; with no cached list nothing is written and the action still runs; another type's list is untouched. Run `pnpm --filter @allonfire/back-office exec vitest run src/features/services/utils/tests/services-mutations.test.ts`. Expected: FAIL. Implement, run. Expected: PASS.
- [x] **Step 2: Rework the browser test** around a harness that seeds the cache and passes `enabled` from `useQuery(servicesQuery)` (the parent's job in `service-providers.tsx`): keep the cases "turns off at once", "sends nothing when the shown option is chosen again", "refreshes `QUERY.SERVICES.ALL`"; the failure case builds its `QueryClient` with `aofErrorCaches` (as `aof-query-errors.test.ts` does) and asserts the toast and that the switch shows the confirmed choice again through the cache rollback; add two quick toggles, asserting the calls run in order. Run `pnpm --filter @allonfire/back-office test:browser -- service-switch`. Expected: FAIL.
- [x] **Step 3: Convert `ServiceSwitch`** to `useMutation({ ...serviceEnabledMutation(type), meta: aofErrorMeta(t("failed")) })`; it stays a `useAOFForm` field whose `onChange` calls `mutate` with the `choice` (was `value`); an effect syncs the field from the `enabled` prop with `form.setFieldValue("enabled", ..., { dontRunListeners: true })`. Remove `startTransition`, the hand-written rollback (`otherChoice`, `saved`), the `aofToast` call and `useRefreshServices` from this file (the hook stays for other callers, with its `queryClient` rename). Rename `res` to `response` and `FIELDS` to `PROVIDER_FIELDS` in `actions/services.ts`, and `res` to `response` in the other Services, Images and Users actions.
- [x] **Step 4: Run** the browser and unit tests. Expected: PASS.

### Task 5: The rule in the guide, and the full checks

**Files:**
- Modify: `docs/guides/next-apps.md` (checklist point 2), `docs/superpowers/specs/2026-11-17-optimistic-updates-design.md` (status: implemented)

- [x] **Step 1: Add the rule** to point 2 of the data checklist, in the guide's style: a click-driven write the server almost never refuses (a switch, a delete) is a `useMutation` built with `optimisticMutation`, writes the cache first through `optimisticUpdate`, and rolls back and toasts on a refusal; a form with fields stays `useActionState` and never writes the cache before the server answers; a `ONE(id)` read is never patched. Name the two helpers' paths.
- [x] **Step 2: Naming sweep:** grep `apps/back-office` (src, e2e) for each "Now" name in the Naming table (`imagesListKey`, `usersListKey`, `QUERY.IMAGES.LIST`, `QUERY.USERS.LIST`, `\bres\b`, `FIELDS`, `otherChoice`, `useBeingDeleted`, `settled[`): no hit outside strings and translation keys.
- [x] **Step 3: Run the checks:** `pnpm check`, `pnpm --filter @allonfire/back-office test`, `pnpm --filter @allonfire/back-office test:browser`, `pnpm static:knip`, `pnpm static:knip-production`, `pnpm static:dupes`. Expected: all pass; fix what knip names (an unused export is deleted).

## Implementation Notes (rulings made while building)

- Task 3 Step 5 (hold the table's height): skipped as a code change. The data table already reserves its room (the rows' box is `flex-1` with a header-and-eight-rows minimum, its viewport laid `absolute` over it; the phone cards' list is `flex-1` too), so removing rows moves nothing. The two table browser tests assert it: the table frame's `clientHeight` is the same before and while the delete is pending.
- The fade lived in the shared `ListTable` (`deleting` prop, `busy` rows), not in the two tables; it is removed there. `busy` is no longer omitted from `ListTable`'s props.
- `rowsWithout` and `perPageIn` live together in `shared/utils/page-without.ts` (one tested place; `imagesPageWithout` and `usersPageWithout` are thin wrappers), which keeps `static:dupes` clean.
- A page that deletion would empty while rows remain elsewhere keeps its rows, page 1 included (the rule is on `total`, not on the page number); page 1 empties only when the total reaches 0.
- `removeRows` is required on `bulkDeleteMutation` (a bulk delete is always optimistic); a key with no page size leaves its page unchanged.
- Users' param names come from auth's `USER.PARAM`, not the feature's `USERS` constants.
- Service switch: besides following the `enabled` prop, the field is put back in the call's own `onError` (`choiceOf(!turnOn)`): a refusal can undo the cache before React renders the patched value, so the prop never changes and the effect alone would leave the switch on the refused choice. A `biome-ignore` to depend on the mutation's error flag instead is refused by the repo's own config test.
- The unit case "another type's list is untouched" was dropped: `ServiceType` has one value (MAIL).
- `scope` for the switch is the mutation key joined (`services.enabled.MAIL`): unique per type.

## Implementation Log
- Implemented: 2026-11-17T15:14:51+01:00
- Workspace: current-branch — feat/list-sort-view
- Committed: no — awaiting user review
