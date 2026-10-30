import { IconX } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";

/**
 * A button at a field's end, on its tile (`--field-tile`): a password's
 * reveal, a search's clear. Ghost, so it shows a ground only under the
 * pointer, and the pointer cursor (`AOFButton`).
 */
export const aofInputEndButton = cva(
  "absolute top-1 right-1 size-(--field-tile) text-muted-foreground *:size-5"
);

export type AOFInputClearProps = Omit<
  ComponentPropsWithoutChildren<typeof AOFButton>,
  "aria-label"
> & {
  /** Its name, in the page's language: what it clears. */
  label: string;
};

/**
 * Empties a search box, standing in for the browser's own cross (which takes
 * no pointer cursor, no hover and no name in the page's language): the box
 * hides that one (`[&::-webkit-search-cancel-button]:appearance-none`),
 * leaves room for this (`pr-12`), and shows it only while it holds text.
 */
export const AOFInputClear = ({
  className,
  label,
  ...props
}: AOFInputClearProps) => (
  <AOFButton
    aria-label={label}
    className={cn(aofInputEndButton(), className)}
    size="icon"
    type="button"
    variant="ghost"
    {...props}
  >
    <IconX aria-hidden />
  </AOFButton>
);
