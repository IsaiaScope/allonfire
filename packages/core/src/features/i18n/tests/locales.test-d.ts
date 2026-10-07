import type { ElementOf } from "../../../shared/utils/object";
import {
  BASE_LANGUAGES,
  type ContentLanguage,
  DEFAULT_LANGUAGE,
  defineLanguages,
  type Language,
  type Locale,
  type SUPPORTED_LOCALES,
} from "../constants/locales";

// Every locale has a place in the preference order; a new one without it
// fails here instead of never being matched.
expectTypeOf<
  Exclude<Locale, ElementOf<typeof SUPPORTED_LOCALES>>
>().toBeNever();

// The base languages are English and Italian, and every locale speaks one.
expectTypeOf<Language>().toEqualTypeOf<"en" | "it">();
expectTypeOf<
  Locale extends `${infer L}-${string}` ? L : never
>().toEqualTypeOf<Language>();
expectTypeOf(DEFAULT_LANGUAGE).toEqualTypeOf<"en">();

// Every base language is a content language.
expectTypeOf<Exclude<Language, ContentLanguage>>().toBeNever();

// A Host's languages: the base ones first, then content languages.
expectTypeOf(defineLanguages([...BASE_LANGUAGES])).toEqualTypeOf<
  readonly ["en", "it"]
>();
// @ts-expect-error a Host cannot drop a base language
defineLanguages(["en"]);
// @ts-expect-error a language must be in CONTENT_LANGUAGES before a Host adds it
defineLanguages([...BASE_LANGUAGES, "fr"]);
