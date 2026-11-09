// @module-tag unit
import { env } from "../../../environment/environment";
import { TELEMETRY } from "../constants/telemetry";
import {
  type OtlpTarget,
  otlpExporterOptions,
  otlpTargetFrom,
  telemetryResourceAttributes,
} from "../otlp";

const TARGET: OtlpTarget = {
  endpoint: "http://collector.test/api/default",
  headers: { authorization: "Basic YWI6Y2Q=" },
  serviceName: "allonfire-test",
};

describe("otlpTargetFrom", () => {
  it("builds no target without an endpoint", () => {
    expect(
      otlpTargetFrom({
        TELEMETRY_HEADERS: TARGET.headers,
        TELEMETRY_SERVICE_NAME: TARGET.serviceName,
      })
    ).toBeUndefined();
  });

  it("builds the target from the endpoint, headers and service name", () => {
    expect(
      otlpTargetFrom({
        TELEMETRY_ENDPOINT: TARGET.endpoint,
        TELEMETRY_HEADERS: TARGET.headers,
        TELEMETRY_SERVICE_NAME: TARGET.serviceName,
      })
    ).toEqual(TARGET);
  });
});

describe("otlpExporterOptions", () => {
  it("appends the signal's path to the endpoint and carries the headers", () => {
    expect(otlpExporterOptions(TARGET, TELEMETRY.PATH.TRACES)).toEqual({
      headers: TARGET.headers,
      url: `${TARGET.endpoint}${TELEMETRY.PATH.TRACES}`,
    });
  });
});

describe("telemetryResourceAttributes", () => {
  it("names the service, its version and the environment", () => {
    expect(telemetryResourceAttributes(TARGET, "1.2.3")).toEqual({
      [TELEMETRY.ATTRIBUTE.RESOURCE.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
      [TELEMETRY.ATTRIBUTE.RESOURCE.SERVICE_NAME]: TARGET.serviceName,
      [TELEMETRY.ATTRIBUTE.RESOURCE.SERVICE_VERSION]: "1.2.3",
    });
  });

  it("leaves the version out when there is none", () => {
    // An array: a dotted string is read as a nested path.
    expect(telemetryResourceAttributes(TARGET)).not.toHaveProperty([
      TELEMETRY.ATTRIBUTE.RESOURCE.SERVICE_VERSION,
    ]);
  });
});
