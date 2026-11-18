// @module-tag unit
import { OCEAN_SEA_ICON, oceanSeaIconSvg } from "../sea-icons";
import { oceanWavePath } from "../sea-wave";

const VIEW_BOX = /^0 0 \d+ \d+$/;
const SEA_ICONS = [
  ["crab", OCEAN_SEA_ICON.CRAB],
  ["jellyfish", OCEAN_SEA_ICON.JELLYFISH],
  ["lighthouse", OCEAN_SEA_ICON.LIGHTHOUSE],
] as const;

describe("oceanWavePath", () => {
  const spec = { amplitude: 14, period: 120, width: 1200, y: 24 };

  it("starts at the left edge and runs across the whole width", () => {
    const path = oceanWavePath(spec);
    expect(path.startsWith("M0 24Q")).toBe(true);
    expect(path.endsWith(`T${spec.width} ${spec.y}`)).toBe(true);
  });

  it("draws one smooth curve per half period after the first", () => {
    const smooth = oceanWavePath(spec).match(/T/g) ?? [];
    expect(smooth).toHaveLength(spec.width / (spec.period / 2) - 1);
  });
});

describe("OCEAN_SEA_ICON", () => {
  it.each(SEA_ICONS)("holds the %s as a view box and a path", (_name, icon) => {
    expect(icon.VIEW_BOX).toMatch(VIEW_BOX);
    expect(icon.PATH.startsWith("M")).toBe(true);
  });

  it.each(SEA_ICONS)(
    "draws the %s in the colour it is given",
    (_name, icon) => {
      const svg = oceanSeaIconSvg(icon, "#123456");
      expect(svg).toContain(`viewBox="${icon.VIEW_BOX}"`);
      expect(svg).toContain('fill="#123456"');
      expect(svg).not.toContain("<filter");
    }
  );
});
