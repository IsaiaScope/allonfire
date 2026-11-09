import { aofTranslators } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import EN from "../../features/i18n/translations/en.json" with { type: "json" };
import IT from "../../features/i18n/translations/it.json" with { type: "json" };

/**
 * The App's copy as a visitor reads it, core's `Common` text included: a test
 * names a control by `enT("Users.copy.label", { email })`, never by filling
 * `{email}` by hand. Relative imports, so e2e reads it too.
 */
export const { en: enT, it: itT } = aofTranslators({ en: EN, it: IT });
