import type { App, Role } from "@allonfire/database/enums";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import type { TablerIcon } from "@tabler/icons-react";

/** An App's mark: its Brand logo, or a pictogram. */
type AppMark = { icon: TablerIcon } | { logo: AppLogo };

/** How an App draws an App (itself or another) in its switcher and lists. */
export type AppEntry = { mark: AppMark; name: string };

/** A Section's own page, listed under it in the sidebar. */
export type AppSubPage = { icon: TablerIcon; label: string; path: string };

/**
 * One row of an App's menu. `label` and each page's `label` are keys of the
 * App's own `Navigation` translations; `path` follows the locale (Home's is
 * `AUTH.PAGE.HOME`, empty, and always the first Section).
 */
export type AppSection = {
  icon: TablerIcon;
  label: string;
  path: string;
  /**
   * Above the App's floor (`ACCESS.APP_SETTINGS[app].minRole`): the proxy
   * gate, the page check, the menu and the guard test read it, and the API
   * enforces it again. Absent: the App's floor.
   */
  minRole?: Role;
  pages?: readonly AppSubPage[];
};

/** The slice of an App the switcher draws: its mark and the Apps beside it. */
export type AppSwitcherDescriptor = Pick<
  AppDescriptor,
  "app" | "entries" | "name"
>;

/**
 * What an App tells the shared frame about itself. `S` is the App's own
 * Section type, so its labels stay literal where it reads them.
 */
export type AppDescriptor<S extends AppSection = AppSection> = {
  /** Which App this is (auth's `AUTH_APP` names the same). */
  app: App;
  /** How this App draws every App in its switcher. */
  entries: Record<App, AppEntry>;
  /** The share card's top band colour. */
  line: string;
  /** The Brand logo: tab icon, tile, share card, launch screens. */
  logo: AppLogo;
  /** Never translated. */
  name: string;
  /** The menu's order: Home first, so there is always one. */
  sections: readonly [S, ...S[]];
  shareImageAlt: string;
};
