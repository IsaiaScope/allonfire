// @module-tag unit
import { createApp } from "../../../app";
import { API } from "../../../shared/constants/api";
import { appDeps } from "../../../shared/tests/app-deps";
import { captureLog, infoLevel } from "./capture";

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

    await app.request("/nothing-here");

    const infoLines = lines.filter((entry) => entry.level >= infoLevel(logger));

    expect(infoLines.length).toBeGreaterThan(0);
  });
});

describe("request log headers", () => {
  it("logs only allowlisted request headers", async () => {
    const { lines, logger } = captureLog();
    const app = createApp(appDeps({ logger }));

    await app.request(API.PATH.OPENAPI, {
      headers: {
        "accept-language": "it",
        traceparent: "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
        "user-agent": "curl/8",
        "x-forwarded-for": "203.0.113.7",
      },
    });

    const [entry] = lines as { req?: { headers?: object } }[];
    expect(entry?.req?.headers).toEqual({ "accept-language": "it" });
  });
});
