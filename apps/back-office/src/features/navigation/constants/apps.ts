import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { APP_ENTRY } from "@/shared/constants/apps";

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
