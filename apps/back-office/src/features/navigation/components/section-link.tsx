"use client";

import {
  AOFSidebarMenuButton,
  useAOFSidebar,
} from "@allonfire/ui/components/aof-sidebar";
import { cva } from "class-variance-authority";
import { type ReactNode, useCallback } from "react";
import { Link, usePathname } from "@/features/i18n/navigation";
import { isCurrentSection, sectionHref } from "../constants/sections";

/**
 * A Section's row, with room for a bar along its left edge. The Section you
 * are on is marked by the yellow of the tactile paving: that bar and a faint
 * wash of it behind the row, both following light and dark. The frame's
 * only yellow.
 */
const sectionRow = cva(
  "relative pl-2.5 before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-sm before:bg-tactile motion-safe:before:transition-opacity",
  {
    variants: {
      current: {
        false: "before:opacity-0",
        // `data-active:`, to outrank shadcn's own active background.
        true: "before:opacity-100 data-active:bg-tactile/15",
      },
    },
  }
);

export type SectionLinkProps = {
  /** The pictogram, rendered on the server: an element, not a component. */
  children: ReactNode;
  label: string;
  path: string;
};

/**
 * A Section in the sidebar; collapsed to icons, the label becomes the
 * tooltip. A tap closes the phone's drawer, the Section you are on
 * included, where no navigation would close it.
 */
export const SidebarSectionLink = ({
  children,
  label,
  path,
}: SectionLinkProps) => {
  const current = isCurrentSection(usePathname(), path);
  const { setOpenMobile } = useAOFSidebar();
  const closeDrawer = useCallback(() => setOpenMobile(false), [setOpenMobile]);
  return (
    <AOFSidebarMenuButton
      className={sectionRow({ current })}
      isActive={current}
      onClick={closeDrawer}
      render={
        <Link
          aria-current={current ? "page" : undefined}
          href={sectionHref(path)}
        />
      }
      tooltip={label}
    >
      {children}
      <span>{label}</span>
    </AOFSidebarMenuButton>
  );
};
