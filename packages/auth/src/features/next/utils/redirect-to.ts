import { LANGUAGES, languageSchema } from "@allonfire/utils/constants/locales";
import { redirect } from "next/navigation";
import type { AppPath } from "../constants/access";

/**
 * The locale a form bound to its action (`action.bind(null, locale)`).
 * `next/root-params` does not work in Server Actions yet, so next-intl's
 * `getLocale` cannot read it there; next-intl's docs pass it from the call
 * site instead. It comes from the browser, so anything but a known language
 * falls back to the first one.
 */
export const languageOf = (locale: unknown) => {
  const language = languageSchema.safeParse(locale);
  return language.success ? language.data : LANGUAGES[0];
};

/**
 * Redirects to one of the App's paths in a locale (`languageOf`). With the
 * locale in front the path is a string an App's typed routes accept, and the
 * App's proxy has nothing left to fix.
 */
export const redirectTo = (locale: string, path: AppPath): never =>
  redirect(`/${languageOf(locale)}${path}`);
