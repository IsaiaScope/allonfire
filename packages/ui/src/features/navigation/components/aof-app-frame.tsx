import { useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, Suspense } from "react";
import { AOFSeparator } from "../../../shared/components/aof-separator";
import { cn } from "../../../shared/utils/utils";
import { NAVIGATION, sidebarParam } from "../constants/navigation";
import type { AppDescriptor } from "../types/app-descriptor";
import { AOFCloseDrawerOnNavigate } from "./aof-close-drawer-on-navigate";
import { AOFFrameHeader } from "./aof-frame-header";
import { AOFRoleGatedSection } from "./aof-role-gated-section";
import {
  AOFSidebar,
  AOFSidebarContent,
  AOFSidebarFooter,
  AOFSidebarGroup,
  AOFSidebarHeader,
  AOFSidebarInset,
  AOFSidebarMenu,
  AOFSidebarMenuItem,
  AOFSidebarProvider,
  AOFSidebarRail,
  AOFSidebarTrigger,
} from "./aof-sidebar";
import { AOFSidebarParam } from "./aof-sidebar-param";
import { AOFSidebarSectionLink } from "./aof-sidebar-section-link";

export type AOFAppFrameProps = {
  /** The account menu, in the sidebar's footer (`AOFAccount` in its own `Suspense`). */
  account: ReactNode;
  app: Pick<AppDescriptor, "app" | "sections">;
  /** The header's breadcrumb: the App's client binding of `AOFFrameBreadcrumb`. */
  breadcrumb: ReactNode;
  children: ReactNode;
  /** Classes the Design adds to the two headers (a rule under both). */
  classNames?: { frameHeader?: string; sidebarHeader?: string };
  /** `icon` by default; a phone is a drawer whatever it is. */
  collapsible?: ComponentProps<typeof AOFSidebar>["collapsible"];
  /** The Section row's look, from the Design: its `cva` results. */
  rowClassName: { current: string; idle: string };
  /** What the Design lays behind and beside the frame. */
  slots?: {
    /** Painted behind the page header's end. */
    headerWall?: ReactNode;
    /** The header's far end. */
    headerEnd?: ReactNode;
    /** Painted behind the sidebar's rows. */
    sidebarWall?: ReactNode;
  };
  /** The App switcher, in the sidebar's header (`AOFAppSwitcher` in its own `Suspense`). */
  switcher: ReactNode;
  /** `sidebar` (shadcn's `sidebar-07`) by default. */
  variant?: ComponentProps<typeof AOFSidebar>["variant"];
};

/**
 * Every signed-in page's frame (ADR 0024, ADR 0033), shadcn's `sidebar-07` by
 * default: a sidebar that collapses to icons (a drawer on a phone, opened
 * from the header) with the App switcher, the App's Sections and the
 * account menu, and a header with the breadcrumb. Static: it reads nothing
 * of the request, so it is in the shell; the switcher, the account menu, a
 * Section above the App's floor (`AOFRoleGatedSection`) and the page each
 * read the Session on their own. Sections and labels come from the App
 * (`app.sections`, the labels in its `Navigation` translations); the Design
 * comes in through `rowClassName`, `slots` and `classNames`.
 */
export const AOFAppFrame = ({
  account,
  app,
  breadcrumb,
  children,
  classNames,
  collapsible,
  rowClassName,
  slots,
  switcher,
  variant = "sidebar",
}: AOFAppFrameProps) => {
  const t = useTranslations("Navigation");
  const common = useTranslations("Common.Navigation");
  return (
    <AOFSidebarProvider data-frame-variant={variant}>
      <Suspense fallback={null}>
        <AOFSidebarParam />
      </Suspense>
      <Suspense fallback={null}>
        <AOFCloseDrawerOnNavigate />
      </Suspense>
      <AOFSidebar
        collapsedBy={{
          param: NAVIGATION.PARAM.SIDEBAR,
          value: sidebarParam.serialize(false),
        }}
        label={common("menu")}
        variant={variant}
        {...(collapsible ? { collapsible } : {})}
      >
        {slots?.sidebarWall}
        {/* The App's line under its name, level with the page header's line
            (ui keeps both below a notch). */}
        <AOFSidebarHeader
          className={cn("relative justify-center", classNames?.sidebarHeader)}
        >
          {switcher}
        </AOFSidebarHeader>
        <AOFSidebarContent className="relative">
          <AOFSidebarGroup className="py-4">
            <nav aria-label={common("menu")}>
              <AOFSidebarMenu>
                {app.sections.map((section) => {
                  const { icon: Icon, label, pages, path } = section;
                  const row = (
                    <AOFSidebarMenuItem key={label}>
                      <AOFSidebarSectionLink
                        label={t(label)}
                        pages={pages?.map(({ icon: PageIcon, ...page }) => ({
                          icon: <PageIcon aria-hidden />,
                          label: t(page.label),
                          path: page.path,
                        }))}
                        path={path}
                        rowClassName={rowClassName}
                      >
                        <Icon aria-hidden />
                      </AOFSidebarSectionLink>
                    </AOFSidebarMenuItem>
                  );
                  return section.minRole ? (
                    <Suspense fallback={null} key={label}>
                      <AOFRoleGatedSection section={section}>
                        {row}
                      </AOFRoleGatedSection>
                    </Suspense>
                  ) : (
                    row
                  );
                })}
              </AOFSidebarMenu>
            </nav>
          </AOFSidebarGroup>
        </AOFSidebarContent>
        {/* Clear of the home indicator and the rounded corner at every
            width: a phone turned sideways gets the wide layout. */}
        <AOFSidebarFooter className="relative pb-[max(--spacing(2),env(safe-area-inset-bottom))]">
          {account}
        </AOFSidebarFooter>
        {/* A mouse's edge to drag or click; the header's button is the one
            control assistive tech meets, so this duplicate stays hidden. */}
        <AOFSidebarRail aria-hidden title={common("toggleMenu")} />
      </AOFSidebar>
      {/* On a wider screen the page area is the visible height (`dvh`, so no band
          shows once Safari hides its toolbar) and scrolls
          itself, so a list's table fills what is left and keeps its own
          scroll bars on screen; a phone scrolls the page, pull to refresh
          included. Its pages' gutters clear every inset; the left one only
          when no sidebar stands beside it (AOFSidebarInset). */}
      <AOFSidebarInset className="md:h-dvh md:overflow-y-auto">
        <AOFFrameHeader className={classNames?.frameHeader}>
          {slots?.headerWall}
          <AOFSidebarTrigger
            aria-label={common("toggleMenu")}
            className="-ml-1 size-9.5 [&_svg:not([class*='size-'])]:size-5.5"
          />
          <AOFSeparator
            className="mr-2 data-vertical:h-4.5 data-vertical:self-auto"
            orientation="vertical"
          />
          {breadcrumb}
          {slots?.headerEnd}
        </AOFFrameHeader>
        {children}
      </AOFSidebarInset>
    </AOFSidebarProvider>
  );
};
