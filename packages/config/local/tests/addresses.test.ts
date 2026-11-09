// @module-tag unit
import { LOCAL } from "../addresses";

describe("local addresses", () => {
  it("builds every URL from its port", () => {
    expect(LOCAL.URL).toEqual({
      API: "http://localhost:3300",
      API_E2E: "http://localhost:3310",
      BACK_OFFICE: "http://localhost:3400",
      BACK_OFFICE_E2E: "http://localhost:3410",
      CDN: "http://localhost:9010",
      DATABASE: "postgresql://allonfire:allonfire@localhost:5432/allonfire",
      IMAGE_SERVER: "http://localhost:9010/image",
      LAURA: "http://localhost:3200",
      MAIL_SINK_E2E: "https://localhost:3320",
      REDIS: "redis://localhost:6379/0",
      REDIS_E2E: "redis://localhost:6379/15",
      STORAGE: "http://localhost:9000",
      TEST_API: "http://api.test",
    });
  });

  it("names a host that never resolves for MSW", () => {
    expect(LOCAL.URL.TEST_API).toBe("http://api.test");
  });
});
