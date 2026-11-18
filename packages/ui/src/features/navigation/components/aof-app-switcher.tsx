import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import type { App } from "@allonfire/database/enums";
import {
  accessUserFrom,
  enterableApps,
} from "@allonfire/database/features/auth/access/access";
import { getTranslations } from "next-intl/server";
import { cn } from "../../../shared/utils/utils";
import type { AppDescriptor } from "../types/app-descriptor";
import { switcherApps } from "../utils/switcher-apps";
import { AOFAppSwitcherMenu } from "./aof-app-switcher-menu";
import { AOFCurrentAppMark, aofSwitcherButton } from "./aof-current-app-mark";
import {
  AOFSidebarMenu,
  AOFSidebarMenuButton,
  AOFSidebarMenuItem,
} from "./aof-sidebar";

type SwitcherApp = Pick<AppDescriptor, "app" | "entries" | "name">;

/**
 * The App you are in, drawn as the switcher's button but with no menu: the
 * frame's static shell, and what a visitor without a Session sees.
 */
export const AOFCurrentApp = ({ app }: { app: SwitcherApp }) => (
  <AOFSidebarMenu>
    <AOFSidebarMenuItem>
      {/* The switcher's own button, folded and unfolded alike, opening
          nothing: the menu replaces it without a pixel moving. */}
      <AOFSidebarMenuButton
        className={cn("pointer-events-none", aofSwitcherButton())}
        render={<div />}
        size="lg"
      >
        <AOFCurrentAppMark app={app} />
      </AOFSidebarMenuButton>
    </AOFSidebarMenuItem>
  </AOFSidebarMenu>
);

/**
 * The App switcher, read at request time behind the frame's own
 * `<Suspense>` (ADR 0024): the other Apps the signed-in User is allowed
 * into, each with a known address (`addresses`, the App's own variables;
 * unset, an App is not listed). With none, the button is the App you are in
 * and opens nothing. The Session is the page check's own read
 * (`requireAppSession`, one per request), so the frame asks the API nothing
 * more.
 */
export const AOFAppSwitcher = async ({
  addresses,
  app,
}: {
  addresses: Partial<Record<App, string | undefined>>;
  app: SwitcherApp;
}) => {
  const [session, t] = await Promise.all([
    requireAppSession(),
    getTranslations("Common.Navigation"),
  ]);
  const apps = switcherApps(
    app,
    enterableApps(accessUserFrom(session.user)),
    addresses
  );
  return apps.length > 0 ? (
    <AOFAppSwitcherMenu
      app={app}
      apps={apps}
      labels={{ apps: t("apps"), switchApp: t("switchApp") }}
    />
  ) : (
    <AOFCurrentApp app={app} />
  );
};
