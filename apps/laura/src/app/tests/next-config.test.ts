// @module-tag unit
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import config from "../../../next.config";

// The env is read at import and a unit test lacks it.
vi.mock("@allonfire/core/environment/environment", () => ({
  env: { CONFIG_E2E_TESTING_API: false, NODE_ENV: "test" },
}));

describe("Laura's Next config", () => {
  it("takes a whole upload through a Server Action and the proxy", () => {
    expect(config.experimental?.proxyClientMaxBodySize).toBe(
      IMAGE.LIMIT.UPLOAD.BODY_BYTES
    );
    expect(config.experimental?.serverActions?.bodySizeLimit).toBe(
      IMAGE.LIMIT.UPLOAD.BODY_BYTES
    );
  });
});
