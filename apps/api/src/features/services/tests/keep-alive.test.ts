// @module-tag unit

import type { SendOutcome } from "@allonfire/core/features/mail/constants/mail";
import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { ServiceType } from "@allonfire/database/enums";
import { SERVICES } from "../constants/services";
import { mailKeepAlive, runKeepAlives } from "../utils/keep-alive";

const NOW = new Date("2026-11-03T03:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * UNIT.MS_PER_DAY);

const provider = (slot: number, lastAcceptedAt: Date | null) => ({
  id: `provider-${slot}`,
  lastAcceptedAt,
  name: `Provider ${slot}`,
  slot,
});

const keepAliveWith = (
  providers: ReturnType<typeof provider>[],
  outcomes: Record<string, SendOutcome> = {}
) => {
  const sent: string[] = [];
  const names: string[] = [];
  const keepAlive = mailKeepAlive({
    providers: () => Promise.resolve(providers),
    send: ({ id: providerId, name }) => {
      sent.push(providerId);
      names.push(name);
      return Promise.resolve({
        outcome: outcomes[providerId] ?? MAIL.OUTCOME.ACCEPTED,
        providerId,
      });
    },
  });
  return { keepAlive, names, sent };
};

describe("mailKeepAlive", () => {
  it("sends only through providers idle for 30 days, each through itself", async () => {
    const { keepAlive, names, sent } = keepAliveWith([
      provider(0, daysAgo(2)),
      provider(1, daysAgo(31)),
      provider(2, null),
    ]);
    const reports = await keepAlive.run(NOW);
    expect(sent).toEqual(["provider-1", "provider-2"]);
    // The name it already read, so the email needs no second read.
    expect(names).toEqual(["Provider 1", "Provider 2"]);
    expect(reports.map(({ result }) => result)).toEqual([
      SERVICES.KEEP_ALIVE_RESULT.SKIPPED,
      SERVICES.KEEP_ALIVE_RESULT.SENT,
      SERVICES.KEEP_ALIVE_RESULT.SENT,
    ]);
  });

  it("reports each outcome as the workflow reads it", async () => {
    const { keepAlive } = keepAliveWith(
      [provider(0, null), provider(1, null), provider(2, null)],
      {
        "provider-0": MAIL.OUTCOME.REJECTED,
        "provider-1": MAIL.OUTCOME.UNCERTAIN,
        "provider-2": MAIL.OUTCOME.UNAVAILABLE,
      }
    );
    expect((await keepAlive.run(NOW)).map(({ result }) => result)).toEqual([
      SERVICES.KEEP_ALIVE_RESULT.REJECTED,
      SERVICES.KEEP_ALIVE_RESULT.UNCERTAIN,
      SERVICES.KEEP_ALIVE_RESULT.UNAVAILABLE,
    ]);
  });

  it("reports a provider whose send throws as unavailable, the others unharmed", async () => {
    const keepAlive = mailKeepAlive({
      providers: () => Promise.resolve([provider(0, null), provider(1, null)]),
      send: ({ id: providerId }) =>
        providerId === "provider-0"
          ? Promise.reject(new Error("render failed"))
          : Promise.resolve({ outcome: MAIL.OUTCOME.ACCEPTED, providerId }),
    });
    expect((await keepAlive.run(NOW)).map(({ result }) => result)).toEqual([
      SERVICES.KEEP_ALIVE_RESULT.UNAVAILABLE,
      SERVICES.KEEP_ALIVE_RESULT.SENT,
    ]);
  });
});

describe("runKeepAlives", () => {
  it("runs every Service's keep-alive and names each", async () => {
    const { keepAlive } = keepAliveWith([provider(0, daysAgo(1))]);
    expect(await runKeepAlives([keepAlive], NOW)).toEqual({
      services: [
        {
          providers: [
            {
              id: "provider-0",
              name: "Provider 0",
              result: SERVICES.KEEP_ALIVE_RESULT.SKIPPED,
              slot: 0,
            },
          ],
          type: ServiceType.MAIL,
        },
      ],
    });
  });
});
