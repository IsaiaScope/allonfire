import type { Locale } from "@allonfire/core/features/i18n/constants/locales";
import {
  MAIL,
  type MailPurpose,
} from "@allonfire/core/features/mail/constants/mail";
import type {
  MailMessage,
  SendResult,
} from "@allonfire/core/features/mail/types/mail";
import { App } from "@allonfire/database/enums";
import { renderAOFEmail } from "@allonfire/ui/features/email/utils/render-aof-email";
import { TRANSLATION } from "../../i18n/constants/locales";
import { translate } from "../../i18n/translate";
import { EMAIL } from "../../mail/constants/email";
import { SERVICES } from "../constants/services";

type ProviderCheckDeps = {
  findProvider: (id: string) => Promise<{ name: string } | null | undefined>;
  /** Drops the provider's cached usage: a send moved the count. */
  forgetUsage: (providerId: string) => Promise<void>;
  logger: { warn: (bindings: object, message: string) => void };
  /** Where the keep-alive's check goes; unset, it sends nothing. */
  recipient: string | undefined;
  send: (
    message: MailMessage,
    options: { only: string; purpose: MailPurpose }
  ) => Promise<SendResult>;
};

const messageOf = async (
  provider: string,
  to: string,
  locale: Locale,
  purpose: MailPurpose
): Promise<MailMessage> => {
  const { html, text } = await renderAOFEmail({
    body: [translate("PROVIDER_CHECK_BODY", locale, { provider })],
    footnote: translate("EMAIL_FOOTNOTE", locale),
    heading: translate("PROVIDER_CHECK_HEADING", locale),
    language: locale,
    look: EMAIL.LOOK[App.BACK_OFFICE],
    preview: translate("PROVIDER_CHECK_HEADING", locale),
    purpose,
  });
  return {
    html,
    subject: translate("PROVIDER_CHECK_SUBJECT", locale, { provider }),
    text,
    to,
  };
};

/**
 * The check email a provider sends through itself alone: a test an Admin asks
 * for from the Back Office, or the keep-alive's to the owner. Both render the
 * same email; only the purpose, the address and the language differ.
 */
export const createProviderCheck = (deps: ProviderCheckDeps) => ({
  /** The owner's check; nothing is sent while no owner is set. */
  keepAlive: async ({
    id: providerId,
    name,
  }: {
    id: string;
    name: string;
  }): Promise<SendResult> => {
    if (!deps.recipient) {
      deps.logger.warn({ providerId }, SERVICES.LOG_MESSAGE.NO_RECIPIENT);
      return { outcome: MAIL.OUTCOME.UNAVAILABLE };
    }
    return deps.send(
      await messageOf(
        name,
        deps.recipient,
        TRANSLATION.DEFAULT_LOCALE,
        MAIL.PURPOSE.KEEP_ALIVE
      ),
      { only: providerId, purpose: MAIL.PURPOSE.KEEP_ALIVE }
    );
  },
  /** An Admin's test; null when the provider is gone. */
  test: async (
    providerId: string,
    to: string,
    locale: Locale
  ): Promise<SendResult | null> => {
    const provider = await deps.findProvider(providerId);
    if (!provider) {
      return null;
    }
    const sent = await deps.send(
      await messageOf(provider.name, to, locale, MAIL.PURPOSE.TEST),
      { only: providerId, purpose: MAIL.PURPOSE.TEST }
    );
    await deps.forgetUsage(providerId);
    return sent;
  },
});
