import { notFound } from "next/navigation";
import { type AbstractIntlMessages, hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import type { Language } from "../../constants/locales";
import { SHARED_TRANSLATIONS } from "./shared-translations";

type Options<L extends Language> = {
  routing: { locales: readonly L[] };
  /** `locale` from `next/root-params`, whose exports each App generates. */
  locale: () => Promise<string | undefined>;
  /** The App's own translations for a language. */
  translations: (locale: L) => Promise<AbstractIntlMessages>;
};

/**
 * next-intl's request config: the root-param locale, 404 on one not routed,
 * and the shared `Common` translations under the App's own. next-intl calls
 * them `messages`; that key is its API, every other name here says
 * translations.
 */
export const AOFGetRequestConfig = <L extends Language>({
  routing,
  locale,
  translations,
}: Options<L>) =>
  getRequestConfig(async () => {
    const requested = await locale();
    if (!hasLocale(routing.locales, requested)) {
      notFound();
    }
    return {
      locale: requested,
      messages: {
        ...SHARED_TRANSLATIONS[requested],
        ...(await translations(requested)),
      },
    };
  });
