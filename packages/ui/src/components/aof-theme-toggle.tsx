"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { cva } from "class-variance-authority";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";

// Each icon shows only in the theme it switches away from, by the `.dark`
// class on <html>, so the server render needs no theme. Shown by display,
// so each switch replays a short spin-in; never for reduced motion.
const icon = cva(
  "motion-safe:zoom-in-50 motion-safe:spin-in-90 motion-safe:animate-in motion-safe:duration-300",
  {
    variants: {
      showIn: {
        dark: "hidden dark:block",
        light: "dark:hidden",
      },
    },
  }
);

export type AOFThemeToggleProps = ComponentPropsWithoutChildren<
  typeof AOFButton
> & {
  /** The accessible name; the button shows only an icon. */
  label: string;
};

/**
 * Flips between light and dark through next-themes. Any AOFButton prop
 * passes through (variant, size, className, disabled, ...); it defaults to a
 * ghost icon button, rounded by the Design's radius.
 *
 * The switch is this component's built-in handler, chained the Base UI way
 * with `mergeProps`: a caller's `onClick` runs first and can skip the switch
 * with `event.preventBaseUIHandler()`, leaving the browser's default alone.
 */
export const AOFThemeToggle = ({
  className,
  label,
  onClick,
  size = "icon",
  variant = "ghost",
  ...props
}: AOFThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const toggle = useCallback(
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    [resolvedTheme, setTheme]
  );
  const handlers = mergeProps<"button">({ onClick: toggle }, { onClick });

  return (
    <AOFButton
      aria-label={label}
      className={cn("text-muted-foreground", className)}
      onClick={handlers.onClick}
      size={size}
      variant={variant}
      {...props}
    >
      <Moon aria-hidden className={icon({ showIn: "light" })} />
      <Sun aria-hidden className={icon({ showIn: "dark" })} />
    </AOFButton>
  );
};
