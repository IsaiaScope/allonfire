import { objectEntries } from "@allonfire/core/shared/utils/object";
import { startTransition } from "react";

/** A form whose controls can be found by name, as `HTMLFormElement` is. */
export type NamedControls = {
  elements: { namedItem: (name: string) => unknown };
};

/** Each field's meta, as TanStack keeps it, in the order the fields mounted. */
export type FieldErrorsByName = Readonly<
  Record<string, { errors: readonly unknown[] } | undefined>
>;

/** What `submitAOFForm` needs of a `useAOFForm` form. */
export type SubmittableForm = {
  handleSubmit: () => Promise<unknown>;
  state: { fieldMeta: FieldErrorsByName; isValid: boolean };
};

/** A submit event, as React hands it to a form's `onSubmit`. */
export type FormSubmitEvent<Element extends NamedControls> = {
  currentTarget: Element;
  preventDefault: () => void;
};

const canFocus = (item: unknown): item is { focus: () => void } =>
  typeof item === "object" &&
  item !== null &&
  "focus" in item &&
  typeof item.focus === "function";

/**
 * Moves focus to the first field with errors, so a screen reader reads its
 * label and error (ADR 0017).
 */
const focusFirstInvalid = (
  element: NamedControls,
  fieldMeta: FieldErrorsByName
) => {
  for (const [name, meta] of objectEntries(fieldMeta)) {
    const item = meta?.errors.length ? element.elements.namedItem(name) : null;
    if (canFocus(item)) {
      item.focus();
      return;
    }
  }
};

/**
 * Sends a form's own controls to a `useActionState` action, in a transition:
 * the same data a post before hydration sends.
 */
export const formDataTo =
  (action: (formData: FormData) => void) => (element: HTMLFormElement) => {
    const formData = new FormData(element);
    startTransition(() => action(formData));
  };

/**
 * An AOF form's `onSubmit` (ADR 0017): stops the browser's own post and lets
 * the form check its fields. When they pass, `send` gets the form element
 * (`formDataTo(action)`); when they block, the first invalid field takes
 * focus. A validator that throws is reported like any uncaught error instead
 * of disappearing. Before hydration none of this runs and the browser posts to
 * the form's action.
 */
export const submitAOFForm = <Element extends NamedControls>(
  form: SubmittableForm,
  event: FormSubmitEvent<Element>,
  send: (element: Element) => void
) => {
  event.preventDefault();
  // React clears currentTarget once the handler returns.
  const element = event.currentTarget;
  form.handleSubmit().then(
    () => {
      if (form.state.isValid) {
        send(element);
      } else {
        focusFirstInvalid(element, form.state.fieldMeta);
      }
    },
    // Looked up on failure: `reportError` is a browser global.
    (error: unknown) => reportError(error)
  );
};
