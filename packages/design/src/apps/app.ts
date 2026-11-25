import { BACK_OFFICE_LOGO } from "./back-office/back-office-logo";
import { LAURA_LOGO } from "./laura/laura-logo";

/**
 * How every App is drawn: its name (never a translation) and its mark. The
 * keys are the `App` enum's values (this package imports no database), so an
 * App's `entries: Record<App, AppEntry>` fails to compile until a new App is
 * listed here.
 */
const ENTRY = {
  BACK_OFFICE: {
    mark: { logo: BACK_OFFICE_LOGO },
    name: BACK_OFFICE_LOGO.name,
  },
  LAURA: { mark: { logo: LAURA_LOGO }, name: LAURA_LOGO.name },
} as const;

const option = (app: keyof typeof ENTRY) => ({
  label: ENTRY[app].name,
  value: app,
});

/** The Apps, as every App's switcher, lists and filters draw them. */
export const APP = {
  ENTRY,
  /**
   * The App list's options for a filter, in the order the `App` enum declares
   * the Apps (Laura first; the Back Office's test pins it, since this package
   * cannot read the enum).
   */
  OPTIONS: [option("LAURA"), option("BACK_OFFICE")],
} as const;
