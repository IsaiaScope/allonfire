import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { App } from "@allonfire/database/enums";
import {
  accessUserFrom,
  enterableApps,
} from "@allonfire/database/features/auth/access/access";
import {
  AOFSidebarMenu,
  AOFSidebarMenuButton,
  AOFSidebarMenuItem,
} from "@allonfire/ui/components/aof-sidebar";
import { cn } from "@allonfire/ui/lib/utils";
import { getTranslations } from "next-intl/server";
import { env } from "@/environment/environment";
import { switcherApps } from "../constants/apps";
import { AppSwitcherMenu } from "./app-switcher-menu";
import { CurrentAppMark, switcherButton } from "./current-app-mark";

/**
 * The App you are in, drawn as the switcher's button but with no menu: the
 * frame's static shell, and what a visitor without a Session sees.
 */
export const CurrentApp = () => (
  <AOFSidebarMenu>
    <AOFSidebarMenuItem>
      {/* The switcher's own button, folded and unfolded alike, opening
          nothing: the menu replaces it without a pixel moving. */}
      <AOFSidebarMenuButton
        className={cn("pointer-events-none", switcherButton())}
        render={<div />}
        size="lg"
      >
        <CurrentAppMark />
      </AOFSidebarMenuButton>
    </AOFSidebarMenuItem>
  </AOFSidebarMenu>
);

/**
 * The App switcher, read at request time behind the frame's own
 * `<Suspense>` (ADR 0024): the other Apps the signed-in User is allowed
 * into, each with a known address (`LAURA_URL`; unset, Laura is not listed).
 * With none, the button is the App you are in and opens nothing. The
 * Session is the page check's own read (`requireAppSession`, one per
 * request), so the frame asks the API nothing more.
 */
export const AppSwitcher = async () => {
  const [session, t] = await Promise.all([
    requireAppSession(),
    getTranslations("Navigation"),
  ]);
  const apps = switcherApps(
    enterableApps(accessUserFrom(session.user)),
    { [App.LAURA]: env.LAURA_URL },
    App.BACK_OFFICE
  );
  return apps.length > 0 ? (
    <AppSwitcherMenu
      apps={apps}
      labels={{ apps: t("apps"), switchApp: t("switchApp") }}
    />
  ) : (
    <CurrentApp />
  );
};
