import type { Language } from "../../constants/locales";
import EN from "./translations/en.json" with { type: "json" };
import IT from "./translations/it.json" with { type: "json" };

/**
 * Text every App shows, under the reserved `Common` namespace; each App's own
 * translations are merged on top. `satisfies` fails when a language has none.
 */
export const SHARED_TRANSLATIONS = {
  en: EN,
  it: IT,
} as const satisfies Record<Language, typeof EN>;
