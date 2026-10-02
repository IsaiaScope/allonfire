---
name: aof-design
description: >
  The only way to design, build or edit an AllOnFire page. Wraps impeccable
  (every command: craft, shape, critique, audit, polish, live, colorize,
  typeset, layout, harden, document, init and the rest) in two modes:
  prototype (a draft page in packages/design, promoted into the App once
  approved) and direct (build or edit the page straight in its App). Use when
  asked to design, redesign, build, style, polish, critique or audit any App
  page or component, to create a Design ("new"), or when the user types
  /aof-design. Never run plain /impeccable in this repo.
---

# aof-design

Every real component lives in an App (or in `@allonfire/ui` when generic);
`packages/design` holds only what Apps share visually, impeccable's context
and prototypes (ADR 0011, ADR 0014):

```
apps/<app>/src/features/<topic>/components/   the real interface, tests in tests/
apps/<app>/src/app/[locale]/<route>/page.tsx  routes, fetches, renders it

packages/design/
  .impeccable/                  impeccable state (config.json, surfaces/ tracked)
  src/designs/<name>/           a Design: DESIGN.md, DESIGN.json, theme.css,
                                fonts/ (no components)
  src/apps/<app>/               PRODUCT.md (source), DESIGN.md + DESIGN.json
                                (generated copies of the worn Design),
                                styles.css (the App's one stylesheet),
                                prototypes/ (drafts under review only)
```

Invocation: `/aof-design <command> [target] [--app <app>] [--prototype]`,
where `<command>` is any impeccable command, or `new`.

## Two modes

- **Direct** (the default): build or edit the page in its App. Use it for any
  change to an existing page and for a new page whose direction is already
  clear. The target is the App file itself.
- **Prototype** (`--prototype`, or when the owner asks to try a look first, or
  a new page needs a visual direction chosen): impeccable builds a draft in
  `packages/design/src/apps/<app>/prototypes/<route>.tsx`, the App page
  renders it while it is reviewed, and once the owner approves it is promoted
  (step 6) and deleted. Nothing ships from `prototypes/`.

Ask only when the request leaves the mode genuinely open; a fix, polish or
tweak is always direct.

## Every impeccable command

1. **App.** From `target` when it is under `apps/<app>/` or
   `packages/design/src/apps/<app>/`; else `--app`; else the only folder under
   `packages/design/src/apps/`. Ambiguous: ask which App.
2. **Design.** Read `packages/design/src/apps/<app>/styles.css` for
   `@import "../../designs/<name>/theme.css"`. None: stop and say
   `/aof-design new <name> --app <app>` comes first.
3. **Sync in.** `pnpm design:sync --check` first. If it lists this App's own
   `DESIGN.md` or `DESIGN.json`, the App copy holds edits that were never
   synced out (an earlier run stopped before step 8): a plain sync would
   overwrite them. Show the user the diff against the Design's source and ask
   whether to keep them (`pnpm design:sync --from <app>`) or discard them.
   Then `pnpm design:sync`. If either command throws about a shadowing
   `PRODUCT.md`/`DESIGN.md` or `.impeccable/design.json`, move that file as the
   message says before anything else.
4. **Target.**
   - Direct: the App file. A route's interface beyond a few lines lives in a
     feature component, `apps/<app>/src/features/<topic>/components/<name>.tsx`
     (the Sign in page is `features/auth/components/sign-in.tsx`, export
     `SignIn`); its page only adds metadata and renders it. A trivial page
     (home placeholder, error, not found) keeps its markup in the page. A new
     page gets its component file first.
   - Prototype: `packages/design/src/apps/<app>/prototypes/<route>.tsx`, one
     named export, text inline or as props (it never imports next-intl or
     `next/*`). Point the App page at it through
     `@allonfire/design/apps/<app>/prototypes/<route>` for the review.
5. **Hand off.** Invoke the `impeccable` skill with the command and
   `--target <path>`. Run **every** impeccable launcher command with
   `IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/<app>` in front, for
   example
   `IMPECCABLE_CONTEXT_DIR=packages/design/src/apps/back-office .claude/skills/impeccable/scripts/impeccable context --target apps/back-office/src/features/auth/components/sign-in.tsx`.
   With an App target impeccable still reads PRODUCT.md and DESIGN.md from
   the package (checked 2026-10-02, impeccable 4.3.1) and writes any state it
   creates under `apps/<app>/.impeccable/`, which is gitignored. Give
   impeccable the repo rules and the owner's taste below before the command.
