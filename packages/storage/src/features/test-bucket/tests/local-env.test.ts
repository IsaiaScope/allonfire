// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { objectEntries, objectKeys } from "@allonfire/core/shared/utils/object";
import { fillLocalStorageEnv } from "../utils/local-env";

const SET_ENDPOINT = "http://storage.test";

const LOCAL_STORAGE_ENV = {
  STORAGE_ACCESS_KEY: LOCAL.STORAGE.ACCESS_KEY,
  STORAGE_ENDPOINT: LOCAL.URL.STORAGE,
  STORAGE_IMAGE_SERVER_KEY: LOCAL.IMAGE_SERVER.KEY,
  STORAGE_IMAGE_SERVER_SALT: LOCAL.IMAGE_SERVER.SALT,
  STORAGE_IMAGE_SERVER_URL: LOCAL.URL.IMAGE_SERVER,
  STORAGE_SECRET_KEY: LOCAL.STORAGE.SECRET_KEY,
} as const;

it("fills each unset STORAGE_ variable from LOCAL and keeps a set one", () => {
  for (const name of objectKeys(LOCAL_STORAGE_ENV)) {
    vi.stubEnv(name, undefined);
  }
  vi.stubEnv("STORAGE_ENDPOINT", SET_ENDPOINT);

  fillLocalStorageEnv();

  for (const [name, value] of objectEntries(LOCAL_STORAGE_ENV)) {
    const expected = name === "STORAGE_ENDPOINT" ? SET_ENDPOINT : value;
    expect(process.env[name]).toBe(expected);
  }
});
