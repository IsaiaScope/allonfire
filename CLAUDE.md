# AllOnFire — Claude Code Rules

## Server-Side Rendering First

Default to Server Components. Only add `"use client"` when the component actually needs:

- React hooks (`useState`, `useEffect`, `useTransition`, `useForm`, etc.)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `localStorage`, `navigator`)
- Third-party client libraries (`useTheme`, `usePathname`, context providers)

**Do not** add `"use client"` to pure presentational components that just receive props and render JSX — they work as Server Components with zero client JS cost.

**Pragmatic rule**: if making something server-side requires significantly more complexity (extra data-fetching layers, prop-drilling through many levels, splitting one simple component into server/client pairs), just use `"use client"`. Simplicity wins over purity.

### Patterns

- Fetch data in Server Components (pages, layouts), pass as props to client components
- Use Server Actions for mutations — keep form logic in client components but action definitions server-side
- Use `initialData` pattern with TanStack Query: server-fetch in page, hydrate in client component
- Providers must be client: an App composes the AOF providers from `@allonfire/core/features/next/providers/*` one by one in its `[locale]/layout.tsx` (ADR 0012), never a single all-in-one `Providers` component
- Page information (the `<head>`, icons, link previews, iOS launch screens) comes from `@allonfire/core/features/next/metadata/*` and core's `METADATA` (`features/metadata/constants/metadata`: Indexing, the metadata paths, the icon sizes, the logo variants, the iOS launch devices). An App's Indexing lives in `ACCESS.APP_SETTINGS`; its own values in one object (`BACK_OFFICE`, `src/shared/constants/back-office`). In the Back Office:
  - the layout spreads `baseMetadata(locale)`; a page adds only `title`, `description` and `openGraph: pageOpenGraph(path, locale)` (`features/metadata/utils`), never `openGraph` or `robots` by hand: Next replaces them whole, and `"./"` as `og:url` resolves to `/en/...`, not the public path
  - a URL no language owns (one with a dot, `/api/...`) gets the localized 404 through `AOFWithLocalizedNotFound` in `next.config.ts`; core's own routes (launch screens, manifest icons, logos) are kept already; any other dynamic route outside `[locale]` goes in its `keep` list. A path is matched case-sensitively, so `/IT/x.png` gets the 404 too. There is no `global-not-found`: under a top-level `[locale]` every URL matches a route. A 404's HTML, in dev and production alike, is Next's empty `__next_error__` shell (status 404, `noindex`): with Cache Components a `notFound()` at request time comes before any shell, and the browser renders `not-found.tsx` from the RSC payload. Expected; a test reading the raw HTML finds no title
  - a signed-in page is `export default signedInPage(Page)` (`features/navigation/utils/signed-in-page`): `withAppSession(Page, <SectionLoading />)` from `@allonfire/auth/features/next/components/with-app-session`, Next's auth-with-Cache-Components pattern. The Session check (`requireAppSession`) runs beside the page behind its own `<Suspense fallback={null}>`, so a page with no request-time data of its own is in the static shell and paints at once; a visitor the App keeps out is redirected at request time and may see that static frame first, never its data: the API checks every request itself. The check is `use cache: private` (the browser keeps a passed one for `AUTH.SESSION.PAGE_CHECK_STALE_S`, 30 minutes; a redirect is never kept). The page itself sits in its own `<Suspense>` (the loading screen as its fallback) for its request-time data: a route group's `loading.tsx` sits above where sibling pages diverge, so a soft navigation between them would block. Its `generateMetadata` stays static (translations and `pageOpenGraph`, never request-time data)
  - a page left is hidden in React's `<Activity>`, not unmounted, and keeps its state: a form that adds something is wrapped in ui's `AOFFreshOnReturn` (`components/aof-fresh-on-return`), which remounts it when its page is hidden, so it opens empty every visit (no password kept in a hidden page); a filter or a draft worth keeping is left alone
  - Sign in sends someone the App already lets in Home: the proxy's `withSignInGate` asks the API (the real Session check, `entersApp`) on a visit to Sign in that carries a Session cookie and answers 307 to Home before any HTML; never the cookie alone, since a cookie the API refuses would bounce between Home and Sign in. A signed-out visit asks nothing
  - the signed-in frame is `(signed-in)/layout.tsx` (ADR 0024), shadcn's `sidebar-07` (`features/navigation/components/app-frame`: a sidebar collapsing to icons, a drawer on a phone, no tab bar; the App switcher over `enterableApps`, each App's address from the env, `LAURA_URL` optional; the account menu; a breadcrumb header): static, drawn from the App's Sections (`features/navigation/constants/sections`, an explicit tuple: Biome sorts object keys), which the proxy's sign-in gate and a guard test also read. A new Section is one row there plus its page; its UI state is a typed nuqs param read on the client, never a cookie the server reads
  - a Section's page is `SectionPage` (`features/navigation/components/section-page`): `width="full"` (the default) for a list or a table, `width="form"` for a form (centred, capped at `max-w-4xl`, a container: its layout switches on its own width, `@2xl:` for two columns, never on the screen's, since the sidebar decides how much room the page has)
  - no `loading.tsx` under `[locale]`: above the catch-all it turns every 404 into a 200
  - the logo is the Brand's (`@allonfire/design/brand/aof-logo`), given `BACK_OFFICE.LOGO` (name, banner, face). As SVG it is `aofLogoSvg`: the favicon in `auto`, `/logo/<layout>-<scheme>.svg` through core's `AOFLogoRoute` for a file other sites link to, and `aofLogoDataUrl` for a page's own logo (`AOFImage` with a data URL: painted with the HTML, no request of its own). In an `ImageResponse` it is ui's `AOFBrandLogo` (`components/aof-brand-logo`)
  - icons go through core's `AOFIconImage` and `AOFManifestIconRoute`; launch screens through `AOFLaunchScreenRoute`, where the App says only how its mark looks per color scheme (ground, mark, fonts)
  - the preview card is ui's `AOFShareCard` dressed in the Japan Design's `JAPAN_SHARE_CARD` (`designs/japan/share-card-look`: colours, image face, tactile edge), with `BACK_OFFICE.LINE` as its band
  - fonts for generated images come from `imageFonts()` (`features/metadata/utils/image-fonts`): `loadJapanImageFonts` under `"use cache"` and `cacheLife("max")`. A shorter life re-renders every prerendered image when it runs out
  - the viewport is core's `AOFBaseViewport({ schemeColors })` (`features/next/metadata/aof-base-viewport`: both colour schemes, a theme colour per scheme from the App's ground, and `viewport-fit=cover`, without which iOS reports every safe-area inset as 0); a page keeps to ui base.css's edges, `--gutter-top/right/bottom/left` (the larger of `--page-gutter`, 1.5rem, and that side's inset): every `AOFPage` pads itself to them by default (`edges="safe"`; `edges="none"` for a page drawn to the screen's edges; override one side, `pb-24`, never the whole `p-*`, which drops them all), a fixed control sits at `bottom-(--gutter-bottom)`, `AOFToaster` offsets toasts by them; the body is never padded
  - the PWA comes from core's `features/next/pwa` (ADR 0023): the App's `build` runs `pwa:build` after `next build`, writing `public/sw.js` (gitignored, a turbo build output; Workbox: Next's static files and each language's Offline page precached, page loads network only with the Offline page as fallback, nothing else cached); the layout wraps its pages in core's `AOFPwa` (`enabled` in production only), handing it the App's own `hint` and `banner`, which send toasts drawn in its Design through ui's `AOFToaster` (shadcn's Sonner, mounted once in the layout; ids in `PWA.TOAST`), sent from a client component with `useAOFToast(id, content | null, options)` (`@allonfire/ui/lib/use-aof-toast`: a frame late, since a toast sent before the toaster hydrates is lost, and dismissing only what it sent) (`features/pwa/components/install-hint` and `offline-banner`: the hint a toast at the bottom, from `useInstallHint`: an Install button opening the browser's dialog (`beforeinstallprompt`, held by core from page load) where offered, else iPhone's or macOS Safari's steps, never on a first visit; the offline notice a red toast centred at the top; the manifest is `display: "standalone"` (ADR 0025); the banner shown while `useOffline`), and it registers the worker; an e2e test Playwright drives in Chromium only takes `E2E_TAG.CHROMIUM_ONLY` (`@allonfire/config/tests/e2e/run`); the Offline page is `[locale]/offline`, which the proxy skips at `/<lang>/offline` so the precache meets no redirect

## Context7 Usage

Always use Context7 MCP tools when generating code involving:

- Next.js, React, Prisma, BetterAuth, shadcn/ui, TanStack Query, Zustand
- Resolve library ID first, then query docs

For Next.js, read the docs that ship with the installed version first:
`packages/core/node_modules/next/dist/docs/` (`01-app`, `02-pages`,
`03-architecture`, `index.md`). They match the exact `next` in the lockfile,
so they never describe an option this version lacks. Use Context7 when they
do not cover the question.

Before implementing anything in Next.js, React or shadcn, check the Framework
skills (see Agent skills) for a guide that covers it and follow it: `shadcn` for
components, `vercel-react-best-practices` and `vercel-composition-patterns` for
React, the `next-*` skills for caching, prefetching and the dev loop.

## Object Helpers (`@allonfire/core/shared/utils/object`)

Never call `Object.keys` / `values` / `entries` / `fromEntries` directly. Use
`objectKeys`, `objectValues`, `objectEntries`, `objectFromEntries` — the
standard versions are typed loosely (a value may carry properties its type does
not declare) and each call site was ending in an `as` to recover the literal
type. `objectFromEntries` is the one that matters: `Object.fromEntries` returns
`{ [k: string]: V }`, so `as Record<Union, V>` at the call site is unchecked and
compiles against entries covering none of the union.

The type-level counterparts live in the same file and mean the same thing one
level up: `KeyOf<T>`, `ValueOf<T>`, `EntryOf<T>`, plus `ElementOf<T>` for a
`readonly [...] as const` tuple (`ValueOf` on a tuple would also pick up
`length`, `map` and the rest of the array prototype).

## JSON Helpers (`@allonfire/core/shared/utils/json`)

Never call `JSON.parse` / `JSON.stringify` directly. `JSON.parse` returns
`any`, so a typo on the result compiles; `JSON.stringify` takes anything, so
`undefined`, a function or a `Date` compiles and comes out as nothing or as a
string the reader does not expect. Every helper is generic, so the types
carry through: `stringifyJson(value)` (`value: T & Json<T>` rejects any part
that is not JSON, at any depth, interfaces included) returns `JsonText<T>`, and
`parseJson(text)` reads that `T` back on its own; on any other string it is
`unknown`, or the `T` passed as `parseJson<T>` (a claim, not a check).
`parseJsonWith(text, schema)` parses and validates text from outside;
`jsonFrom<T>(message)` is the zod step for a field that holds JSON text.

## Storage Helpers (`@allonfire/core/shared/utils/storage`)

Never touch `localStorage` / `sessionStorage` directly outside a test (which may clear them). `storageItem(key,
schema, area?)` keeps one value as JSON, typed by its zod schema both ways:
`write` takes the schema's type (and only JSON, through `stringifyJson`),
`read` gives it back checked, or `null`. The globals are loose and they
throw: a private window or a full quota refuses, and with site data blocked
merely reading `window.localStorage` throws. Every call is guarded, so what
is kept there is a convenience a visitor can lose, never state that must
survive. A schema crosses no package: a package's `storageItem` takes its own zod's schema (the Apps and core can resolve different zod versions, and tsc runs out of memory comparing them), so a test seeds a value through the owner's function (`firstLoad()`), never its own `storageItem`.

## Forms (`@allonfire/ui/lib/form`)

Every form with fields is an AOF form (ADR 0017): `useAOFForm` manages its
fields, never bare `useForm`, and never `@tanstack/react-form` outside
`packages/ui` (Biome enforces it). Only the form is a client component; the
page stays on the server. The server action keeps the last word:

- `useActionState(action, initialState)` holds the action's answer and the
  pending flag; the action returns its own state, never TanStack form state.
- `useAOFForm({ defaultValues, validators: { onChange: schema } })`; a
  submit runs the `onChange` validators too.
- `<form action={action} noValidate onSubmit={submit}>`, where `submit` is
  `(event) => submitAOFForm(form, event, formDataTo(action))` from
  `@allonfire/ui/lib/form-submit`: it stops the browser's post; when the
  checks pass it sends the form's own controls to the action in a transition,
  the same data a post before hydration sends; when they block it focuses the
  first invalid field; a validator that throws is reported. Before hydration
  the browser posts to the action. See
  `apps/back-office/src/features/auth/components/sign-in-form.tsx`.
- Fields render through `form.AppField` and `field.TextField` (one look in
  every form: tall, a bold label, its `icon` on a dark tile), which sets `name`, adopts a value typed or
  autofilled before hydration, and shows errors (not a live region) once the
  field is left or a submit was tried, in a line kept free so nothing moves.
  `invalid` marks a field the server refused. `AOFSubmitButton` takes
  `pending`.
- One rhythm in every form: 8px from a label to its control, 32px between
  blocks. A field leaves its 32px itself (the gap and its error line), so the
  form adds no gap after a field; any other block (a list, a fieldset)
  takes `mt-8`. A form's buttons are `size="field"` (44px, a field's height)
  in a last row of `mt-auto pt-2` (8px under the form's alert): the form fills the Section (`flex-1`), so
  a short form keeps its buttons at the bottom. The form's `FormAlert`
  (`shared/components/form-alert`), why the last submit failed, boxed, ends
  the form 16px after its last block (`mt-4`), right above the button where the form
  has no row of its own (Sign in), in a place kept whether or not it
  says anything (always the box's height on two lines; a longer message stops at two with an ellipsis), so its message
  moves nothing.
- The zod schema with translated messages is built in the form; it repeats
  the action's rules, and the action's copy is the one that counts.

A form without fields (Sign out) stays a plain `<form action>`. Laura keeps
`react-hook-form` until it is rebuilt.

## Database Schema Quick Reference

Schema folder: `packages/database/prisma/schema/` (`schema.prisma`, `auth.prisma`, `image.prisma`, and one file per App under `apps/`: `apps/laura.prisma`). An App's services live in `src/features/apps/<app>/`. The seed (`src/features/seed/`, `pnpm db:seed`) writes only the real Admin (`DATABASE_SEED_ADMIN_*`), Admin in every App: Local holds what Production holds. The Fixtures (`src/features/seed/fixtures/`: `FIXTURE.USER`, `FIXTURE.PASSWORD`, `FIXTURE.IMAGE`) go only into the Test template; `pnpm --filter @allonfire/storage image:setup` gives the Local `image` bucket what Production's `storage-setup` gives it (the bucket and its policy, no Images).
Changelog: `packages/database/changelog/changesets/` — Liquibase owns every change (ADR 0008).

- **`auth` schema (shared):** `User`, `Membership`, `Session`, `Account`, `Verification`, enums `Role`, `App`
- **`image` schema (shared):** `Image` and `ImageApp`: the Images every App shows, each placed in one or more Apps, public or private in each (ADR 0013, ADR 0020)
- **`laura` schema:** `GameScore`, enum `GameType`
- Change a model: edit the `.prisma` file, `pnpm db:changeset <name>`, review the SQL, `pnpm db:update`, `pnpm db:drift`. Never `prisma db push` or `prisma migrate`. Never edit an applied changeset.
- Services import per file: `@allonfire/database/features/image/image.service`, `@allonfire/database/features/apps/laura/game-score.service`, `@allonfire/database/features/auth/user.service` (`listUsers`, `createUser(user, hashedPassword)`: the User, a `credential` Account and their Memberships in one transaction, the email lowercased, a taken one `EmailTakenError`; `deleteUsers(ids)`: the cascades remove Memberships, Sessions, Accounts and Laura scores, Images keep with no uploader; `accessUserById(id)`: Memberships read now, never a cached Session's); the root exports only `prisma` and generated types. Enum values (`Role.VIEWER`, `App.LAURA`) come from `@allonfire/database/enums`; never copy an enum into a constant. A User's Role is per App, one `Membership` row per User and App (ADR 0019). Every rule about them lives beside them in `@allonfire/database/features/auth/access`: the schemas (`roleSchema`, `appSchema`, `App`), `ACCESS.ROLE_RANK`, `ACCESS.APP_SETTINGS` and `AppSettings` (`constants/access` and `constants/app-settings`: each App's `minRole`, `registration` and `indexing`), `AccessUser`, and `hasRole`, `roleIn`, `hasRoleIn(user, app, min)` (at least `min` in that App), `canEnterApp(user, app)` (a Membership in the App whose Role reaches its floor), `entryRoles(app)` (the Roles that reach its floor, what a form offers), `ImageLink`, `canSeeImage(user, links)` (a placement public, or in an App the User enters; `user` null for a visitor), `canManageImage(user, app)` (Admin in that App), `canManageEverywhere(user, links)` (Admin in every App the Image is in), `enterableApps(user)`, `accessUserFrom` (Memberships read as strings, narrowed). Never `z.enum(Role)` or a Role check by hand; an App declares its floor and Registration only in `ACCESS.APP_SETTINGS`.
- Adding an App to `App`: its changeset also inserts an `ADMIN` Membership in it for every Back Office Admin (`INSERT INTO auth."Membership" ("userId", app, role) SELECT "userId", '<new>', 'ADMIN' FROM auth."Membership" WHERE app = 'back-office' AND role = 'ADMIN'`), and the App gets its row in `ACCESS.APP_SETTINGS`.
- Raw SQL names the schema: `image."Image"`.
- Liquibase runs only in Docker (the `db-migrate` image, `packages/database/liquibase/`); Production runs `backup` then `deploy` before the Apps start.

## Laura App Structure (`apps/laura/src/`)

Family photo gallery and games app. Uses next-intl for i18n (Italian + English), Framer Motion for animations, and a viewer role system (`UserRoleProvider` + `checkMutationAccess`).

### Route Layer (`app/[locale]/`)

All routes are nested under `[locale]` for i18n. Dashboard pages are async Server Components.

```
app/[locale]/(auth)/login/page.tsx
app/[locale]/(dashboard)/
├── layout.tsx                          → Dashboard shell (top bar, auth, UserRoleProvider)
├── page.tsx                            → Photo gallery (main view)
├── favorites/page.tsx                  → Favorited photos
├── upload/page.tsx                     → Photo upload (USER/ADMIN only)
├── settings/page.tsx                   → Language, appearance, user info
├── games/page.tsx                      → Game hub (memory + quiz cards)
├── games/memory/page.tsx               → Memory card matching game
├── games/memory/leaderboard/page.tsx   → Memory leaderboard
├── games/quiz/page.tsx                 → Quiz game
├── games/quiz/leaderboard/page.tsx     → Quiz leaderboard
├── games/quiz/edit/page.tsx            → Quiz questions management (ADMIN)
├── games/quiz/edit/new/page.tsx        → Create new quiz question (ADMIN)
└── games/quiz/edit/[id]/page.tsx       → Edit existing quiz question (ADMIN)
```

### Feature Layer (`features/`)

No barrel index files — import directly.

Features: `gallery/`, `games/`, `upload/`, `settings/`, `layout/`

Each has: `components/` (UI), `actions/` (server actions), optionally `hooks/`

### Shared Layer

- `components/` — `animated-page`, `motion-provider` (LazyMotion), `user-role-provider`
- `lib/` — `auth.ts`, `animation-variants.ts`, `file-validation.ts`, `seo.ts`
- `i18n/` — next-intl routing and request config

### Viewer Role System

- Server: `checkMutationAccess(auth)` now lives in `packages/auth-old/src/guard.ts` (local only, untracked) until Laura's refactor; the API has only `requireApp(App.LAURA)`, which lets Viewers in (Laura's floor); a guard for "USER or higher in Laura" comes with Laura's API (`roleIn` + `hasRole`)
- Client: `UserRoleProvider` + `useIsViewer()` hook for UI restrictions
- Viewers can browse gallery and play games but cannot upload, favorite, delete, or submit scores

### Laura Dashboard Routes

- `/` — Photo gallery grid with infinite scroll
- `/favorites` — Favorited photos
- `/upload` — Photo upload (blocked for viewers)
- `/settings` — Language, theme, user info
- `/games` — Game hub
- `/games/memory` — Memory card game
- `/games/memory/leaderboard` — Memory scores
- `/games/quiz` — Quiz game
- `/games/quiz/leaderboard` — Quiz scores
- `/games/quiz/edit` — Quiz question management (ADMIN)
- `/games/quiz/edit/new` — Create new quiz question
- `/games/quiz/edit/[id]` — Edit existing quiz question

## Package Layout (every Node package and `apps/api`)

One layout everywhere, so a file's place answers "who reads it?":

```
src/
  index.ts            root entry only (an App's boot file, a package's root export)
  environment/        the zod env schema, validated at import
  shared/             what more than one top-level feature reads, by kind
  features/
    <feature>/
      <kind>/         components, hooks, actions, middleware, routes,
                      constants, types, utils, translations, tests
      <sub-feature>/  any folder that is not a kind; same shape, recursively
```

Only `environment/`, `shared/` and `features/` sit at the top of `src/`; routes
live in their feature (`features/<name>/routes/`). Kind folders are the closed
list above; any other folder inside a feature is a sub-feature. Nest only when
a feature really has sub-features. Code lives in the deepest feature that
contains every reader: one sub-feature reads it, it lives there; two
sub-features, their parent's kind folder; two top-level features, `shared/`.
A feature's main file can sit directly in its folder when a kind folder would
hold only that file. Every folder is optional (ADR 0016).

**Packages are concepts.** One package per concept, usable by any Host (an App
or the API, see `CONTEXT.md`). A framework adapter lives in a sub-folder
(`features/next/`, `features/hono/`) with the framework as an optional peer. A
package or folder is named after an App, vendor or framework only when it is
wholly that thing (`shadcn`, `features/next`, `database/apps/laura`). A
package's logic never names an App; packages that catalogue per App
(`database`, `design`) keep App folders.

A package never imports an App (`@allonfire/api`, `@allonfire/back-office`,
`@allonfire/laura`, or a path into `apps/`); Biome's `noRestrictedImports`
enforces it. A package is a module any host can mount: the Auth module knows
`/auth`, never the `/v1` the API mounts it under, and a Next App is told the
full address (`API_AUTH_URL`).

Env var names start with their owner: a package's with the package name
(`STORAGE_ENDPOINT`, `DATABASE_URL`, `DATABASE_SEED_ADMIN_EMAIL`, `AUTH_SECRET`), the
API's with `API_` (`API_REDIS_URL`, `API_CORS_ORIGINS`). A var that points at
another service carries that service's name (`API_AUTH_URL` in the Back Office). A
name a tool reads by itself stays as the tool spells it: `NODE_ENV`, `PORT`,
`OTEL_*`. Laura keeps its old names until it is rebuilt.
Export keys mirror the file path without `src/` and `.ts`, one line per file:
`"./features/hono/guards/middleware/require-app": "./src/features/hono/guards/middleware/require-app.ts"`.
A folder's `index.ts` exports as the folder (`./features/image/hono/routes`). Generated code keeps its
own key (`@allonfire/database/enums`). A package that serves HTTP for any host
(the Auth and Image modules) exports its router from `features/<name>/routes/index.ts`,
takes its dependencies as arguments, and throws `CodedError` from
`@allonfire/core/features/errors/coded-error` instead of building responses (ADR 0015;
routes Better Auth serves throw its `APIError`, which its handler answers).
`packages/shadcn`, `packages/ui` and `packages/design` are exempt: the
first two follow shadcn's `components/` and `lib/` so `shadcn add` works;
`packages/design` holds Designs and Apps (ADR 0011).

## API App Structure (`apps/api/src/`)

The HTTP backend serving every app. Hono on Node, port 3300. No domain
endpoints yet; auth is the Auth module (`packages/auth`) mounted at `/v1/auth`
— see `apps/api/README.md`.

```
apps/api/
└── src/
    ├── index.ts          boot: serve(), signals, shutdown
    ├── app.ts            createApp(deps) — middleware order + route mounts only
    ├── client.ts         AppType, ApiType, ErrorCode, ProblemDetails — the
    │                     "./client" export; types only, no runtime code
    ├── shutdown.ts       createShutdown(deps) — ordered close, drain timeout
    ├── environment/      environment — zod env schema, validated at import
    ├── features/         one folder per topic, mounted or applied by app.ts;
    │   │                 each owns its routes/, constants/, middleware/,
    │   │                 utils/ and tests/; the Image module mounts from
    │   │                 @allonfire/storage (ADR 0015)
    │   ├── docs/         routes/{index,handlers}, constants/openapi,
    │   │                 utils/enabled (isDocsEnabled), utils/merge
    │   │                 (mergeOpenApi) — /openapi.json, /reference
    │   ├── health/       routes/{index,routes,handlers}, constants/statuses,
    │   │                 utils/status (HealthDeps, status mapping) — /health, /ready
    │   ├── auth/         auth (instance), middleware/auth-rate-limit (the
    │   │                 API's limiter wrapped in the module's authLimit)
    │   ├── errors/       constants/problem-details,
    │   │                 middleware/error-handler
    │   ├── i18n/         constants/locales, middleware/locale-resolver,
    │   │                 translate, translation-values, translations/*.json
    │   ├── logger/       logger, middleware/request-logger
    │   ├── rate-limit/   constants/limits, middleware/rate-limiter
    │   ├── redis/        redis, constants/redis (REDIS)
    │   └── telemetry/    constants/telemetry, middleware/request-spans (@hono/otel
    │                     + corrections), resource, telemetry — OTel SDK
    └── shared/           anything more than one feature reads, or no feature owns
        ├── constants/    api (API), error (API.ERROR, built on core's
        │                 ERROR.CODE and each module's codes) — no logic
        ├── middleware/   cors, security-headers
        ├── types/        bindings (AppBindings)
        └── utils/        outage (outageLatch), probe (isProbe)
```

A constant belongs in `features/<topic>/constants/` unless more than one
feature reads it. `API` (its paths, context keys, limits, log messages and shutdown steps) is
shared, so it stays in `shared/constants/api.ts`. Anything not API-specific —
`HTTP.STATUS`, `HTTP.METHOD`, `HTTP.HEADER`, `HTTP.CONTENT_TYPE`, `LOG.LEVEL`, the
redaction list, `ENV.BOOLEAN`, `SEPARATOR`, `PATTERN.TRAILING_SLASHES`, `UNIT` (time and size), `HTTP.SECURITY_HEADERS` — lives in
`@allonfire/core` (`features/http`, `features/logger`, `shared/constants`), and so do the standard error codes, core's `ERROR.CODE` (`features/errors/constants/error-codes`: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, …), which every Host and module throws. A module adds only its own (`IMAGE.ERROR_CODE`: `IMAGE_TOO_LARGE`, `UNSUPPORTED_IMAGE`; `AUTH.ERROR_CODE`). `API.ERROR` (every code the API answers with, built from those and never retyped, and the statuses it answers with a problem document) is the API's own,
in `shared/constants/error.ts`. An error code is never a string literal, tests included; only core's own test types them, as the contract clients switch on. A constant's type always comes from zod:
`export const xSchema = z.enum(X)` (or `z.literal(TUPLE)`), then
`export type X = z.infer<typeof xSchema>`. A lookup table is `as const satisfies
Record<K, V>`, never annotated `: Record<K, V>`, which widens every lookup to `V`. `API.PATH` is
shared too: the health routes serve its probes, and telemetry, the request logger and
the rate limiter skip the `PROBE_PATHS` derived from them. `HEALTH`, `OPENAPI`,
`RATE_LIMIT`, `REDIS`, `OTLP` and `OTEL` belong to the feature that owns them.
Tests live beside what they test: the feature's `tests/`, or
`shared/<kind>/tests/` for shared helpers. A feature checked through the whole
middleware chain still lives in its own `tests/` and builds the app with
`createApp(appDeps())` (`shared/tests/app-deps.ts`). Only `client` and
`shutdown` keep root-level tests.
Vitest runs with globals (no `from "vitest"` import). Every test file's first
line is `// @module-tag unit` or `// @module-tag integration`; a file with
neither fails. Integration tests need a running service (database, cache,
queue, external API) and are named
`*.integration.test.ts`. They never touch the Local database: a Vitest
`globalSetup` clones a Test database per package per run from the template
(`allonfire_test_template_<epoch>_<fingerprint>`: the changelog plus the
Fixtures, a new one when `changelog/`, `liquibase/` or `src/features/seed/`
change) and a bucket per run holding the
Image Fixtures, and drops both when the run ends (`dropWhenRunEnds`); a
run killed first leaves them, named with its process id, and the next run
drops those whose process is gone (`isStaleTestRun`); e2e does the same per Playwright run, and drops an
earlier e2e run's leftovers when it starts. A test signs in as a Fixture (`FIXTURE.USER.BACK_OFFICE.ADMIN`
with `FIXTURE.PASSWORD`) and points at an Image Fixture, never a retyped
email or key; local addresses come from `@allonfire/config/local/addresses`
(`LOCAL.URL`, `LOCAL.PORT`, `TEST_API_URL`), checked against compose, CI and
the `.env.example` files by its guard test. Type tests (`*.test-d.ts`) take no tag: `tsc`
checks them and nothing executes. Three layers: unit and integration tests run
in Node (`vitest.config.ts`); browser tests (`*.browser.test.tsx`,
`integration`) render one client component in real Chromium and WebKit through
`vitest.browser.config.ts`, with MSW answering the API: the worker and its
guard are shared (`@allonfire/config/tests/browser/msw`: `startMsw`,
`worker`), the handlers are the App's own (`src/shared/tests/msw/handlers.ts`),
and a request no handler answers fails the test. Vitest serves MSW's
`mockServiceWorker.js` from the installed `msw`; no App keeps one in
`public/`, where it would ship to production; e2e
tests are Playwright's, under the App's `e2e/`, against the API plus the App
(`aofPlaywrightConfig`), each spec once per project: `chromium`, `webkit`,
`mobile-chrome` (Pixel 7) and `mobile-safari` (iPhone 15). Both layers are
headless; `pnpm test:e2e:headed`, `pnpm test:e2e:ui` and
`pnpm test:browser:headed` show the browser. A server action is mocked in a browser test and
covered for real by e2e. CI runs browser and e2e tests only for affected Apps.

The pre-commit hook (`.husky/pre-commit`) runs Biome on the staged files
(errors and warnings fail), `oxlint --type-aware` over the repo, starts the
Local stack (`pnpm docker:up`, then waits for the database, Redis and storage; Docker must be running) for the
integration tests, then `turbo run check-types test test:browser`, then
`turbo run test:e2e`: the App's production build, served like the Docker
image (standalone server), plus the API, on their own ports (3310 and the
App's e2e port) beside `pnpm dev`, the same locally and in CI. Turbo's cache
replays every task whose package and dependencies did not change, e2e
included, and the remote cache lets CI replay an e2e run that passed
locally. oxlint runs one rule, `typescript/no-deprecated`
(`.oxlintrc.json`): a deprecated API, members included, fails `pnpm lint`;
Biome's `noDeprecatedImports` sees only imports. Fix the use, never silence
it; a deprecated name a library's own type still requires goes in the rule's
`allow` list with the reason.

**Routes live in their feature**, under `features/<name>/routes/`:
`index.ts` builds the chained sub-app, `routes.ts` holds the `describeRoute`
specs, `handlers.ts` the handlers; the feature's `constants/`, `utils/` and
`tests/` sit beside `routes/`. File names carry no `<name>.` prefix; the folder already says it. Named
exports only, no `import * as`. `index.ts` assembles a router; it is not a
barrel. A handler for a path with params (`/:id`) goes through
`createFactory<AppBindings>().createHandlers(...)` so the params stay inferred.

**Folder names are plural when the folder holds several things of one kind**
(`features/`, `constants/`, `tests/`, `translations/`) and singular when it
names one concept (`i18n/`, `health/`, `rate-limit/`). `middleware/` is the
exception: it is a mass noun — Hono, Express and Koa all use it for one or
many, and `middlewares/` reads wrong.

- **Errors are RFC 9457 problem documents** (`application/problem+json`):
  `type` (stable `/errors/<kebab-code>`, derived from `API.ERROR.CODE`), `title`
  (the status's reason phrase, invariant per the RFC), `status`, `detail` (the
  localised message — the only member i18n touches), `instance` (the path),
  plus `requestId`, `code` and `errors` as extension members. Send them with
  `problemResponse(c, { code, status, detail, errors? })` in
  `features/errors/middleware/error-handler.ts`, which also sets the media
  type; never hand-assemble one.
- **`HTTP.STATUS` stays numeric literals**, not `StatusCodes` from
  `http-status-codes`. An enum member is its own type, not `404`, which breaks
  `API.ERROR.STATUS` as a key of Hono's response map and collapses every error arm
  of `hc<AppType>` to `never`. The library is used for `getReasonPhrase` only.
- **Every documented body comes from its zod schema**: `content: { [HTTP.CONTENT_TYPE.JSON]:
  { schema: resolver(bodySchema) } }` in `describeRoute`, the same schema the
  handler `satisfies`. An error response is `{ $ref: problemResponseRef(status) }`
  (`@allonfire/core/features/errors/constants/openapi`): `features/docs/routes/handlers.ts`
  registers one `Problem<status>` per `API.ERROR.STATUS`, listing only that status's
  codes (`API.ERROR.STATUS_OF_CODE`). Never
  `@hono/zod-openapi`: `hono-openapi` keeps routes plain chained Hono.
- **Routes must be chained** (`new Hono().get(...).get(...)`) or `hc<AppType>`
  client types silently collapse. Guarded by `src/client.test-d.ts`.
- **Domain routes mount under `/v1`** via `API.PATH.VERSION` (`shared/constants/api.ts`),
  never a hard-coded `"/v1"`; `/health` and `/ready` stay unversioned.
- **Constants are one nested object per owner**, named so the first word says where a
  value comes from, never a flat `X_Y_Z` beside its siblings and never a name that
  carries its value (`VERSION.CURRENT`, not `V1`): `API` (`PATH`, `VERSION`, `LIMIT`,
  `DEFAULT`, `CONTEXT_VAR`, `ERROR`, `EXIT_CODE`, `LOG_MESSAGE`, `SHUTDOWN`;
  `apps/api/src/shared/constants/api.ts`) and each API feature's own (`HEALTH`,
  `OPENAPI`, `RATE_LIMIT`, `REDIS`, `OTLP`, `OTEL`); `AUTH` (`PATH` the module's routes,
  `PAGE` an App's pages, `LIMITED_PATHS`, `API_TIMEOUT_MS`, `COOKIE`, `HEADER`, `SESSION`, `RATE_LIMIT`,
  `ERROR_CODE`, `SIGN_IN_ERROR`, `VAR`, `METHODS`, `OPENAPI_TAG`, `DOC`;
  `@allonfire/auth/shared/constants/auth`); `IMAGE` (`BUCKET`, `CACHE`, `FORMAT`, `LIMIT`,
  `ERROR_CODE`, `DOC`, `OPENAPI_TAG`, `VAR`;
  `@allonfire/storage/features/image/constants/image`); `STORAGE` (`PATH`); core's `HTTP`
  (`STATUS`, `METHOD`, `HEADER`, `CONTENT_TYPE`), `LOG`, `ENV`, `PATTERN` and `I18N`; and
  config's `LOCAL` (`PORT`, `URL`, `DATABASE`, `STORAGE`); the database's `ACCESS`
  (`APP_SETTINGS`, `ROLE_RANK`; `features/auth/access/constants/access`) and `FIXTURE`
  (`USER`, `USERS`, `PASSWORD`, `IMAGE`; `features/seed/fixtures/fixtures`); the API's
  `TRANSLATION` (`CATALOGUE`, `DEFAULT_LOCALE`). Core also holds `UNIT` (`MS_PER_SECOND`,
  `BYTES_PER_MIB`, …), `SEPARATOR` and `ERROR` (`CODE`, the standard error codes): what
  is most generic carries no owner's name. An object literal cannot read its own
  keys: shared pieces are file-local consts above it. A path is never a string literal,
  tests included: compose it (`${API.PATH.AUTH}${AUTH.PATH.GET_SESSION}`).
  The API's paths live once, in `API.PATH` (built from `API.VERSION.CURRENT`), exported as
  `@allonfire/api/shared/constants/api`: an App's tests and its `playwright.config.ts` import it
  and hand it to config's `aofPlaywrightConfig` (`apiPath`), since config, a leaf package,
  imports nothing.
- **Auth guards** come from `@allonfire/auth/features/hono/guards/middleware/*` and throw
  `HTTPException`; never build a 401/403 by hand. `guard(allows)` may await `allows`: a
  route that changes Users reads the caller fresh, as the User module's `POST` and `DELETE` do
  through the Host's `canManageUsers(userId)` (`accessUserById`), since the Session's 5-minute cookie
  cache may hold a Role since taken away. Nobody deletes themselves: a list holding the
  caller's id answers 403 `USER.ERROR_CODE.CANNOT_DELETE_SELF` and deletes nobody.
- **`createApp(deps)` takes its dependencies** (rate-limit store, health
  checkers) so tests never open a socket.
- **Required env:** `DATABASE_URL`, `API_REDIS_URL`, `API_CORS_ORIGINS`,
  `AUTH_SECRET`, `AUTH_URL`, `STORAGE_ENDPOINT`,
  `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`. Full list in
  `apps/api/.env.example`. `dev` loads it via Node's `--env-file`; tests use
  `apps/api/vitest.setup.ts`.
- **Redis db indexes:** 0 rate limits, 1 cache (reserved), 2 sessions
  (reserved), 15 an e2e run's API (`LOCAL.URL.REDIS_E2E`), so its requests never
  count against `pnpm dev`. Eviction is `volatile-lru`; never TTL a session key.
- **`I18N.LOCALE` lives in `@allonfire/core/features/i18n/constants/locales`**, shared with the
  Apps (ADR 0012), which route by its derived `Language`. `I18N.SUPPORTED_LOCALES`
  there is the explicit preference order `match()` sees, main variant of each
  language first; `src/features/i18n/tests/locales.test-d.ts` fails if a locale is
  missing from it or speaks a language outside `I18N.BASE_LANGUAGES`. The API's
  `features/i18n/constants/locales.ts` keeps `TRANSLATION.DEFAULT_LOCALE` and the catalogue.
  `TRANSLATION.CATALOGUE` uses computed `[I18N.LOCALE.X]` keys
  so no tag is typed twice, and `satisfies Record<Locale, Translations>` fails if a
  locale has no messages. `Translations` is `typeof EN`, derived rather than
  `Record<MessageKey, string>`, so a target locale missing a key fails too.
- **The catalogue is not an error catalogue.** `TranslationKey` is
  `keyof typeof en.json`, so any localised string belongs there — a subject
  line, a notification body, a PDF heading. Errors are simply the keys that
  exist today. The dependency runs errors -> messages: `API.ERROR.CODE` carries
  `satisfies Record<string, TranslationKey>`, so a code without a message fails at
  that declaration.
- **Translations are JSON** (`src/features/i18n/translations/*.json`) so a translation platform
  can read them. One file per *language* — `en.json` serves `en-US` and
  `en-GB`.
- **`src/features/i18n/translation-values.ts` is hand-written**, one line per message key,
  saying what that message interpolates. Keep it in step with the ICU strings by
  hand — nothing checks it. It is not optional: omit a value and
  `IntlMessageFormat` throws into `translate`'s catch, serving the user the raw
  ICU source in the wrong language. Add a generator if the list outgrows eyes.
- **`pnpm i18n:check` runs in CI** — `@lingual/i18n-check` compares every locale
  against `en`: missing keys, and ICU arguments a translation dropped, which
  render without throwing so nothing else catches them. Known gap: a leftover
  key present in a target locale but not in `en` is not reported. That is dead
  weight, not wrong output.

## Deployment

- VPS: Hetzner, 4 vCPU / 8 GB RAM, no swap, at 188.245.174.30 (ssh main-vps)
- Observability: self-hosted OpenObserve + Umami (Local only so far) — see `docs/adr/0006-self-hosted-observability.md`
- Orchestrator: Dokploy runs one compose project of GHCR images; `.github/workflows/deploy.yml` builds only the affected Deploy units on a push to `prod` and redeploys it (ADR 0018).
- DB: Shared PostgreSQL 16 (database: allonfire)
- Proxy: Traefik with Let's Encrypt SSL
- A Docker service, its container (`allonfire-<name>`), its volume and its hostname are named after its purpose, never its software: `database`, `redis`, `storage`, `workflow`, `telemetry`, `analytics`, and `<name>-init` for a one-shot (`docker-compose.dev.yml`, `docker-compose.prod.yml`; `packages/config/local/tests/service-names.test.ts` fails on an old name). Swapping the software is an `image:` line. Production's `storage-move` copies `allonfire-minio-data` into `allonfire-storage-data` once, on its first deploy; the old volume is the rollback
- Back Office build needs `STORAGE_ENDPOINT` (Docker build arg, CI secret); it is baked into the `/storage/images` rewrite. It also needs `BACK_OFFICE_URL`, its own public address (`metadataBase`): a Docker build arg (`deploy.yml`) and a CI secret for the `build` job, each read from its GitHub environment (`prod`, `dev`) under the same name, and the same value at runtime (`docker-compose.prod.yml`).
- Before the API starts, the one-shot `storage-setup` service (the API's image) creates the `image` bucket with its read-only policy, only when missing; it uploads no Images.
- CI runs check-types, test and build with `turbo --affected`; lint and the repo-wide checks always run. Affected is Turbo's (`futureFlags.affectedUsingTaskInputs`): every task's `inputs` excludes `**/*.md`, so a Markdown-only change affects nothing, and a root `package.json`, `turbo.json` or lockfile change affects everything; a new task needs the same exclusion. `pnpm ci:affected <base>` (`@allonfire/core/features/ci/affected`) reads `turbo query affected --packages` as the affected Apps (packages under `apps/`) and Deploy units; `docker/`, `.dockerignore` and `pnpm-workspace.yaml`, which no task reads, reach every unit. A push to `prod` diffs against the `deployed/prod` tag, the last commit that deployed.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `IsaiaScope/allonfire`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, label strings unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Framework skills

Pinned in `skills-lock.json`, restored with `npx skills experimental_install`:

- Vercel: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `vercel-react-view-transitions`, `writing-guidelines`.
- Next.js: `next-dev-loop`, `next-cache-components-adoption`, `next-cache-components-optimizer`, `next-partial-prefetching-adoption`, `next-partial-prefetching-optimizer`.
- shadcn: `shadcn`, `migrate-radix-to-base`.
- impeccable: installed with `npx impeccable install --providers=claude --scope=project`, not in `skills-lock.json`; its engine binary is gitignored and downloaded on first run. Reach it only through `/aof-design`.
- Repo's own: `aof-design` (every page, ADR 0011 and 0014) and `aof-documentation` (READMEs, docs, screenshots).

MCP servers in `.mcp.json`: `shadcn` (browse and add registry components) and `next-devtools` (errors, routes and logs from a running `next dev`).

### Design system

`packages/design` holds no components and no React (ADR 0011, ADR 0014, ADR 0022): only fonts, CSS, Markdown and constants. That is the Designs (`src/designs/<name>/`: `DESIGN.md`, `DESIGN.json`, `theme.css`, fonts), each App's `PRODUCT.md` and stylesheet (`src/apps/<app>/`), the Brand's constants and impeccable's state. Every component lives in an App, under `apps/<app>/src/features/<topic>/components/` using next-intl directly, or in `packages/ui` when Apps share it, the generated-image ones included (`AOFBrandLogo`, `AOFShareCard`). Build or edit any page directly in its App with `/aof-design`, never plain `/impeccable`. An App's `globals.css` imports `@allonfire/ui/styles/base.css`, then `@allonfire/design/apps/<app>/styles.css`; generated images also read the Brand (`brand/aof-monogram`, `brand/aof-logo`) and a Design's image fonts, colours and card look (`designs/<name>/image-fonts`, `image-colors`, `share-card-look`). `ui` depends on `design`, never the reverse. `pnpm design:sync` copies a Design into the Apps wearing it; CI runs `--check`.

`packages/shadcn` is written only by tools: run `npx shadcn@4.21.0 add <name>` from `apps/back-office` and it lands there, then `pnpm --filter @allonfire/shadcn canonicalize`, which rewrites the CLI's classes to their canonical Tailwind spelling (`rounded-[4px]` to `rounded-lg`, what the editor's `suggestCanonicalClasses` asks for) against the package's own theme. Never edit it by hand. A registry other than shadcn's (DiceUI, React Bits) installs the same way; React Bits' items land when the CLI runs in `packages/shadcn` itself (`pnpm dlx shadcn@4.21.0 add <url>` there). A vendor file that is not strict TypeScript (React Bits' `GooeyNav.tsx` today) is never edited and never relaxes anyone else: it goes in the lenient `packages/shadcn/src/components/tsconfig.json` (`"files"`) and in the package tsconfig's `"exclude"`, then `pnpm --filter @allonfire/shadcn vendor:types` writes its `.d.ts` beside it. The editor and `check-types` check it under the lenient config; every importer reads the `.d.ts` (the components export's `types` condition, which falls back to the `.tsx` for every other component) and stays strict. packages/ui's `shadcn-compat` test fails when a component is in neither list, in both, or lacks its `.d.ts`. React Bits' Gooey Nav is forked into ui as `AOFGooeyNav` (`components/aof-gooey-nav`, engine in `lib/gooey-nav/`), strict and drawn in the Design's corners; the upstream `GooeyNav.tsx` stays only to diff a React Bits update against. The rewrite is core's (`features/tailwind/canonicalize.ts`, `pnpm --filter @allonfire/core tailwind:canonicalize --css <stylesheet> --dir <folder>...`, built on Tailwind's own engine: no lint plugin matches the editor, `oxlint-tailwindcss` skips every class whose compiled CSS differs in text, `p-[16px]` beside `p-4`), and it runs on every App's classes against its own theme: an App's `tailwind:canonicalize` script passes its `src/app/globals.css`, its `src` and ui's components; the pre-commit hook runs it on the staged files before Biome (root `lint-staged`, one line per App), CI runs each App's `tailwind:check`, and `pnpm tailwind:fix` in an App rewrites all of it; a new App adds its line to `lint-staged` and the same three scripts. Laura joins once rebuilt (its stylesheet still imports a theme that no longer exists). AOF components live in `packages/ui`, the only package that imports `@allonfire/shadcn` (Biome enforces it). An AOF component is named with the `AOF` prefix, `AOFButton` in `packages/ui/src/components/aof-button.tsx`, so it never reads as the shadcn one it wraps. See ADR 0010.

### exFAT volume

The repo lives on an exFAT drive, where macOS writes a `._<name>` sidecar next to every file it touches. Turbopack's file cache stays on: a Next app's `dev` and `build` scripts delete `._*` under `.next` before starting, since Turbopack fails to open a cache folder holding them (laura still turns its dev cache off until it is migrated). Next keeps no optimized image on disk on macOS (`AOFCreateNextConfig`): its image cache serves a folder's first file, which on exFAT is the `._` sidecar. The vitest and Playwright presets ignore `**/._*`; a new tool that scans directories needs the same exclusion.
