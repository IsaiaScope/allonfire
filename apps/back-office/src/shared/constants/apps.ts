import { App } from "@allonfire/database/enums";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { IconLibraryPhoto, type TablerIcon } from "@tabler/icons-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/** An App's mark: its Brand logo, or a pictogram. */
export type AppMark = { icon: TablerIcon } | { logo: AppLogo };

/**
 * How the Back Office draws each App: its name (never a translation) and
 * its mark, for the App switcher and the Users list. Keyed by
 * `App`, so a new App fails here until it is listed.
 * ponytail: Laura's pictogram until its rebuild brings a Brand logo.
 */
export const APP_ENTRY = {
  [App.BACK_OFFICE]: {
    mark: { logo: BACK_OFFICE.LOGO },
    name: BACK_OFFICE.NAME,
  },
  [App.LAURA]: { mark: { icon: IconLibraryPhoto }, name: "Laura" },
} as const satisfies Record<App, { mark: AppMark; name: string }>;
