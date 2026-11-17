import { Input as ShadcnInput } from "@allonfire/shadcn/components/input";
import type { ComponentProps } from "react";

export type AOFInputProps = ComponentProps<typeof ShadcnInput>;

/**
 * shadcn's Input under an AOF name; a Design styles it through its tokens and
 * the component using it sizes it. It hydrates over an attribute a browser
 * added first (Chrome on iOS puts `__gcruniqueid` on inputs before React
 * loads), which would otherwise report a mismatch in development.
 */
export const AOFInput = (props: AOFInputProps) => (
  <ShadcnInput suppressHydrationWarning {...props} />
);
