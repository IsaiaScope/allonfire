// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { App } from "@allonfire/database/enums";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { itGuardsAdminOverview } from "../../../shared/tests/admin-overview-gate";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { USER_USAGE } from "../constants/user-usage";
import type { UserUsageDeps } from "../utils/deps";
import { stubUserUsageDeps } from "./stub-user-usage-deps";

const OVERVIEW = `${API.PATH.USER_USAGE}${USER_USAGE.PATH.OVERVIEW}`;
const STATS = {
  byApp: [
    { admins: 1, app: App.LAURA, count: 3 },
    { admins: 1, app: App.BACK_OFFICE, count: 1 },
  ],
  total: 4,
};

const appWith = (overrides: Partial<UserUsageDeps>, signedIn = true) =>
  createApp(
    appDeps({
      auth: apiAuth({
        getSession: () => Promise.resolve(signedIn ? sessionFor() : null),
      }),
      userUsage: stubUserUsageDeps(overrides),
    })
  );

describe("GET /user-usage/overview", () => {
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