6. **Wire and promote.**
   - New strings go into the App's `src/features/i18n/translations/en.json`
     and `it.json` (run `pnpm i18n:check`); components read them with
     `useTranslations` (Server Components too) or `getTranslations` in an
     async page.
   - Promoting an approved prototype: move it to the App's feature component,
     replace its inline text or copy props with `useTranslations`, its slots
     with the App's own elements (`next/image`, the i18n `Link`, AOF
     components), move its test, point the page at the component and delete
     the prototype and its export use. A piece the App's other features
     would reuse goes to `apps/<app>/src/shared/components/`; one every App
     would reuse becomes an AOF component in `packages/ui`. Never into
     `packages/design`.
7. **Tokens.** If `packages/design/src/designs/<name>/theme.css` changed, run
   impeccable `document` in scan mode against the App folder (same env and
   target rules) so the App's `DESIGN.md`/`DESIGN.json` describe the new
   tokens. `theme.css` wins whenever the two disagree.
8. **Sync out.** If impeccable wrote `packages/design/.impeccable/design.json`,
   move it to `packages/design/src/apps/<app>/DESIGN.json`. impeccable 4.3.1
   calls the App-folder sidecar a legacy path (`design-sidecar-legacy-path`)
   and asks to move it into `.impeccable/`: expected here, never act on it.
   That `.impeccable/` is the package's, shared by every App, while a Design's
   sidecar belongs to the Apps wearing it (ADR 0011). Then, if the App's
   `DESIGN.md` or `DESIGN.json` changed, `pnpm design:sync --from <app>` and
   report which other Apps now carry the change.
9. **Cleanup.** After `live`, run
   `.claude/skills/impeccable/scripts/impeccable live-server stop`. After any
   run, delete `apps/<app>/.impeccable/`, `apps/<app>/PRODUCT.md`,
   `apps/<app>/DESIGN.md` and the repo root's `.impeccable/` if the session
   left them. All are gitignored; impeccable's tracked state stays in
   `packages/design`.
10. **Check.** `pnpm design:sync --check`, then
    `pnpm --filter @allonfire/design test`, the App's tests
    (`pnpm --filter <app> test`), its `tsc --noEmit`, and
    `pnpm exec biome check --write` on the files the run touched.

## live

Live mode needs the App's dev server, resolves its root from `next.config`,
and reads `PRODUCT.md`/`DESIGN.md` only by walking up from the App, ignoring
`IMPECCABLE_CONTEXT_DIR` (checked 2026-09-30 on impeccable 4.3.1:
`"error": "context_missing"` with the env var set). So, for the session only:

1. Copy `packages/design/src/apps/<app>/PRODUCT.md` and `DESIGN.md` into
   `apps/<app>/`, and `DESIGN.json` to `apps/<app>/.impeccable/design.json`.
   All three paths are gitignored.
2. Start the App's dev server, then boot with
   `impeccable live --target apps/<app>/src/app/[locale]/<route>/page.tsx`.
3. The first boot answers `"error": "config_missing"`: follow impeccable's
   live setup (`reference/live-setup.md`). It writes
   `apps/<app>/.impeccable/live/config.json` and may ask to extend the App's
   CSP in `next.config.ts`; show the user that diff and ask before applying it,
   since it is a real change to the App.
4. Accepted variants land where `pageFiles` points. If that is the page and
   the route has a feature component, move the accepted markup into the
   component and put the page back to render it before cleanup.
5. Run step 9 (cleanup), then steps 7, 8 and 10.

## Repo rules to hand impeccable

- Tokens change only in `packages/design/src/designs/<name>/theme.css`
  (`:root`, `.dark`, `@theme inline` on shadcn's variable names:
  `--background`, `--foreground`, `--primary`, `--muted`, `--radius`, ...).
  Never in an App's CSS, never as raw values in a component's classes.
- A page's interface lives in its App's feature component (step 4), one named
  export named for what it is (`SignIn`, never `SignInScreen`), with a render
  test in the feature's `components/tests/` wrapped in `NextIntlClientProvider`
  with the App's `en.json` (next/image mocked). Server Component unless it
  needs state, effects or event handlers; then `"use client"` on the smallest
  part, ideally an AOF component passed in or imported as a leaf.
