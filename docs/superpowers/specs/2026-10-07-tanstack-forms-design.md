# Forms run on TanStack Form

## Goal

Every form with fields is managed by TanStack Form (`@tanstack/react-form`)
through `useAOFForm` in `packages/ui`: every such form is an **AOF form**
(`CONTEXT.md`, ADR 0017). The back office Sign in form is the
first user. The page stays a Server Component; only the form is a client leaf.

## Decisions

- **Library:** `@tanstack/react-form` 1.33.x (4.2M weekly downloads). Chosen
  over React Hook Form (70M) for zod 4 as a validator without a resolver
  (Standard Schema), typed field names, values and per-field validators, and
  one vendor with the TanStack Query the back office already uses. Neither is
  better for Next.js: both are client hooks.
- **No Next.js adapter.** `@tanstack/react-form-nextjs` (`createServerValidate`,
  `mergeForm`) has 32,832 weekly downloads, under the repo's 200k floor, and
  would make every server action return TanStack form state.
- **Server actions stay the source of truth (wiring A).** `useActionState`
  remains the bridge to the action; TanStack checks the fields first and, when
  they pass, dispatches the action inside `startTransition`. The `<form>`
  keeps `action={action}`, so a post before hydration still reaches the
  action, which still checks everything.
- **Scope:** `useAOFForm`, its field components and the Sign in form. Laura keeps `react-hook-form` until
  it is rebuilt. A form without fields (Sign out: one button) stays a plain
  `<form action>`.
- **No end-to-end test for now** (the user's call).

## `useAOFForm` (`packages/ui`)

`@tanstack/react-form` becomes a dependency of `@allonfire/ui`, the only
package that may import shadcn, which the field components compose. Apps
import `useAOFForm` and never `@tanstack/react-form` itself. Named with the
AOF prefix (`CONTEXT.md`), not TanStack's `useAppForm`.

- `src/components/aof-field.tsx` — `AOFField`, `AOFFieldLabel`,
  `AOFFieldError`: shadcn's `field.tsx` (already installed) as-is, like
  `AOFLabel`. `AOFFieldError` takes `errors: { message?: string }[]`, the
  shape TanStack hands back for Standard Schema issues.
- `src/lib/form-context.ts` — `createFormHookContexts()`: `fieldContext`,
  `formContext`, `useFieldContext`, `useFormContext`. Its own file so the
  field components and the hook do not import each other.
- `src/components/aof-text-field.tsx` — `AOFTextField`, bound to the field
  context: `AOFField` > `AOFFieldLabel` > a relative wrapper holding an
  optional `start` slot and `AOFInput` > `AOFFieldError`. Props: `label`,
  `start?: ReactNode`, `invalid?: boolean` (an error the server reported), and
  the input's own props (`type`, `autoComplete`, `inputMode`, `className`,
  ...). It always sets `id`, `name` (the post before hydration needs it),
  `value`, `onChange`, `onBlur`, `aria-invalid` (shown field errors or
  `invalid`) and `aria-describedby` pointing at the error.
  **When errors show:** the field is checked on every change, but its errors
  show only once it has been left (`meta.isBlurred`) or a submit was tried
  (the form's `submissionAttempts > 0`). From then on the message follows the
  typing and clears the moment the value is valid. Every AOF form gets this.
- `src/components/aof-submit-button.tsx` — `AOFSubmitButton`: `AOFButton`
  `type="submit"`, props `pending`, `children`, `pendingChildren`; disabled
  and `aria-busy` while pending. It takes `pending` from the caller because the
  action's transition, not TanStack's `isSubmitting`, knows when the request
  ends.
- `src/lib/form.ts` — `createFormHook({ fieldContext, formContext,
  fieldComponents: { TextField: AOFTextField }, formComponents: {} })`,
  exporting `useAOFForm` (its `useAppForm`). `AOFSubmitButton` reads nothing
  from the form, so a form imports it directly instead of wrapping it in
  `form.AppForm`.
- `src/lib/form-errors.ts` — `shownErrors(errors, { isBlurred,
  submissionAttempts })`: the "when errors show" rule as a pure function,
  turning TanStack's errors (Standard Schema issues or strings) into
  `{ message }[]` without a cast.

`./lib/*` maps to `.ts` and `./components/*` to `.tsx`, so the JSX lives in
components and the hook file has none.

## Wiring an AOF form to a server action

The pattern every AOF form follows, shown on Sign in:

```tsx
const [{ error }, action, pending] = useActionState(
  signIn.bind(null, locale),
  initialState
);
const form = useAOFForm({
  defaultValues: { email: "", password: "" },
  validators: { onChange: schema }, // a submit runs onChange validators too
  onSubmitMeta: { formData: new FormData() },
  onSubmit: ({ meta }) => startTransition(() => action(meta.formData)),
});

<form
  action={action}
  noValidate
  onSubmit={(event) => {
    event.preventDefault();
    form
      .handleSubmit({ formData: new FormData(event.currentTarget) })
      .catch(() => undefined); // onSubmit only starts a transition
  }}
>
```

- Before hydration the browser posts the form to the action, as today.
- After hydration TanStack validates first; an invalid form sends nothing. A
  valid one sends the browser's own `FormData`, the same thing the post before
  hydration sends (file inputs included, later), so no conversion helper.
- `noValidate` stays: the browser's bubbles speak its UI language, not the
  page's.

## Sign in

- `apps/back-office/src/features/auth/components/sign-in-form.tsx` keeps its
  look (pictogram tiles through `start`, the `field` classes through
  `className`) and its `initialState` prop.
- The schema is `signInSchema(t)` in
  `apps/back-office/src/features/auth/utils/sign-in-schema.ts`, built in the
  form from `useTranslations("SignIn")`: email trimmed, required, an email;
  password required. These repeat the two rules `signInWithEmail` checks; a
  shared schema factory would cost more than the duplication.
- New translations in `en.json` and `it.json`: `SignIn.field.emailRequired`,
  `SignIn.field.emailInvalid`, `SignIn.field.passwordRequired`.
- Server errors keep the alert above the fields; `invalid` and `missing` still
  mark both fields through `invalid`. The alert and the marks stay until the
  next submit, as today.
- Both fields keep their values after a failed attempt (React no longer resets
  the form, since the native submit is prevented); password managers fill the
  password again anyway.
- `packages/auth` does not change.

## Tests

- `packages/ui/src/components/tests/`: `aof-field`, `aof-text-field` (label,
  `name`, `aria-invalid` with `invalid`, the `start` slot, no error shown
  before a blur or a submit) rendered through a small `useAOFForm` form, and
  `aof-submit-button` (pending: disabled, `aria-busy`, pending label); static
  renders like the existing ones.
- `apps/back-office/.../tests/sign-in.test.tsx` keeps passing as it is, plus
  the three field translations in `en`; `utils/tests/sign-in-schema.test.ts`
  checks each rule returns its message.

## Docs

- `CONTEXT.md`: **AOF form** (done while grilling).
- ADR 0017 (done while grilling).
- `CLAUDE.md`: a Forms section with the rule and the wiring.
