# The App scaffold lives in packages; an App keeps its Sections, features, words and Design

The Back Office grew its signed-in frame, App switcher, account menu, sign-in
pages, PWA cards, page information, error pages, list kit and API client
inside its own `src/`. Rebuilding Laura on the same standard would have meant
copying about 130 files, so every later fix would be made twice and the two
Apps would drift. ADR 0012 already moved the providers and Next config into
core; ADR 0014 said a second App that wants a piece of a Design moves it to
`@allonfire/ui`. Laura is that second App.

Every piece both Apps need moves to `packages/ui`, `packages/core` or
`packages/auth`, and the Back Office is moved onto it in the same project. A
package never names an App: each App describes itself with one object
(`BACK_OFFICE`, `LAURA`: name, Sections, address, Design) that the package
reads, and a shared component takes what a Design changes as slots, `cva`
variants and theme tokens, never its own copy of the markup (ADR 0022 keeps
the Design package free of components). The frame is one `AppFrame` whose
`variant` and `collapsible` the App sets: the Back Office wears
`sidebar` and `icon` (shadcn's sidebar-07), Laura `floating` and `icon`
(sidebar-04); a phone shows a drawer in both.

## Considered Options

- **A generator that stamps a new App from the Back Office**: quick, but each
  App owns its copy.
- **Copy into Laura now, extract later**: double work, and Laura is built on
  code that then moves.

## Consequences

- `pnpm static:dupes` keeps the Apps honest: a clone between them is merged
  into a package.
- Back Office behaviour must stay unchanged by the move: its browser and e2e
  tests are the proof.
- A Design-specific piece that no other Design needs (the Japan Design's
  ticket gate, hanko, kanji) stays in its App.
