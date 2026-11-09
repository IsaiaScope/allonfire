// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { verifiedLanding } from "../verified-landing";

describe("verifiedLanding", () => {
  it("is the App's verified page in the language, marked as a real landing", () => {
    const landing = new URL(verifiedLanding("https://back-office.test", "it"));
    expect(landing.origin).toBe("https://back-office.test");
    expect(landing.pathname).toBe(`/it${AUTH.PAGE.EMAIL_VERIFIED}`);
    expect(landing.searchParams.has(AUTH.MAIL.VERIFIED_PARAM)).toBe(true);
  });
});
