// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { z } from "zod";
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps, UNMATCHED_PATH } from "../../../shared/tests/app-deps";
import { captureLog, infoLevel } from "../../../shared/tests/capture";

describe("probe logging", () => {
  it("does not emit an info line for /health", async () => {
    const { lines, logger } = captureLog();
    const app = createApp(appDeps({ logger }));

    await app.request(API.PATH.HEALTH);

    const infoLines = lines.filter((entry) => entry.level >= infoLevel(logger));

    expect(infoLines).toHaveLength(0);
  });

  it("emits an info line for a normal request", async () => {
    const { lines, logger } = captureLog();
    const app = createApp(appDeps({ logger }));

    await app.request(UNMATCHED_PATH);

    const infoLines = lines.filter((entry) => entry.level >= infoLevel(logger));

    expect(infoLines.length).toBeGreaterThan(0);
  });
});

/** A request line's headers, parsed rather than cast. */
const requestLineSchema = z.looseObject({
  req: z.object({ headers: z.record(z.string(), z.string()) }),
});

describe("request log headers", () => {
  it("logs only allowlisted request headers", async () => {
    const { lines, logger } = captureLog();
    const app = createApp(appDeps({ logger }));

    await app.request(API.PATH.OPENAPI, {
      headers: {
        [HTTP.HEADER.ACCEPT_LANGUAGE]: "it",
        traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
        [HTTP.HEADER.USER_AGENT]: "curl/8",
        [HTTP.HEADER.X_FORWARDED_FOR]: "203.0.113.7",
      },
    });

    const entry = requestLineSchema.parse(lines[0]);
    expect(entry.req.headers).toEqual({
      [HTTP.HEADER.ACCEPT_LANGUAGE]: "it",
    });
  });
});
