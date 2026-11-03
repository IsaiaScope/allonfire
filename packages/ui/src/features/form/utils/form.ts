"use client";

import { createFormHook } from "@tanstack/react-form";
import { AOFAvatarField } from "../avatar-field/components/aof-avatar-field";
import { AOFChoiceField } from "../components/aof-choice-field";
import { AOFTextField } from "../components/aof-text-field";
import { fieldContext, formContext } from "./form-context";

/**
 * The hook every AOF form is built with (ADR 0017): TanStack Form with the
 * AOF field components bound, so `form.AppField` hands its children
 * `field.TextField`, `field.ChoiceField` and `field.AvatarField`. `AOFSubmitButton` reads nothing from the form, so a form
 * imports it directly. Fields two forms share are one field group,
 * `withAOFFieldGroup` (TanStack's `withFieldGroup`): each form hands it
 * `form` and the names it holds them under (`fields`), whatever else it holds.
 */
export const { useAppForm: useAOFForm, withFieldGroup: withAOFFieldGroup } =
  createFormHook({
    fieldComponents: {
      AvatarField: AOFAvatarField,
      ChoiceField: AOFChoiceField,
      TextField: AOFTextField,
    },
    fieldContext,
    formComponents: {},
    formContext,
  });
