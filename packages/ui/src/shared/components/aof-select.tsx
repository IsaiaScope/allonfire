"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allonfire/shadcn/components/select";
import type { ComponentProps } from "react";
import { SAFE_AREA } from "../constants/safe-area";
import { useSafeAreaPadding } from "../hooks/use-safe-area-padding";

// ponytail: shadcn's select (Base UI) under AOF names; add behaviour here,
// never in packages/shadcn.
export const AOFSelect = Select;
export const AOFSelectItem = SelectItem;
export const AOFSelectTrigger = SelectTrigger;
export const AOFSelectValue = SelectValue;

/**
 * The list's box, kept clear of a notch and the home indicator
 * (`useSafeAreaPadding`). Base UI's item-aligned list (opening over the
 * trigger) places itself with its own fixed margins and ignores
 * `collisionPadding`, so on a screen with insets the list opens beside the
 * trigger like a menu, which honours it; elsewhere it stays as shadcn draws it.
 */
export const AOFSelectContent = (
  props: ComponentProps<typeof SelectContent>
) => {
  const padding = useSafeAreaPadding();
  const clear =
    Math.max(padding.top, padding.right, padding.bottom, padding.left) ===
    SAFE_AREA.POPUP.EDGE_PX;
  return (
    <SelectContent
      alignItemWithTrigger={clear}
      collisionPadding={padding}
      {...props}
    />
  );
};
