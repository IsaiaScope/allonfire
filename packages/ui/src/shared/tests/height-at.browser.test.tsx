// @module-tag integration
import { FORM_WIDTHS, heightAtIn } from "./height-at";

const BOX_HEIGHT_PX = 100;
const PHONE_PX = 360;

describe("heightAtIn", () => {
  it("answers the height of the view drawn at the width given", async () => {
    expect(
      await heightAtIn({
        messages: {},
        view: <div style={{ height: BOX_HEIGHT_PX }} />,
        width: PHONE_PX,
      })
    ).toBe(BOX_HEIGHT_PX);
  });

  // A square as wide as its container is as tall as the width given.
  it("gives the view that width as its container", async () => {
    expect(
      await heightAtIn({
        messages: {},
        view: <div style={{ aspectRatio: "1", width: "100%" }} />,
        width: PHONE_PX,
      })
    ).toBe(PHONE_PX);
  });

  it("names the wide, tablet and phone widths a skeleton is held at", () => {
    expect(FORM_WIDTHS.map(([, width]) => width)).toEqual([900, 520, PHONE_PX]);
  });
});
