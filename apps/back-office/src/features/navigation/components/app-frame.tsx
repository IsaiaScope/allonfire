import { AOFSeparator } from "@allonfire/ui/components/aof-separator";
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
} from "@allonfire/ui/components/aof-sidebar";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { Torii } from "@/shared/components/torii";
import { NAVIGATION, sidebarParam } from "../constants/navigation";
import { SECTIONS } from "../constants/sections";

import { CloseDrawerOnNavigate } from "./close-drawer-on-navigate";
import { FrameBreadcrumb } from "./frame-breadcrumb";
import { HeaderKanji } from "./header-kanji";
import { SidebarSectionLink } from "./section-link";
import { SidebarKanji } from "./sidebar-kanji";
import { SidebarParam } from "./sidebar-param";

export type AppFrameProps = {
  /** The account menu, in the sidebar's footer. */
  account: ReactNode;
  children: ReactNode;
  /** The App switcher, in the sidebar's header. */
  switcher: ReactNode;
};

/**
 * Every signed-in page's frame (ADR 0024), shadcn's `sidebar-07`: a sidebar
 * that collapses to icons (a drawer on a phone, opened from the header) with
 * the App switcher, the Sections and the account menu, and a header with the
 * breadcrumb. Static: it reads nothing of the request, so it is in the
 * shell; the switcher, the account menu and the page each read the Session
 * on their own.
 */
export const AppFrame = ({ account, children, switcher }: AppFrameProps) => {
  const t = useTranslations("Navigation");
  return (
    <AOFSidebarProvider>
      <Suspense fallback={null}>
        <SidebarParam />
      </Suspense>
      <Suspense fallback={null}>
        <CloseDrawerOnNavigate />
      </Suspense>
      <AOFSidebar
        collapsedBy={{
          param: NAVIGATION.PARAM.SIDEBAR,
          value: sidebarParam.serialize(false),
        }}
        label={t("menu")}
      >
        <SidebarKanji />
        {/* The station sign's band: the App's line under its name, level
              with the page header's line. On a phone the drawer runs to the
              screen's edges: keep clear of the notch above and the home
              indicator below. */}
        <AOFSidebarHeader className="relative justify-center border-line/50 border-b-2 max-md:pt-[max(--spacing(3),env(safe-area-inset-top))] max-md:pb-3 md:h-16 md:py-0">
          {switcher}
        </AOFSidebarHeader>
        <AOFSidebarContent className="relative">
          <AOFSidebarGroup className="py-4">
            <nav aria-label={t("menu")}>
              <AOFSidebarMenu>
                {SECTIONS.map(({ icon: Icon, label, path }) => (
                  <AOFSidebarMenuItem key={label}>
                    <SidebarSectionLink label={t(label)} path={path}>
                      <Icon aria-hidden />
                    </SidebarSectionLink>
                  </AOFSidebarMenuItem>
                ))}
              </AOFSidebarMenu>
            </nav>
          </AOFSidebarGroup>
        </AOFSidebarContent>
        <AOFSidebarFooter className="relative max-md:pb-[max(--spacing(2),env(safe-area-inset-bottom))]">
          {account}
        </AOFSidebarFooter>
        {/* A mouse's edge to drag or click; the header's button is the one
              control assistive tech meets, so this duplicate stays hidden. */}
        <AOFSidebarRail aria-hidden title={t("toggleMenu")} />
      </AOFSidebar>
      {/* On a wider screen the page area is the screen's height and scrolls
          itself, so a list's table fills what is left and keeps its own
          scroll bars on screen; a phone scrolls the page, pull to refresh
          included. */}
      <AOFSidebarInset className="md:h-svh md:overflow-y-auto">
        {/* The sidebar header's line runs on across the page's: one station
            sign, the App's line under it. */}
        <header className="relative isolate flex h-16 shrink-0 items-center gap-2 border-line/50 border-b-2 px-4">
          <HeaderKanji />
          <AOFSidebarTrigger
            aria-label={t("toggleMenu")}
            className="-ml-1 size-9.5 [&_svg:not([class*='size-'])]:size-5.5"
          />
          <AOFSeparator
            className="mr-2 data-vertical:h-4.5 data-vertical:self-auto"
            orientation="vertical"
          />
          <FrameBreadcrumb />
          <Torii className="ml-auto h-10.5 w-12.5" />
        </header>
        {children}
      </AOFSidebarInset>
    </AOFSidebarProvider>
  );
};
