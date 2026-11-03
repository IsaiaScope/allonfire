import {
  Field as ShadcnField,
  FieldError as ShadcnFieldError,
  FieldLabel as ShadcnFieldLabel,
} from "@allonfire/shadcn/components/field";
import type { ComponentProps } from "react";

export type AOFFieldErrorProps = ComponentProps<typeof ShadcnFieldError>;

// ponytail: shadcn's Field and FieldLabel under AOF names, like AOFCard;
// AOFTextField composes them for an AOF form.
export const AOFField = ShadcnField;
export const AOFFieldLabel = ShadcnFieldLabel;
/**
 * shadcn's FieldError with `role="none"` in place of `role="alert"`: a field
 * error follows the typing, and a live region would interrupt the screen
 * reader on every keystroke. The input points at it through `aria-describedby`, and a blocked
 * submit moves focus to the first invalid field (`submitAOFForm`).
 */
export const AOFFieldError = (props: AOFFieldErrorProps) => (
  <ShadcnFieldError role="none" {...props} />
);
