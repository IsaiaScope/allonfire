# Next scaffolding lives in utils behind optional peer dependencies

Every Next App repeated the same wiring: TanStack Query's client and provider,
next-themes, nuqs, the Query Devtools, next-intl's request config and proxy, and
the same `next.config` base. We moved it into `@allonfire/utils` under
`src/next/`, one file and one export per piece, each named `AOF` plus the
original name (`AOFThemeProvider`, `AOFGetQueryClient`), so an App adds or drops
a piece one line at a time. The framework libraries are optional
`peerDependencies` of utils: the API also imports utils but never `src/next/`,
so nothing of React or Next reaches it at runtime.

`LOCALE` moved from the API into `@allonfire/utils/constants/locales` at the
same time, so the API and the Apps read one list of locales; an App's
`Language` (`"en" | "it"`) is derived from it. The API keeps `DEFAULT_LOCALE`
and its message catalogue.

An App's `features/i18n/` keeps one line per file (routing, navigation, request
config) and only its own translations: text every App shows lives once in
utils under the reserved `Common` namespace, merged under the App's messages.

## Considered Options

- **A new `@allonfire/next` package**: utils stays free of any framework, at
  the cost of one more package to maintain for a handful of files.
- **One all-in-one provider with switches**: shorter layouts, but an App could
  not insert its own provider between two shared ones, and every new option
  grows one component.

## Consequences

- utils type-checks with JSX and the DOM lib.
- An App's proxy still writes its `config.matcher` literally: Next reads it
  statically and ignores an imported value.
- utils is a symlinked workspace package, so `src/next/*` resolves its libraries
  from utils' own devDependencies, not the App's. Two versions would split React
  contexts, so `src/next/tests/peer-versions.test.ts` fails when an App on the
  scaffolding declares a peer at a range other than utils'.
