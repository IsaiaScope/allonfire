// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import { OCEAN_ART } from "@allonfire/design/designs/ocean/mascot-art";
import { AOF_ACTION } from "@allonfire/ui/shared/constants/action";
import { MASCOT } from "../mascots";

const MONO_KEY = /_MONO$/;

describe("MASCOT", () => {
  it("names a picture that exists for every moment", () => {
    const keys = [
      MASCOT.ERROR,
      MASCOT.GALLERY.EMPTY,
      MASCOT.GALLERY.FAVORITES_EMPTY,
      MASCOT.GATE,
      MASCOT.INSTALL,
      MASCOT.LOADING,
      MASCOT.NOT_FOUND,
      MASCOT.OFFLINE,
      MASCOT.REMOVE,
      ...objectValues(MASCOT.TOAST),
    ];
    for (const key of keys) {
      expect(OCEAN_ART[key].SVG).toContain("<svg");
    }
  });

  it("dresses the forms' band in the Noto octopus, the owner's pick", () => {
    expect(MASCOT.GATE).toBe("OCTOPUS_NOTO");
  });

  it("holds no crumb picture whose fill all but vanishes on the light ground", () => {
    const vanishing = new Set([
      "JELLYFISH_NOTO",
      "LIGHTHOUSE_NOTO",
      "SHARK_NOTO",
      "WAVE_FLUENT",
      "WHALE_NOTO",
    ]);
    for (const key of [MASCOT.APP, ...objectValues(MASCOT.CRUMB)]) {
      expect(OCEAN_ART[key].SVG).toContain("<svg");
      expect(vanishing.has(key)).toBe(false);
    }
  });

  it("gives every action a one-colour picture, the one beside Back never the one beside Send or Save", () => {
    for (const action of objectValues(AOF_ACTION)) {
      expect(MASCOT.ACTION[action]).toMatch(MONO_KEY);
      expect(OCEAN_ART[MASCOT.ACTION[action]]).toHaveProperty("MONO", true);
    }
    expect(MASCOT.ACTION.back).not.toBe(MASCOT.ACTION.send);
    expect(MASCOT.ACTION.back).not.toBe(MASCOT.ACTION.save);
    expect(MASCOT.ACTION.back).not.toBe(MASCOT.ACTION.retry);
  });

  it("gives each kind of toast its own picture", () => {
    const toasts = objectValues(MASCOT.TOAST);
    expect(new Set(toasts).size).toBe(toasts.length);
  });

  it("keeps the page's moments told apart: an error, a 404 and offline differ", () => {
    expect(new Set([MASCOT.ERROR, MASCOT.NOT_FOUND, MASCOT.OFFLINE]).size).toBe(
      3
    );
  });

  it("tells the photos' moments apart: an empty Gallery, an empty Favorites and a failed load differ", () => {
    expect(
      new Set([
        MASCOT.GALLERY.EMPTY,
        MASCOT.GALLERY.FAVORITES_EMPTY,
        MASCOT.ERROR,
      ]).size
    ).toBe(3);
  });
});
