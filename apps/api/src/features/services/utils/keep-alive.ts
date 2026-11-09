import {
  MAIL,
  type SendOutcome,
} from "@allonfire/core/features/mail/constants/mail";
import type { SendResult } from "@allonfire/core/features/mail/types/mail";
import { ServiceType } from "@allonfire/database/enums";
import type { KeepAliveBody } from "../constants/schemas";
import { type KeepAliveResult, SERVICES } from "../constants/services";

/** The keep-alive endpoint's answer. */
export type KeepAliveReport = KeepAliveBody;

/** What one provider's keep-alive did. */
type ProviderReport = KeepAliveReport["services"][number]["providers"][number];

/**
 * A Service's keep-alive: whatever keeps its providers from lapsing. A new
 * Service type adds one beside MAIL's; the endpoint, the schedule and the
 * report stay.
 */
export type ServiceKeepAlive = {
  type: ServiceType;
  run: (now: Date) => Promise<ProviderReport[]>;
};

const RESULT_OF = {
  [MAIL.OUTCOME.ACCEPTED]: SERVICES.KEEP_ALIVE_RESULT.SENT,
  [MAIL.OUTCOME.REJECTED]: SERVICES.KEEP_ALIVE_RESULT.REJECTED,
  [MAIL.OUTCOME.UNCERTAIN]: SERVICES.KEEP_ALIVE_RESULT.UNCERTAIN,
  [MAIL.OUTCOME.UNAVAILABLE]: SERVICES.KEEP_ALIVE_RESULT.UNAVAILABLE,
} as const satisfies Record<SendOutcome, KeepAliveResult>;

type MailKeepAliveDeps = {
  /** The enabled MAIL providers, in slot order, with their last acceptance. */
  providers: () => Promise<
    { id: string; name: string; slot: number; lastAcceptedAt: Date | null }[]
  >;
  /** Sends the owner one check email through this provider alone. */
  send: (provider: { id: string; name: string }) => Promise<SendResult>;
};

/** One provider's check; a throw is its own result, never the others'. */
const sentResult = async (
  deps: MailKeepAliveDeps,
  provider: { id: string; name: string }
): Promise<KeepAliveResult> => {
  try {
    return RESULT_OF[(await deps.send(provider)).outcome];
  } catch {
    return SERVICES.KEEP_ALIVE_RESULT.UNAVAILABLE;
  }
};

/**
 * MAIL's keep-alive: a provider that accepted nothing in 30 days sends one
 * email to the owner, through itself only; a provider that sent recently is
 * skipped. A provider deactivates an idle key after 90 days, so a daily run
 * retries a failure long before then.
 */
export const mailKeepAlive = (deps: MailKeepAliveDeps): ServiceKeepAlive => ({
  // Each through its own provider, so they run side by side.
  run: async (now) =>
    Promise.all(
      (await deps.providers()).map(
        async ({ id, lastAcceptedAt, name, slot }) => {
          const idle =
            lastAcceptedAt === null ||
            now.getTime() - lastAcceptedAt.getTime() >= SERVICES.IDLE_MS;
          const result = idle
            ? await sentResult(deps, { id, name })
            : SERVICES.KEEP_ALIVE_RESULT.SKIPPED;
          return { id, name, result, slot };
        }
      )
    ),
  type: ServiceType.MAIL,
});

/** Runs every Service's keep-alive, side by side. */
export const runKeepAlives = async (
  keepAlives: readonly ServiceKeepAlive[],
  now: Date = new Date()
): Promise<KeepAliveReport> => ({
  services: await Promise.all(
    keepAlives.map(async ({ run, type }) => ({
      providers: await run(now),
      type,
    }))
  ),
});
