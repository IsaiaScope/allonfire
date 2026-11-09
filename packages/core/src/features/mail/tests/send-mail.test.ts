// @module-tag unit
import { inspect } from "node:util";
import { objectKeys } from "../../../shared/utils/object";
import { MAIL, type MailAttempt } from "../constants/mail";
import type {
  MailDeps,
  MailDriverImpl,
  MailEndpoint,
  MailMessage,
  SendingProvider,
} from "../types/mail";
import { sendMail } from "../utils/send-mail";

const MESSAGE: MailMessage = {
  html: "<p>hi</p>",
  subject: "Hi",
  text: "hi",
  to: "someone@send-mail.test",
};
const KEY = "provider-key-value";

const providerAt = (slot: number): SendingProvider => ({
  fromAddress: `no-reply-${slot}@send-mail.test`,
  id: `provider-${slot}`,
  name: `Provider ${slot}`,
  slot,
});

type Setup = {
  /** What each slot's driver answers, in turn; a slot without one has no endpoint. */
  attempts: Record<number, MailAttempt>;
  providers?: SendingProvider[];
  storeFails?: "providers" | "accepted";
};

const setup = ({ attempts, providers, storeFails }: Setup) => {
  const handed: { slot: number; from: string }[] = [];
  const refs: (string | undefined)[] = [];
  const accepted: string[] = [];
  const asked: (string | undefined)[] = [];
  const logged: { bindings: object; message: string }[] = [];
  const log = (bindings: object, message: string) => {
    logged.push({ bindings, message });
  };
  const endpoint = (slot: number): MailEndpoint | undefined =>
    attempts[slot] === undefined
      ? undefined
      : {
          driver: MAIL.DRIVER.BEARER_FLAT,
          key: KEY,
          url: `https://send-mail.test/${slot}`,
        };
  const driver: MailDriverImpl = {
    send: (target, message) => {
      const slot = Number(new URL(target.url).pathname.slice(1));
      handed.push({ from: message.from, slot });
      refs.push(message.headers?.[MAIL.HEADER.ENTITY_REF_ID]);
      return Promise.resolve(attempts[slot] ?? MAIL.ATTEMPT.REJECTED);
    },
    usage: () => Promise.resolve(null),
  };
  const deps: MailDeps = {
    drivers: {
      [MAIL.DRIVER.BEARER_FLAT]: driver,
      [MAIL.DRIVER.KEY_HEADER_ENVELOPE]: driver,
    },
    endpoint,
    fetch: () => Promise.reject(new Error("the driver is stubbed")),
    logger: { error: log, info: log, warn: log },
    store: {
      accepted: (id) => {
        if (storeFails === "accepted") {
          return Promise.reject(new Error("store down"));
        }
        accepted.push(id);
        return Promise.resolve();
      },
      providers: (only) => {
        asked.push(only);
        if (storeFails === "providers") {
          return Promise.reject(new Error("store down"));
        }
        return Promise.resolve(
          providers ??
            objectKeys(attempts).map((slot) => providerAt(Number(slot)))
        );
      },
    },
  };
  return { accepted, asked, deps, handed, logged, refs };
};

const send = (deps: MailDeps, only?: string) =>
  sendMail(MESSAGE, { only, purpose: MAIL.PURPOSE.VERIFICATION }, deps);

