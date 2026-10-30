// @module-tag unit
import { tileBlur } from "../tile-blur";

const BLUR = "data:image/webp;base64,UklGRhoAAABXRUJQ";

describe("tileBlur", () => {
  it("draws the blur as it is from a 40 px side", () => {
    expect(tileBlur(BLUR, 40)).toEqual({ placeholder: BLUR });
    expect(tileBlur(BLUR, 256)).toEqual({ placeholder: BLUR });
  });

  it("draws none under 40 px, where next/image advises against a placeholder", () => {
    expect(tileBlur(BLUR, 36)).toEqual({});
  });

  it("draws none without a blur, or with anything but an image's data URL", () => {
    expect(tileBlur(null, 64)).toEqual({});
    expect(tileBlur(undefined, 64)).toEqual({});
    expect(tileBlur("https://example.com/blur.webp", 64)).toEqual({});
  });
});
