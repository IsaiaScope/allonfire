// @module-tag unit
import { z } from "zod";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";

describe("documentation routes", () => {
  it("serves a spec describing the probes", async () => {
    const res = await createApp(appDeps()).request(API.PATH.OPENAPI);
    expect(res.status).toBe(200);

    const spec = z
      .object({
        paths: z.object({
          [API.PATH.HEALTH]: z.object({
            get: z.object({ summary: z.string() }),
          }),
        }),
      })
      .parse(await res.json());
    expect(spec.paths[API.PATH.HEALTH]).toBeDefined();
    expect(spec.paths[API.PATH.HEALTH].get.summary).toBe("Liveness probe");
  });

  it("serves the Scalar reference in development", async () => {
    const res = await createApp(appDeps()).request(API.PATH.REFERENCE);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
