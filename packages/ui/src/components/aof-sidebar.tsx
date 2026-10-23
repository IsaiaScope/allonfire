"use client";

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@allonfire/shadcn/components/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@allonfire/shadcn/components/sidebar";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../lib/utils";
import { AOFButton, type AOFButtonProps } from "./aof-button";
import { AOFDropdownMenuContent } from "./aof-dropdown-menu";

type Collapsible = NonNullable<ComponentProps<typeof Sidebar>["collapsible"]>;

/** The address param that holds the sidebar's state, and its collapsed value. */
export type AOFSidebarCollapsedBy = { param: string; value: string };

/**
 * Runs while the HTML is parsed, before the first paint: when the address
 * holds the collapsed value, the wrapper right before it says so.
 */
const collapseOnArrival = (
  { param, value }: AOFSidebarCollapsedBy,
  collapsible: Collapsible
) => `{
  const wrapper = document.currentScript.previousElementSibling;
  if (new URLSearchParams(location.search).get(${stringifyJson(param)}) === ${stringifyJson(value)}) {
    wrapper.dataset.state = "collapsed";
    wrapper.dataset.collapsible = ${stringifyJson(collapsible)};
  }
}`;

/**
 * Draws the sidebar collapsed from the first paint (Next's "Preventing flash
 * before hydration"). A prerendered page's HTML is the sidebar open, and the
 * App reads its address only once the page runs: alone, the menu would show
 * open, then close. This wrapper carries shadcn's own marks (`group`,
 * `data-state`, `data-collapsible`), which every `group-data-*` class inside
 * the sidebar reads from any ancestor; the inline script sets them before
 * the first paint, and after that they follow the sidebar's state, so the
 * hydration mismatch is the script's, expected. React never runs a script it
 * renders in the browser, so there the script is inert.
 */
const CollapsedOnArrival = ({
  by,
  children,
  collapsible,
}: {
  by: AOFSidebarCollapsedBy;
  children: ReactNode;
  collapsible: Collapsible;
}) => {
  const { state } = useSidebar();
  return (
    <>
      <div
        className="group contents"
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-state={state}
        suppressHydrationWarning
      >
        {children}
      </div>
      <script
        suppressHydrationWarning
        type={
          typeof window === "undefined" ? undefined : HTTP.CONTENT_TYPE.JSON
        }
      >
        {collapseOnArrival(by, collapsible)}
      </script>
    </>
  );
};

/**
 * The phone's drawer, as shadcn draws it, but named by the App: shadcn's
 * own sheet is titled "Sidebar" in English whatever the page's language.
 */
const AOFSidebarSheet = ({
  children,
  label,
  side = "left",
}: Pick<AOFSidebarProps, "children" | "label" | "side">) => {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <Sheet onOpenChange={setOpenMobile} open={openMobile}>
      <SheetContent
        // shadcn's phone width, 18rem.
        className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [--sidebar-width:18rem] [&>button]:hidden"
        data-mobile="true"
        data-sidebar="sidebar"
        data-slot="sidebar"
        side={side}
      >
        <SheetTitle className="sr-only">{label}</SheetTitle>
        <div className="flex h-full w-full flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  );
};

export type AOFSidebarProps = ComponentProps<typeof Sidebar> & {
  /** The menu's name, in the page's language: the phone drawer's title. */
  label: string;
  /**
   * The App's address param for the sidebar's state: given, a page loaded
   * with it collapsed draws the sidebar collapsed from the first paint. The
   * App still keeps the param and the sidebar in step once the page runs.
   */
  collapsedBy?: AOFSidebarCollapsedBy;
};

/**
 * The main menu: shadcn's sidebar, collapsing to its icons on desktop and a
 * drawer on a phone, opened by `AOFSidebarTrigger`. Its state lives in the
 * App (a URL param, `collapsedBy`), not in shadcn's cookie, which nothing
 * reads.
 */
export const AOFSidebar = ({
  collapsedBy,
  collapsible = "icon",
  label,
  ...props
}: AOFSidebarProps) => {
  const { isMobile } = useSidebar();
  const sidebar = isMobile ? (
    <AOFSidebarSheet label={label} side={props.side}>
      {props.children}
    </AOFSidebarSheet>
  ) : (
    <Sidebar collapsible={collapsible} {...props} />
  );
  return collapsedBy ? (
    <CollapsedOnArrival by={collapsedBy} collapsible={collapsible}>
      {sidebar}
    </CollapsedOnArrival>
  ) : (
    sidebar
  );
};

