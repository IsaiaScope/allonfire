// @module-tag unit

import { withAppSession } from "@allonfire/auth/features/next/components/with-app-session";
import { Role } from "@allonfire/database/enums";
import { signedInPage } from "../utils/signed-in-page";

vi.mock("@allonfire/auth/features/next/components/with-app-session", () => ({
  withAppSession: vi.fn(() => () => null),
}));

const Page = () => null;

describe("signedInPage", () => {
  it("wraps the page in the Session check with the Back Office's loading screen", () => {
    signedInPage(Page);
    expect(withAppSession).toHaveBeenCalledWith(
      Page,
      expect.anything(),
      undefined
    );
  });

  it("hands a Section's minRole on, for a page above the App's floor", () => {
    signedInPage(Page, { minRole: Role.ADMIN });
    expect(withAppSession).toHaveBeenLastCalledWith(Page, expect.anything(), {
      minRole: Role.ADMIN,
    });
  });
});
