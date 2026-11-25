// @module-tag unit
import { HTTP } from "../../../http/constants/http";
import { aofRefusal, textOf } from "../utils/aof-refusal";

const CODES = { CONFLICT: "conflict", TAKEN: "email_taken" } as const;
const MESSAGES = { FAILED: "failed", REFUSED: "refused" } as const;
const TAKEN_MESSAGE = "taken" as const;
const { refusalOf } = aofRefusal({
  codes: CODES,
  status: [HTTP.STATUS.CONFLICT] as const,
});

const answer = (status: number, body: unknown = {}) =>
  Response.json(body, { status });
const known = { [CODES.TAKEN]: TAKEN_MESSAGE } as const;

describe("aofRefusal", () => {
  it("answers the message a known code maps to", async () => {
    expect(
      await refusalOf(
        answer(HTTP.STATUS.CONFLICT, { code: CODES.TAKEN }),
        { FAILED: TAKEN_MESSAGE, REFUSED: TAKEN_MESSAGE },
        known
      )
    ).toBe(TAKEN_MESSAGE);
  });

  it("falls back to the status the API answers with a problem", async () => {
    const byStatus = { [HTTP.STATUS.CONFLICT]: MESSAGES.FAILED } as const;
    expect(
      await refusalOf(answer(HTTP.STATUS.CONFLICT), MESSAGES, byStatus)
    ).toBe(MESSAGES.FAILED);
  });

  it("answers REFUSED to a 403 whose code is unknown, and FAILED to a 500", async () => {
    const none = {};
    expect(
      await refusalOf(
        answer(HTTP.STATUS.FORBIDDEN, { code: "unheard_of" }),
        MESSAGES,
        none
      )
    ).toBe(MESSAGES.REFUSED);
    expect(
      await refusalOf(answer(HTTP.STATUS.INTERNAL_SERVER_ERROR), MESSAGES, none)
    ).toBe(MESSAGES.FAILED);
  });

  it("finds nothing for a code every object has: `constructor`", async () => {
    const none = {};
    expect(
      await refusalOf(
        answer(HTTP.STATUS.BAD_REQUEST, { code: "constructor" }),
        MESSAGES,
        none
      )
    ).toBe(MESSAGES.FAILED);
  });

  it("answers FAILED when the body is not JSON", async () => {
    const none = {};
    expect(
      await refusalOf(
        new Response("<html>", { status: HTTP.STATUS.BAD_GATEWAY }),
        MESSAGES,
        none
      )
    ).toBe(MESSAGES.FAILED);
  });
});

describe("textOf", () => {
  it("reads a posted text field, and nothing for a missing one or a file", () => {
    const form = new FormData();
    form.set("name", "Mia");
    form.set("picture", new File(["x"], "x.txt"));
    expect(textOf(form, "name")).toBe("Mia");
    expect(textOf(form, "missing")).toBe("");
    expect(textOf(form, "picture")).toBe("");
  });
});
