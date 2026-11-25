// @module-tag unit
import { App, Role } from "@allonfire/database/enums";
import { adminOf, memberOf } from "../admin-of";

const IDS = { sessionId: "session-1", userId: "user-1" };

const userWith = (app: App, role: Role) => ({
  memberships: [{ app, role }],
});

describe("adminOf", () => {
  it("lets an Admin of the App, on a live Session", async () => {
    const canManage = adminOf(App.LAURA, {
      accessUserById: async () => userWith(App.LAURA, Role.ADMIN),
      sessionAlive: async () => true,
    });
    expect(await canManage(IDS)).toBe(true);
  });

  it("refuses a Session that is gone", async () => {
    const canManage = adminOf(App.LAURA, {
      accessUserById: async () => userWith(App.LAURA, Role.ADMIN),
      sessionAlive: async () => false,
    });
    expect(await canManage(IDS)).toBe(false);
  });

  it("refuses an unknown User", async () => {
    const canManage = adminOf(App.LAURA, {
      accessUserById: async () => null,
      sessionAlive: async () => true,
    });
    expect(await canManage(IDS)).toBe(false);
  });

  it("refuses an Admin of another App", async () => {
    const canManage = adminOf(App.LAURA, {
      accessUserById: async () => userWith(App.BACK_OFFICE, Role.ADMIN),
      sessionAlive: async () => true,
    });
    expect(await canManage(IDS)).toBe(false);
  });

  it("refuses a member below Admin", async () => {
    const canManage = adminOf(App.BACK_OFFICE, {
      accessUserById: async () => userWith(App.BACK_OFFICE, Role.USER),
      sessionAlive: async () => true,
    });
    expect(await canManage(IDS)).toBe(false);
  });
});

describe("memberOf", () => {
  const reads = (user: ReturnType<typeof userWith> | null, alive = true) => ({
    accessUserById: async () => user,
    sessionAlive: async () => alive,
  });

  it("lets a Member of the App of any Role, on a live Session", async () => {
    const canPlay = memberOf(App.LAURA, reads(userWith(App.LAURA, Role.USER)));
    expect(await canPlay(IDS)).toBe(true);
  });

  it("refuses a Session that is gone", async () => {
    const canPlay = memberOf(
      App.LAURA,
      reads(userWith(App.LAURA, Role.USER), false)
    );
    expect(await canPlay(IDS)).toBe(false);
  });

  it("refuses an unknown User and a Member of another App", async () => {
    expect(await memberOf(App.LAURA, reads(null))(IDS)).toBe(false);
    expect(
      await memberOf(
        App.LAURA,
        reads(userWith(App.BACK_OFFICE, Role.ADMIN))
      )(IDS)
    ).toBe(false);
  });
});
