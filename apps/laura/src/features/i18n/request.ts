import type { Language } from "@allonfire/core/features/i18n/constants/locales";
import { AOFGetRequestConfig } from "@allonfire/core/features/next/i18n/utils/aof-get-request-config";
import { locale } from "next/root-params";
import { routing } from "./routing";
import EN from "./translations/en.json" with { type: "json" };

// next-intl reads the request config from this file in each App; the Back Office's
// twin loads its own words the same way.
// jscpd:ignore-start
// next-intl reads the request config from this file, and a dynamic `import()` takes a literal path, so each App holds its own loaders; the Back Office's twin loads its own words the same way.
/**
 * One loader per language. `satisfies` fails
 * when a language has no file or its file misses a key English has.
 */
const TRANSLATIONS = {
  // English is the source every other file is checked against, so it is
  // bundled; the rest load on demand.
  en: async () => EN,
  it: async () => (await import("./translations/it.json")).default,
} as const satisfies Record<Language, () => Promise<typeof EN>>;
// jscpd:ignore-end

export default AOFGetRequestConfig({
  locale,
  routing,
  translations: TRANSLATIONS,
});
