// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { administeredApps, offeredApps } from "../administered-apps";

describe("administeredApps", () => {
  it("lists the Apps the user is an Admin of", () => {
    expect(
      administeredApps({
        memberships: [
          { app: App.BACK_OFFICE, role: Role.ADMIN },
          { app: App.LAURA, role: Role.USER },
        ],
      })
    ).toEqual([App.BACK_OFFICE]);
  });

  it("lists none for a user who is Admin of nothing", () => {
    expect(
      administeredApps({ memberships: [{ app: App.LAURA, role: Role.VIEWER }] })
    ).toEqual([]);
  });

  it("drops an App this build does not know", () => {
    expect(
      administeredApps({
        memberships: [{ app: "ELSEWHERE", role: Role.ADMIN }],
      })
    ).toEqual([]);
  });
});

describe("offeredApps", () => {
  it("offers the administered Apps and the ones the Image is in already, each once", () => {
    expect(
      offeredApps([App.BACK_OFFICE], [App.LAURA, App.BACK_OFFICE])
    ).toEqual([App.BACK_OFFICE, App.LAURA]);
  });

  it("offers an App the Image is in that the visitor does not administer", () => {
    expect(offeredApps([], [App.LAURA])).toEqual([App.LAURA]);
  });
});