- Components come from `@allonfire/ui/components/aof-*` (AOF components) or
  the App itself (the Back office's departure board, hanko and tactile strip
  sit in `features/auth/components/`). A missing AOF component is created in
  `packages/ui/src/components/aof-<name>.tsx` with a test, composing shadcn
  components. Never import `@allonfire/shadcn` outside `packages/ui`, never
  edit `packages/shadcn`: a missing primitive is `npx shadcn@4.21.0 add <name>`
  from `apps/back-office`, then `pnpm --filter @allonfire/shadcn canonicalize`.
- Mobile-first. Every image carries width and height (a static import gives
  both). Framer Motion for anything beyond a CSS transition.

## Owner's taste

Learned while designing the Back office Sign in (2026-10). Hand these to
impeccable with the repo rules, and hold every result to them.

**Budget.** One build pass, then one screenshot round (phone 390 wide and
desktop, dark and light), fix what it shows, stop. No finish-reviewer or
critique subagent loops unless the owner asks: open-ended review rounds were
called out as spending too much. Small change, small check.

**Checking in a browser.** Through `/iso-browser`, attached to a window the
owner already has open: never a new window, tab or isolated context. Before
starting a dev server, check its port (`lsof -iTCP:<port> -sTCP:LISTEN`); if
it listens, the owner's server is running, so use it and never stop it. Stop
only a server this run started, by its own task or PID, never with
`pkill -f`.

**Restraint.**
- A page does one job; on a Sign in or form page the form is the focal point,
  centred on a phone. Strip everything that does not serve it.
- No heavy decoration: no large SVG illustrations (a drawn train was
  rejected), no big signage blocks, no blur or brightness filters. They read
  as overkill and made the page lag.
- Never invent content: no other Apps, transfers or cross-links on a page
  that does not need them, no copy pairs in two languages beside each field.
- Names are exact: "Back office" is the App, "AllOnFire" is the repository,
  not a brand.

**Motion.** A little, never a show. CSS only (tw-animate-css or a keyframe
token in `theme.css`), each animation short (300 to 700ms), played once on
entry or on a state change, and every one behind `motion-safe:`. Continuous
motion is allowed only where it carries meaning (a departure board's running
notice) and then ships a pause control that works without a mouse and stops
for reduced motion (WCAG 2.2.2).

**Japan Design (Back office).** Tokyo station at night, used with taste:
- Desktop: the photograph on the left, the yellow tactile-paving strip as
  the vertical separator, the form centred in its own column (about 32rem).
- Phone: the photograph full-bleed under a scrim, the departure board on
  top, the form centred.
- The LED departure board (amber, DotGothic16, running notice with a
  pause button) is centred over the photograph.
- The form card is headed like a station sign: a black band with the App's
  line-colour pictogram tile, the App name as the `h1`, and a vermilion hanko
  seal.
