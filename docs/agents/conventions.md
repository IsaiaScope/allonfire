# Code conventions

Repo-wide helpers and constant rules. Every package and App.

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

## Constants

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


## Comments

A comment says what a thing is or does, never which Apps or packages use it
today: "shared by every service that reports", not "shared by the API and the
Back Office". A list of consumers goes stale the day one is added; the code
already says who imports what. Name a specific App or package only when the
line is about that one alone.
