// @module-tag integration
import {
  CAN_EMULATE_MEDIA,
  withCoarsePointer,
  withDarkDevice,
  withReducedMotion,
} from "./emulated-media";

const matches = (query: string) => matchMedia(query).matches;

// Only Chromium can be told what its screen is.
describe.runIf(CAN_EMULATE_MEDIA)("emulated media", () => {
  it("has the page report a coarse pointer the moment the test starts, and a fine one after", async () => {
    expect(matches("(pointer: coarse)")).toBe(false);
    const during = await withCoarsePointer(() =>
      Promise.resolve(matches("(pointer: coarse)"))
    );
    expect(during).toBe(true);
    expect(matches("(pointer: coarse)")).toBe(false);
  });

  it("has the page ask for less motion while the test runs, and no more after", async () => {
    const during = await withReducedMotion(() =>
      Promise.resolve(matches("(prefers-reduced-motion: reduce)"))
    );
    expect(during).toBe(true);
    expect(matches("(prefers-reduced-motion: reduce)")).toBe(false);
  });

  it("has the device turn dark while the test runs, and light again after", async () => {
    const during = await withDarkDevice(() =>
      Promise.resolve(matches("(prefers-color-scheme: dark)"))
    );
    expect(during).toBe(true);
    expect(matches("(prefers-color-scheme: dark)")).toBe(false);
  });
});
