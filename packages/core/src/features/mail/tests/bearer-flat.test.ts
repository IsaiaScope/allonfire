// @module-tag unit
import { stringifyJson } from "../../../shared/utils/json";
import { HTTP } from "../../http/constants/http";
import { MAIL } from "../constants/mail";
import type { MailEndpoint } from "../types/mail";
import { bearerFlat } from "../utils/drivers/bearer-flat";
import { fakeFetch, jsonResponse } from "./fake-fetch";

const ENDPOINT: MailEndpoint = {
  driver: MAIL.DRIVER.BEARER_FLAT,
  key: "key-for-the-test",
  url: "https://flat.test",
};
const MESSAGE = {
  from: "no-reply@flat.test",
  html: "<p>hi</p>",
  subject: "Hi",
  text: "hi",
  to: "someone@flat.test",
};
/** The card's limits: this driver reports its own counts and ignores them. */
const LIMITS = { dailyLimit: 100 };
const NOW = new Date("2026-11-09T09:30:00.000Z");

describe("bearerFlat.send", () => {
  it("posts the flat body with a bearer key and never puts the key elsewhere", async () => {
    const { fetch, seen } = fakeFetch(jsonResponse({ id: "x" }, 200));
    await bearerFlat.send(ENDPOINT, MESSAGE, fetch);
    const [request] = seen;
    expect(request?.method).toBe(HTTP.METHOD.POST);
    expect(request?.url.href).toBe(
      `https://flat.test${MAIL.PATH.BEARER_FLAT.SEND}`
    );
    expect(request?.headers.get(HTTP.HEADER.AUTHORIZATION)).toBe(
      `Bearer ${ENDPOINT.key}`
    );
    expect(request?.body).toBe(stringifyJson(MESSAGE));
    expect(request?.url.href).not.toContain(ENDPOINT.key);
    expect(request?.body).not.toContain(ENDPOINT.key);
  });

  it("sends the message's custom headers in a `headers` object", async () => {
    const { fetch, seen } = fakeFetch(jsonResponse({ id: "x" }, 200));
    const headers = { [MAIL.HEADER.ENTITY_REF_ID]: "ref-1" };
    await bearerFlat.send(ENDPOINT, { ...MESSAGE, headers }, fetch);
    expect(seen[0]?.body).toBe(
      stringifyJson({
        from: MESSAGE.from,
        headers,
        html: MESSAGE.html,
        subject: MESSAGE.subject,
        text: MESSAGE.text,
        to: MESSAGE.to,
      })
    );
  });

  it("answers accepted for a 2xx, even with a body that is not JSON", async () => {
    const { fetch } = fakeFetch(new Response("not json", { status: 200 }));
    expect(await bearerFlat.send(ENDPOINT, MESSAGE, fetch)).toBe(
      MAIL.ATTEMPT.ACCEPTED
    );
  });

  it("answers quota for a 429", async () => {
    const { fetch } = fakeFetch(
      jsonResponse(
        { name: "daily_quota_exceeded" },
        HTTP.STATUS.TOO_MANY_REQUESTS
      )
    );
    expect(await bearerFlat.send(ENDPOINT, MESSAGE, fetch)).toBe(
      MAIL.ATTEMPT.QUOTA
    );
  });

  it.each([
    HTTP.STATUS.UNAUTHORIZED,
    HTTP.STATUS.BAD_REQUEST,
    HTTP.STATUS.INTERNAL_SERVER_ERROR,
  ])("answers rejected for a %i", async (status) => {
    const { fetch } = fakeFetch(
      jsonResponse({ name: "validation_error" }, status)
    );
    expect(await bearerFlat.send(ENDPOINT, MESSAGE, fetch)).toBe(
      MAIL.ATTEMPT.REJECTED
    );
  });
});

describe("bearerFlat.usage", () => {
  const metrics = (sent: number) => jsonResponse({ totals: { sent } });

  it("reads today's and the last 31 days' sends from the metrics", async () => {
    const { fetch, seen } = fakeFetch(metrics(3), metrics(40));
    expect(await bearerFlat.usage(ENDPOINT, NOW, fetch, LIMITS)).toEqual({
      day: 3,
      dayLimit: null,
      month: 40,
      monthLimit: null,
    });
    const starts = seen.map(({ url }) => url.searchParams.get("start_date"));
    expect(starts).toContain("2026-11-09T00:00:00.000Z");
    expect(starts).toContain("2026-10-09T09:30:00.000Z");
    expect(
      seen.every(({ url }) => url.pathname === MAIL.PATH.BEARER_FLAT.METRICS)
    ).toBe(true);
  });

  it("answers null when the provider refuses", async () => {
    const { fetch } = fakeFetch(jsonResponse({}, HTTP.STATUS.FORBIDDEN));
    expect(await bearerFlat.usage(ENDPOINT, NOW, fetch, LIMITS)).toBeNull();
  });

  it("answers null for a body it cannot read", async () => {
    const { fetch } = fakeFetch(jsonResponse({ totals: {} }));
    expect(await bearerFlat.usage(ENDPOINT, NOW, fetch, LIMITS)).toBeNull();
  });

  it("answers null when the request fails", async () => {
    const { fetch } = fakeFetch(new Error("down"));
    expect(await bearerFlat.usage(ENDPOINT, NOW, fetch, LIMITS)).toBeNull();
  });
});
