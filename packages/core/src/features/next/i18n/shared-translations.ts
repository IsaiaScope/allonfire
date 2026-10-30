import type { Language } from "../../i18n/constants/locales";
import EN from "./translations/en.json" with { type: "json" };
import IT from "./translations/it.json" with { type: "json" };

/** The shape of the shared text; a Host adding a language supplies one. */
export type SharedTranslations = typeof EN;

/**
 * Text every App shows, under the reserved `Common` namespace; each App's own
 * translations are merged on top. `satisfies` fails when a base language has
 * none.
 */
export const SHARED_TRANSLATIONS = {
  en: EN,
  it: IT,
} as const satisfies Record<Language, SharedTranslations>;
