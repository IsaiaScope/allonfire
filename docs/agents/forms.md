# Forms

Every form with fields.

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
  takes `mt-8`. A form's buttons are `size="field"` (a field's height, `--field-height` in ui's base.css: 40px under a mouse, 44px on a touch screen; every control that lines up with a field, a toolbar, a table's rows and its pager, reads it, never `h-11`)
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

