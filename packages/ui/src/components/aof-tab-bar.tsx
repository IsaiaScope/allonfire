import type { ReactNode } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";

/**
 * The padding a page area adds on a phone so its last line clears the tab
 * bar and the iOS home indicator under it (`--tab-bar-height`, base.css).
 */
export const AOF_TAB_BAR_CLEARANCE = "pb-(--tab-bar-height) md:pb-0";

export type AOFTabBarProps = ComponentPropsWithoutChildren<"nav"> & {
  /** The links, one per Section. */
  children: ReactNode;
  /** The navigation's accessible name. */
  label: string;
};

/**
 * The phone's main menu: one link per Section, fixed to the bottom within a
 * thumb's reach, above the iOS home indicator. Hidden from `md` up, where
 * the sidebar takes over. While it shows, AOFToaster's bottom toasts sit
 * above it (`--toast-bottom`, base.css).
 */
export const AOFTabBar = ({
  children,
  className,
  label,
  ...props
}: AOFTabBarProps) => (
  <nav
    aria-label={label}
    className={cn(
      "fixed inset-x-0 bottom-0 z-20 flex h-(--tab-bar-height) items-stretch justify-around border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden",
      className
    )}
    data-slot="tab-bar"
    {...props}
  >
    {children}
  </nav>
);
