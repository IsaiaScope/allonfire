import { z } from "zod";
import { UNIT } from "../../../../shared/constants/units";
import { stringifyJson } from "../../../../shared/utils/json";
import { HTTP } from "../../../http/constants/http";
import { MAIL, USAGE_MONTH_DAYS } from "../../constants/mail";
import type { MailDriverImpl, MailEndpoint, MailFetch } from "../../types/mail";
import { attemptOf, readJson, timeoutSignal } from "../http-attempt";

const metricsSchema = z.object({
  totals: z.object({ sent: z.number().int() }),
});

const startOfUtcDay = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

const authorized = (endpoint: MailEndpoint) => ({
  [HTTP.HEADER.AUTHORIZATION]: `${HTTP.AUTH_SCHEME.BEARER} ${endpoint.key}`,
});

/** What the provider says it sent since `start`: null when it cannot say. */
const sentSince = async (
  endpoint: MailEndpoint,
  start: Date,
  fetcher: MailFetch
): Promise<number | null> => {
  const url = new URL(`${endpoint.url}${MAIL.PATH.BEARER_FLAT.METRICS}`);
  url.searchParams.set("start_date", start.toISOString());
  const metrics = await readJson(
    fetcher,
    url,
    authorized(endpoint),
    metricsSchema
  );
  return metrics?.totals.sent ?? null;
};

/**
 * The API that takes `Authorization: Bearer` and a flat body. A 429 is a quota
 * (daily, monthly and rate alike); any other refusal is final.
 */
export const bearerFlat: MailDriverImpl = {
  send: (endpoint, message, fetcher) =>
    attemptOf(
      () =>
        fetcher(`${endpoint.url}${MAIL.PATH.BEARER_FLAT.SEND}`, {
          body: stringifyJson({
            from: message.from,
            headers: message.headers,
            html: message.html,
            subject: message.subject,
            text: message.text,
            to: message.to,
          }),
          headers: {
            ...authorized(endpoint),
            [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON,
          },
          method: HTTP.METHOD.POST,
          signal: timeoutSignal(),
        }),
      (response) =>
        Promise.resolve(
          response.status === HTTP.STATUS.TOO_MANY_REQUESTS
            ? MAIL.ATTEMPT.QUOTA
            : MAIL.ATTEMPT.REJECTED
        )
    ),
  usage: async (endpoint, now, fetcher) => {
    const monthStart = new Date(
      now.getTime() - USAGE_MONTH_DAYS * UNIT.MS_PER_DAY
    );
    const [day, month] = await Promise.all([
      sentSince(endpoint, startOfUtcDay(now), fetcher),
      sentSince(endpoint, monthStart, fetcher),
    ]);
    return day === null || month === null
      ? null
      : { day, dayLimit: null, month, monthLimit: null };
  },
};
