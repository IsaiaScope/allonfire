// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { OCEAN_IMAGE_COLOR } from "../image-colors";
import { OCEAN_IMAGE_FONT } from "../image-font";
import { OCEAN_SHARE_CARD } from "../share-card-look";

const EDGE_HEIGHT = 48;

describe("OCEAN_SHARE_CARD", () => {
  it.each(["light", "dark"] as const)(
    "dresses the %s card in the Design's colours and image face",
    (scheme) => {
      const { background, foreground, mutedForeground } =
        OCEAN_IMAGE_COLOR[scheme];
      expect(OCEAN_SHARE_CARD[scheme]).toMatchObject({
        colors: { background, foreground, mutedForeground },
        fontFamily: OCEAN_IMAGE_FONT.FAMILY,
      });
    }
  );

  it.each(["light", "dark"] as const)(
    "runs a wave along the %s card's bottom edge in the scheme's primary",
    (scheme) => {
      const { edge } = OCEAN_SHARE_CARD[scheme];
      const [kind, data = ""] = edge.image.split(",");
      const svg = decodeURIComponent(data);
      expect(kind).toBe(`data:${HTTP.CONTENT_TYPE.SVG}`);
      expect(svg).toContain(OCEAN_IMAGE_COLOR[scheme].primary);
      expect(svg).toContain(OCEAN_IMAGE_COLOR[scheme].background);
      expect(svg).not.toContain("<filter");
      expect(svg).not.toContain("href");
      expect(edge.height).toBe(EDGE_HEIGHT);
    }
  );
});
