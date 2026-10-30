"use client";

import { createFormHookContexts } from "@tanstack/react-form";

/**
 * The contexts `useAOFForm` binds its field components through; a file of
 * their own so those components and the hook never import each other.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