describe("sendMail", () => {
  it("stops at the first provider that accepts, stamping its acceptance", async () => {
    const { accepted, deps, handed } = setup({
      attempts: { 0: MAIL.ATTEMPT.ACCEPTED, 1: MAIL.ATTEMPT.ACCEPTED },
    });
    expect(await send(deps)).toEqual({
      outcome: MAIL.OUTCOME.ACCEPTED,
      providerId: "provider-0",
    });
    expect(handed).toEqual([{ from: "no-reply-0@send-mail.test", slot: 0 }]);
    expect(accepted).toEqual(["provider-0"]);
  });

  it("marks each message with a reference of its own, the same through a failover, so Gmail never threads two", async () => {
    const { deps, refs } = setup({
      attempts: { 0: MAIL.ATTEMPT.QUOTA, 1: MAIL.ATTEMPT.ACCEPTED },
    });
    await send(deps);
    await send(deps);
    const [firstA, firstB, secondA, secondB] = refs;
    expect(firstA).toBeTruthy();
    expect(firstA).toBe(firstB);
    expect(secondA).toBe(secondB);
    expect(firstA).not.toBe(secondA);
  });

  it("moves on to the next provider after a quota refusal", async () => {
    const { deps, handed } = setup({
      attempts: { 0: MAIL.ATTEMPT.QUOTA, 1: MAIL.ATTEMPT.ACCEPTED },
    });
    expect((await send(deps)).providerId).toBe("provider-1");
    expect(handed.map(({ slot }) => slot)).toEqual([0, 1]);
  });

  it("moves on to the next provider after a refusal", async () => {
    const { deps } = setup({
      attempts: { 0: MAIL.ATTEMPT.REJECTED, 1: MAIL.ATTEMPT.ACCEPTED },
    });
    expect((await send(deps)).outcome).toBe(MAIL.OUTCOME.ACCEPTED);
  });

  it("stops at an uncertain outcome and never tries another provider", async () => {
    const { deps, handed } = setup({
      attempts: { 0: MAIL.ATTEMPT.UNCERTAIN, 1: MAIL.ATTEMPT.ACCEPTED },
    });
    expect(await send(deps)).toEqual({
      outcome: MAIL.OUTCOME.UNCERTAIN,
      providerId: "provider-0",
    });
    expect(handed).toHaveLength(1);
  });

  it("answers unavailable when every provider is out of room", async () => {
    const { deps } = setup({
      attempts: { 0: MAIL.ATTEMPT.QUOTA, 1: MAIL.ATTEMPT.QUOTA },
    });
    expect(await send(deps)).toEqual({ outcome: MAIL.OUTCOME.UNAVAILABLE });
  });

  it("answers rejected when one provider refused and the rest had no room", async () => {
    const { deps } = setup({
      attempts: { 0: MAIL.ATTEMPT.REJECTED, 1: MAIL.ATTEMPT.QUOTA },
    });
    expect(await send(deps)).toEqual({
      outcome: MAIL.OUTCOME.REJECTED,
      providerId: "provider-0",
    });
  });

  it("skips a provider with no usable endpoint and logs it", async () => {
    const { deps, handed, logged } = setup({
      attempts: { 1: MAIL.ATTEMPT.ACCEPTED },
      providers: [providerAt(0), providerAt(1)],
    });
    expect((await send(deps)).providerId).toBe("provider-1");
    expect(handed.map(({ slot }) => slot)).toEqual([1]);
    expect(logged.map(({ message }) => message)).toContain(
      MAIL.LOG_MESSAGE.NO_ENDPOINT
    );
  });

  it("answers unavailable when no provider is enabled", async () => {
    const { deps } = setup({ attempts: {}, providers: [] });
    expect(await send(deps)).toEqual({ outcome: MAIL.OUTCOME.UNAVAILABLE });
  });

  it("asks the store for one provider alone when told to", async () => {
    const { asked, deps } = setup({
      attempts: { 1: MAIL.ATTEMPT.ACCEPTED },
    });
    await send(deps, "provider-1");
    expect(asked).toEqual(["provider-1"]);
  });

  it("still answers accepted when stamping the acceptance fails", async () => {
    const { deps } = setup({
      attempts: { 0: MAIL.ATTEMPT.ACCEPTED },
      storeFails: "accepted",
    });
    expect((await send(deps)).outcome).toBe(MAIL.OUTCOME.ACCEPTED);
  });

  it("answers unavailable when the store cannot list the providers", async () => {
    const { deps } = setup({
      attempts: { 0: MAIL.ATTEMPT.ACCEPTED },
      storeFails: "providers",
    });
    expect(await send(deps)).toEqual({ outcome: MAIL.OUTCOME.UNAVAILABLE });
  });

  it("never logs a provider's key", async () => {
    const { deps, logged } = setup({
      attempts: {
        0: MAIL.ATTEMPT.QUOTA,
        1: MAIL.ATTEMPT.REJECTED,
        2: MAIL.ATTEMPT.UNCERTAIN,
      },
    });
    await send(deps);
    expect(inspect(logged, { depth: 6 })).not.toContain(KEY);
  });
});
