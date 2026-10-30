# Back Office Users list: design

2026-10-21. Owner decisions are marked **(owner)**; calls left to me are marked **(my call)**.

## Intent

An Admin opens Users to find someone and see where they have access:

- their email;
- their Role in each App;
- when the account was created.

The Users Section is a placeholder today (`AOFEmpty`). This turns it into the real list. The User detail page comes in a later plan **(owner)**: a row opens its address, which shows a placeholder until then.

## Goals

- A TanStack Table **(owner)**, built on DiceUI's Base UI data-table **(owner, from the library survey `2026-10-21-users-table-library-survey.md`)**:
  - installed through the shadcn CLI into `packages/shadcn`;
  - wrapped as AOF components in `packages/ui`.

  **Planning ruling (my call, owner to confirm):** DiceUI is not installed after all. Its only exported `DataTable` always renders a pagination footer with English written into the markup ("Rows per page", "Page n of m", the button labels, "No results."). `packages/shadcn` is never edited by hand, so the Italian Back Office could not translate it. `AOFDataTable` is built in `packages/ui` instead, on TanStack Table v9 and shadcn's `table`, using DiceUI's layout as the reference and taking every label as a prop.
- Columns **(owner)**:
  - Email;
  - one column per App, showing the User's Role there or a dash;
  - Created.

  The App columns come from the Apps the API reports, so a new App adds a column with no change to the page **(my call)**.
- Order: newest first, fixed; no header sorting for now **(owner)**.
- Pagination: 25, 50 or 100 rows per page, 25 by default **(owner)**.
- Controls **(owner)**: an email search box, an App select and a Role select. The options for both selects come from the API.
- Desktop: the table fills the height (a `flex-1` chain); its body scrolls and the pagination stays below it **(owner)**.
- Phone: one shadcn `card` per User, drawn from the same table rows: the email, the Role in each App the User is in, and Created **(owner)**. The table shows from `md` up **(my call)**.
- A row (or card) opens `/<lang>/users/<id>`. The first cell holds a real link, so it works from the keyboard and opens in a new tab **(my call)**.

## The address

- `?search=app:laura role:admin input:isaia&page=2&perPage=50` **(owner: one `search` param holding `field:value` pairs and free text)**.
- `page` and `perPage` follow DiceUI's `useDataTable` keys **(my call)**: the hook already reads and writes them.
- `search` grammar:
  - parts are separated by spaces;
  - `app:<value>` takes an App, `role:<value>` a Role, case-insensitive;
  - `input:<words>` is the free text, matched as a case-insensitive part of the email; a plain word reads as text too, and the page always writes `input:` (owner, 2026-10-22).
- An unknown field or value (`team:x`, `role:boss`) is dropped, never an error. `perPage` outside `25 | 50 | 100`, or `page` below 1, falls back to the default.
- Meaning **(owner)**:
  - `app:laura role:admin` means Admin in Laura, both on the same Membership;
  - `role:admin` alone means Admin in any App;
  - `app:laura` alone means any Membership in Laura;
  - `role:user` matches exactly that Role, never "User or higher" **(owner)**.
- The selects write `app:` and `role:` into `search`, and the text box writes the free text. The text waits about 300ms after the last key before the address changes **(my call)**. Changing any filter sends the view back to page 1 **(my call)**.

## A shared search parser

A generic one, not tied to Users **(owner: "a BE method that accepts fields and arguments")**.

- **In:** a table of fields, each a tuple of allowed values (`{ app: APP_VALUES, role: ROLE_VALUES }`), plus the raw string. Core builds its own `z.enum` from each tuple **(my call, required by CLAUDE.md: a zod schema never crosses a package)**.
- **Out:** a typed object, `{ app?: App; role?: Role; text: string }`.
- **And back:** serialising the object returns the string, so the selects and the text box rewrite `search` through it.
- **Where:** it lives in `@allonfire/core` **(my call)**, so the App (nuqs, on the server and in the browser) and the API clean the string the same way.

## API: the User module

**Where (owner).** A module in `packages/auth`, the **User module** (CONTEXT.md), at `features/users/hono/routes/index.ts`, exporting `userRoutes(deps)`. The API mounts it at `API.PATH.USERS` (`/v1/users`), the way it mounts the Image module. A package never names an App.

**Guard (owner).** Only a User with an Admin Membership in the Back Office may list Users.

