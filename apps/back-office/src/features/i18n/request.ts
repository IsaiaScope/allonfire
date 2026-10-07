import type { Language } from "@allonfire/core/features/i18n/constants/locales";
import { AOFGetRequestConfig } from "@allonfire/core/features/next/i18n/aof-get-request-config";
import { locale } from "next/root-params";
import { routing } from "./routing";
import EN from "./translations/en.json" with { type: "json" };

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

export default AOFGetRequestConfig({
  locale,
  routing,
  translations: TRANSLATIONS,
});
