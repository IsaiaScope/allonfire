import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { LAURA_LOGO } from "@allonfire/design/apps/laura/laura-logo";
import type { AppEntry } from "@allonfire/ui/features/navigation/types/app-descriptor";
import { BACK_OFFICE_BASE } from "./back-office-base";

/**
 * How the Back Office draws each App: its name (never a translation) and
 * its mark, for the App switcher and the Users list. Keyed by
 * `App`, so a new App fails here until it is listed.
 */
export const APP_ENTRY = {
  [App.BACK_OFFICE]: {
    mark: { logo: BACK_OFFICE_BASE.LOGO },
    name: BACK_OFFICE_BASE.NAME,
  },
  [App.LAURA]: { mark: { logo: LAURA_LOGO }, name: LAURA_LOGO.name },
} as const satisfies Record<App, AppEntry>;

/** The App list's options for a filter, in the order the enum declares them. */
export const APP_OPTIONS = objectValues(App).map((app) => ({
  label: APP_ENTRY[app].name,
  value: app,
}));
