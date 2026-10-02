import type { ElementOf } from "../../helpers/object";
import type {
  LANGUAGES,
  Language,
  Locale,
  SUPPORTED_LOCALES,
} from "../locales";

// Every locale has a place in the preference order; a new one without it
// fails here instead of never being matched.
expectTypeOf<
  Exclude<Locale, ElementOf<typeof SUPPORTED_LOCALES>>
>().toBeNever();

// Language is derived from LOCALE; a locale in a new language fails here
// until LANGUAGES lists it.
expectTypeOf<Exclude<Language, ElementOf<typeof LANGUAGES>>>().toBeNever();
expectTypeOf<Language>().toEqualTypeOf<"en" | "it">();
