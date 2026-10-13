// @module-tag unit
import { App, Role } from "../../../../generated/prisma/enums";
import { adminSeedUser } from "../seed-user";

describe("adminSeedUser", () => {
  it("is an Admin of every App there is", () => {
    expect(adminSeedUser("admin@aof.test", "Admin")).toEqual({
      email: "admin@aof.test",
      memberships: [
        { app: App.LAURA, role: Role.ADMIN },
        { app: App.BACK_OFFICE, role: Role.ADMIN },
      ],
      name: "Admin",
    });
  });
});
