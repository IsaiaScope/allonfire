import type { ElementOf } from "@allonfire/utils/helpers/object";
import type { Locale, SUPPORTED_LOCALES } from "../constants/locales";

// Every locale has a place in the preference order; a new one without it
// fails here instead of never being matched.
expectTypeOf<
  Exclude<Locale, ElementOf<typeof SUPPORTED_LOCALES>>
>().toBeNever();
