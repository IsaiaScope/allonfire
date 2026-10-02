import { defineRouting, type RoutingConfig } from "next-intl/routing";
import { LANGUAGES, type Language } from "../../constants/locales";

type Options = Omit<
  RoutingConfig<typeof LANGUAGES, "as-needed", never, never>,
  "defaultLocale" | "locales" | "localePrefix"
> & { defaultLocale?: Language | undefined };

/**
 * Every App routes the shared LANGUAGES with a prefix only when needed; it
 * picks its default and any other next-intl option. Localized `pathnames` and
 * `domains` are left out until an App needs them.
 */
export const AOFDefineRouting = ({
  defaultLocale = "en",
  ...options
}: Options = {}) =>
  defineRouting({
    ...options,
    defaultLocale,
    localePrefix: "as-needed",
    locales: LANGUAGES,
  });
