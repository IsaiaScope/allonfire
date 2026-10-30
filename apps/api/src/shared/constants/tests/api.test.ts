// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { API } from "../api";

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
