// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseJsonWith } from "@allonfire/core/shared/utils/json";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "../../../../../../generated/prisma/enums";
import { seedUsersSchema } from "../../../../seed/seed-user";
import { lauraSeedUsers } from "../laura-seed";

const mockUsers = (path: string) =>
  parseJsonWith(readFileSync(path, "utf-8"), seedUsersSchema);

describe("Laura's seed", () => {
  it("has its own mock users, every one allowed into Laura", () => {
    const users = mockUsers(resolve(import.meta.dirname, "../mock/users.json"));
    expect(users.length).toBeGreaterThan(0);
    expect(
      users.every(({ memberships }) =>
        memberships.some(({ app }) => app === App.LAURA)
      )
    ).toBe(true);
  });

  it("seeds a Viewer from the env, the account Laura's guests use", () => {
    expect(
      lauraSeedUsers({
        DATABASE_SEED_LAURA_VIEWER_EMAIL: "guest@laura.test",
      })
    ).toEqual([
      {
        email: "guest@laura.test",
        memberships: [{ app: App.LAURA, role: Role.VIEWER }],
        name: "guest",
      },
    ]);
  });
});

describe("the shared seed", () => {
  it("holds no App's users, only users of every App", () => {
    const users = mockUsers(
      resolve(import.meta.dirname, "../../../../seed/mock/users.json")
    );
    const everyApp = [...objectValues(App)].sort().join();
    expect(
      users.every(
        ({ memberships }) =>
          memberships
            .map(({ app }) => app)
            .sort()
            .join() === everyApp
      )
    ).toBe(true);
  });
});
