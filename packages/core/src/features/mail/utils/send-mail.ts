import { MAIL, type MailAttempt, type MailPurpose } from "../constants/mail";
import type {
  MailDeps,
  MailMessage,
  SendingProvider,
  SendResult,
} from "../types/mail";

type SendOptions = {
  /** Why it is sent: a log field, nothing counts by it. */
  purpose: MailPurpose;
  /** Send through this provider alone, never failing over (a test, a keep-alive). */
  only?: string | undefined;
};

/** What a log line may carry of a provider: never its key. */
const logged = ({ id, name, slot }: SendingProvider) => ({
  provider: { id, name, slot },
});

/** What one provider's turn ended in: a result, or on to the next slot. */
type Turn = SendResult | { next: true; rejected: boolean };

/** One provider's turn: skipped for want of an endpoint, or handed the message. */
const turn = async (
  provider: SendingProvider,
  message: MailMessage,
  purpose: MailPurpose,
  deps: MailDeps
): Promise<Turn> => {
  const endpoint = deps.endpoint(provider.slot);
  if (!endpoint) {
    deps.logger.warn(logged(provider), MAIL.LOG_MESSAGE.NO_ENDPOINT);
    return { next: true, rejected: false };
  }
  const attempt: MailAttempt = await deps.drivers[endpoint.driver].send(
    endpoint,
    { ...message, from: provider.fromAddress },
    deps.fetch
  );
  switch (attempt) {
    case MAIL.ATTEMPT.ACCEPTED:
      try {
        await deps.store.accepted(provider.id);
      } catch (error) {
        // The message left: a stamp that failed must not turn it into a failure.
        deps.logger.error({ err: error }, MAIL.LOG_MESSAGE.STORE_FAILED);
      }
      deps.logger.info(
        { ...logged(provider), purpose },
        MAIL.LOG_MESSAGE.ACCEPTED
      );
      return { outcome: MAIL.OUTCOME.ACCEPTED, providerId: provider.id };
    case MAIL.ATTEMPT.QUOTA:
      deps.logger.warn(logged(provider), MAIL.LOG_MESSAGE.QUOTA);
      return { next: true, rejected: false };
    case MAIL.ATTEMPT.UNCERTAIN:
      deps.logger.error(logged(provider), MAIL.LOG_MESSAGE.UNCERTAIN);
      return { outcome: MAIL.OUTCOME.UNCERTAIN, providerId: provider.id };
    case MAIL.ATTEMPT.REJECTED:
      deps.logger.warn(logged(provider), MAIL.LOG_MESSAGE.REJECTED);
      return { next: true, rejected: true };
    default:
      return attempt satisfies never;
  }
};

/** Tries `providers` one after the other: a failover is never parallel. */
const tryInTurn = async (
  [provider, ...rest]: readonly SendingProvider[],
  send: { message: MailMessage; purpose: MailPurpose; deps: MailDeps },
  rejectedBy?: string
): Promise<SendResult> => {
  const { deps, message, purpose } = send;
  if (!provider) {
    if (rejectedBy) {
      return { outcome: MAIL.OUTCOME.REJECTED, providerId: rejectedBy };
    }
    deps.logger.warn({ purpose }, MAIL.LOG_MESSAGE.NO_PROVIDER);
    return { outcome: MAIL.OUTCOME.UNAVAILABLE };
  }
  const result = await turn(provider, message, purpose, deps);
  if (!("next" in result)) {
    return result;
  }
  return tryInTurn(rest, send, result.rejected ? provider.id : rejectedBy);
};

/**
 * Sends one message through the enabled providers in slot order: a provider
 * with no room (its API says so) or that refuses is skipped for the next. An
 * uncertain outcome stops the send, so a message is never sent twice.
 * Acceptance is not delivery.
 */
export const sendMail = async (
  message: MailMessage,
  { only, purpose }: SendOptions,
  deps: MailDeps
): Promise<SendResult> => {
  let providers: SendingProvider[];
  try {
    providers = await deps.store.providers(only);
  } catch (error) {
    deps.logger.error({ err: error }, MAIL.LOG_MESSAGE.STORE_FAILED);
    return { outcome: MAIL.OUTCOME.UNAVAILABLE };
  }
  // One reference per message, the same whichever provider ends up sending it.
  const referenced: MailMessage = {
    ...message,
    headers: {
      ...message.headers,
      [MAIL.HEADER.ENTITY_REF_ID]: crypto.randomUUID(),
    },
  };
  return tryInTurn(providers, { deps, message: referenced, purpose });
};
