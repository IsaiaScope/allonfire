import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { App } from "@allonfire/database/enums";
import {
  accessUserFrom,
  roleIn,
} from "@allonfire/database/features/auth/access/access";
import {
  AOFSidebarMenu,
  AOFSidebarMenuButton,
  AOFSidebarMenuItem,
} from "@allonfire/ui/components/aof-sidebar";
import { getTranslations } from "next-intl/server";
import { NAVIGATION } from "../constants/navigation";
import { AccountMenu } from "./account-menu";

/**
 * The signed-in User's menu, read at request time behind the frame's own
 * `<Suspense>`: the page check's own Session read (`requireAppSession`, one
 * per request), which redirects a visitor the App keeps out. Sign out submits the layout's form (`NAVIGATION.FORM.SIGN_OUT`),
 * outside the menu's popup.
 */
export const Account = async () => {
  const [session, t] = await Promise.all([
    requireAppSession(),
    getTranslations("Navigation"),
  ]);
  const role = roleIn(accessUserFrom(session.user), App.BACK_OFFICE);
  return (
    <AccountMenu
      email={session.user.email}
      image={session.user.image}
      labels={{
        account: t("account"),
        language: t("language"),
        signOut: t("signOut"),
        theme: t("theme"),
        themeDark: t("themeDark"),
        themeLight: t("themeLight"),
      }}
      name={session.user.name}
      role={role ? t(`role.${role}`) : ""}
      seal={role ? NAVIGATION.ROLE_SEAL[role] : undefined}
    />
  );
};

/**
 * The menu while the Session is read, in its button's shape: the avatar's
 * tile and two lines where the name and the email land, folded and unfolded
 * alike, so nothing moves when they do. Still, and fixed widths: shadcn's
 * skeleton pulses and picks a random width the static shell cannot
 * prerender.
 */
export const AccountPlaceholder = () => (
  <AOFSidebarMenu aria-hidden>
    <AOFSidebarMenuItem>
      <AOFSidebarMenuButton
        className="pointer-events-none"
        render={<div />}
        size="lg"
      >
        <span className="size-8 shrink-0 rounded-lg bg-muted group-data-[collapsible=icon]:mx-0.5" />
        <span className="grid flex-1 gap-1.5">
          <span className="h-3.5 w-28 rounded-sm bg-muted" />
          <span className="h-3 w-40 max-w-full rounded-sm bg-muted" />
        </span>
      </AOFSidebarMenuButton>
    </AOFSidebarMenuItem>
  </AOFSidebarMenu>
);
