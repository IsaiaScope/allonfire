// @module-tag unit
import { NextRequest } from "next/server";
import { AOFCreateMiddleware } from "../aof-create-middleware";

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response("intl"),
}));

const routing = { defaultLocale: "en", locales: ["en", "it"] } as const;

describe("AOFCreateMiddleware", () => {
  it("hands every request to next-intl", async () => {
    const response = await AOFCreateMiddleware(routing)(
      new NextRequest("http://localhost/it")
    );
    expect(await response.text()).toBe("intl");
  });
});
