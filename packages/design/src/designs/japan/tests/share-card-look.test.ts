// @module-tag unit
import { JAPAN_IMAGE_COLOR } from "../image-colors";
import { JAPAN_IMAGE_FONT } from "../image-font";
import { JAPAN_SHARE_CARD } from "../share-card-look";

describe("JAPAN_SHARE_CARD", () => {
  it.each(["light", "dark"] as const)(
    "dresses the %s card in the Design's colours and image face",
    (scheme) => {
      const { background, foreground, mutedForeground } =
        JAPAN_IMAGE_COLOR[scheme];
      expect(JAPAN_SHARE_CARD[scheme]).toMatchObject({
        colors: { background, foreground, mutedForeground },
        fontFamily: JAPAN_IMAGE_FONT.FAMILY,
      });
    }
  );

  it("runs the yellow tactile paving along the bottom edge", () => {
    const { edge } = JAPAN_SHARE_CARD.light;
    const [kind, data = ""] = edge.image.split(",");
    expect(kind).toBe("data:image/svg+xml;base64");
    expect(Buffer.from(data, "base64").toString()).toContain(
      JAPAN_IMAGE_COLOR.TACTILE
    );
  });
});