/**
 * A row a little larger than shadcn's: 40px with a 16px label for a mouse,
 * the tap target (`--tap-target`, `--tap-icon`) on a touch screen; the icon
 * stays shadcn's 16px otherwise. Folded to icons every row is a 36px square
 * (shadcn's is 32px): an 18px icon with 9px around it, in the rail
 * `AOFSidebarProvider` widens to match. The `lg` rows are 48px. A row that
 * opens a menu stays lit while it is open (Base UI marks its trigger
 * `data-popup-open`; `data-open` is the popup's own). Its highlight fades:
 * on a touch screen the menu opens once the finger lifts, so the pressed
 * highlight goes off and on again, which read as a second tap.
 */
export const AOFSidebarMenuButton = ({
  className,
  ...props
}: ComponentProps<typeof SidebarMenuButton>) => (
  <SidebarMenuButton
    className={cn(
      // The highlight fades, so press then open reads as one tap.
      "transition-[width,height,padding,background-color,color]",
      // Lit while its menu is open.
      "data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground",
      // 40px with a 16px label; the tap target on a touch screen.
      "data-[size=default]:h-10 pointer-coarse:data-[size=default]:h-(--tap-target) data-[size=default]:text-base pointer-coarse:data-[size=default]:[&_svg]:size-(--tap-icon)",
      // Folded: a 36px square, an 18px icon with 9px around it.
      "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:data-[size=default]:p-2.25! group-data-[collapsible=icon]:data-[size=default]:[&_svg]:size-4.5",
      className
    )}
    {...props}
  />
);

/**
 * The menu's button: 36px with a 20px icon for a mouse, the tap target on a
 * touch screen. It says whether the menu is open (`aria-expanded`): the
 * drawer on a phone, the expanded sidebar on desktop, and its icon points
 * the way a click moves the sidebar. shadcn's
 * `SidebarTrigger` with the frame's own icon, which shadcn's hard-codes
 * beside an English "Toggle Sidebar"; the App names it in its language.
 */
export const AOFSidebarTrigger = ({
  className,
  onClick,
  ...props
}: AOFButtonProps & { "aria-label": string }) => {
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();
  // ponytail: React state, so a page opened folded (`collapsedBy`) shows
  // the collapse icon until hydration; CSS on the wrapper's data-state if
  // that frame ever shows.
  const expanded = isMobile ? openMobile : open;
  const Icon = expanded
    ? IconLayoutSidebarLeftCollapse
    : IconLayoutSidebarLeftExpand;
  const toggle: AOFButtonProps["onClick"] = (event) => {
    onClick?.(event);
    toggleSidebar();
  };
  return (
    <AOFButton
      aria-expanded={expanded}
      className={cn(
        "pointer-coarse:size-(--tap-target) size-9 [&_svg:not([class*='size-'])]:size-5",
        className
      )}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      onClick={toggle}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      <Icon aria-hidden />
    </AOFButton>
  );
};

/**
 * The rail the sidebar folds to: 52px (shadcn's is 48px), room for its 36px
 * squares and the group's 8px either side.
 */
const RAIL = { "--sidebar-width-icon": "3.25rem" };

export const AOFSidebarProvider = ({
  style,
  ...props
}: ComponentProps<typeof SidebarProvider>) => (
  <SidebarProvider style={{ ...RAIL, ...style }} {...props} />
);

/**
 * The menu a sidebar row opens (the App switcher, the account): at least
 * 14rem wide, beside the sidebar on desktop and below the row in the phone's
 * drawer, 4px off. `align` stays the caller's.
 */
export const AOFSidebarDropdownContent = ({
  className,
  ...props
}: ComponentProps<typeof AOFDropdownMenuContent>) => {
  const { isMobile } = useSidebar();
  return (
    <AOFDropdownMenuContent
      className={cn("w-fit min-w-56", className)}
      side={isMobile ? "bottom" : "right"}
      sideOffset={4}
      {...props}
    />
  );
};

// ponytail: the other parts are shadcn's under AOF names, nothing added yet.
export const AOFSidebarContent = SidebarContent;
export const AOFSidebarFooter = SidebarFooter;
export const AOFSidebarGroup = SidebarGroup;
export const AOFSidebarHeader = SidebarHeader;
export const AOFSidebarInset = SidebarInset;
export const AOFSidebarMenu = SidebarMenu;
export const AOFSidebarMenuItem = SidebarMenuItem;
export const AOFSidebarRail = SidebarRail;
export const useAOFSidebar = useSidebar;
