import {
  Field as ShadcnField,
  FieldError as ShadcnFieldError,
  FieldLabel as ShadcnFieldLabel,
} from "@allonfire/shadcn/components/field";
import type { ComponentProps } from "react";

export type AOFFieldProps = ComponentProps<typeof ShadcnField>;
export type AOFFieldLabelProps = ComponentProps<typeof ShadcnFieldLabel>;
export type AOFFieldErrorProps = ComponentProps<typeof ShadcnFieldError>;

// ponytail: shadcn's Field and FieldLabel as-is, like AOFLabel; AOFTextField
// composes them for an AOF form.
export const AOFField = (props: AOFFieldProps) => <ShadcnField {...props} />;
export const AOFFieldLabel = (props: AOFFieldLabelProps) => (
  <ShadcnFieldLabel {...props} />
);
/**
 * shadcn's FieldError with `role="none"` in place of `role="alert"`: a field
 * error follows the typing, and a live region would interrupt the screen
 * reader on every keystroke. The input points at it through `aria-describedby`, and a blocked
 * submit moves focus to the first invalid field (`submitAOFForm`).
 */
export const AOFFieldError = (props: AOFFieldErrorProps) => (
  <ShadcnFieldError role="none" {...props} />
);
