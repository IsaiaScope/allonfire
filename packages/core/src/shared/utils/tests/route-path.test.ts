// @module-tag unit
import { fillPath, openApiPath } from "../route-path";

describe("fillPath", () => {
  it("fills every param of a Hono path", () => {
    expect(fillPath("/users/:id/avatar/:size", { id: "u1", size: "s" })).toBe(
      "/users/u1/avatar/s"
    );
  });

  it("encodes a param so it stays one path segment", () => {
    expect(fillPath("/users/:id", { id: "a/b c" })).toBe("/users/a%2Fb%20c");
  });

  it("throws on a param the path names but the call leaves out", () => {
    expect(() => fillPath("/users/:id", {})).toThrow(":id");
  });
});

describe("openApiPath", () => {
  it("writes each Hono param the way OpenAPI does", () => {
    expect(openApiPath("/users/:id/avatar")).toBe("/users/{id}/avatar");
  });
});
