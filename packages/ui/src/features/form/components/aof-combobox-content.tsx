"use client";

import { ComboboxContent } from "@allonfire/shadcn/components/combobox";
import type { ComponentProps } from "react";
import { useSafeAreaPadding } from "../../../shared/hooks/use-safe-area-padding";

/** The combobox's list box, kept clear of a notch and the home indicator (`useSafeAreaPadding`). */
export const AOFComboboxContent = (
  props: ComponentProps<typeof ComboboxContent>
) => <ComboboxContent collisionPadding={useSafeAreaPadding()} {...props} />;
