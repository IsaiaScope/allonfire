# Package architecture — design

AllOnFire will run more than one backend and more than one frontend. Every
package must work for any of them, every value must be written once, and the
base languages (English, Italian) must reach every App and backend while each
can add its own. This spec sets the rules; seven plans apply them in order.

## Decisions (approved in chat, 2026-10-02)

1. One spec with every rule, then several plans run in order, each a
   reviewable refactor.
2. A package may import another package; an App may import another App
   (back office keeps reading the API's types).
3. `utils` becomes `core`. The Next scaffolding stays inside it, under
   `features/next/`.
4. `design` keeps its per-App folders (it is the prototyping package);
   `database` gains `apps/<app>/` so every table is described in one place.
5. Sub-features nest directly (option B), kept light: nest only when a feature
   really has sub-features; no lint script.
6. The top of every `src/` holds only `environment/`, `shared/` and
   `features/` (plus root entry files such as `index.ts`). Routes live inside
   their feature, as a `routes/` kind folder.
7. Each App declares its own access policy; `auth` keeps the mechanism only.
8. A Host adding a language must supply it everywhere it reads translations,
   shared ones included (strict).
9. **Host** (CONTEXT.md) names anything under `apps/` that composes packages:
   every App and the API. App keeps its product meaning.
10. Extra alt languages come from one `core` list of Content languages.

## 1. Folder layout

```
src/
  index.ts            root entry only (an App's boot file, a package's root export)
  environment/        the zod env schema, validated at import
  shared/             what more than one top-level feature reads, by kind
  features/
    <feature>/
      <kind>/         components, hooks, actions, middleware, routes,
                      constants, types, utils, tests
      <sub-feature>/  any folder that is not a kind; same shape, recursively
```

- **Kind folders** are a closed list: `components`, `hooks`, `actions`,
  `middleware`, `routes`, `constants`, `types`, `utils`, `tests`. Any other
  folder inside a feature is a sub-feature.
- **Placement:** code lives in the deepest feature that contains every reader.
  Read only by `auth/sign-in` → `features/auth/sign-in/`; by `sign-in` and
  `session` → `features/auth/<kind>/`; by two top-level features →
  `shared/<kind>/`.
- A feature's main file may sit directly in its folder (`features/server/auth.ts`)
  when a kind folder would hold just that file.
- **Exempt:** Next's `app/` route tree; `packages/shadcn`, `packages/ui`,
  `packages/hooks` (shadcn's `components/`, `lib/`); `packages/design`
  (ADR 0011). Export keys keep mirroring paths.

## 2. Packages

One package per concept. A concept that needs a framework adapter keeps it in a
sub-folder (`features/next/`, `features/hono/`), and the framework is an
optional peer, so a host that is not that framework never loads it.

| Package | Holds | Change |
|---|---|---|
| `core` | `environment/`; `shared/` (generic constants: units, separators, patterns, env flags, node env; object helpers); `features/http` (HTTP constants, security headers), `features/errors` (`CodedError`, `formatErrorMessage`), `features/i18n` (languages, locales), `features/logger`, `features/next` (config, i18n, providers, query, api) | renamed from `utils`, reorganised |
| `auth` | `features/server` (Better Auth), `features/hono` (guards, rate limit, session, routes, OpenAPI), `features/next` (actions, proxy, redirects), `features/access` (the mechanism) | regrouped by adapter; App policy leaves |
| `database` | shared schemas (`auth`, `image`) and their services; `apps/<app>/` for an App's own schema, services and seed (Laura today) | Laura moves under `apps/laura/` |
| `storage` | `features/s3` (client, put/delete objects in any bucket) and `features/image` (preparation, Image objects, the Image module in `hono/`, the Next proxy in `next/`) | generic object storage with Images as its first kind (revised 2026-10-07: no separate `image` package) |
| `ui` | `AOF*` components, `AOFStorageImage` | depends on `storage` (Image path constants only) |
| `design`, `shadcn`, `hooks`, `config` | unchanged | |

- **Naming:** a package or folder carries an App, vendor or framework name only
  when it is wholly that thing (`shadcn`, `features/next`, `database/apps/laura`).
  Everything else is named for its concept.
- **No App in a package's logic.** A package whose job is to catalogue per App
  (`database/apps`, `design/src/apps`) may have App folders; logic elsewhere
  never names an App. Today's offenders, fixed by the plans: `APP_MIN_ROLE` in
  `auth`, the `3300` default in `auth`'s Next env, Laura seed users in the shared
  seed, `--line-back-office`/`--line-laura` in the japan Design, `shadcn`'s
  `@source ../../../apps/**`.

## 3. One source of truth

1. **One owner per value**, placed by the rule in section 1, across packages too.
2. **Types derive, never re-type:** `z.infer`, `Pick`, `typeof`, Prisma's
   generated types.
   - Stored shapes: Prisma (`Image`, the enums).
   - Wire shapes derive from them: `imageBodySchema` in `image`, with a type test
     against `ImageRecord`.
   - UI props pick from the wire shape:
     `AOFStorageImageSource = Pick<ImageBody, "alt" | "blurDataUrl" | "height" | "key" | "width">`.
3. **Enum values only from Prisma's generated enums**; an enum-keyed table is
   `as const satisfies Record<Enum, V>`.
4. **A value about a service belongs to that service.** An env schema never
   defaults to another service's address: `auth`'s `API_URL` default (3300) and
   back office's `NEXT_PUBLIC_API_URL` default go; the vars become required and
   `.env.development` holds them.
5. **One name, one meaning:** storage's `IMAGE_BASE_PATH` (`/storage/images`)
   becomes `IMAGE_PROXY_PATH`; the API's `IMAGE_BASE_PATH` (`/v1/images`) keeps
   its name, beside `AUTH_BASE_PATH`.
6. **Access policy:** the App passes its minimum role to `auth`'s Next adapter
   (`minRole: Role.ADMIN`); `auth` holds no App-keyed table. Adding an App edits
   only `AllowedApp` in the database.

## 4. Languages

1. `core` owns the base languages (`BASE_LANGUAGES = ["en", "it"]`) and the
   `Language` type derived from them.
2. A Host that adds a language declares its own list as a superset
   (`defineLanguages([...BASE_LANGUAGES, "fr"])`) and gets its own `Language`.
3. Every catalogue is a typed import map (`satisfies Record<HostLanguage, typeof EN>`):
   the API's, back office's (untyped today), and `core`'s shared one. A Host
   with extra languages supplies them for `core`'s shared strings too, in an
   override file; missing one is a compile error.
4. Shared wording lives once in `core` (`Common.Error.title`,
   `Common.NotFound.title`); `global-error.tsx` reads it.
5. The default language is `BASE_LANGUAGES[0]`, never a literal.
6. **Content languages:** `core` keeps the list of every extra language any Host
   speaks (`CONTENT_LANGUAGES = [...BASE_LANGUAGES, ...extras]`); a Host's
   extras must be in it. Stored per-language data (`Image.alt`) requires the base
   languages and allows the other content languages, so the Back office shows a
   field for each and a new language needs no data migration. A Host reading an
   alt it lacks falls back to English.

## 5. Roadmap

Each plan leaves the workspace green and is planned with `/iso-plan` when the
one before it has landed, so its paths are real.

| # | Plan | Depends on |
|---|---|---|
| 1 | Rules in `CLAUDE.md` + ADR 0016; `utils` → `core`, reorganised to section 1; every importer rewritten | — |
| 2 | `storage` generic objects + `features/image` layout; `IMAGE_PROXY_PATH` | 1 |
| 3 | API layout: `routes/` into `features/` (`docs`, `health`) | 1 |
| 4 | `database/apps/laura`; Laura seed users out of the shared seed | 1 |
| 5 | `auth` regrouped by adapter; App declares its access policy; no `3300` default | 1, and the in-progress auth work committed |
| 6 | One source of truth: Image types derived, env defaults removed, Design and shadcn App names removed | 2, 5 |
| 7 | Languages: base list, typed catalogues everywhere, strict extension, alt fallback | 1, 6 |

## Out of scope

Laura's own code (it keeps its old imports until rebuilt; plan 1 only rewrites
its `@allonfire/utils` specifiers mechanically). New features. Changing the
Prisma enums.

## ADR

ADR 0016, "Packages are concepts with adapter folders": hard to reverse (every
import path), surprising without context (why `core` has a `features/next`, why
`auth` is one package), and a real trade-off against one package per adapter.

## Implementation log

- **Plan 6 (2026-10-07):** `imageBodySchema` moved to
  `storage/features/image/constants/schemas`, with a type test against
  `ImageRecord`; `AOFStorageImageSource` picks from `ImageBody`. The japan
  Design names a line palette (`--line-green`, `--line-orange`) and each App
  picks `--line` in its own `styles.css` (`bg-line`). shadcn's two `@source`
  globs into `packages/apps` and `packages/components` (paths that never
  existed) are gone. The env defaults went in plan 5.
- **Plan 7 (2026-10-07):** `core` owns `BASE_LANGUAGES`, `DEFAULT_LANGUAGE`,
  `EXTRA_LANGUAGES` (empty), `CONTENT_LANGUAGES` and `defineLanguages`.
  `AOFDefineRouting(languages, options?)` routes the Host's list;
  `AOFGetRequestConfig` takes one loader per language and, for a language
  beyond the base ones, the shared text in it (`SharedTranslationsFor`). The
  Back office's catalogue `satisfies Record<Language, () => Promise<typeof EN>>`;
  `global-error.tsx` reads the shared `Common.Error` in `DEFAULT_LANGUAGE`.
  Image alt (`database/features/image/alt`) requires the base languages,
  allows extras, and reads a missing one as English; `AOFStorageImage` takes
  any content language and falls back to English. `translations` joins the
  kind folders. The API's catalogue was already typed per locale.
