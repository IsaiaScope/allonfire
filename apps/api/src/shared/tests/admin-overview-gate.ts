import type { CanManage } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import { HTTP } from "@allonfire/core/features/http/constants/http";

type OverviewApp = {
  request: (path: string) => Response | Promise<Response>;
};

/**
 * The three tests every Back Office Admin overview route shares: no Session
 * answers 401, a signed-in User who cannot manage answers 403, and the Session
 * and the User are asked fresh. `appWith` builds the App around the route's
 * stubbed dependencies.
 */
export const itGuardsAdminOverview = (
  path: string,
  appWith: (
    overrides: { canManage?: CanManage },
    signedIn?: boolean
  ) => OverviewApp
) => {
  it("answers 401 without a Session", async () => {
    const res = await appWith({}, false).request(path);
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
  });

  it("answers 403 to a signed-in User who is not a Back Office Admin", async () => {
    const res = await appWith({}).request(path);
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("asks the Session and the User fresh", async () => {
    const canManage = vi.fn(() => Promise.resolve(true));
    await appWith({ canManage }).request(path);
    expect(canManage).toHaveBeenCalledWith({
      sessionId: expect.any(String),
      userId: expect.any(String),
    });
  });
};
