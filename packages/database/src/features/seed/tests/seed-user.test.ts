// @module-tag unit

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "../../../../generated/prisma/enums";
import { adminSeedUser, seedUsersSchema } from "../seed-user";

describe("seedUsersSchema", () => {
  it("accepts the mock users file", () => {
    const raw = readFileSync(
      resolve(import.meta.dirname, "../mock/users.json"),
      "utf-8"
    );
    expect(seedUsersSchema.safeParse(parseJson(raw)).success).toBe(true);
  });

  it("rejects an unknown Role or App, and a User in no App", () => {
    const user = {
      email: "a@b.test",
      memberships: [{ app: "LAURA", role: "ADMIN" }],
      name: "a",
    };
    expect(seedUsersSchema.safeParse([user]).success).toBe(true);
    expect(
      seedUsersSchema.safeParse([
        { ...user, memberships: [{ app: "LAURA", role: "OWNER" }] },
      ]).success
    ).toBe(false);
    expect(
      seedUsersSchema.safeParse([
        { ...user, memberships: [{ app: "ALL", role: "ADMIN" }] },
      ]).success
    ).toBe(false);
    expect(
      seedUsersSchema.safeParse([{ ...user, memberships: [] }]).success
    ).toBe(false);
  });
});

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
