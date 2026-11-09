import { z } from "zod";
import { parseJsonWith, stringifyJson } from "../../../../shared/utils/json";
import { HTTP } from "../../../http/constants/http";
import { MAIL, type MailAttempt, USAGE_MONTH_DAYS } from "../../constants/mail";
import type { MailDriverImpl, MailEndpoint, MailFetch } from "../../types/mail";
import { attemptOf, readJson, timeoutSignal } from "../http-attempt";

const reportSchema = z.object({ requests: z.number().int() });
const refusalSchema = z.object({ code: z.string() });
const accountSchema = z.object({
  plan: z.array(
    z.object({
      credits: z.number(),
      creditsType: z.string(),
      type: z.string(),
    })
  ),
});

const UTC_DATE_LENGTH = "YYYY-MM-DD".length;
const utcDate = (date: Date) => date.toISOString().slice(0, UTC_DATE_LENGTH);

/** A 429, or a 400 saying the credits are spent, is a quota; the rest is final. */
const refusalOf = async (response: Response): Promise<MailAttempt> => {
  if (response.status === HTTP.STATUS.TOO_MANY_REQUESTS) {
    return MAIL.ATTEMPT.QUOTA;
  }
  if (response.status !== HTTP.STATUS.BAD_REQUEST) {
    return MAIL.ATTEMPT.REJECTED;
  }
  try {
    const { code } = parseJsonWith(await response.text(), refusalSchema);
    return code === MAIL.QUOTA_CODE
      ? MAIL.ATTEMPT.QUOTA
      : MAIL.ATTEMPT.REJECTED;
  } catch {
    return MAIL.ATTEMPT.REJECTED;
  }
};

const keyed = (endpoint: MailEndpoint) => ({
  [MAIL.HEADER.API_KEY]: endpoint.key,
});

/** The requests the provider's report counts for the window; null when it cannot say. */
const requestsIn = async (
  endpoint: MailEndpoint,
  window: Record<string, string>,
  fetcher: MailFetch
): Promise<number | null> => {
  const url = new URL(`${endpoint.url}${MAIL.PATH.KEY_HEADER_ENVELOPE.REPORT}`);
  for (const [name, value] of new URLSearchParams(window)) {
    url.searchParams.set(name, value);
  }
  const report = await readJson(fetcher, url, keyed(endpoint), reportSchema);
  return report?.requests ?? null;
};

/**
 * The send credits left today on a plan whose credits are the day's
 * allowance; null on any other plan (its credits are a plan total) or when
 * the account cannot be read.
 */
const dailyCreditsLeft = async (
  endpoint: MailEndpoint,
  fetcher: MailFetch
): Promise<number | null> => {
  const account = await readJson(
    fetcher,
    `${endpoint.url}${MAIL.PATH.KEY_HEADER_ENVELOPE.ACCOUNT}`,
    keyed(endpoint),
    accountSchema
  );
  return (
    account?.plan.find(
      ({ creditsType, type }) =>
        creditsType === MAIL.SEND_CREDITS && type === MAIL.DAILY_PLAN_TYPE
    )?.credits ?? null
  );
};

/**
 * The API that takes an `api-key` header and a nested body. A 429, or a 400
 * whose code says the credits are spent, is a quota; any other refusal is
 * final. On a `free` plan the account's credits are the day's remaining
 * allowance, and they move the moment a send is accepted while the aggregated
 * report is built with a delay: the day's count is the larger of the report
 * and the card's daily limit less the credits left, so a send shows at once.
 * No limit is reported: the card's is the ring's maximum. The credits count
 * only when they fit the card's limit (a lower limit is a cap an Admin chose,
 * not the plan's allowance). On any other plan only the report counts
 * (docs/superpowers/specs, "Probe results").
 */
export const keyHeaderEnvelope: MailDriverImpl = {
  send: (endpoint, message, fetcher) =>
    attemptOf(
      () =>
        fetcher(`${endpoint.url}${MAIL.PATH.KEY_HEADER_ENVELOPE.SEND}`, {
          body: stringifyJson({
            headers: message.headers,
            htmlContent: message.html,
            sender: { email: message.from },
            subject: message.subject,
            textContent: message.text,
            to: [{ email: message.to }],
          }),
          headers: {
            ...keyed(endpoint),
            [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
          },
          method: HTTP.METHOD.POST,
          signal: timeoutSignal(),
        }),
      refusalOf
    ),
  usage: async (endpoint, now, fetcher, limits) => {
    const today = utcDate(now);
    const [reported, month, creditsLeft] = await Promise.all([
      requestsIn(endpoint, { endDate: today, startDate: today }, fetcher),
      requestsIn(endpoint, { days: String(USAGE_MONTH_DAYS) }, fetcher),
      dailyCreditsLeft(endpoint, fetcher),
    ]);
    if (reported === null || month === null) {
      return null;
    }
    const fromCredits =
      creditsLeft === null || creditsLeft > limits.dailyLimit
        ? 0
        : limits.dailyLimit - creditsLeft;
    return {
      day: Math.max(reported, fromCredits),
      dayLimit: null,
      month,
      monthLimit: null,
    };
  },
};
