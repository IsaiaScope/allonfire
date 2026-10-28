// @module-tag unit
import { srcSetLoader } from "../image-server-loader";

const SRC_SET = [640, 1080, 1920, 2560].map((width) => ({
  url: `https://images.test/${width}`,
  width,
}));
const ask = (width: number) =>
  srcSetLoader(SRC_SET)({ quality: 75, src: "ignored", width });

describe("srcSetLoader", () => {
  it("picks the smallest link at least as wide as asked", () => {
    expect(ask(900)).toBe("https://images.test/1080");
    expect(ask(640)).toBe("https://images.test/640");
  });

  it("falls back to the largest past every width", () => {
    expect(ask(4000)).toBe("https://images.test/2560");
  });
});
