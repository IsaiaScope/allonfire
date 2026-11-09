// @module-tag unit
import { z } from "zod";
import { MAIL, type MailAttempt } from "../constants/mail";
import { attemptOf, readJson } from "../utils/http-attempt";
import { fakeFetch, jsonResponse } from "./fake-fetch";

const refusal = (answer: MailAttempt) => {
  const calls: number[] = [];
  const read = () => {
    calls.push(1);
    return Promise.resolve(answer);
  };
  return { calls, read };
};

describe("attemptOf", () => {
  it("answers accepted for a 2xx without reading a refusal", async () => {
    const { calls, read } = refusal(MAIL.ATTEMPT.REJECTED);
    const attempt = await attemptOf(
      () => Promise.resolve(new Response("not json", { status: 201 })),
      read
    );
    expect(attempt).toBe(MAIL.ATTEMPT.ACCEPTED);
    expect(calls).toHaveLength(0);
  });

  it("hands any other status to the refusal reader", async () => {
    const { read } = refusal(MAIL.ATTEMPT.QUOTA);
    expect(
      await attemptOf(
        () => Promise.resolve(new Response("{}", { status: 429 })),
        read
      )
    ).toBe(MAIL.ATTEMPT.QUOTA);
  });

  it("answers rejected for a failure known to have left nothing", async () => {
    const { read } = refusal(MAIL.ATTEMPT.ACCEPTED);
    const error = Object.assign(new TypeError("fetch failed"), {
      cause: { code: MAIL.HTTP.DEFINITE_ERROR_CODES[0] },
    });
    expect(await attemptOf(() => Promise.reject(error), read)).toBe(
      MAIL.ATTEMPT.REJECTED
    );
  });

  it("answers uncertain for a timeout", async () => {
    const { read } = refusal(MAIL.ATTEMPT.ACCEPTED);
    expect(
      await attemptOf(
        () => Promise.reject(new DOMException("slow", "TimeoutError")),
        read
      )
    ).toBe(MAIL.ATTEMPT.UNCERTAIN);
  });

  it("answers uncertain for any other failure", async () => {
    const { read } = refusal(MAIL.ATTEMPT.ACCEPTED);
    expect(
      await attemptOf(() => Promise.reject(new Error("reset")), read)
    ).toBe(MAIL.ATTEMPT.UNCERTAIN);
  });
});

describe("readJson", () => {
  const schema = z.object({ n: z.number() });
  const KEY_HEADER = "x-key";

  it("asks with the headers and answers the parsed body", async () => {
    const { fetch, seen } = fakeFetch(jsonResponse({ n: 3 }));
    expect(
      await readJson(
        fetch,
        "https://api.test/report",
        { [KEY_HEADER]: "k" },
        schema
      )
    ).toStrictEqual({ n: 3 });
    expect(seen[0]?.headers.get(KEY_HEADER)).toBe("k");
    expect(seen[0]?.method).toBe("GET");
  });

  it("answers null for a refusal", async () => {
    const { fetch } = fakeFetch(new Response("{}", { status: 500 }));
    expect(await readJson(fetch, "https://api.test/r", {}, schema)).toBeNull();
  });

  it("answers null for a body that does not fit the schema", async () => {
    const { fetch } = fakeFetch(jsonResponse({ n: "x" }));
    expect(await readJson(fetch, "https://api.test/r", {}, schema)).toBeNull();
  });

  it("answers null for text that is not JSON", async () => {
    const { fetch } = fakeFetch(new Response("<html>", { status: 200 }));
    expect(await readJson(fetch, "https://api.test/r", {}, schema)).toBeNull();
  });

  it("answers null when the request fails", async () => {
    const { fetch } = fakeFetch(new Error("down"));
    expect(await readJson(fetch, "https://api.test/r", {}, schema)).toBeNull();
  });
});
