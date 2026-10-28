# Next.js Apps

Rules for every Next App (Back Office now, Laura once rebuilt). Back Office specifics: `back-office.md`.

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
- A failed query or mutation is told in one place: an App mounts ui's `AOFQueryProvider` (`components/aof-query-provider`: core's `AOFQueryClientProvider` with `aofErrorCaches`, `features/next/query/aof-query-errors`, telling through `aofToast`). A mutation always toasts; a query only when refreshing what is on screen fails, since a first load shows its own error state (a table's). `meta: aofErrorMeta(t("…"))` gives the toast its own words, `aofErrorMeta(false)` silences it where the component shows the error; the default words are core's `Common.Request.failed`. Never an `aofToast` in a query's or mutation's own `onError`. A mutation's options live in its feature's `utils/<feature>-mutations.ts`, apart from `<feature>-queries.ts`, which the server reads too
- Providers must be client: an App composes the AOF providers from `@allonfire/core/features/next/providers/*` one by one in its `[locale]/layout.tsx` (ADR 0012), never a single all-in-one `Providers` component

