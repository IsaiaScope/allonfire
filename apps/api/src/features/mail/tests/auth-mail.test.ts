// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import {
  MAIL,
  type MailPurpose,
} from "@allonfire/core/features/mail/constants/mail";
import type { MailMessage } from "@allonfire/core/features/mail/types/mail";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App } from "@allonfire/database/enums";
import { JAPAN_EMAIL_LOOK } from "@allonfire/design/designs/japan/email-look";
import { translate } from "../../i18n/translate";
import { EMAIL } from "../constants/email";
import { createAuthMail } from "../utils/auth-mail";

const TO = "someone@auth-mail.test";
const RESET_PAGE = "https://back-office.test/reset-password";

const setup = ({ room = true } = {}) => {
  const sent: { message: MailMessage; purpose: MailPurpose }[] = [];
  const warned: string[] = [];
  const mail = createAuthMail({
    limit: {
      ready: () => Promise.resolve(true),
      take: () => Promise.resolve(room),
    },
    logger: {
      error: () => undefined,
      info: () => undefined,
      warn: (_bindings: object, message: string) => {
        warned.push(message);
      },
    },
    send: (message, purpose) => {
      sent.push({ message, purpose });
      return Promise.resolve({ outcome: MAIL.OUTCOME.ACCEPTED });
    },
  });
  return { mail, sent, warned };
};

const requestFrom = (headers: Record<string, string>) =>
  new Request("https://api.test", { headers });

describe("createAuthMail", () => {
  it("sends a reset link to the App's page, in the App's look and the visitor's language", async () => {
    const { mail, sent } = setup();
    await mail.sendPasswordReset(
      { email: TO, redirectTo: RESET_PAGE, token: "tok-1" },
      requestFrom({
        [HTTP.HEADER.ACCEPT_LANGUAGE]: I18N.LOCALE.IT_IT,
        [AUTH.HEADER.APP]: App.BACK_OFFICE,
      })
    );
    const [one] = sent;
    expect(one?.purpose).toBe(MAIL.PURPOSE.PASSWORD_RESET);
    expect(one?.message.to).toBe(TO);
    expect(one?.message.subject).toBe(
      translate("RESET_PASSWORD_SUBJECT", I18N.LOCALE.IT_IT, {
        app: EMAIL.LOOK[App.BACK_OFFICE].brand,
      })
    );
    expect(one?.message.text).toContain(
      `${RESET_PAGE}?${AUTH.MAIL.TOKEN_PARAM}=tok-1`
    );
    expect(one?.message.text).toContain(
      translate("EMAIL_LINK_EXPIRY", I18N.LOCALE.IT_IT, {
        minutes: AUTH.MAIL.LINK_EXPIRES_IN_S / UNIT.SECONDS_PER_MINUTE,
      })
    );
    expect(one?.message.html).toContain(EMAIL.LOOK[App.BACK_OFFICE].brand);
    expect(one?.message.html).toContain(
      JAPAN_EMAIL_LOOK.flourish.kanji[MAIL.PURPOSE.PASSWORD_RESET]
    );
  });

  it("falls back to English and the shared look with no App or language", async () => {
    const { mail, sent } = setup();
    await mail.sendVerification(
      { email: TO, url: "https://api.test/verify-email?token=t" },
      undefined
    );
    const [one] = sent;
    expect(one?.purpose).toBe(MAIL.PURPOSE.VERIFICATION);
    expect(one?.message.subject).toBe(
      translate("VERIFY_EMAIL_SUBJECT", I18N.LOCALE.EN_US, { app: "AllOnFire" })
    );
    expect(one?.message.html).not.toContain(
      JAPAN_EMAIL_LOOK.flourish.kanji[MAIL.PURPOSE.VERIFICATION]
    );
  });

  it("sends nothing once the address had its emails this hour", async () => {
    const { mail, sent, warned } = setup({ room: false });
    await mail.sendVerification(
      { email: TO, url: "https://api.test/v" },
      undefined
    );
    expect(sent).toEqual([]);
    expect(warned).toEqual([EMAIL.LOG_MESSAGE.ADDRESS_LIMITED]);
  });

  it("sends no reset without a page to land on", async () => {
    const { mail, sent, warned } = setup();
    await mail.sendPasswordReset(
      { email: TO, redirectTo: null, token: "t" },
      undefined
    );
    expect(sent).toEqual([]);
    expect(warned).toEqual([EMAIL.LOG_MESSAGE.NO_RESET_PAGE]);
  });

  it("sends nothing when the limit cannot count", async () => {
    const { sent } = setup();
    const mail = createAuthMail({
      limit: {
        ready: () => Promise.resolve(false),
        take: () => Promise.reject(new Error("redis down")),
      },
      logger: {
        error: () => undefined,
        info: () => undefined,
        warn: () => undefined,
      },
      send: (message, purpose) => {
        sent.push({ message, purpose });
        return Promise.resolve({ outcome: MAIL.OUTCOME.ACCEPTED });
      },
    });
    await mail.sendVerification(
      { email: TO, url: "https://api.test/v" },
      undefined
    );
    expect(sent).toEqual([]);
  });
});
