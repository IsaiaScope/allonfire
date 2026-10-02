// @module-tag unit
import { LOCALE } from "@allonfire/utils/constants/locales";
import { CodedError } from "@allonfire/utils/helpers/coded-error";
import { Hono } from "hono";
import { translate } from "../../i18n/translate";
import { onError } from "../middleware/error-handler";
import { problemOf } from "./problem-of";

const appThrowing = (error: Error) =>
  new Hono()
    .get("/", () => {
      throw error;
    })
    .onError(onError);

describe("onError with a CodedError", () => {
  it("renders the code with its values in the request's language", async () => {
    const res = await appThrowing(
      new CodedError({
        code: "PAYLOAD_TOO_LARGE",
        status: 413,
        values: { limit: 2048 },
      })
    ).request("/", { headers: { "accept-language": "en-US" } });
    expect(res.status).toBe(413);
    const body = await problemOf(res);
    expect(body.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.detail).toBe(
      translate("PAYLOAD_TOO_LARGE", LOCALE.EN_US, { limit: 2048 })
    );
  });

  it("passes field errors through", async () => {
    const res = await appThrowing(
      new CodedError({
        code: "VALIDATION_FAILED",
        errors: [{ message: "Required", path: "app" }],
        status: 400,
        values: { count: 1 },
      })
    ).request("/");
    expect((await problemOf(res)).errors).toEqual([
      { message: "Required", path: "app" },
    ]);
  });

  it.each([
    ["an unknown code", { code: "NOPE", status: 400 }],
    ["an undocumented status", { code: "NOT_FOUND", status: 418 }],
  ])("answers 500 for %s", async (_, fields) => {
    const res = await appThrowing(new CodedError(fields)).request("/");
    expect(res.status).toBe(500);
    expect((await problemOf(res)).code).toBe("INTERNAL_ERROR");
  });
});
