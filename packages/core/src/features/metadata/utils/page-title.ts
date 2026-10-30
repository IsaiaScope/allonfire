import { SEPARATOR } from "../../../shared/constants/separators";

/**
 * A page's tab title in any App: its own, then the App's name. `%s` as the
 * title builds Next's `title.template` for the App's layout.
 */
export const pageTitle = (title: string, app: string) =>
  `${title}${SEPARATOR.TITLE}${app}`;
