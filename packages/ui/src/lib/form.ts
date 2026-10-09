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
