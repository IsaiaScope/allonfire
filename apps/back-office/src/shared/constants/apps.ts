import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import type { AppEntry } from "@allonfire/ui/features/navigation/types/app-descriptor";
import { IconLibraryPhoto } from "@tabler/icons-react";
import { BACK_OFFICE_BASE } from "./back-office-base";

/**
 * How the Back Office draws each App: its name (never a translation) and
 * its mark, for the App switcher and the Users list. Keyed by
 * `App`, so a new App fails here until it is listed.
 * ponytail: Laura's pictogram until its rebuild brings a Brand logo.
 */
export const APP_ENTRY = {
  [App.BACK_OFFICE]: {
    mark: { logo: BACK_OFFICE_BASE.LOGO },
    name: BACK_OFFICE_BASE.NAME,
  },
  [App.LAURA]: { mark: { icon: IconLibraryPhoto }, name: "Laura" },
} as const satisfies Record<App, AppEntry>;

/** The App list's options for a filter, in the order the enum declares them. */
export const APP_OPTIONS = objectValues(App).map((app) => ({
  label: APP_ENTRY[app].name,
  value: app,
}));
