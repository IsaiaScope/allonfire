// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import {
  MAIL,
  type MailPurpose,
} from "@allonfire/core/features/mail/constants/mail";
import type { MailMessage } from "@allonfire/core/features/mail/types/mail";
import { JAPAN_EMAIL_LOOK } from "@allonfire/design/designs/japan/email-look";
import { translate } from "../../i18n/translate";
import { SERVICES } from "../constants/services";
import { createProviderCheck } from "../utils/provider-check";

const OWNER = "owner@provider-check.test";
const PROVIDER = { id: "provider-1", name: "Provider 1" };

type Sent = { message: MailMessage; only: string; purpose: MailPurpose };

const setup = ({
  provider = PROVIDER,
  recipient = OWNER,
}: {
  provider?: typeof PROVIDER | null;
  recipient?: string | null;
} = {}) => {
  const steps: string[] = [];
  const sent: Sent[] = [];
  const warned: string[] = [];
  const check = createProviderCheck({
    findProvider: () => Promise.resolve(provider),
    forgetUsage: (providerId) => {
      steps.push(`forget:${providerId}`);
      return Promise.resolve();
    },
    logger: {
      warn: (_bindings: object, message: string) => {
        warned.push(message);
      },
    },
    recipient: recipient ?? undefined,
    send: (message, { only, purpose }) => {
      steps.push("send");
      sent.push({ message, only, purpose });
      return Promise.resolve({ outcome: MAIL.OUTCOME.ACCEPTED });
    },
  });
  return { check, sent, steps, warned };
};

describe("createProviderCheck", () => {
  describe("keepAlive", () => {
    it("sends the owner one check through the provider alone", async () => {
      const { check, sent } = setup();
      const result = await check.keepAlive(PROVIDER);
      expect(result.outcome).toBe(MAIL.OUTCOME.ACCEPTED);
      expect(sent).toHaveLength(1);
      expect(sent[0]?.only).toBe(PROVIDER.id);
      expect(sent[0]?.purpose).toBe(MAIL.PURPOSE.KEEP_ALIVE);
      expect(sent[0]?.message.to).toBe(OWNER);
      expect(sent[0]?.message.subject).toContain(PROVIDER.name);
      // The email wears the keep-alive's word, not the test's.
      expect(sent[0]?.message.html).toContain(
        JAPAN_EMAIL_LOOK.flourish.kanji[MAIL.PURPOSE.KEEP_ALIVE]
      );
    });

    it("sends nothing and says so when no owner is set", async () => {
      const { check, sent, warned } = setup({ recipient: null });
      const result = await check.keepAlive(PROVIDER);
      expect(result.outcome).toBe(MAIL.OUTCOME.UNAVAILABLE);
      expect(sent).toHaveLength(0);
      expect(warned).toStrictEqual([SERVICES.LOG_MESSAGE.NO_RECIPIENT]);
    });
  });

  describe("test", () => {
    it("sends to the address in the asker's language, then drops the cached usage", async () => {
      const { check, sent, steps } = setup();
      const asked = await check.test(
        PROVIDER.id,
        "asker@provider-check.test",
        I18N.LOCALE.IT_IT
      );
      expect(asked?.outcome).toBe(MAIL.OUTCOME.ACCEPTED);
      expect(sent[0]?.purpose).toBe(MAIL.PURPOSE.TEST);
      expect(sent[0]?.message.to).toBe("asker@provider-check.test");
      expect(sent[0]?.only).toBe(PROVIDER.id);
      expect(sent[0]?.message.html).toContain(
        JAPAN_EMAIL_LOOK.flourish.kanji[MAIL.PURPOSE.TEST]
      );
      expect(sent[0]?.message.subject).toBe(
        translate("PROVIDER_CHECK_SUBJECT", I18N.LOCALE.IT_IT, {
          provider: PROVIDER.name,
        })
      );
      // The send moved the count: forgetting comes after it, never before.
      expect(steps).toStrictEqual(["send", `forget:${PROVIDER.id}`]);
    });

    it("answers null for a provider that is gone, sending nothing", async () => {
      const { check, sent, steps } = setup({ provider: null });
      expect(
        await check.test("gone", "a@provider-check.test", I18N.LOCALE.EN_US)
      ).toBeNull();
      expect(sent).toHaveLength(0);
      expect(steps).toHaveLength(0);
    });
  });
});
