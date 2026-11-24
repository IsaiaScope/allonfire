import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import type { AppSwitcherDescriptor } from "../types/app-descriptor";

/** One entry of the switcher's menu. */
export type SwitcherEntry = {
  app: App;
  /** The address without its scheme, shown under the name. */
  host: string;
  href: string;
  name: string;
};

/**
 * The switcher's entries, in `App`'s order: the other Apps the User is
 * allowed into (`enterable`, from `enterableApps`) that have an address,
 * named as `app.entries` draws them. The App you are in is not one: its
 * button already shows it.
 */
export const switcherApps = (
  app: Pick<AppSwitcherDescriptor, "app" | "entries">,
  enterable: readonly App[],
  addresses: Partial<Record<App, string | undefined>>
): SwitcherEntry[] =>
  objectValues(App).flatMap((other) => {
    const href = addresses[other];
    if (other === app.app || !(enterable.includes(other) && href)) {
      return [];
    }
    return [
      {
        app: other,
        host: new URL(href).host,
        href,
        name: app.entries[other].name,
      },
    ];
  });
