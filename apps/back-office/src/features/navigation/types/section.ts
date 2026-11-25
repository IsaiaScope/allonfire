import type {
  AppSection,
  AppSubPage,
} from "@allonfire/ui/features/navigation/types/app-descriptor";

/**
 * A Section's key in `Navigation` (its menu label and page title); `t()`
 * checks each against the translations where it is read.
 */
type SectionLabel = "home" | "services" | "storage" | "users";

/** A Section's own page's key in `Navigation`, as the sub-menu names it. */
type SectionPageLabel = "images" | "mail";

/** One of a Section's own pages, listed under it in the sidebar. */
type SectionSubPage = AppSubPage & { label: SectionPageLabel };

/** The Back Office's Section: the shared one with its own keys for labels. */
export type Section = AppSection & {
  label: SectionLabel;
  pages?: readonly SectionSubPage[];
};
