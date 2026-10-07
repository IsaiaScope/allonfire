# AOF Forms on TanStack Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every form with fields runs on TanStack Form through `useAOFForm` in `@allonfire/ui`, starting with the back office Sign in form, while the `signIn` server action stays the source of truth.

**Architecture:** `packages/ui` gains AOF field components (shadcn's `field.tsx`), a pure `shownErrors` rule, an `AOFTextField` bound to TanStack's field context, an `AOFSubmitButton`, and `useAOFForm` (`createFormHook`). A form checks its fields in the browser with a zod schema, then hands the browser's own `FormData` to the action through `useActionState` inside `startTransition`; `<form action={action}>` keeps the post before hydration working.

**Tech Stack:** `@tanstack/react-form` 1.33.x, React 19 `useActionState`, zod 4 (Standard Schema), next-intl, Vitest (globals, static renders), Biome.

**Spec:** `docs/superpowers/specs/2026-10-07-tanstack-forms-design.md` (ADR 0017, `CONTEXT.md` **AOF form**).

## Global Constraints

- `@tanstack/react-form` only; never `@tanstack/react-form-nextjs` (32,832 weekly downloads, under the 200k floor).
- Apps import `useAOFForm` from `@allonfire/ui/lib/form`, never `@tanstack/react-form` (Biome enforces it from Task 3).
- `packages/ui` is the only package importing `@allonfire/shadcn`; never edit `packages/shadcn`.
- AOF prefix in front of the original name: `useAOFForm`, `AOFTextField`, `AOFSubmitButton`, `AOFField`.
- `packages/auth` does not change; the server action keeps its own answer (`SignInState`).
- No `as` casts, no `biome-ignore`, no `Object.*`/`JSON.*` direct calls; a constant's type comes from zod.
- Every test file's first line is `// @module-tag unit`; Vitest globals, no `from "vitest"`.
- No end-to-end test for now (the user's call).
- Never commit: the user commits with `/iso-commit`.
- `noValidate` stays on the form; translations live in `en.json` and `it.json`.

## Review Focus

- **Post before hydration:** with JavaScript off, submitting must still reach `signIn`, so every input carries its `name` (pinned in Task 5).
- **Double submit:** a second click while the action runs must do nothing; the button is disabled while `pending` (pinned in Task 3).
- **Server refusal on valid fields:** "Email or password is wrong" must still mark both fields red although the browser found nothing wrong (pinned in Task 3 and Task 5).
- **Spaces around a pasted email:** `" ada@example.com "` must pass in the browser, since the server trims it too; a blank `"   "` asks for the email (pinned in Task 4).
- **Italian:** every new field message exists in `it.json`, or an Italian visitor sees a key (pinned in Task 4).

---

### Task 1: AOF field parts

**Files:**
- Create: `packages/ui/src/components/aof-field.tsx`
- Test: `packages/ui/src/components/tests/aof-field.test.tsx`

**Interfaces:**
- Consumes: `Field`, `FieldLabel`, `FieldError` from `@allonfire/shadcn/components/field` (already installed; `FieldError` takes `errors?: Array<{ message?: string } | undefined>` and renders nothing when empty).
- Produces: `AOFField`, `AOFFieldLabel`, `AOFFieldError` and their `...Props` types.

- [ ] **Step 1: Write the failing test**

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFField, AOFFieldError, AOFFieldLabel } from "../aof-field";

describe("AOFField", () => {
  it("renders the shadcn field, its label and its error", () => {
    const html = renderToStaticMarkup(
      <AOFField>
        <AOFFieldLabel htmlFor="email">Email</AOFFieldLabel>
        <AOFFieldError
          errors={[{ message: "Enter your email." }]}
          id="email-error"
        />
      </AOFField>
    );
    expect(html).toContain('data-slot="field"');
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain("Enter your email.");
  });

  it("renders no error when there is none", () => {
    expect(renderToStaticMarkup(<AOFFieldError errors={[]} />)).toBe("");
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-field.test.tsx`
Expected: FAIL, cannot resolve `../aof-field`.

- [ ] **Step 3: Write the component**

```tsx
import {
  Field as ShadcnField,
  FieldError as ShadcnFieldError,
  FieldLabel as ShadcnFieldLabel,
} from "@allonfire/shadcn/components/field";
import type { ComponentProps } from "react";

export type AOFFieldProps = ComponentProps<typeof ShadcnField>;
export type AOFFieldLabelProps = ComponentProps<typeof ShadcnFieldLabel>;
export type AOFFieldErrorProps = ComponentProps<typeof ShadcnFieldError>;

// ponytail: shadcn's Field parts as-is, like AOFLabel; AOFTextField composes
// them for an AOF form.
export const AOFField = (props: AOFFieldProps) => <ShadcnField {...props} />;
export const AOFFieldLabel = (props: AOFFieldLabelProps) => (
  <ShadcnFieldLabel {...props} />
);
export const AOFFieldError = (props: AOFFieldErrorProps) => (
  <ShadcnFieldError {...props} />
);
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-field.test.tsx`
Expected: PASS, 2 tests.

---

### Task 2: When a field shows its errors

**Files:**
- Create: `packages/ui/src/lib/form-errors.ts`
- Test: `packages/ui/src/lib/tests/form-errors.test.ts`

**Interfaces:**
- Produces: `type FieldMessage = { message: string }`, `type ErrorVisibility = { isBlurred: boolean; submissionAttempts: number }`, `shownErrors(errors: readonly unknown[], visibility: ErrorVisibility): FieldMessage[]`.

- [ ] **Step 1: Write the failing test**

```ts
// @module-tag unit
import { shownErrors } from "../form-errors";

const ISSUE = { message: "Enter your email." };

describe("shownErrors", () => {
  it("hides errors until the field is left or a submit is tried", () => {
    expect(
      shownErrors([ISSUE], { isBlurred: false, submissionAttempts: 0 })
    ).toEqual([]);
  });

  it("shows them once the field is left", () => {
    expect(
      shownErrors([ISSUE], { isBlurred: true, submissionAttempts: 0 })
    ).toEqual([ISSUE]);
  });

  it("shows them once a submit was tried, on a field never left", () => {
    expect(
      shownErrors([ISSUE], { isBlurred: false, submissionAttempts: 1 })
    ).toEqual([ISSUE]);
  });

  it("reads plain strings and skips what carries no message", () => {
    expect(
      shownErrors(["Required.", undefined, { code: "custom" }], {
        isBlurred: true,
        submissionAttempts: 0,
      })
    ).toEqual([{ message: "Required." }]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/lib/tests/form-errors.test.ts`
Expected: FAIL, cannot resolve `../form-errors`.

- [ ] **Step 3: Write the rule**

```ts
/** A message an AOF field shows under its input. */
export type FieldMessage = { message: string };

/** What decides whether an AOF field shows its errors yet. */
export type ErrorVisibility = {
  isBlurred: boolean;
  submissionAttempts: number;
};

/** A validator's error as text: a string, or a Standard Schema issue. */
const messageOf = (error: unknown) => {
  if (typeof error === "string") {
    return error;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return undefined;
};

/**
 * The errors an AOF field shows (ADR 0017): none until the field is left or a
 * submit is tried, then every message, so it follows the typing and clears
 * the moment the value is valid. Anything without a message shows nothing.
 */
export const shownErrors = (
  errors: readonly unknown[],
  { isBlurred, submissionAttempts }: ErrorVisibility
): FieldMessage[] => {
  if (!(isBlurred || submissionAttempts > 0)) {
    return [];
  }
  return errors.flatMap((error) => {
    const message = messageOf(error);
    return message ? [{ message }] : [];
  });
};
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm --filter @allonfire/ui exec vitest run src/lib/tests/form-errors.test.ts`
Expected: PASS, 4 tests.

---

### Task 3: `useAOFForm`, `AOFTextField`, `AOFSubmitButton`

**Files:**
- Modify: `packages/ui/package.json` (dependency), `pnpm-lock.yaml`
- Modify: `biome.jsonc` (both `noRestrictedImports` overrides, around lines 133-190)
- Create: `packages/ui/src/lib/form-context.ts`
- Create: `packages/ui/src/components/aof-text-field.tsx`
- Create: `packages/ui/src/components/aof-submit-button.tsx`
- Create: `packages/ui/src/lib/form.ts`
- Test: `packages/ui/src/components/tests/aof-text-field.test.tsx`
- Test: `packages/ui/src/components/tests/aof-submit-button.test.tsx`

**Interfaces:**
- Consumes: `AOFField`, `AOFFieldLabel`, `AOFFieldError` (Task 1); `shownErrors` (Task 2); `AOFInput`, `AOFButton`, `AOFButtonProps` (existing).
- Produces:
  - `useAOFForm(options)` from `@allonfire/ui/lib/form`: TanStack's `useAppForm`; `form.AppField` children get `field.TextField`.
  - `AOFTextField` props: input props minus `name | value | defaultValue | onChange | onBlur | aria-invalid | aria-describedby`, plus `label: ReactNode`, `labelClassName?: string`, `start?: ReactNode`, `invalid?: boolean`.
  - `AOFSubmitButton` props: `AOFButtonProps` minus `type | disabled | aria-busy`, plus `pending: boolean`, `pendingChildren: ReactNode`.

- [ ] **Step 1: Add the dependency**

Run: `pnpm --filter @allonfire/ui add @tanstack/react-form@^1.33.5`
Expected: `packages/ui/package.json` lists `"@tanstack/react-form": "^1.33.5"` under `dependencies`.

- [ ] **Step 2: Keep TanStack Form behind `useAOFForm`**

In `biome.jsonc`, add this entry to the `patterns` array of the `apps/**` override (after the shadcn entry) and of the `packages/**`, `!packages/ui/**` override (after the shadcn entry):

```jsonc
{
  "group": ["@tanstack/react-form", "@tanstack/react-form/**"],
  "message": "Build forms with useAOFForm from @allonfire/ui/lib/form (ADR 0017)."
}
```

- [ ] **Step 3: Write the failing tests**

`packages/ui/src/components/tests/aof-text-field.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { useAOFForm } from "../../lib/form";

const EmailForm = ({ invalid }: { invalid?: boolean }) => {
  const form = useAOFForm({ defaultValues: { email: "ada@example.com" } });
  return (
    <form.AppField name="email">
      {(field) => (
        <field.TextField
          autoComplete="username"
          id="email"
          invalid={invalid}
          label="Email"
          start={<span data-start />}
          type="email"
        />
      )}
    </form.AppField>
  );
};

describe("AOFTextField", () => {
  it("labels and names its input from the field", () => {
    const html = renderToStaticMarkup(<EmailForm />);
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email"');
    expect(html).toContain('name="email"');
    expect(html).toContain('value="ada@example.com"');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('data-start=""');
  });

  it("shows no error before the field is left or a submit is tried", () => {
    const html = renderToStaticMarkup(<EmailForm />);
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain('role="alert"');
  });

  it("marks the input when the server reported an error", () => {
    expect(renderToStaticMarkup(<EmailForm invalid />)).toContain(
      'aria-invalid="true"'
    );
  });
});
```

`packages/ui/src/components/tests/aof-submit-button.test.tsx`:

```tsx
// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFSubmitButton } from "../aof-submit-button";

const render = (pending: boolean) =>
  renderToStaticMarkup(
    <AOFSubmitButton pending={pending} pendingChildren="Signing in…">
      Sign in
    </AOFSubmitButton>
  );

describe("AOFSubmitButton", () => {
  it("submits and says its label when idle", () => {
    const html = render(false);
    expect(html).toContain('type="submit"');
    expect(html).toContain("Sign in");
    expect(html).not.toContain("Signing in…");
    expect(html).not.toContain("disabled");
    expect(html).not.toContain("aria-busy");
  });

  it("is disabled and busy while pending, so a second click does nothing", () => {
    const html = render(true);
    expect(html).toContain("disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Signing in…");
  });
});
```

- [ ] **Step 4: Run them and see them fail**

Run: `pnpm --filter @allonfire/ui exec vitest run src/components/tests/aof-text-field.test.tsx src/components/tests/aof-submit-button.test.tsx`
Expected: FAIL, cannot resolve `../../lib/form` and `../aof-submit-button`.

- [ ] **Step 5: Write the contexts**

`packages/ui/src/lib/form-context.ts`:

```ts
"use client";

import { createFormHookContexts } from "@tanstack/react-form";

/**
 * The contexts `useAOFForm` binds its field components through; a file of
 * their own so those components and the hook never import each other.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
```

- [ ] **Step 6: Write `AOFTextField`**

`packages/ui/src/components/aof-text-field.tsx`:

```tsx
"use client";

import { useStore } from "@tanstack/react-form";
import { type ComponentProps, type ReactNode, useId } from "react";
import { useFieldContext } from "../lib/form-context";
import { shownErrors } from "../lib/form-errors";
import { AOFField, AOFFieldError, AOFFieldLabel } from "./aof-field";
import { AOFInput } from "./aof-input";

export type AOFTextFieldProps = Omit<
  ComponentProps<typeof AOFInput>,
  | "name"
  | "value"
  | "defaultValue"
  | "onChange"
  | "onBlur"
  | "aria-invalid"
  | "aria-describedby"
> & {
  label: ReactNode;
  labelClassName?: string;
  /** Drawn at the input's start, e.g. an icon tile the caller positions. */
  start?: ReactNode;
  /** An error the server reported for this field: marks it, no message. */
  invalid?: boolean;
};

/**
 * A text input in an AOF form (ADR 0017), bound to its TanStack field. It
 * always sets `name`, so a post before hydration still sends the value, and
 * shows its errors by `shownErrors`' rule.
 */
export const AOFTextField = ({
  id,
  invalid,
  label,
  labelClassName,
  start,
  ...input
}: AOFTextFieldProps) => {
  const field = useFieldContext<string>();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const submissionAttempts = useStore(
    field.form.store,
    (state) => state.submissionAttempts
  );
  const errors = shownErrors(field.state.meta.errors, {
    isBlurred: field.state.meta.isBlurred,
    submissionAttempts,
  });
  const showsErrors = errors.length > 0;

  return (
    <AOFField>
      <AOFFieldLabel className={labelClassName} htmlFor={inputId}>
        {label}
      </AOFFieldLabel>
      <div className="relative">
        {start}
        <AOFInput
          {...input}
          aria-describedby={showsErrors ? errorId : undefined}
          aria-invalid={invalid || showsErrors ? true : undefined}
          id={inputId}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          value={field.state.value}
        />
      </div>
      <AOFFieldError errors={errors} id={errorId} />
    </AOFField>
  );
};
```

- [ ] **Step 7: Write `AOFSubmitButton`**

`packages/ui/src/components/aof-submit-button.tsx`:

```tsx
import type { ReactNode } from "react";
import { AOFButton, type AOFButtonProps } from "./aof-button";

export type AOFSubmitButtonProps = Omit<
  AOFButtonProps,
  "type" | "disabled" | "aria-busy"
> & {
  /** True while the server action runs: `useActionState`'s flag. */
  pending: boolean;
  /** What the button says while pending. */
  pendingChildren: ReactNode;
};

/**
 * An AOF form's submit button. `pending` comes from the caller because the
 * action's transition, not TanStack's `isSubmitting`, knows when the request
 * ends; while pending the button is disabled, so a second click does nothing.
 */
export const AOFSubmitButton = ({
  children,
  pending,
  pendingChildren,
  ...props
}: AOFSubmitButtonProps) => (
  <AOFButton
    {...props}
    aria-busy={pending || undefined}
    disabled={pending}
    type="submit"
  >
    {pending ? pendingChildren : children}
  </AOFButton>
);
```

- [ ] **Step 8: Write `useAOFForm`**

`packages/ui/src/lib/form.ts`:

```ts
"use client";

import { createFormHook } from "@tanstack/react-form";
import { AOFTextField } from "../components/aof-text-field";
import { fieldContext, formContext } from "./form-context";

/**
 * The hook every AOF form is built with (ADR 0017): TanStack Form with the
 * AOF field components bound, so `form.AppField` hands its children
 * `field.TextField`. `AOFSubmitButton` reads nothing from the form, so a form
 * imports it directly.
 */
export const { useAppForm: useAOFForm } = createFormHook({
  fieldComponents: { TextField: AOFTextField },
  fieldContext,
  formComponents: {},
  formContext,
});
```

- [ ] **Step 9: Run the tests and see them pass**

Run: `pnpm --filter @allonfire/ui exec vitest run`
Expected: PASS, every `packages/ui` test, the five new ones included.

- [ ] **Step 10: Type-check the package**

Run: `pnpm --filter @allonfire/ui check-types`
Expected: no errors.

---

### Task 4: The Sign in schema and its translations

**Files:**
- Create: `apps/back-office/src/features/auth/utils/sign-in-schema.ts`
- Test: `apps/back-office/src/features/auth/utils/tests/sign-in-schema.test.ts`
- Modify: `apps/back-office/src/features/i18n/translations/en.json` (`SignIn`)
- Modify: `apps/back-office/src/features/i18n/translations/it.json` (`SignIn`)
- Modify: `apps/back-office/src/features/auth/components/tests/sign-in.test.tsx`

**Interfaces:**
- Produces: `type SignInFieldMessages = { emailInvalid: string; emailRequired: string; passwordRequired: string }`, `signInSchema(messages: SignInFieldMessages)`: a zod object over `{ email: string; password: string }`.

- [ ] **Step 1: Write the failing schema test**

```ts
// @module-tag unit
import { signInSchema } from "../sign-in-schema";

const MESSAGES = {
  emailInvalid: "Enter a valid email address.",
  emailRequired: "Enter your email.",
  passwordRequired: "Enter your password.",
};
const schema = signInSchema(MESSAGES);

const messagesFor = (email: string, password: string) => {
  const result = schema.safeParse({ email, password });
  return result.success ? [] : result.error.issues.map(({ message }) => message);
};

describe("signInSchema", () => {
  it("accepts an email and a password", () => {
    expect(messagesFor("ada@example.com", "secret")).toEqual([]);
  });

  it("accepts an email pasted with spaces around it, as the server does", () => {
    expect(messagesFor(" ada@example.com ", "secret")).toEqual([]);
  });

  it("asks for the email when it is empty or blank, once", () => {
    expect(messagesFor("   ", "secret")).toEqual([MESSAGES.emailRequired]);
  });

  it("asks for a valid email", () => {
    expect(messagesFor("ada", "secret")).toEqual([MESSAGES.emailInvalid]);
  });

  it("asks for the password", () => {
    expect(messagesFor("ada@example.com", "")).toEqual([
      MESSAGES.passwordRequired,
    ]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/auth/utils/tests/sign-in-schema.test.ts`
Expected: FAIL, cannot resolve `../sign-in-schema`.

- [ ] **Step 3: Write the schema**

```ts
import { z } from "zod";

/** The Sign in form's field messages, translated by the form. */
export type SignInFieldMessages = {
  emailInvalid: string;
  emailRequired: string;
  passwordRequired: string;
};

/**
 * The Sign in form's checks in the browser (ADR 0017): the two rules
 * `signInWithEmail` applies on the server, each with its message. The
 * server's copy is the one that counts; this one spares a round trip.
 */
export const signInSchema = (messages: SignInFieldMessages) =>
  z.object({
    email: z
      .string()
      .trim()
      .min(1, messages.emailRequired)
      .pipe(z.email(messages.emailInvalid)),
    password: z.string().min(1, messages.passwordRequired),
  });
```

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/auth/utils/tests/sign-in-schema.test.ts`
Expected: PASS, 5 tests (checked against zod 4: a failed `min` stops the pipe, so a blank email gets one message).

- [ ] **Step 5: Add the translations**

In `en.json`, inside `"SignIn"`, after `"error"`:

```json
"field": {
  "emailInvalid": "Enter a valid email address.",
  "emailRequired": "Enter your email.",
  "passwordRequired": "Enter your password."
},
```

In `it.json`, inside `"SignIn"`, after `"error"`:

```json
"field": {
  "emailInvalid": "Inserisci un indirizzo email valido.",
  "emailRequired": "Inserisci la tua email.",
  "passwordRequired": "Inserisci la password."
},
```

- [ ] **Step 6: Pin the translations in both languages**

In `sign-in.test.tsx`, add the Italian translations beside the English
import (named `itMessages`, since `it` is Vitest's global) and a test at the
end of `describe("SignInForm")`:

```tsx
import itMessages from "../../../i18n/translations/it.json" with { type: "json" };
```

```tsx
  it.each(["emailInvalid", "emailRequired", "passwordRequired"])(
    "has a field translation for %s in English and Italian",
    (key) => {
      expect(en.SignIn.field).toHaveProperty(key);
      expect(itMessages.SignIn.field).toHaveProperty(key);
    }
  );
```

- [ ] **Step 7: Run the back office tests**

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/auth`
Expected: PASS.

---

### Task 5: The Sign in form on `useAOFForm`

**Files:**
- Modify: `apps/back-office/src/features/auth/components/sign-in-form.tsx` (whole file)
- Modify: `apps/back-office/src/features/auth/components/tests/sign-in.test.tsx`

**Interfaces:**
- Consumes: `useAOFForm` (`@allonfire/ui/lib/form`), `AOFSubmitButton` (`@allonfire/ui/components/aof-submit-button`), `field.TextField` props (Task 3); `signInSchema` (Task 4); `signIn`, `SIGN_IN_ERROR`, `SignInState` (unchanged, `@allonfire/auth`).
- Produces: `SignInForm({ initialState?: SignInState })`, same signature as today.

- [ ] **Step 1: Write the failing test**

In `sign-in.test.tsx`, inside `describe("SignInForm")`:

```tsx
  it("names each field, so a post before hydration sends both", () => {
    const html = render(<SignInForm />);
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('id="sign-in-password"');
  });

  it("marks both fields on a refusal although the browser found nothing wrong", () => {
    const html = render(
      <SignInForm initialState={{ error: SIGN_IN_ERROR.MISSING }} />
    );
    expect(html.match(INVALID_FIELD)).toHaveLength(2);
  });
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/auth/components/tests/sign-in.test.tsx`
Expected: the new tests pass already (the current form names its inputs) — that is fine: they guard the rewrite. Every existing test passes too. Record that, then go on.

- [ ] **Step 3: Rewrite the form**

Replace `sign-in-form.tsx` with:

```tsx
"use client";

import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import {
  SIGN_IN_ERROR,
  type SignInState,
} from "@allonfire/auth/features/next/constants/api";
import { AOFSubmitButton } from "@allonfire/ui/components/aof-submit-button";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { cva } from "class-variance-authority";
import { KeyRound, LoaderCircle, Mail, Nfc, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { startTransition, useActionState } from "react";
import { signInSchema } from "../utils/sign-in-schema";

// Each field opens on a pictogram tile, white on black like station signage.
const field = cva("h-12 pl-14 text-base md:text-base");
const fieldIcon = cva(
  "dark pointer-events-none absolute inset-y-1.5 left-1.5 flex w-9 items-center justify-center rounded-sm bg-led-panel text-foreground *:size-5"
);

/**
 * The email and password form, an AOF form (ADR 0017). `useAOFForm` checks
 * the fields in the browser and, when they pass, hands the browser's own
 * `FormData` to the shared `signIn` server action through `useActionState`,
 * which holds why it failed and the pending flag. Before hydration the form
 * posts to the same action, which checks everything again: its answer is the
 * one that counts. `noValidate`: the browser's own bubbles speak its UI
 * language, not the page's. A success never comes back: the action redirects
 * home.
 */
export const SignInForm = ({
  initialState = {},
}: {
  /** The state to start from, e.g. an error the page already knows. */
  initialState?: SignInState;
}) => {
  const t = useTranslations("SignIn");
  const locale = useLocale();
  const [{ error }, action, pending] = useActionState(
    signIn.bind(null, locale),
    initialState
  );
  const form = useAOFForm({
    defaultValues: { email: "", password: "" },
    // A submit runs the onChange validators too.
    validators: {
      onChange: signInSchema({
        emailInvalid: t("field.emailInvalid"),
        emailRequired: t("field.emailRequired"),
        passwordRequired: t("field.passwordRequired"),
      }),
    },
    onSubmitMeta: { formData: new FormData() },
    onSubmit: ({ meta }) => {
      startTransition(() => action(meta.formData));
    },
  });
  // A server-side refusal or outage is not the fields' fault.
  const invalid =
    error === SIGN_IN_ERROR.INVALID || error === SIGN_IN_ERROR.MISSING;

  return (
    <form
      action={action}
      aria-label={t("submit")}
      className="flex flex-col gap-5 p-4 lg:p-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        form
          .handleSubmit({ formData: new FormData(event.currentTarget) })
          // onSubmit only starts a transition; nothing here can reject.
          .catch(() => undefined);
      }}
    >
      {error ? (
        <p
          className="flex items-start gap-3 rounded-md border border-destructive bg-destructive/10 px-3 py-3 text-sm"
          role="alert"
        >
          <TriangleAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          {t(`error.${error}`)}
        </p>
      ) : null}
      <form.AppField name="email">
        {(email) => (
          <email.TextField
            autoComplete="username"
            className={field()}
            id="sign-in-email"
            inputMode="email"
            invalid={invalid}
            label={t("email")}
            labelClassName="font-bold"
            required
            spellCheck={false}
            start={
              <span aria-hidden className={fieldIcon()}>
                <Mail />
              </span>
            }
            type="email"
          />
        )}
      </form.AppField>
      <form.AppField name="password">
        {(password) => (
          <password.TextField
            autoComplete="current-password"
            className={field()}
            id="sign-in-password"
            invalid={invalid}
            label={t("password")}
            labelClassName="font-bold"
            required
            start={
              <span aria-hidden className={fieldIcon()}>
                <KeyRound />
              </span>
            }
            type="password"
          />
        )}
      </form.AppField>
      <AOFSubmitButton
        className="mt-1 h-12 w-full gap-2 font-bold text-base"
        pending={pending}
        pendingChildren={
          <>
            <LoaderCircle aria-hidden className="animate-spin" />
            {t("submitting")}
          </>
        }
      >
        <Nfc aria-hidden />
        {t("submit")}
      </AOFSubmitButton>
    </form>
  );
};
```

- [ ] **Step 4: Run the Sign in tests**

Run: `pnpm --filter @allonfire/back-office exec vitest run src/features/auth`
Expected: PASS, every existing test unchanged plus the new ones: the alert, two `aria-invalid="true"` on `invalid`/`missing`, none on `unavailable`, `noValidate`, both names.

- [ ] **Step 5: Lint the files**

Run: `pnpm exec biome check --write apps/back-office/src/features/auth packages/ui/src biome.jsonc`
Expected: no errors. If `noMisusedPromises` or `noFloatingPromises` flags `onSubmit`, the `.catch(() => undefined)` above is the repo's own pattern (`packages/auth/src/features/next/utils/sign-in.ts`, `revoke`); keep it rather than adding `async`.

- [ ] **Step 6: Type-check the App**

Run: `pnpm --filter @allonfire/back-office check-types`
Expected: no errors in `sign-in-form.tsx`. `field.TextField` rejects an unknown prop and `form.AppField` an unknown `name`, which is the check.

---

### Task 6: Write the rule down and run the gates

**Files:**
- Modify: `CLAUDE.md` (new section after "JSON Helpers", before "Database Schema Quick Reference")

- [ ] **Step 1: Add the Forms section to `CLAUDE.md`**

```markdown
## Forms (`@allonfire/ui/lib/form`)

Every form with fields is an AOF form (ADR 0017): `useAOFForm` manages its
fields, never bare `useForm`, and never `@tanstack/react-form` outside
`packages/ui` (Biome enforces it). Only the form is a client component; the
page stays on the server. The server action keeps the last word:

- `useActionState(action, initialState)` holds the action's answer and the
  pending flag; the action returns its own state, never TanStack form state.
- `useAOFForm({ defaultValues, validators: { onChange: schema },
  onSubmitMeta: { formData: new FormData() }, onSubmit: ({ meta }) =>
  startTransition(() => action(meta.formData)) })`; a submit runs the
  `onChange` validators too.
- `<form action={action} noValidate onSubmit={...}>` calls
  `event.preventDefault()` and `form.handleSubmit({ formData: new
  FormData(event.currentTarget) })`, so a post before hydration still reaches
  the action.
- Fields render through `form.AppField` and `field.TextField`, which sets
  `name` and shows errors once the field is left or a submit was tried;
  `invalid` marks a field the server refused. `AOFSubmitButton` takes
  `pending`.
- The zod schema with translated messages is built in the form; it repeats
  the action's rules, and the action's copy is the one that counts.

A form without fields (Sign out) stays a plain `<form action>`. Laura keeps
`react-hook-form` until it is rebuilt.
```

- [ ] **Step 2: Format what the run touched**

Run: `git diff --name-only -z -- '*.ts' '*.tsx' '*.json' '*.jsonc' | xargs -0 pnpm exec biome check --write`
Expected: no errors left.

- [ ] **Step 3: Run the repo-wide gates**

Run: `pnpm check-types && pnpm lint && pnpm test`
Expected: all green. A failure outside this plan's files (for example `packages/auth/src/features/next/utils/redirect-to.ts` importing `LANGUAGES`, from another session's in-progress core refactor) is reported, not fixed here.
