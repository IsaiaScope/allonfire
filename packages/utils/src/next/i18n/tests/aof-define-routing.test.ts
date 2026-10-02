// @module-tag unit
import { AOFDefineRouting } from "../aof-define-routing";

describe("AOFDefineRouting", () => {
  it("routes every language, English first, prefix only when needed", () => {
    expect(AOFDefineRouting()).toEqual({
      defaultLocale: "en",
      localePrefix: "as-needed",
      locales: ["en", "it"],
    });
  });

  it("takes the App's overrides and keeps the shared languages", () => {
    expect(
      AOFDefineRouting({ defaultLocale: "it", localeCookie: false })
    ).toEqual({
      defaultLocale: "it",
      localeCookie: false,
      localePrefix: "as-needed",
      locales: ["en", "it"],
    });
  });
});
