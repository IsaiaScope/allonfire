// @module-tag unit
import { stringifyJson } from "../../../shared/utils/json";
import { HTTP } from "../../http/constants/http";
import { MAIL } from "../constants/mail";
import type { MailEndpoint } from "../types/mail";
import { keyHeaderEnvelope } from "../utils/drivers/key-header-envelope";
import { fakeFetch, jsonResponse } from "./fake-fetch";

const ENDPOINT: MailEndpoint = {
  driver: MAIL.DRIVER.KEY_HEADER_ENVELOPE,
  key: "key-for-the-test",
  url: "https://envelope.test/v3",
};
const MESSAGE = {
  from: "no-reply@envelope.test",
  html: "<p>hi</p>",
  subject: "Hi",
  text: "hi",
  to: "someone@envelope.test",
};
const NOW = new Date("2026-11-09T09:30:00.000Z");

describe("keyHeaderEnvelope.send", () => {
  it("posts the nested body with the key header and nowhere else", async () => {
    const { fetch, seen } = fakeFetch(jsonResponse({ messageId: "x" }, 201));
    await keyHeaderEnvelope.send(ENDPOINT, MESSAGE, fetch);
    const [request] = seen;
    expect(request?.method).toBe(HTTP.METHOD.POST);
    expect(request?.url.href).toBe(
      `https://envelope.test/v3${MAIL.PATH.KEY_HEADER_ENVELOPE.SEND}`
    );
    expect(request?.headers.get(MAIL.HEADER.API_KEY)).toBe(ENDPOINT.key);
    expect(request?.headers.get(HTTP.HEADER.AUTHORIZATION)).toBeNull();
    expect(request?.body).toBe(
      stringifyJson({
        htmlContent: MESSAGE.html,
        sender: { email: MESSAGE.from },
        subject: MESSAGE.subject,
        textContent: MESSAGE.text,
        to: [{ email: MESSAGE.to }],
      })
    );
    expect(request?.url.href).not.toContain(ENDPOINT.key);
    expect(request?.body).not.toContain(ENDPOINT.key);
  });

  it("sends the message's custom headers in a `headers` map", async () => {
    const { fetch, seen } = fakeFetch(jsonResponse({ messageId: "x" }, 201));
    const headers = { [MAIL.HEADER.ENTITY_REF_ID]: "ref-1" };
    await keyHeaderEnvelope.send(ENDPOINT, { ...MESSAGE, headers }, fetch);
    expect(seen[0]?.body).toBe(
      stringifyJson({
        headers,
        htmlContent: MESSAGE.html,
        sender: { email: MESSAGE.from },
        subject: MESSAGE.subject,
        textContent: MESSAGE.text,
        to: [{ email: MESSAGE.to }],
      })
    );
  });

  it("answers accepted for a 2xx, even with a body that is not JSON", async () => {
    const { fetch } = fakeFetch(new Response("not json", { status: 201 }));
    expect(await keyHeaderEnvelope.send(ENDPOINT, MESSAGE, fetch)).toBe(
      MAIL.ATTEMPT.ACCEPTED
    );
  });

  it("answers quota for a 429", async () => {
    const { fetch } = fakeFetch(
      jsonResponse({}, HTTP.STATUS.TOO_MANY_REQUESTS)
    );
    expect(await keyHeaderEnvelope.send(ENDPOINT, MESSAGE, fetch)).toBe(
      MAIL.ATTEMPT.QUOTA
    );
  });

  it("answers quota for a 400 saying the credits are spent", async () => {
    const { fetch } = fakeFetch(
      jsonResponse({ code: MAIL.QUOTA_CODE }, HTTP.STATUS.BAD_REQUEST)
    );
    expect(await keyHeaderEnvelope.send(ENDPOINT, MESSAGE, fetch)).toBe(
      MAIL.ATTEMPT.QUOTA
    );
  });

  it("answers rejected for any other 400, readable or not", async () => {
    const other = fakeFetch(
      jsonResponse({ code: "invalid_parameter" }, HTTP.STATUS.BAD_REQUEST)
    );
    expect(await keyHeaderEnvelope.send(ENDPOINT, MESSAGE, other.fetch)).toBe(
      MAIL.ATTEMPT.REJECTED
    );
    const garbage = fakeFetch(
      new Response("<html>", { status: HTTP.STATUS.BAD_REQUEST })
    );
    expect(await keyHeaderEnvelope.send(ENDPOINT, MESSAGE, garbage.fetch)).toBe(
      MAIL.ATTEMPT.REJECTED
    );
  });

  it.each([HTTP.STATUS.UNAUTHORIZED, HTTP.STATUS.INTERNAL_SERVER_ERROR])(
    "answers rejected for a %i",
    async (status) => {
      const { fetch } = fakeFetch(jsonResponse({}, status));
      expect(await keyHeaderEnvelope.send(ENDPOINT, MESSAGE, fetch)).toBe(
        MAIL.ATTEMPT.REJECTED
      );
    }
  );
});

