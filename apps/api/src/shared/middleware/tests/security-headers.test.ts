// @module-tag unit
import { SECURITY_HEADERS } from "@allonfire/core/features/http/constants/security-headers";
import { Hono } from "hono";
import { securityHeaders } from "../security-headers";

describe("securityHeaders", () => {
  it("sends the allonfire values, not Hono's defaults for the same headers", async () => {
    const res = await new Hono()
      .use(securityHeaders())
      .get("/", (c) => c.text("ok"))
      .request("/");
    for (const { key, value } of SECURITY_HEADERS) {
      expect(res.headers.get(key)).toBe(value);
    }
  });

  it("keeps Hono's defaults for the headers allonfire does not set", async () => {
    const res = await new Hono()
      .use(securityHeaders())
      .get("/", (c) => c.text("ok"))
      .request("/");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
  });
});