- Each field opens on a black pictogram tile; it stays black on focus (the
  field's own focus ring is enough).
- Station furniture stays night in both themes through a scoped `.dark`.
- Language and theme controls share one capsule: bottom right on a phone,
  bottom left of the form column on desktop.

**Server-first, client at the leaf.** Pages and their components stay Server
Components. When
interactivity is unavoidable it is one small `"use client"` AOF component
passed in as a slot (the theme toggle). Prefer a native control when it does
the job: language switching is plain links built with
`getPathname({ forcePrefix: true })`, a pause control is a CSS-driven
checkbox. Ask before adding client code to anything else.

**Components.** Interactive elements compose shadcn through AOF components,
never a hand-rolled `<button>` or widget: shadcn here is `base-nova`, built on
Base UI, so focus, keyboard and ARIA come from it (`AOFThemeToggle` is a ghost
icon `AOFButton`). Native elements stay native where they are the right
semantics (links for navigation, a checkbox for a pause). Visual states are
`cva` variants (`class-variance-authority`), not ternaries of class strings,
and classes are joined with `cn` from `@allonfire/ui/lib/utils`, never a
template string (`cn` lets a caller's `className` override a default). A
component's props extend the element or component it renders
(`ComponentProps<"div">`, or `ComponentPropsWithoutChildren<...>` from
`@allonfire/ui/lib/types` when it draws its own content), spread the rest onto
it, and expose its variants through `VariantProps`: see
`features/auth/components/hanko.tsx` and `AOFThemeToggle`. Every page frames itself
with `AOFPage` (`layout`: `stack`, `split` or `centered`; `as` for
`section`/`article`), and page-level controls sit in an `AOFControlBar`.

**Corners.** Every corner comes from the Design's `--radius` (Japan:
0.25rem) through `rounded-sm`/`md`/`lg`/`xl`; nested shapes step down a size
(bar `rounded-lg`, controls inside `rounded-md`). No `rounded-full` and no
arbitrary radius, except for something round in the world it depicts (the
hanko seal).

**Both themes, WCAG 2.0 AA at least.** Every page works in light and dark;
each new text-on-surface pair goes into the Design's `theme.test.ts`.
Interactive elements get a visible focus ring. Decorative Japanese stays
`aria-hidden` with `lang="ja"`; the App's `<html>` carries `translate="no"`
since every language is shipped. A form validated by the browser shows its bubble in the browser's UI
language, not the page's: server-validated forms set `noValidate`.

**Auth is shared.** All auth logic lives in `@allonfire/auth/features/next/*`
for every App: the `signIn`/`signOut` server actions, `requireAppSession` for
pages and `withSessionRefresh` for the proxy. An App sets `AUTH_APP` in its
env and keeps only its components, styles and translations.

**Forms.** Next's pattern (forms guide, "Validation errors"): the action
and every check live on the server; the component that defines the `<form>`
is a small client leaf holding `useActionState` (the error, the pending
flag), so the page stays mounted and works before hydration. Never send an
error back through the URL (`?error=`): the page segment is keyed by its
search params, so every attempt remounts the page and replays its entrance
animations. Server-checked fields set `noValidate`. A complex form uses
TanStack Form.

**Layout traps seen.** A `w-max` element (a marquee) inside a flex child
needs `min-w-0` on that child, or it pushes the page wider than the
viewport. Buttons need `cursor-pointer` (`AOFButton` adds it). A custom
`@utility` must not start with a Tailwind group prefix (`bg-`, `text-`,
`border-`...): `cn`'s tailwind-merge reads it as that group and drops it
beside the element's real one (Japan's dot grids are `pattern-led-grid`,
`pattern-tactile-dots`).

## new <name> --app <app>

1. Create `packages/design/src/designs/<name>/`. If
   `packages/design/src/apps/<app>/` is missing, the App is new to the
   package; wire it:
   - `packages/design/src/apps/<app>/styles.css` importing
     `@allonfire/ui/styles/base.css` and `@source "./prototypes";`;
   - two export lines in `packages/design/package.json`:
     `"./apps/<app>/prototypes/*": "./src/apps/<app>/prototypes/*.tsx"`,
     `"./apps/<app>/styles.css": "./src/apps/<app>/styles.css"`;
   - in the App: `"@allonfire/design": "workspace:*"` in `package.json`,
     `@allonfire/design` in `next.config.ts` `transpilePackages`, and
     `globals.css` reduced to
     `@import "@allonfire/design/apps/<app>/styles.css";` plus its own
     `@source "../";`; then `pnpm install`.
2. If the App folder has no `PRODUCT.md`, or it is a placeholder, run
   impeccable `init` there (env and target rules above).
3. Run impeccable's `document` seed flow for the App (new-work's world round,
   then the surface brief). Seed mode writes `DESIGN.md` with frontmatter
   `name` and `description` only, and no `DESIGN.json`; write that seed as
   `packages/design/src/designs/<name>/DESIGN.md` (the source), not the App
   copy.
4. Write `packages/design/src/designs/<name>/theme.css` from the chosen
   direction's palette and rules (the decision card and `DESIGN.md`'s Colors
   prose), mapped onto shadcn's variables in `:root` and `.dark`, plus
   `@theme inline` for any token shadcn has no variable for. Keep every text
   pair at WCAG AA: `src/designs/<name>/tests/theme.test.ts` checks them
   (copy Japan's test for a new Design).
5. Add `@import "../../designs/<name>/theme.css";` to the App's `styles.css`
   after the base import, then `pnpm design:sync`.
6. Once a page is built in the Design, run step 7's `document` scan so the
   real tokens land in the frontmatter and `DESIGN.json` exists.

Wearing a different Design is changing that one import, then
`pnpm design:sync`.
