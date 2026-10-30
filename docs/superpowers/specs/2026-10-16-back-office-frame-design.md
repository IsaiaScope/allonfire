# Back Office frame: menu, top bar, tab bar, and the first sections

## Intent

The Back Office's signed-in home is a placeholder (the App's name, a line of
copy, Sign out). The owner wants the frame every Back Office page lives in: a
main menu, a top bar and a phone tab bar, with Home and the first two sections
as real, empty pages. The sections' data (the Users list, Storage's files) and
the TanStack Table come later, each with its own plan and its own API.

What the owner said:

- shadcn (`.claude/skills/shadcn`) is the base.
- Before building, check the libraries the owner uses as a list, for
  something already built that fits: Shadcn Studio, Shadcnblocks, React Bits,
  Ui-Layouts, Shadcn UI Kit, Shadcn UI Blocks (shadcnui-blocks), Aceternity UI.
- impeccable, through `/aof-design`, decides how the interface is built.
- The main menu and the bar are decided with the owner.
- Server-side wherever possible; client only where interaction needs it.
- State lives in typed URL params (nuqs, `AOFNuqsAdapter`), read on the
  client, so the pages stay static.
- TanStack Table later.

Success: after Sign in the owner lands on Home inside the frame, moves between
Home, Users and Storage from the sidebar (desktop) or the tab bar (phone),
switches language and theme and signs out from the account menu, and nothing of
a page reaches a visitor the App keeps out.

## Words

The glossary avoids "dashboard", "admin panel" and "console" for the Back
Office. The menu's entries are **Sections** (glossary term, added with this
spec): Home, Users, Storage. Home is the Section a User lands on after Sign
in. Code and copy never say dashboard.

## Decisions

| Question | Decision |
|---|---|
| First screen | The frame plus a nearly empty Home: the App's name and one line, as today; Section tiles wait until the Sections have content |
| Menu entries now | Home, Users, Storage; Users and Storage are real pages with an empty state |
| Desktop navigation | shadcn's sidebar on the left, collapsible to icons |
| Phone navigation | A top bar (the App's name, account button; the page's `h1` names the Section) and a fixed bottom tab bar; no sidebar drawer |
| Account and preferences | One account menu: name and Role in the Back Office (`roleIn`), language, theme, Sign out. Desktop: the sidebar's footer. Phone: the top bar's button. No Settings page |
| Where the frame lives | `(signed-in)/layout.tsx`, static: the same for everyone, no data, no session (ADR 0024) |
| Where pieces come from | shadcn's generated `sidebar.tsx` and the official blocks, wrapped as AOF components; the seven libraries are surveyed and one is used only when the owner picks it from the survey |
| UI state | Typed nuqs params, read on the client; never a cookie the server reads |
| Library pick | Official shadcn, free (MIT): the generated `sidebar` and `dropdown-menu`, laid out after `sidebar-07` and its `nav-user`; the tab bar is built as an AOF component. Paid blocks are out; Shadcn Studio's free tier was looked at and dropped (survey: `2026-10-16-back-office-frame-library-survey.md`) |

## Routes

```
app/[locale]/(signed-in)/
  layout.tsx          the frame (static)
  loading.tsx         existing; now renders inside the frame, in the page area
  page.tsx            Home
  users/page.tsx      Users: empty state
  storage/page.tsx    Storage: empty state
```

Every page keeps `export default withAppSession(Page)`: the Session check runs
before the page renders. The frame renders before the check: it holds no data,
so a visitor with an expired cookie sees the empty frame for a moment and is
redirected; no page reaches them.

## The sections list

One list, owned by the App: `features/navigation/constants/sections.ts`, each
entry a path (the App's typed route), a translation key and a pictogram (lucide
icon). Read by:

- the sidebar and the tab bar, so the two menus never differ;
- the proxy: `withSignInGate` takes the App's signed-in paths as plain
  strings instead of `AppPath` (the values of `AUTH.PAGE`), so the auth package stops naming one
  App's pages. `AUTH.PAGE` keeps what every App shares (Home, Sign in);
