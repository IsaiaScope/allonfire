// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { z } from "zod";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import { HEALTH } from "../../health/constants/statuses";

describe("documentation routes", () => {
  it("serves a spec describing the probes", async () => {
    const res = await createApp(appDeps()).request(API.PATH.OPENAPI);
    expect(res.status).toBe(HTTP.STATUS.OK);

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
    expect(spec.paths[API.PATH.HEALTH].get.summary).toBe(
      HEALTH.PROBE_DESCRIPTION.HEALTH_SUMMARY
    );
  });

  it("serves the Scalar reference in development", async () => {
    const res = await createApp(appDeps()).request(API.PATH.REFERENCE);
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(res.headers.get(HTTP.HEADER.CONTENT_TYPE)).toContain(
      HTTP.CONTENT_TYPE.HTML
    );
  });
});
