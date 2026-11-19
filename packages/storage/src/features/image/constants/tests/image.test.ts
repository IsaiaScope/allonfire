// @module-tag unit

import { IMAGE } from "../image";

// Cloudflare's free plan refuses a request body over 100 MB (decimal), and
// every App's host sits behind it. A multipart body is its files plus a little
// framing, so the cap keeps a margin below that line.
const CLOUDFLARE_BODY_BYTES = 100_000_000;
const FRAMING_MARGIN_BYTES = 1_000_000;

describe("IMAGE.LIMIT.UPLOAD_BYTES", () => {
  it("fits through Cloudflare's request body limit with room for framing", () => {
    expect(IMAGE.LIMIT.UPLOAD_BYTES + FRAMING_MARGIN_BYTES).toBeLessThan(
      CLOUDFLARE_BODY_BYTES
    );
  });

  it("still holds one file of the largest size", () => {
    expect(IMAGE.LIMIT.UPLOAD_BYTES).toBeGreaterThanOrEqual(
      IMAGE.LIMIT.FILE_BYTES
    );
  });
});
