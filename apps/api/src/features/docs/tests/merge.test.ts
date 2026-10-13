// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { API } from "../../../shared/constants/api";
import { mergeOpenApi } from "../utils/merge";

const GET_SESSION_ROUTE = `${API.PATH.AUTH}${AUTH.PATH.GET_SESSION}`;

const fragment = {
  components: { schemas: { User: { type: "object" } } },
  paths: { [GET_SESSION_ROUTE]: { get: { tags: ["Auth"] } } },
  tags: [{ name: "Auth" }],
};

describe("mergeOpenApi", () => {
  it("adds paths, component groups and tags next to the base ones", () => {
    const merged = mergeOpenApi(
      {
        components: { responses: { Problem: { description: "x" } } },
        openapi: "3.1.0",
        paths: { [API.PATH.HEALTH]: { get: {} } },
        tags: [{ name: "Infrastructure" }],
      },
      fragment
    );
    expect(merged.paths).toHaveProperty([API.PATH.HEALTH]);
    expect(merged.paths).toHaveProperty([GET_SESSION_ROUTE]);
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
