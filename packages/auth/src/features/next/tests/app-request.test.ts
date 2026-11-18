// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { AUTH } from "../../../shared/constants/auth";
import { appHeaders, formText } from "../utils/app-request";

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ [HTTP.HEADER.X_FORWARDED_FOR]: "1.2.3.4" }),
}));

describe("formText", () => {
  it("trims a text field", () => {
    expect(formText("  a@b.test ")).toBe("a@b.test");
  });

  it("reads a missing field or a file as empty", () => {
    expect(formText(null)).toBe("");
    expect(formText(new File([], "a.txt"))).toBe("");
  });
});

describe("appHeaders", () => {
  it("forwards the visitor and names this App", async () => {
    const result = await appHeaders();
    expect(result.get(HTTP.HEADER.X_FORWARDED_FOR)).toBe("1.2.3.4");
    expect(result.get(AUTH.HEADER.APP)).toBe(App.BACK_OFFICE);
  });

  it("sends no language unless one is given", async () => {
    expect((await appHeaders()).has(HTTP.HEADER.ACCEPT_LANGUAGE)).toBe(false);
    expect((await appHeaders("it")).get(HTTP.HEADER.ACCEPT_LANGUAGE)).toBe(
      "it"
    );
  });
});
