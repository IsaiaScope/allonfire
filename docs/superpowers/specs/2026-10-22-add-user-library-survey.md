# Add a User: library survey

2026-10-22. The Users list needs:

- an **Add** button;
- a page, `/users/new`, holding a form with email, name and password;
- one Role choice per App, where "not a member" is one of the choices.

Free items only. Every URL answered 200.

## Already in the repo

These cover every field except the Role per App:

- the AOF form (`useAOFForm`, `field.TextField`, `AOFSubmitButton`, `submitAOFForm`);
- shadcn's `field`, `input`, `select`, `radio-group` and `toggle-group`, all Base UI and all installed.

The Sign in form is the pattern to follow.

## The Role per App

- **Segmented row: shadcn Toggle Group**, https://ui.shadcn.com/docs/components/base/toggle-group. Installed, Base UI, single choice.
  - Each App gets one row: "Not a member · Viewer · User · Admin".
  - It matches the account menu's segmented language and theme choices, which the owner already approved.
  - **Use**.
- **shadcn Radio Group**, https://ui.shadcn.com/docs/components/base/radio-group. Installed, Base UI.
  - Native radio semantics, but it takes four lines per App.
  - **Idea only**.
- **Shadcn Studio radio-group-10**, https://shadcnstudio.com/preview/components/base/radio-group?index=10. Free radio "cards".
  - Too heavy for four short options.
  - **Skip**.
- **A select per App**, with AOFSelect (already wrapped): compact, but it hides the choices behind a click. **Idea only**.

## Pages and blocks

- **shadcn's signup blocks** (`signup-01` to `05`) are sign-up screens for visitors with brand panels. They are not an admin form. **Skip**.
- **Shadcnblocks** and **Shadcn UI Blocks**: their "create user" forms are Pro or Radix. **Skip**.
- **React Bits, Ui-Layouts, Aceternity UI**: nothing of this kind. **Skip**.

## Owner's pick (2026-10-22)

- **React Bits Gooey Nav**, https://reactbits.dev/components/gooey-nav?icons=true&particleCount=20. Free, no dependencies, WebGL goo between items.
  - Registry: `https://reactbits.dev/r/GooeyNav-TS-TW.json` (200, `registry:component`, one file).
  - **Use**, by the owner: "I LOVE" it for role selection. It replaces the segmented recommendation below.

## Recommendation (superseded by the owner's pick)

Build the page from the AOF form, with no new install:

- the email, name and password fields as `field.TextField`;
- each App's Role as a segmented Toggle Group, wrapped as `AOFSegmented` in `packages/ui` and wired as an AOF form field (`field.SegmentedField`).
