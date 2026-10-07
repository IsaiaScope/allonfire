import { notFound } from "next/navigation";
import { type AbstractIntlMessages, hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import type { ContentLanguage, Language } from "../../i18n/constants/locales";
import {
  SHARED_TRANSLATIONS,
  type SharedTranslations,
} from "./shared-translations";

/**
 * The shared text for the languages a Host adds: core has it for the base
 * ones only, so a Host routing another must pass it, or fail to compile.
 */
export type SharedTranslationsFor<L extends string> = [
  Exclude<L, Language>,
] extends [never]
  ? { shared?: undefined }
  : { shared: Record<Exclude<L, Language>, SharedTranslations> };

type Options<L extends ContentLanguage> = {
  routing: { locales: readonly L[] };
  /** `locale` from `next/root-params`, whose exports each App generates. */
  locale: () => Promise<string | undefined>;
  /** The App's own translations, one loader per language it routes. */
  translations: Record<L, () => Promise<AbstractIntlMessages>>;
} & SharedTranslationsFor<L>;

/**
 * next-intl's request config: the root-param locale, 404 on one not routed,
 * and the shared `Common` translations under the App's own. next-intl calls
 * them `messages`; that key is its API, every other name here says
 * translations.
 */
export const AOFGetRequestConfig = <L extends ContentLanguage>({
  routing,
  locale,
  translations,
  shared,
}: Options<L>) => {
  // ponytail: string-keyed inside; the Options type already proved every
  // routed language has its shared text.
  const sharedText: Partial<Record<string, SharedTranslations>> = {
    ...SHARED_TRANSLATIONS,
    ...shared,
  };
  return getRequestConfig(async () => {
    const requested = await locale();
    if (!hasLocale(routing.locales, requested)) {
      notFound();
    }
    return {
      locale: requested,
      messages: {
        ...sharedText[requested],
        ...(await translations[requested]()),
      },
    };
  });
};
