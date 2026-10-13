import type { ElementOf } from "../../../shared/utils/object";
import {
  type ContentLanguage,
  defineLanguages,
  I18N,
  type Language,
  type Locale,
} from "../constants/locales";

// Every locale has a place in the preference order; a new one without it
// fails here instead of never being matched.
expectTypeOf<
  Exclude<Locale, ElementOf<typeof I18N.SUPPORTED_LOCALES>>
>().toBeNever();

// The base languages are English and Italian, and every locale speaks one.
expectTypeOf<Language>().toEqualTypeOf<"en" | "it">();
expectTypeOf<
  Locale extends `${infer L}-${string}` ? L : never
>().toEqualTypeOf<Language>();
expectTypeOf(I18N.DEFAULT_LANGUAGE).toEqualTypeOf<"en">();

// Every base language is a content language.
expectTypeOf<Exclude<Language, ContentLanguage>>().toBeNever();

// A Host's languages: the base ones first, then content languages.
expectTypeOf(defineLanguages([...I18N.BASE_LANGUAGES])).toEqualTypeOf<
  readonly ["en", "it"]
>();
// @ts-expect-error a Host cannot drop a base language
defineLanguages(["en"]);
// @ts-expect-error a language must be in I18N.CONTENT_LANGUAGES before a Host adds it
defineLanguages([...I18N.BASE_LANGUAGES, "fr"]);
