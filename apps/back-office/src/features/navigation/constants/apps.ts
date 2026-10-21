import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { Images, type LucideIcon } from "lucide-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/** An App's mark: its Brand logo, or a pictogram. */
export type AppMark = { icon: LucideIcon } | { logo: AppLogo };

/**
 * How the App switcher draws each App: its name and its mark. Keyed by
 * `App`, so a new App fails here until it is listed.
 * ponytail: Laura's pictogram until its rebuild brings a Brand logo.
 */
export const APP_ENTRY = {
  [App.BACK_OFFICE]: {
    mark: { logo: BACK_OFFICE.LOGO },
    name: BACK_OFFICE.NAME,
  },
  [App.LAURA]: { mark: { icon: Images }, name: "Laura" },
} as const satisfies Record<App, { mark: AppMark; name: string }>;

/** One entry of the switcher's menu. */
export type SwitcherApp = {
  app: App;
  /** The address without its scheme, shown under the name. */
  host: string;
  href: string;
  name: string;
};

/**
 * The switcher's entries, in `App`'s order: the other Apps the User is
 * allowed into (`apps`, from `enterableApps`) that have an address. The App
 * you are in is not one: its button already shows it.
 */
export const switcherApps = (
  apps: readonly App[],
  addresses: Partial<Record<App, string>>,
  current: App
): SwitcherApp[] =>
  objectValues(App).flatMap((app) => {
    const href = addresses[app];
    if (app === current || !(apps.includes(app) && href)) {
      return [];
    }
    return [{ app, host: new URL(href).host, href, name: APP_ENTRY[app].name }];
  });
