"use client";

import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  type ActionBarProps,
  ActionBarSelection,
  ActionBarSeparator,
} from "@allonfire/shadcn/components/action-bar";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type AOFActionBarProps = Omit<
  ActionBarProps,
  "children" | "onOpenChange" | "open"
> & {
  /** The actions, each an `AOFActionBarItem`. */
  children: ReactNode;
  /** The close button's accessible name: it clears the selection. */
  close: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /** How many are selected, already worded: "3 selected". */
  selection: string;
};

/**
 * A bar floating at the bottom of the page while rows are selected (DiceUI's
 * Action Bar): the count with a close button, then the actions. Kept above
 * the home indicator by the page's bottom gutter.
 */
export const AOFActionBar = ({
  children,
  close,
  onOpenChange,
  open,
  selection,
  style,
  ...props
}: AOFActionBarProps) => (
  <ActionBar
    onOpenChange={onOpenChange}
    open={open}
    style={{ bottom: "var(--gutter-bottom)", ...style }}
    {...props}
  >
    <ActionBarSelection>
      {selection}
      <ActionBarSeparator />
      <ActionBarClose aria-label={close} className="cursor-pointer">
        <IconX />
      </ActionBarClose>
    </ActionBarSelection>
    <ActionBarSeparator />
    <ActionBarGroup>{children}</ActionBarGroup>
  </ActionBar>
);

// ponytail: DiceUI's item under its AOF name; it is already a shadcn Button.
export const AOFActionBarItem = ActionBarItem;
