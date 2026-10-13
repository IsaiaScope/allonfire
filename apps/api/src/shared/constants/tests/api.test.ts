// @module-tag unit
import { API_PATH, LOCAL } from "@allonfire/config/local/addresses";
import { API } from "../api";

describe("API.PATH.AUTH", () => {
  it("is the path config tells the Apps and the e2e stack to reach Auth at", () => {
    expect(API.PATH.AUTH).toBe(API_PATH.AUTH);
  });
});

describe("API.PATH.HEALTH", () => {
  it("is the probe config tells the e2e stack and the Apps' tests to ask", () => {
    expect(API.PATH.HEALTH).toBe(API_PATH.HEALTH);
  });
});

describe("API.PATH", () => {
  it("builds the version prefix and both modules' mount points from API.VERSION.CURRENT", () => {
    const prefix = `/${API.VERSION.CURRENT}`;
    expect(API.PATH.VERSION).toBe(prefix);
    expect(API.PATH.AUTH.startsWith(`${prefix}/`)).toBe(true);
    expect(API.PATH.IMAGES.startsWith(`${prefix}/`)).toBe(true);
  });
});

it("listens where the Local stack expects the API", () => {
  expect(API.DEFAULT.PORT).toBe(LOCAL.PORT.API);
});