describe("keyHeaderEnvelope.usage", () => {
  const report = (requests: number) => jsonResponse({ requests });
  const account = (
    ...plan: { type: string; credits: number; creditsType: string }[]
  ) => jsonResponse({ plan });
  const freePlan = {
    creditsType: MAIL.SEND_CREDITS,
    type: MAIL.DAILY_PLAN_TYPE,
  };
  /** The daily limit an Admin set on the provider's card. */
  const LIMITS = { dailyLimit: 300 };
  const usage = (...answers: Parameters<typeof fakeFetch>) => {
    const { fetch, seen } = fakeFetch(...answers);
    return {
      seen,
      usage: keyHeaderEnvelope.usage(ENDPOINT, NOW, fetch, LIMITS),
    };
  };

  it("reads today's and the last 31 days' requests from the aggregated report", async () => {
    const { seen, usage: result } = usage(
      report(3),
      report(40),
      account({ ...freePlan, credits: 297 })
    );
    expect(await result).toEqual({
      day: 3,
      dayLimit: null,
      month: 40,
      monthLimit: null,
    });
    const [day, month] = seen;
    expect(day?.url.searchParams.get("startDate")).toBe("2026-11-09");
    expect(day?.url.searchParams.get("endDate")).toBe("2026-11-09");
    expect(month?.url.searchParams.get("days")).toBe("31");
    expect(day?.headers.get(MAIL.HEADER.API_KEY)).toBe(ENDPOINT.key);
    expect(seen[2]?.url.pathname).toBe(
      `/v3${MAIL.PATH.KEY_HEADER_ENVELOPE.ACCOUNT}`
    );
  });

  it("counts a send its report has not caught up with, from the credits left", async () => {
    // The report is built with a delay; the credits move at once.
    const { usage: result } = usage(
      report(0),
      report(5),
      account({ ...freePlan, credits: 299 })
    );
    expect((await result)?.day).toBe(1);
  });

  it("never counts below what the report says", async () => {
    const { usage: result } = usage(
      report(5),
      report(40),
      account({ ...freePlan, credits: 299 })
    );
    expect((await result)?.day).toBe(5);
  });

  it("ignores the credits when the card's limit is below them, a cap the Admin set", async () => {
    const { fetch } = fakeFetch(
      report(3),
      report(40),
      account({ ...freePlan, credits: 283 })
    );
    const capped = await keyHeaderEnvelope.usage(ENDPOINT, NOW, fetch, {
      dailyLimit: 100,
    });
    expect(capped?.day).toBe(3);
  });

  it("counts only what the report says on a plan whose credits are a total", async () => {
    const { usage: result } = usage(
      report(3),
      report(40),
      account({
        credits: 5000,
        creditsType: MAIL.SEND_CREDITS,
        type: "subscription",
      })
    );
    expect(await result).toEqual({
      day: 3,
      dayLimit: null,
      month: 40,
      monthLimit: null,
    });
  });

  it("keeps the report's counts when the account call fails", async () => {
    const { usage: result } = usage(
      report(3),
      report(40),
      jsonResponse({}, HTTP.STATUS.FORBIDDEN)
    );
    expect(await result).toEqual({
      day: 3,
      dayLimit: null,
      month: 40,
      monthLimit: null,
    });
  });

  it("answers null when the provider refuses the report", async () => {
    const { usage: result } = usage(jsonResponse({}, HTTP.STATUS.UNAUTHORIZED));
    expect(await result).toBeNull();
  });

  it("answers null for a report body it cannot read", async () => {
    const { usage: result } = usage(jsonResponse({ requests: "many" }));
    expect(await result).toBeNull();
  });

  it("answers null when the request fails", async () => {
    const { usage: result } = usage(new Error("down"));
    expect(await result).toBeNull();
  });
});
