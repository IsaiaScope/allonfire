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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@allonfire/shadcn/components/sidebar";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import {
  AOFButton,
  type AOFButtonProps,
} from "../../../shared/components/aof-button";
import { AOFDropdownMenuContent } from "../../../shared/components/aof-dropdown-menu";
import { cn } from "../../../shared/utils/utils";

type Collapsible = NonNullable<ComponentProps<typeof Sidebar>["collapsible"]>;

/** The address param that holds the sidebar's state, and its collapsed value. */
type AOFSidebarCollapsedBy = { param: string; value: string };

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
}: Pick<AOFSidebarProps, "children" | "label"> & {
  side?: AOFSidebarProps["side"] | undefined;
}) => {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <Sheet onOpenChange={setOpenMobile} open={openMobile}>
      <SheetContent
        // shadcn's phone width, 18rem, plus the left inset: a drawer standing
        // in on a phone turned sideways runs behind the notch, its rows clear.
        className={cn(
          "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [--sidebar-width:18rem] [&>button]:hidden",
          side === "left" &&
            "pl-[env(safe-area-inset-left,0px)] [--sidebar-width:calc(18rem+env(safe-area-inset-left,0px))]"
        )}
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
    <Sidebar
      collapsible={collapsible}
      {...props}
      // Its content clear of a notch on the left; its colour runs to the edge.
      className={cn(
        "md:*:data-[sidebar=sidebar]:pl-[env(safe-area-inset-left,0px)]",
        props.className
      )}
    />
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
 * A row a little larger than shadcn's: 40px with a 16px label and an 18px
 * icon for a mouse, the tap target (`--tap-target`, `--tap-icon`) on a touch
 * screen. Folded to icons every row is a 36px square
 * (shadcn's is 32px): an 18px icon with 9px around it, in the rail
 * `AOFSidebarProvider` widens to match (plus the left inset). The `lg` rows are 48px. A row that
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
      // 40px with a 16px label and an 18px icon; the tap target on a touch screen.
      "data-[size=default]:h-10 pointer-coarse:data-[size=default]:h-(--tap-target) data-[size=default]:text-base data-[size=default]:[&_svg]:size-4.5 pointer-coarse:data-[size=default]:[&_svg]:size-(--tap-icon)",
      // Folded: a 36px square, the 18px icon with 9px around it.
      "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:data-[size=default]:p-2.25!",
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
  const expanded = isMobile ? openMobile : open;
  const toggle: AOFButtonProps["onClick"] = (event) => {
    onClick?.(event);
    toggleSidebar();
  };
  return (
    <AOFButton
      aria-expanded={expanded}
      className={cn(
        // Never lit for `aria-expanded`, which the ghost button paints as a
        // menu left open: the page's HTML says open until the page runs, so
        // a page opened folded would flash lit. Its icon tells the state.
        "pointer-coarse:size-(--tap-target) size-9 aria-expanded:bg-transparent aria-expanded:hover:bg-muted dark:aria-expanded:hover:bg-muted/50 [&_svg:not([class*='size-'])]:size-5",
        className
      )}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      onClick={toggle}
      size="icon-sm"
      variant="ghost"
      {...props}
    >
      {/* Both icons, chosen by CSS from the sidebar's own marks (the
          wrapper `collapsedBy` folds before the first paint, then shadcn's):
          a page opened folded shows the unfold icon from its first frame,
          not after hydration. On a phone the button only ever opens the
          drawer. */}
      <IconLayoutSidebarLeftCollapse
        aria-hidden
        className="group-has-[[data-state=collapsed][data-collapsible]]/sidebar-wrapper:hidden max-md:hidden"
      />
      <IconLayoutSidebarLeftExpand
        aria-hidden
        className="hidden group-has-[[data-state=collapsed][data-collapsible]]/sidebar-wrapper:block max-md:block"
      />
    </AOFButton>
  );
};

/**
 * The sidebar's widths, each plus the screen's left inset: shadcn's 16rem
 * open, and the rail it folds to 54px (shadcn's is 48px), room for its 36px
 * squares, the group's 8px either side and 1px more each side to breathe. A
 * phone turned sideways puts its notch there; `AOFSidebar` pads its content
 * by the same inset, so its colour fills behind the notch.
 */
const RAIL = {
  /** The frame's top bars, the sidebar's header and the page's, level. */
  "--frame-bar-height": "4rem",
  "--sidebar-width": "calc(16rem + env(safe-area-inset-left, 0px))",
  "--sidebar-width-icon": "calc(3.375rem + env(safe-area-inset-left, 0px))",
};

/**
 * `--frame-inset-left`: the screen's left inset (a notch there), which the
 * page area clears itself, or none once the docked sidebar is drawn beside
 * it and clears it instead. Read from what is drawn, not from shadcn's phone
 * test: iOS can fire the breakpoint's change before the screen's new width,
 * leaving the drawer on a phone turned sideways, and the page still clears
 * the notch. Anything the App lays on the page's left edge pads by it.
 */
export const AOFSidebarProvider = ({
  className,
  style,
  ...props
}: ComponentProps<typeof SidebarProvider>) => (
  <SidebarProvider
    className={cn(
      "[--frame-inset-left:env(safe-area-inset-left,0px)] md:has-data-[slot=sidebar-gap]:[--frame-inset-left:0px]",
      className
    )}
    style={{ ...RAIL, ...style }}
    {...props}
  />
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
/**
 * The sidebar's top bar, below a notch above: in the phone's drawer, 12px
 * or the notch's height above its content; docked, as tall as the page's
 * `AOFFrameHeader`, the notch's height on top, so their lines are level.
 */
export const AOFSidebarHeader = ({
  className,
  ...props
}: ComponentProps<typeof SidebarHeader>) => (
  <SidebarHeader
    className={cn(
      "max-md:pt-[max(--spacing(3),env(safe-area-inset-top,0px))] max-md:pb-3 md:h-[calc(var(--frame-bar-height)+env(safe-area-inset-top,0px))] md:pt-[env(safe-area-inset-top,0px)] md:pb-0",
      className
    )}
    {...props}
  />
);

/** The page area: its pages' left gutter clears only the inset the sidebar
 *  leaves (`--frame-inset-left`), never the notch twice. */
export const AOFSidebarInset = ({
  className,
  ...props
}: ComponentProps<typeof SidebarInset>) => (
  <SidebarInset
    className={cn(
      "[--gutter-left:max(var(--page-gutter),var(--frame-inset-left))]",
      className
    )}
    {...props}
  />
);
export const AOFSidebarMenu = SidebarMenu;

/** A row's sub-menu: its own pages, on a rule under the row's icon. */
/** A sub-menu, indented under its row with no rule beside it, its links starting 12px in from the row. */
export const AOFSidebarMenuSub = ({
  className,
  ...props
}: ComponentProps<typeof SidebarMenuSub>) => (
  <SidebarMenuSub
    className={cn("ml-1.5 border-l-0 pl-1.5", className)}
    {...props}
  />
);
export const AOFSidebarMenuSubItem = SidebarMenuSubItem;

/**
 * A sub-menu's link, sized as a Section's row: 40px with a 16px label and an
 * 18px icon for a mouse, the tap target on a touch screen (shadcn's is 28px).
 */
export const AOFSidebarMenuSubButton = ({
  className,
  ...props
}: ComponentProps<typeof SidebarMenuSubButton>) => (
  <SidebarMenuSubButton
    className={cn(
      "h-10 pointer-coarse:h-(--tap-target) data-[size=md]:text-base [&>svg]:size-4.5 pointer-coarse:[&>svg]:size-(--tap-icon)",
      className
    )}
    {...props}
  />
);
export const AOFSidebarMenuItem = SidebarMenuItem;
export const AOFSidebarRail = SidebarRail;
export const useAOFSidebar = useSidebar;
