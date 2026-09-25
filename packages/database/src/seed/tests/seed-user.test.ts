// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { seedUsersSchema } from "../seed-user";

describe("seedUsersSchema", () => {
  it("accepts the mock users file", () => {
    const raw = readFileSync(
      resolve(import.meta.dirname, "../mock/users.json"),
      "utf-8"
    );
    expect(seedUsersSchema.safeParse(JSON.parse(raw)).success).toBe(true);
  });

  it("rejects an unknown Role or Allowed app", () => {
    const user = {
      allowedApps: ["ALL"],
      email: "a@b.test",
      name: "a",
      role: "ADMIN",
    };
    expect(seedUsersSchema.safeParse([user]).success).toBe(true);
    expect(
      seedUsersSchema.safeParse([{ ...user, role: "OWNER" }]).success
    ).toBe(false);
    expect(
      seedUsersSchema.safeParse([{ ...user, allowedApps: ["social"] }]).success
    ).toBe(false);
  });
});
