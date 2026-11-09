// @module-tag integration

import {
  CAN_EMULATE_MEDIA,
  withReducedMotion,
} from "@allonfire/ui/shared/tests/emulated-media";
import { render } from "vitest-browser-react";
import { EkiStamp } from "../eki-stamp";

/** The Japan Design's stamp landing (`theme.css`, `--animate-stamp`). */
const STAMP = "stamp";

const ring = async () => {
  const screen = await render(
    <EkiStamp code="404" kana="回送" station="Back Office" />
  );
  const stamp = screen.container.firstElementChild;
  if (!stamp) {
    throw new Error("the stamp drew nothing");
  }
  // Read now: a computed style is live, and the test's setting ends.
  const { animationIterationCount, animationName } = getComputedStyle(stamp);
  return { animationIterationCount, animationName };
};

describe("EkiStamp", () => {
  it("is pressed in once", async () => {
    expect(await ring()).toMatchObject({
      animationIterationCount: "1",
      animationName: STAMP,
    });
  });

  // Only Chromium can be asked for less motion.
  describe.runIf(CAN_EMULATE_MEDIA)("asked for less motion", () => {
    it("is already there", async () => {
      const { animationName } = await withReducedMotion(ring);
      expect(animationName).toBe("none");
    });
  });
});
