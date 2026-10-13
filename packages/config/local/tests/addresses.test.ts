// @module-tag unit
import { LOCAL, TEST_API_URL } from "../addresses";

describe("local addresses", () => {
  it("builds every URL from its port", () => {
    expect(LOCAL.URL).toEqual({
      API: "http://localhost:3300",
      API_E2E: "http://localhost:3310",
      BACK_OFFICE: "http://localhost:3400",
      BACK_OFFICE_E2E: "http://localhost:3410",
      DATABASE: "postgresql://allonfire:allonfire@localhost:5432/allonfire",
      LAURA: "http://localhost:3200",
      REDIS: "redis://localhost:6379/0",
      REDIS_E2E: "redis://localhost:6379/15",
      STORAGE: "http://localhost:9000",
    });
  });

  it("names a host that never resolves for MSW", () => {
    expect(TEST_API_URL).toBe("http://api.test");
  });
});
