// @module-tag unit
// @vitest-environment node
import { withAppSession } from "@allonfire/auth/features/next/components/with-app-session";
import { sessionOf } from "@allonfire/auth/features/next/tests/session-request-mocks";
import { hasSectionRole } from "@allonfire/auth/features/next/utils/has-section-role";
import { LOCAL } from "@allonfire/config/local/addresses";
import { App, Role } from "@allonfire/database/enums";
import { SECTION, SECTIONS } from "@/shared/constants/laura";

vi.mock("@allonfire/auth/features/next/components/with-app-session", () => ({
  withAppSession: vi.fn(() => () => null),
}));
// The Role is read for the App auth serves: Laura.
vi.mock("@allonfire/auth/environment/next-environment", () => ({
  nextAuthEnv: { AUTH_APP: "LAURA" },
}));
// The env is read at import and a unit test lacks it.
vi.mock("@/environment/environment", () => ({
  env: { LAURA_URL: LOCAL.URL.LAURA },
}));

/** A Session whose User holds `role` in Laura. */
const heldAs = (role: Role) => sessionOf([{ app: App.LAURA, role }]);

/** What the page tells `withAppSession`: its call, read as the page module is loaded. */
const callOf = async (load: () => Promise<unknown>) => {
  vi.mocked(withAppSession).mockClear();
  vi.resetModules();
  await load();
  return vi.mocked(withAppSession).mock.calls[0];
};

describe("the Upload gate", () => {
  it("holds Upload alone to the Admin Role, in the one list the proxy reads", () => {
    const closed = SECTIONS.filter((section) => "minRole" in section);
    expect(closed).toEqual([SECTION.UPLOAD]);
    expect(SECTION.UPLOAD.minRole).toBe(Role.ADMIN);
  });

  it("has the Upload page ask for the Admin Role", async () => {
    const call = await callOf(
      () => import("../[locale]/(signed-in)/upload/page")
    );
    expect(call?.[2]).toEqual({ minRole: Role.ADMIN });
  });

  it.each([
    ["Home", () => import("../[locale]/(signed-in)/page")],
    ["Favorites", () => import("../[locale]/(signed-in)/favorites/page")],
    ["Memory", () => import("../[locale]/(signed-in)/memory/page")],
    [
      "Leaderboard",
      () => import("../[locale]/(signed-in)/memory/leaderboard/page"),
    ],
  ])(
    "has the %s page ask for nothing beyond the App's floor",
    async (_name, load) => {
      const call = await callOf(load);
      expect(call).toBeDefined();
      expect(call?.[2]?.minRole).toBeUndefined();
    }
  );

  it("keeps a User out of the Upload row and lets an Admin in", () => {
    expect(hasSectionRole(heldAs(Role.USER), SECTION.UPLOAD.minRole)).toBe(
      false
    );
    expect(hasSectionRole(heldAs(Role.ADMIN), SECTION.UPLOAD.minRole)).toBe(
      true
    );
  });
});
