import { BASE_LANGUAGES } from "../../../i18n/constants/locales";
import { AOFDefineRouting } from "../aof-define-routing";

// The default locale is one of the Host's languages.
// @ts-expect-error "de" is not a language this Host routes
AOFDefineRouting(BASE_LANGUAGES, { defaultLocale: "de" });

// A Host routes every base language; it cannot drop one.
// @ts-expect-error "it" is missing
AOFDefineRouting(["en"]);

// Locales come from the languages, never as an option.
// @ts-expect-error locales are the first argument
AOFDefineRouting(BASE_LANGUAGES, { locales: ["en"] });

expectTypeOf(AOFDefineRouting(BASE_LANGUAGES).locales).toEqualTypeOf<
  readonly ["en", "it"]
>();
