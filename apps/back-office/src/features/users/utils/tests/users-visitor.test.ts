// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { App, Role } from "@allonfire/database/enums";
import { usersVisitorOf } from "../users-visitor";

const COOKIE = `${AUTH.COOKIE.SESSION_TOKEN}=token`;

describe("usersVisitorOf", () => {
  // The Role keys the kept lists: an Admin whose Role is taken away misses
  // the entries kept for them and asks the API, which refuses.
  it("carries the Session and its Back Office Role", () => {
    expect(
      usersVisitorOf(
        {
          memberships: [
            { app: App.LAURA, role: Role.ADMIN },
            { app: App.BACK_OFFICE, role: Role.USER },
          ],
        },
        COOKIE
      )
    ).toEqual({ role: Role.USER, sessionCookie: COOKIE });
  });

  it("has no Role outside the Back Office", () => {
    expect(usersVisitorOf({ memberships: [] }, COOKIE).role).toBeUndefined();
  });
});
