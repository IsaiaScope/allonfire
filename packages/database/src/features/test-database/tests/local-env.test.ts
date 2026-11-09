// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { fillLocalDatabaseEnv } from "../utils/local-env";

const SET_URL = "postgresql://set@database.test:5432/set";

it("fills an unset DATABASE_URL from LOCAL", () => {
  vi.stubEnv("DATABASE_URL", undefined);

  fillLocalDatabaseEnv();

  expect(process.env.DATABASE_URL).toBe(LOCAL.URL.DATABASE);
});

it("keeps a set DATABASE_URL", () => {
  vi.stubEnv("DATABASE_URL", SET_URL);

  fillLocalDatabaseEnv();

  expect(process.env.DATABASE_URL).toBe(SET_URL);
});
