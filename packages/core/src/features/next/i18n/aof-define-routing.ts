import { defineRouting, type RoutingConfig } from "next-intl/routing";
import type { ElementOf } from "../../../shared/utils/object";
import type { HostLanguages } from "../../i18n/constants/locales";

type Options<L extends HostLanguages> = Omit<
  RoutingConfig<L, "as-needed", never, never>,
  "defaultLocale" | "locales" | "localePrefix"
> & { defaultLocale?: ElementOf<L> | undefined };

/**
 * Every App routes its Host's languages (`BASE_LANGUAGES`, or its own from
 * `defineLanguages`) with a prefix only when needed, the first one
 * (`DEFAULT_LANGUAGE`) unless it picks another default. Localized `pathnames` and `domains` are
 * left out until an App needs them.
 */
export const AOFDefineRouting = <const L extends HostLanguages>(
  languages: L,
  { defaultLocale, ...options }: Options<L> = {}
) =>
  defineRouting({
    ...options,
    // A Host's languages start with the base ones, so this is DEFAULT_LANGUAGE.
    defaultLocale: defaultLocale ?? languages[0],
    localePrefix: "as-needed",
    locales: languages,
  });
