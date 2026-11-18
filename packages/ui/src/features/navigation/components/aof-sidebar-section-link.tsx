"use client";

import { aofBaseNavigation } from "@allonfire/core/features/next/i18n/utils/aof-base-navigation";
import { IconChevronRight } from "@tabler/icons-react";
import { type ReactNode, Suspense, useCallback, useState } from "react";
import {
  AOFCollapsible,
  AOFCollapsibleContent,
  AOFCollapsibleTrigger,
} from "../../../shared/components/aof-collapsible";
import { isCurrentSection, sectionEntry, sectionHref } from "../utils/sections";
import {
  AOFSidebarMenuButton,
  AOFSidebarMenuSub,
  AOFSidebarMenuSubButton,
  AOFSidebarMenuSubItem,
  useAOFSidebar,
} from "./aof-sidebar";

const { Link, usePathname } = aofBaseNavigation;

/** The Section row's look, from the App's Design: its `cva` results. */
type RowClassName = { current: string; idle: string };

/**
 * One of the Section's own pages: its pictogram (rendered on the server, an
 * element) and its label in the page's language.
 */
type SubPageLink = { icon: ReactNode; label: string; path: string };

export type AOFSidebarSectionLinkProps = {
  /** The pictogram, rendered on the server: an element, not a component. */
  children: ReactNode;
  label: string;
  path: string;
  /** How the row looks on the Section you are on, and on the others. */
  rowClassName: RowClassName;
  /** Its own pages: a sub-menu the row opens, under it. */
  pages?: readonly SubPageLink[] | undefined;
};

/**
 * A Section in the sidebar; collapsed to icons, the label becomes the
 * tooltip. A tap closes the phone's drawer, the Section you are on
 * included, where no navigation would close it.
 */
const SectionRow = ({
  children,
  current,
  label,
  path,
  rowClassName,
}: Omit<AOFSidebarSectionLinkProps, "pages"> & { current: boolean }) => {
  const { setOpenMobile } = useAOFSidebar();
  const closeDrawer = useCallback(() => setOpenMobile(false), [setOpenMobile]);
  return (
    <AOFSidebarMenuButton
      className={current ? rowClassName.current : rowClassName.idle}
      isActive={current}
      onClick={closeDrawer}
      render={
        <Link
          aria-current={current ? "page" : undefined}
          href={sectionHref(path)}
          // One link per Section, few: each prefetches its page's data too
          // (ADR 0028).
          prefetch
        />
      }
      tooltip={label}
    >
      {children}
      <span>{label}</span>
    </AOFSidebarMenuButton>
  );
};

/**
 * A Section with its own pages, as `sidebar-07` draws one: the whole row
 * opens and closes the sub-menu (its caret turning, its height sliding),
 * the pages indented under it, each with its pictogram; only the page you are on is marked,
 * like a Section, never the row above it. Open while you are on
 * one of them, and opened when you arrive on one. Folded to icons there is
 * no room for a sub-menu, so the row is a link to the first page instead.
 */
const SectionWithPages = ({
  children,
  current,
  label,
  pages,
  pathname,
  rowClassName,
}: Omit<AOFSidebarSectionLinkProps, "path"> & {
  current: boolean;
  pages: readonly SubPageLink[];
  pathname: string;
}) => {
  const { isMobile, setOpenMobile, state } = useAOFSidebar();
  const closeDrawer = useCallback(() => setOpenMobile(false), [setOpenMobile]);
  // Controlled: Base UI ignores, and warns about, a changing `defaultOpen`.
  // Arriving on one of its pages opens it, adjusting state while rendering
  // rather than in an effect; leaving leaves it as you had it.
  const [open, setOpen] = useState(current);
  const [wasCurrent, setWasCurrent] = useState(current);
  if (current !== wasCurrent) {
    setWasCurrent(current);
    if (current) {
      setOpen(true);
    }
  }
  const [first] = pages;
  if (first && state === "collapsed" && !isMobile) {
    return (
      <SectionRow
        current={current}
        label={label}
        path={first.path}
        rowClassName={rowClassName}
      >
        {children}
      </SectionRow>
    );
  }
  return (
    <AOFCollapsible className="group/pages" onOpenChange={setOpen} open={open}>
      <AOFCollapsibleTrigger
        render={
          <AOFSidebarMenuButton
            // Its pages carry the mark: the one you are on, never the row too.
            className={rowClassName.idle}
            tooltip={label}
          />
        }
      >
        {children}
        <span>{label}</span>
        <IconChevronRight
          aria-hidden
          className="ml-auto group-data-open/pages:rotate-90 motion-safe:transition-transform motion-safe:duration-200"
        />
      </AOFCollapsibleTrigger>
      {/* Kept in the page while closed, so its links prefetch and the
          server renders them. */}
      <AOFCollapsibleContent
        className="h-(--collapsible-panel-height) overflow-hidden data-ending-style:h-0 data-starting-style:h-0 motion-safe:transition-[height] motion-safe:duration-200 motion-safe:ease-out"
        keepMounted
      >
        <AOFSidebarMenuSub>
          {pages.map((page) => {
            const here = isCurrentSection(pathname, page.path);
            return (
              <AOFSidebarMenuSubItem key={page.path}>
                <AOFSidebarMenuSubButton
                  className={here ? rowClassName.current : rowClassName.idle}
                  isActive={here}
                  onClick={closeDrawer}
                  render={
                    <Link
                      aria-current={here ? "page" : undefined}
                      href={sectionHref(page.path)}
                      prefetch
                    />
                  }
                >
                  {page.icon}
                  <span>{page.label}</span>
                </AOFSidebarMenuSubButton>
              </AOFSidebarMenuSubItem>
            );
          })}
        </AOFSidebarMenuSub>
      </AOFCollapsibleContent>
    </AOFCollapsible>
  );
};

const CurrentSectionLink = ({
  pages,
  ...props
}: AOFSidebarSectionLinkProps) => {
  const pathname = usePathname();
  const current = isCurrentSection(pathname, props.path);
  return pages?.length ? (
    <SectionWithPages
      current={current}
      pages={pages}
      pathname={pathname}
      {...props}
    />
  ) : (
    <SectionRow current={current} {...props} />
  );
};

/**
 * The Section's row, marked when you are on it. Under a page whose address
 * the build cannot know (`/users/<id>`), the pathname waits for the request:
 * the row is prerendered unmarked and marked once it arrives.
 */
export const AOFSidebarSectionLink = (props: AOFSidebarSectionLinkProps) => (
  <Suspense
    fallback={
      <SectionRow
        current={false}
        label={props.label}
        path={sectionEntry(props)}
        rowClassName={props.rowClassName}
      >
        {props.children}
      </SectionRow>
    }
  >
    <CurrentSectionLink {...props} />
  </Suspense>
);
