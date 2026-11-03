import { createTranslator } from "next-intl";
import type { Language } from "../../../i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "../translations/shared-translations";

/**
 * An App's messages in a language with core's shared `Common` text under them,
 * the way `AOFGetRequestConfig` serves them: what a test hands
 * `NextIntlClientProvider`.
 * @internal
 */
export const aofMessages = <M extends object>(
  language: Language,
  messages: M
) => ({
  ...SHARED_TRANSLATIONS[language],
  ...messages,
});

/**
 * One translator per base language over an App's messages and the shared
 * text: a test reads copy as a visitor sees it, `t.en("Users.copy.label",
 * { email })`, never filling `{email}` by hand. A new base language fails the
 * `satisfies` until it has its translator.
 * @internal
 */
export const aofTranslators = <M extends object>(messages: {
  readonly en: M;
  readonly it: M;
}) =>
  ({
    en: createTranslator({
      locale: "en",
      messages: aofMessages("en", messages.en),
    }),
    it: createTranslator({
      locale: "it",
      messages: aofMessages("it", messages.it),
    }),
  }) satisfies Record<Language, unknown>;
