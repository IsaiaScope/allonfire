import { I18N } from "../../../i18n/constants/locales";
import { AOFDefineRouting } from "../aof-define-routing";

// The default locale is one of the Host's languages.
// @ts-expect-error "de" is not a language this Host routes
AOFDefineRouting(I18N.BASE_LANGUAGES, { defaultLocale: "de" });

// A Host routes every base language; it cannot drop one.
// @ts-expect-error "it" is missing
AOFDefineRouting(["en"]);

// Locales come from the languages, never as an option.
// @ts-expect-error locales are the first argument
AOFDefineRouting(I18N.BASE_LANGUAGES, { locales: ["en"] });

expectTypeOf(AOFDefineRouting(I18N.BASE_LANGUAGES).locales).toEqualTypeOf<
  readonly ["en", "it"]
>();
