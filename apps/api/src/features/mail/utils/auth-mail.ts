import type { AuthMail } from "@allonfire/auth/features/server/utils/mail-options";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { Locale } from "@allonfire/core/features/i18n/constants/locales";
import {
  MAIL,
  type MailPurpose,
} from "@allonfire/core/features/mail/constants/mail";
import type {
  MailLogger,
  MailMessage,
  SendResult,
} from "@allonfire/core/features/mail/types/mail";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { appSchema } from "@allonfire/database/features/auth/access/constants/schemas";
import {
  AOF_EMAIL_LOOK,
  type AOFEmailLook,
  type AOFEmailProps,
} from "@allonfire/ui/features/email/components/aof-email";
import { renderAOFEmail } from "@allonfire/ui/features/email/utils/render-aof-email";
import { resolveLocale } from "../../i18n/middleware/locale-resolver";
import { translate } from "../../i18n/translate";
import { EMAIL } from "../constants/email";
import type { AddressLimit } from "./address-limit";

export type AuthMailDeps = {
  limit: AddressLimit;
  /** Sends through the MAIL Service's providers. */
  send: (message: MailMessage, purpose: MailPurpose) => Promise<SendResult>;
  logger: MailLogger;
};

/** An email's words, chosen for its reader. */
type Composed = Omit<AOFEmailProps, "language" | "look" | "purpose"> & {
  subject: string;
};

/** How long the link in the email works, in the reader's language. */
const expiry = (locale: Locale) =>
  translate("EMAIL_LINK_EXPIRY", locale, {
    minutes: AUTH.MAIL.LINK_EXPIRES_IN_S / UNIT.SECONDS_PER_MINUTE,
  });

/** The App the request names and the reader's language; the shared look and English without them. */
const readerOf = (request: Request | undefined) => {
  const app = appSchema.safeParse(request?.headers.get(AUTH.HEADER.APP));
  const locale = resolveLocale(
    request?.headers.get(HTTP.HEADER.ACCEPT_LANGUAGE) ?? undefined
  );
  const look: AOFEmailLook = app.success
    ? EMAIL.LOOK[app.data]
    : AOF_EMAIL_LOOK;
  return { locale, look };
};

/**
 * The emails Better Auth asks for, as the API sends them: each counted
 * against the reader's address first (five in any rolling hour, whichever
 * route asks), then rendered in the App's look and the reader's language,
 * then sent. A refusal sends nothing and is only logged: the response went
 * out already and said the same for every address.
 */
export const createAuthMail = (deps: AuthMailDeps): AuthMail => {
  const deliver = async (
    email: string,
    purpose: MailPurpose,
    request: Request | undefined,
    compose: (locale: Locale, app: string) => Composed
  ) => {
    let room: boolean;
    try {
      room = await deps.limit.take(email);
    } catch (error) {
      deps.logger.error(
        { err: error, purpose },
        EMAIL.LOG_MESSAGE.LIMIT_UNAVAILABLE
      );
      return;
    }
    if (!room) {
      deps.logger.warn({ purpose }, EMAIL.LOG_MESSAGE.ADDRESS_LIMITED);
      return;
    }
    const { locale, look } = readerOf(request);
    const { subject, ...words } = compose(locale, look.brand);
    const { html, text } = await renderAOFEmail({
      ...words,
      language: locale,
      look,
      purpose,
    });
    const { outcome } = await deps.send(
      { html, subject, text, to: email },
      purpose
    );
    if (outcome !== MAIL.OUTCOME.ACCEPTED) {
      deps.logger.warn({ outcome, purpose }, EMAIL.LOG_MESSAGE.NOT_SENT);
    }
  };

  return {
    ready: deps.limit.ready,
    sendPasswordReset: async ({ email, redirectTo, token }, request) => {
      if (!redirectTo) {
        deps.logger.warn({}, EMAIL.LOG_MESSAGE.NO_RESET_PAGE);
        return;
      }
      const link = new URL(redirectTo);
      link.searchParams.set(AUTH.MAIL.TOKEN_PARAM, token);
      await deliver(
        email,
        MAIL.PURPOSE.PASSWORD_RESET,
        request,
        (locale, app) => ({
          action: {
            href: link.toString(),
            label: translate("RESET_PASSWORD_ACTION", locale),
          },
          body: [
            translate("RESET_PASSWORD_BODY", locale, { app }),
            expiry(locale),
          ],
          footnote: translate("EMAIL_FOOTNOTE", locale),
          heading: translate("RESET_PASSWORD_HEADING", locale),
          preview: translate("RESET_PASSWORD_HEADING", locale),
          subject: translate("RESET_PASSWORD_SUBJECT", locale, { app }),
        })
      );
    },
    sendVerification: async ({ email, url }, request) => {
      await deliver(
        email,
        MAIL.PURPOSE.VERIFICATION,
        request,
        (locale, app) => ({
          action: {
            href: url,
            label: translate("VERIFY_EMAIL_ACTION", locale),
          },
          body: [
            translate("VERIFY_EMAIL_BODY", locale, { app }),
            expiry(locale),
          ],
          footnote: translate("EMAIL_FOOTNOTE", locale),
          heading: translate("VERIFY_EMAIL_HEADING", locale),
          preview: translate("VERIFY_EMAIL_HEADING", locale),
          subject: translate("VERIFY_EMAIL_SUBJECT", locale, { app }),
        })
      );
    },
  };
};