- The module takes a required `canListUsers(user)` from its Host and answers the request itself: 401 with no Session, 403 when `canListUsers` refuses (core's `ERROR.CODE`, thrown as `CodedError`).
- The API passes an explicit check: the User's Role in the Back Office (`roleIn`) is Admin (`hasRole(..., Role.ADMIN)`). It is not written through the App's floor (`canEnterApp`), so lowering the Back Office's `minRole` one day never opens the list.

**Routes (my call on paths and shape):**

- `GET /` with `?search=&page=&perPage=` answers `{ users: [{ id, email, createdAt, memberships: [{ app, role }] }], total, pageCount }`.
  - The query runs in the database (a filtered `count` plus `findMany` with `skip` and `take`, ordered by `createdAt desc`).
  - A User with no Membership is listed when neither `app:` nor `role:` is set (owner).
  - A `page` past the last page answers an empty list with the real `total`.
- `GET /filters` answers `{ apps: App[], roles: Role[] }`, the options for the two selects in the order the enums declare them. **Superseded:** the route was dropped; the App draws both lists from the `App` and `Role` enums, which it already imports, so no request is spent on them.

**Code layout.** The routes are documented with `describeRoute` plus zod. The list method lives in the database package as a service (`features/auth/user.service`, imported per file); the module takes it as a dependency, like the Image module.

## The page: server first

- `users/page.tsx` stays a Server Component under `signedInPage`.
- It reads `searchParams` through nuqs's `createSearchParamsCache` (or `createLoader`), with parsers built on the shared parser. That is the sanitising step **(owner asked for it)**.
- It prefetches the list query (the filters query went with `GET /filters`) on a per-request query client (`AOFGetQueryClient`). The calls go to the API with the visitor's cookies (`readVisitorHeaders`).
- It hands the result to the client through `HydrationBoundary`.
- The table is a small `"use client"` component:
  - `useQuery` with the same key, read from the same nuqs params, opens already filled;
  - changing a param fetches in the browser through the typed `hc` client;
  - the previous page stays on screen while the next one loads.
- **States:**
  - loading: DiceUI's skeleton;
  - no match: `AOFEmpty`;
  - an API error: an inline message with a retry.
- **Copy.** Strings go into `en.json` and `it.json`. App names come from their constants, never translations. Role names are translated.

## Server address of the API

A new server-only variable, `API_URL` **(owner)**, holds the API's internal base: `http://api:3300` in Docker, the local address from `@allonfire/config/local/addresses` locally. It goes into:

- the Back Office's env schema and `.env.example`;
- `docker-compose.prod.yml` and `deploy.yml`;
- the local-addresses guard test.

The browser keeps `NEXT_PUBLIC_API_URL`.

## A Section owns the pages under it

`/users/<id>` belongs to the Users Section **(my call; `sections.ts` already notes the switch to a prefix match)**. Three things change:

- the proxy's sign-in gate (`withSignInGate`) matches a Section's path and everything under it, so a signed-out visit to `/users/<id>` is redirected before any page streams;
- `isCurrentSection` matches by prefix, so the sidebar and the breadcrumb mark Users;
- the guard test in `sections.test.ts` accepts a page under a Section's path.

## User placeholder page

`app/[locale]/(signed-in)/users/[id]/page.tsx`:

- under `signedInPage`;
- a breadcrumb back to Users;
- `AOFEmpty` saying the detail is coming.

## Non-goals

- Editing Users or Memberships, and inviting.
- The detail page's content.
- Sorting.
- Searching by name.
- Picking more than one App or Role.
- Infinite scroll.

## Anti-goals

- Filtering or paging on the client over the whole list.
- Any param that throws or answers 400 to a visitor's hand-edited address.
- A non-Admin seeing any User data.

## Constraints

From CLAUDE.md and the aof-design skill:

- AOF wrappers only in `packages/ui`, and `packages/shadcn` written only by the CLI.
- cva and `cn`; corners from `--radius`; tokens from `theme.css`; WCAG AA in both themes.
- No `as` casts except `as const`; object and JSON helpers; constants as one nested object per owner; paths composed, never literals.
- Tests beside their code, with the `@module-tag` header.
- A browser test with MSW for the client table; e2e for the page.
- New dependencies of at least 200k weekly downloads (`@tanstack/react-table`).
- Nothing committed.

## Left to the builder

- The exact wrapper split between DiceUI's files and the AOF components.
- Query key naming.
- The debounce mechanism.
- The skeleton row count.
