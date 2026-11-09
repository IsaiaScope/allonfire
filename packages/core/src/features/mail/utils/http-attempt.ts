import type { z } from "zod";
import { parseJsonWith } from "../../../shared/utils/json";
import { MAIL, type MailAttempt } from "../constants/mail";
import type { MailFetch } from "../types/mail";

const fieldOf = (error: unknown, field: string): unknown =>
  typeof error === "object" && error !== null && field in error
    ? Reflect.get(error, field)
    : undefined;

const isDefinite = (error: unknown) =>
  [fieldOf(error, "code"), fieldOf(fieldOf(error, "cause"), "code")].some(
    (code) => MAIL.HTTP.DEFINITE_ERROR_CODES.some((known) => known === code)
  );

/** Aborts a request that stalls, so a provider cannot hold a send. */
export const timeoutSignal = (): AbortSignal =>
  AbortSignal.timeout(MAIL.HTTP.TIMEOUT_MS);

/**
 * Runs one handoff. A 2xx is `accepted` (the body is never read: a provider
 * that took the message and sent odd JSON still took it). Another status goes
 * to `readRefusal`. A throw is `rejected` when it is known to have left
 * nothing (DNS, refused connection) and `uncertain` otherwise (a timeout or a
 * reset after the request left).
 */
export const attemptOf = async (
  request: () => Promise<Response>,
  readRefusal: (response: Response) => Promise<MailAttempt>
): Promise<MailAttempt> => {
  let response: Response;
  try {
    response = await request();
  } catch (error) {
    return isDefinite(error) ? MAIL.ATTEMPT.REJECTED : MAIL.ATTEMPT.UNCERTAIN;
  }
  return response.ok ? MAIL.ATTEMPT.ACCEPTED : readRefusal(response);
};

/**
 * Reads one JSON answer a provider's usage API gives: `null` when it cannot
 * say (a refusal, a failure, a body that does not fit `schema`), so a caller
 * never tells those apart.
 */
export const readJson = async <S extends z.ZodType>(
  fetcher: MailFetch,
  url: URL | string,
  headers: Record<string, string>,
  schema: S
): Promise<z.infer<S> | null> => {
  try {
    const response = await fetcher(url, { headers, signal: timeoutSignal() });
    return response.ok ? parseJsonWith(await response.text(), schema) : null;
  } catch {
    return null;
  }
};
