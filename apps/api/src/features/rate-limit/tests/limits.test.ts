// @module-tag unit
import { RATE_LIMIT } from "../constants/limits";
import { rateLimitKey } from "../utils/rate-limit-key";

describe("rateLimitKey", () => {
  it("namespaces a client's counter under the rate-limit prefix", () => {
    expect(rateLimitKey("1.2.3.4")).toBe(`${RATE_LIMIT.KEY.PREFIX}1.2.3.4`);
  });

  it("keeps the context key, header spec and unknown client the limiter reads", () => {
    expect(RATE_LIMIT.CONTEXT_VAR.INFO).toBe("rateLimit");
    expect(RATE_LIMIT.HEADER.SPEC).toBe("draft-6");
    expect(RATE_LIMIT.KEY.UNKNOWN_CLIENT).toBe("unknown");
  });
});
