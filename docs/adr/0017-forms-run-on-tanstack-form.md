# Forms run on TanStack Form, server actions stay the source of truth

Every form with fields is an AOF form: `useAOFForm` from `@allonfire/ui`
(TanStack Form's `createFormHook`, bound to AOF field components) manages its
fields and checks them in the browser, then hands the browser's own `FormData`
to the server action through `useActionState`, inside `startTransition`. The
`<form>` keeps `action={action}`, so a post before hydration still reaches the
action, and the action still checks everything: the browser's checks only
spare a round trip. Only the form is a client component; the page stays on the
server. A form without fields (Sign out) stays a plain `<form action>`.

## Considered Options

- **React Hook Form:** far more downloads and years of answers, but zod needs
  `@hookform/resolvers`, and its errors are typed less tightly. TanStack Form
  takes zod 4 directly (Standard Schema), types every field and validator, and
  is the same vendor as the TanStack Query the Apps already use. Neither is
  better for Next.js: both are client hooks.
- **`@tanstack/react-form-nextjs`** (`createServerValidate`, `mergeForm`):
  under the 200k weekly downloads floor, and every server action would return
  TanStack form state instead of its own answer.
- **TanStack's `onSubmit` calling the action directly, without
  `useActionState`:** no post before hydration, and a hand-rolled pending flag.

## Consequences

- A server action's answer stays its own (`SignInState`); server errors render
  beside the fields, not inside TanStack's state.
- The browser and the action repeat the field rules; the action's copy is the
  one that counts.
- Laura keeps `react-hook-form` until it is rebuilt.
