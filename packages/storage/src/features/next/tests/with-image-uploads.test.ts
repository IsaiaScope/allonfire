// @module-tag unit
import { UNIT } from "@allonfire/core/shared/constants/units";
import { IMAGE } from "../../image/constants/image";
import { withImageUploads } from "../utils/with-image-uploads";

describe("IMAGE.LIMIT.UPLOAD.BODY_BYTES", () => {
  it("is the API's upload cap plus 1 MiB", () => {
    expect(IMAGE.LIMIT.UPLOAD.BODY_BYTES).toBe(
      IMAGE.LIMIT.UPLOAD.BYTES + UNIT.BYTES_PER_MIB
    );
  });
});

describe("withImageUploads", () => {
  it("lets the proxy and a Server Action take a whole upload", () => {
    const config = withImageUploads({});
    expect(config.experimental?.proxyClientMaxBodySize).toBe(
      IMAGE.LIMIT.UPLOAD.BYTES + UNIT.BYTES_PER_MIB
    );
    expect(config.experimental?.serverActions?.bodySizeLimit).toBe(
      IMAGE.LIMIT.UPLOAD.BYTES + UNIT.BYTES_PER_MIB
    );
  });

  it("keeps every other experimental and Server Action setting the App set", () => {
    const config = withImageUploads({
      experimental: {
        authInterrupts: true,
        serverActions: { allowedOrigins: ["example.test"] },
      },
    });
    expect(config.experimental?.authInterrupts).toBe(true);
    expect(config.experimental?.serverActions?.allowedOrigins).toEqual([
      "example.test",
    ]);
  });
});
