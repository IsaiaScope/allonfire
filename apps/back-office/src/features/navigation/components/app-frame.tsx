import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofLogoDataUrl } from "@allonfire/design/brand/aof-logo";
import { AOFImage } from "@allonfire/ui/components/aof-image";
import {
  AOFSidebar,
  AOFSidebarContent,
  AOFSidebarFooter,
  AOFSidebarHeader,
  AOFSidebarInset,
  AOFSidebarMenu,
  AOFSidebarMenuItem,
  AOFSidebarProvider,
  AOFSidebarTrigger,
} from "@allonfire/ui/components/aof-sidebar";
import {
  AOF_TAB_BAR_CLEARANCE,
  AOFTabBar,
} from "@allonfire/ui/components/aof-tab-bar";
import { cn } from "@allonfire/ui/lib/utils";
import { useTranslations } from "next-intl";
import { type ReactNode, Suspense } from "react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { SECTIONS } from "../constants/sections";
import { SidebarSectionLink, TabSectionLink } from "./section-link";
import { SidebarParam } from "./sidebar-param";

/** The logo's side in the sidebar's header (`size-8`). */
const LOGO_SIZE = 32;

// Inlined in the HTML, so the logo paints with the frame. One per theme,
// shown by the theme toggle's `.dark` class: `auto` would follow the system.
const LOGOS = [
  { className: "dark:hidden", scheme: METADATA.LOGO.SCHEME.LIGHT },
  { className: "hidden dark:block", scheme: METADATA.LOGO.SCHEME.DARK },
].map(({ className, scheme }) => ({
  className,
  scheme,
  src: aofLogoDataUrl({
    app: BACK_OFFICE.LOGO,
    layout: METADATA.LOGO.LAYOUT.SQUARE,
    scheme,
  }),
}));

export type AppFrameProps = {
  /** The account menu, rendered in the sidebar's footer and the top bar. */
  account: ReactNode;
  children: ReactNode;
};

/**
 * Every signed-in page's frame (ADR 0024): the sidebar on desktop, the top
 * bar and tab bar on a phone, both menus drawn from the one Sections list.
 * Static: it reads nothing of the request, so it is in the shell; the page
 * area under it checks the Session.
 */
export const AppFrame = ({ account, children }: AppFrameProps) => {
  const t = useTranslations("Navigation");
  return (
    <AOFSidebarProvider>
      <Suspense fallback={null}>
        <SidebarParam />
      </Suspense>
      <AOFSidebar>
        <AOFSidebarHeader className="flex-row items-center gap-2 px-3 py-4 group-data-[collapsible=icon]:px-2">
          {/* The square logo in the theme's scheme; the name beside it. */}
          {LOGOS.map(({ className, scheme, src }) => (
            <AOFImage
              alt=""
              className={cn("size-8 shrink-0 rounded-md", className)}
              height={LOGO_SIZE}
              key={scheme}
              sizes={`${LOGO_SIZE}px`}
              src={src}
              width={LOGO_SIZE}
            />
          ))}
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">
            {BACK_OFFICE.NAME}
          </span>
        </AOFSidebarHeader>
        <AOFSidebarContent>
          <nav aria-label={t("menu")}>
            <AOFSidebarMenu>
              {SECTIONS.map(({ icon: Icon, label, path }, index) => (
                <AOFSidebarMenuItem key={label}>
                  <SidebarSectionLink
                    label={t(label)}
                    last={index === SECTIONS.length - 1}
                    path={path}
                  >
                    <Icon aria-hidden />
                  </SidebarSectionLink>
                </AOFSidebarMenuItem>
              ))}
            </AOFSidebarMenu>
          </nav>
        </AOFSidebarContent>
        <AOFSidebarFooter className="max-md:hidden">{account}</AOFSidebarFooter>
      </AOFSidebar>
      <AOFSidebarInset className={AOF_TAB_BAR_CLEARANCE}>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <AOFSidebarTrigger
            aria-label={t("toggleMenu")}
            className="max-md:hidden"
          />
          <span className="font-semibold md:hidden">{BACK_OFFICE.NAME}</span>
          <div className="ml-auto md:hidden">{account}</div>
        </header>
        {children}
      </AOFSidebarInset>
      <AOFTabBar label={t("menu")}>
        {SECTIONS.map(({ icon: Icon, label, path }) => (
          <TabSectionLink key={label} label={t(label)} path={path}>
            <Icon aria-hidden />
          </TabSectionLink>
        ))}
      </AOFTabBar>
    </AOFSidebarProvider>
  );
};
