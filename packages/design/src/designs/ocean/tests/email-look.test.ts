// @module-tag unit
import { AA, contrast } from "../../shared/tests/theme-css";
import { OCEAN_EMAIL_LOOK } from "../email-look";
import { OCEAN_IMAGE_COLOR } from "../image-colors";

const WHITE = "#ffffff";

describe("OCEAN_EMAIL_LOOK", () => {
  it("fills its button with the light primary, labelled in white at AA", () => {
    expect(OCEAN_EMAIL_LOOK.accent).toBe(OCEAN_IMAGE_COLOR.light.primary);
    expect(OCEAN_EMAIL_LOOK.accentInk).toBe(WHITE);
    expect(
      contrast(OCEAN_EMAIL_LOOK.accentInk, OCEAN_EMAIL_LOOK.accent)
    ).toBeGreaterThanOrEqual(AA);
  });

  it("wears the Design's light colours by day and its dark ones at night", () => {
    const { dark, light } = OCEAN_IMAGE_COLOR;
    expect(OCEAN_EMAIL_LOOK).toMatchObject({
      dark: {
        card: dark.card,
        ground: dark.background,
        ink: dark.foreground,
        muted: dark.mutedForeground,
      },
      ground: light.background,
      ink: light.foreground,
      muted: light.mutedForeground,
    });
  });

  it.each(["ink", "muted"] as const)(
    "reads %s on the ground at AA, by day and at night",
    (text) => {
      expect(
        contrast(OCEAN_EMAIL_LOOK[text], OCEAN_EMAIL_LOOK.ground)
      ).toBeGreaterThanOrEqual(AA);
      expect(
        contrast(OCEAN_EMAIL_LOOK.dark[text], OCEAN_EMAIL_LOOK.dark.ground)
      ).toBeGreaterThanOrEqual(AA);
      expect(
        contrast(OCEAN_EMAIL_LOOK.dark[text], OCEAN_EMAIL_LOOK.dark.card)
      ).toBeGreaterThanOrEqual(AA);
    }
  );

  it("has no flourish: Japan's seal and kanji have no ocean twin", () => {
    expect("flourish" in OCEAN_EMAIL_LOOK).toBe(false);
  });
});
