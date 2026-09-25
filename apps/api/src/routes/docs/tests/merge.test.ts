// @module-tag unit
import { mergeOpenApi } from "../utils/merge";

const fragment = {
  components: { schemas: { User: { type: "object" } } },
  paths: { "/v1/auth/get-session": { get: { tags: ["Auth"] } } },
  tags: [{ name: "Auth" }],
};

describe("mergeOpenApi", () => {
  it("adds paths, component groups and tags next to the base ones", () => {
    const merged = mergeOpenApi(
      {
        components: { responses: { Problem: { description: "x" } } },
        openapi: "3.1.0",
        paths: { "/health": { get: {} } },
        tags: [{ name: "Infrastructure" }],
      },
      fragment
    );
    expect(merged.paths).toHaveProperty(["/health"]);
    expect(merged.paths).toHaveProperty(["/v1/auth/get-session"]);
    expect(merged.components).toEqual({
      responses: { Problem: { description: "x" } },
      schemas: { User: { type: "object" } },
    });
    expect(merged.tags).toEqual([{ name: "Infrastructure" }, { name: "Auth" }]);
    expect(merged.openapi).toBe("3.1.0");
  });

  it("throws rather than overwrite a component both documents define", () => {
    expect(() =>
      mergeOpenApi(
        { components: { schemas: { User: {} } }, paths: {} },
        fragment
      )
    ).toThrow("schemas.User");
  });
});
