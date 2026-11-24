// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { createApp } from "../../../../../app";
import { API } from "../../../../../shared/constants/api";
import { itGuardsAdminOverview } from "../../../../../shared/tests/admin-overview-gate";
import { apiAuth, appDeps } from "../../../../../shared/tests/app-deps";
import type { OverviewUsersDeps } from "../utils/deps";
import { stubOverviewUsersDeps } from "./stub-users-deps";

const OVERVIEW = API.PATH.BACK_OFFICE.OVERVIEW.USERS;
const STATS = {
  byApp: [
    { admins: 1, app: App.LAURA, count: 3 },
    { admins: 1, app: App.BACK_OFFICE, count: 1 },
  ],
  total: 4,
};

const appWith = (overrides: Partial<OverviewUsersDeps>, signedIn = true) =>
  createApp(
    appDeps({
      auth: apiAuth({
        getSession: () => Promise.resolve(signedIn ? sessionFor() : null),
      }),
      overviewUsers: stubOverviewUsersDeps(overrides),
    })
  );

describe("GET /overview/users", () => {
  itGuardsAdminOverview(OVERVIEW, appWith);

  it("answers the Users by App to an Admin", async () => {
    const res = await appWith({
      canManage: () => Promise.resolve(true),
      userStats: () => Promise.resolve(STATS),
    }).request(OVERVIEW);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual(STATS);
  });
});