- a guard test: every `(signed-in)/**/page.tsx` has its path in the list and
  default-exports through `withAppSession`; the proxy gates every path in the
  list. Forgetting any of the three fails it.

## Session

- `getSession` is wrapped in React `cache`: the page's check and the account
  menu share one API call per request.
- The account menu sits in the layout inside its own `<Suspense>`: a server
  piece reads the Session and passes name and Role (`roleIn` for the App) to
  the client dropdown. For a visitor the App keeps out, the page has already
  redirected.

## Server and client

| Piece | Kind |
|---|---|
| Layout, sidebar contents, top bar, tab bar, pages, empty states | Server |
| Sidebar open or collapsed | Client: shadcn's `SidebarProvider`, controlled by a typed nuqs param (`parseAsBoolean`, default open, cleared when default). The generated provider still writes its cookie; nothing reads it |
| The active link | Client leaf: the App's i18n `Link` plus `usePathname`, `aria-current="page"` |
| Account menu | Client leaf (dropdown); name, Role, language links (`getPathname`) and the Sign out form come from the server |

The layout stays mounted across navigations, so the sidebar keeps its state
without the links carrying the param; the param matters on a reload or a
shared link. The same rule holds later for the table: filters, sort and page
are typed nuqs params.

## Components

AOF components in `packages/ui`, each composing shadcn and tested:

| Component | Composes | Notes |
|---|---|---|
| `AOFSidebar` and its parts (header, content, group, item, footer) | `sidebar.tsx` | Desktop only (`md:`); takes `open` and `onOpenChange` |
| `AOFTabBar` | links | Phone only, fixed at the bottom, iOS safe area, server |
| `AOFEmpty` | `empty.tsx` | Users and Storage |
| `AOFDropdownMenu` and the parts the account menu needs | `dropdown-menu.tsx` | Client |

In the App, `features/navigation/`: `constants/sections.ts`,
`constants/search-params.ts` (the typed nuqs parsers),
`components/app-frame.tsx` (server), `components/nav-link.tsx` (client leaf),
`components/account.tsx` (server, reads the Session) and
`components/account-menu.tsx` (client leaf). A missing shadcn component is
added with the CLI from `apps/back-office`, then canonicalized; `packages/shadcn`
is never edited by hand.

## The /aof-design step

1. **Library survey.** One entry per source: official shadcn and the seven
   above. For each: its dashboard, sidebar and navbar blocks, Radix or Base UI,
   free or paid, how it installs (shadcn registry namespace or copy), and its
   fit with the owner's taste (restraint, motion only when it means something).
   Saved as `docs/superpowers/specs/2026-10-16-back-office-frame-library-survey.md`.
   The owner picks from it; nothing is installed before. A Radix block goes
   through `migrate-radix-to-base`.
2. **Japan direction.** Two or three previews of how the frame wears the Japan
   Design (for example the sidebar as a line map with the sections as
   stations, the tabs as platform signs). The owner picks one.
3. **Build** in the App, then one screenshot round: phone 390 and desktop,
   dark and light. Fix what it shows, stop.

## Not in this plan

- The Users list, Memberships, Sessions, Storage's files and their API.
- TanStack Table.
- Remembering the sidebar's state across reloads without the param.
- A Settings page.

## Metadata

A signed-in page's `generateMetadata` runs outside `withAppSession`, so it
stays static: a title from translations and `pageOpenGraph`, never data read
at request time.

## Testing

- Unit: the guard test (sections, pages, `withAppSession`, proxy); the
  sections list; `withSignInGate` with App paths; `getSession` asks the API
  once per request.
- Render tests for every new AOF component and for the App's Home, Users and
  Storage pages.
- Browser test: the account menu opens, moves by keyboard, closes on Escape,
  returns focus.
- e2e on all four projects: Home to Users to Storage (sidebar on desktop, tab
  bar on phone), the active section is marked, switching language stays on the
  section, Sign out from the account menu, a signed-out visit to `/users` goes
  to Sign in.
