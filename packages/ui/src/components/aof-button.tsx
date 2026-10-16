import {
  buttonVariants,
  Button as ShadcnButton,
} from "@allonfire/shadcn/components/button";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type AOFButtonProps = ComponentProps<typeof ShadcnButton>;

// The shadcn Button plus a pointer cursor, which shadcn v4 leaves out. It
// exists so Apps import from @allonfire/ui (ADR 0010); customisations land
// here, not in packages/shadcn.
export const AOFButton = ({ className, ...props }: AOFButtonProps) => (
  <ShadcnButton className={cn("cursor-pointer", className)} {...props} />
);

/**
 * The button's classes for an element that is not a button: a link that
 * navigates (the i18n `Link`) and should look like one. A Server Component
 * cannot pass Base UI's `render` prop, so the link takes the classes instead.
 */
export const aofButtonVariants = (...args: Parameters<typeof buttonVariants>) =>
  cn("cursor-pointer", buttonVariants(...args));
