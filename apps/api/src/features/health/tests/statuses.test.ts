// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { HEALTH } from "../constants/statuses";

describe("HEALTH", () => {
  it("keeps the readiness vocabulary orchestrators branch on", () => {
    expect(objectValues(HEALTH.READY.STATUS)).toEqual([
      "degraded",
      "ok",
      "unavailable",
    ]);
    expect(objectValues(HEALTH.CHECK.STATUS)).toEqual(["ok", "unreachable"]);
  });

  it("answers 200 when ready and 503 when Postgres is down", () => {
    expect(HEALTH.READY.HTTP_STATUS.READY).toBe(HTTP.STATUS.OK);
    expect(HEALTH.READY.HTTP_STATUS.NOT_READY).toBe(
      HTTP.STATUS.SERVICE_UNAVAILABLE
    );
  });

  it("describes each probe with a summary, a description and every status it answers", () => {
    const { HEALTH: health, READY: ready } = HEALTH.PROBE_DESCRIPTION;

    expect(health.RESPONSE[HTTP.STATUS.OK]).not.toBe("");
    expect(ready.RESPONSE[HTTP.STATUS.OK]).not.toBe("");
    expect(ready.RESPONSE[HTTP.STATUS.SERVICE_UNAVAILABLE]).not.toBe("");
    for (const probe of objectValues(HEALTH.PROBE_DESCRIPTION)) {
      expect(probe.SUMMARY).not.toBe("");
      expect(probe.DESCRIPTION).not.toBe("");
    }
  });
});
