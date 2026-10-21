import { getSession } from "@allonfire/auth/features/next/utils/session";
import { App } from "@allonfire/database/enums";
import {
  accessUserFrom,
  roleIn,
} from "@allonfire/database/features/auth/access/access";
import { getTranslations } from "next-intl/server";
import { NAVIGATION } from "../constants/navigation";
import { AccountMenu } from "./account-menu";

/**
 * The signed-in User's menu, read at request time behind the frame's own
 * `<Suspense>`: the same Session read as the page's check (`getSession` is
 * cached per request). Nothing for a visitor without one; the page redirects
 * them. Sign out submits the layout's form (`NAVIGATION.FORM.SIGN_OUT`),
 * outside the menu's popup.
 */
export const Account = async () => {
  const [session, t] = await Promise.all([
    getSession(),
    getTranslations("Navigation"),
  ]);
  if (!session) {
    return null;
  }
  const role = roleIn(accessUserFrom(session.user), App.BACK_OFFICE);
  return (
    <AccountMenu
      email={session.user.email}
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
 * The menu's place while the Session is read: its button's height. Not
 * shadcn's skeleton, whose random width the static shell cannot prerender.
 */
export const AccountPlaceholder = () => <div aria-hidden className="h-12" />;
