"use client";

import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { type ReactNode, useCallback } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { useAOFColorScheme } from "../lib/use-aof-theme-switch";
import { cn } from "../lib/utils";
import { AOFGooeyNav } from "./aof-gooey-nav";

export type AOFGooeyOption<V extends string> = {
  icon: ReactNode;
  label: string;
  value: V;
};

/** The radio group's `<div>` (named by `label`), plus the choice. */
export type AOFGooeyChoiceProps<V extends string> = Omit<
  ComponentPropsWithoutChildren<"div">,
  "role"
> & {
  /** The chosen option's text and icon colour, as hex. */
  ink: string;
  /** The group's accessible name. */
  label: string;
  /** What the chosen value posts as. */
  name: string;
  onValueChange: (value: V) => void;
  options: readonly AOFGooeyOption<V>[];
  /** The chosen pill's colour, as hex: WebGL paints it, so no CSS variable. */
  pill: string;
  value: V;
};

/** The particles a choice sends flying (the owner's pick, 2026-10-22). */
const PARTICLES = 20;

/**
 * Gooey Nav's frame in the Design's tokens rather than its own two
 * palettes: it follows the colour scheme through CSS, in the server's HTML
 * too, so nothing waits for a script and server and browser agree.
 */
const FRAME = {
  "--gn-frame": "var(--muted)",
  "--gn-frame-edge": "var(--border)",
  "--gn-frame-highlight": "var(--border)",
  "--gn-frame-shadow": "none",
  "--gn-ink": "var(--foreground)",
  // Options not chosen read in full ink: muted read too faint by day.
  "--gn-muted": "var(--foreground)",
} as const satisfies Record<`--gn-${string}`, string>;

/**
 * One choice among a few, drawn as `AOFGooeyNav` (React Bits' Gooey Nav,
 * forked so its pill keeps the Design's corners): the chosen pill
 * melts into goo that flows to the next (WebGL, off for reduced motion). A
 * labelled radio group holding a hidden input, so a form posts the value;
 * Gooey Nav's own buttons stay named and focusable. The pill's colours come
 * as props, so the first render paints them; on a phone the options sit two
 * to a row, each filling its half.
 */
export const AOFGooeyChoice = <V extends string>({
  className,
  ink,
  label,
  name,
  onValueChange,
  options,
  pill,
  value,
  ...props
}: AOFGooeyChoiceProps<V>) => {
  const { scheme } = useAOFColorScheme();
  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (option) {
        onValueChange(option.value);
      }
    },
    [onValueChange, options]
  );
  return (
    // Clipped sideways: Gooey Nav's canvas runs past the row for the goo to
    // spill into, which would widen a phone's page.
    <div
      aria-label={label}
      {...props}
      className={cn("min-w-0 max-w-full overflow-x-clip", className)}
      role="radiogroup"
    >
      <input name={name} type="hidden" value={value} />
      <AOFGooeyNav
        activeIndex={Math.max(
          0,
          options.findIndex((option) => option.value === value)
        )}
        activeTextColor={ink}
        // On a phone, two options to a row, each filling its half.
        className={cn(
          "max-sm:flex max-sm:w-full max-sm:[&>div]:w-full max-sm:[&_li>*]:w-full max-sm:[&_li>*]:justify-center max-sm:[&_ul]:grid max-sm:[&_ul]:grid-cols-2"
        )}
        color={pill}
        items={options.map(({ icon, label: text }) => ({ icon, label: text }))}
        onChange={choose}
        particleCount={PARTICLES}
        // The size of a field label (14px), like the rest of a form.
        size="md"
        style={FRAME}
        // Only Gooey Nav's WebGL hover and shadow read it: the markup is the
        // same whichever scheme, so hydration finds nothing to disagree on.
        theme={
          scheme === METADATA.COLOR_SCHEME.DARK
            ? METADATA.COLOR_SCHEME.DARK
            : METADATA.COLOR_SCHEME.LIGHT
        }
      />
    </div>
  );
};
