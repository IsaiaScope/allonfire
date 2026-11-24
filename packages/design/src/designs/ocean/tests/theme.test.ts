// @module-tag unit
import {
  COMMON_TEXT_PAIRS,
  declarations,
  describeContrast,
  hexTokens,
  readTheme,
} from "../../shared/tests/theme-css";

const css = readTheme("ocean");
const PLAIN_LENGTH = /^\d+(\.\d+)?(rem|px)$/;
const RADIUS_STEP = /^var\(--radius-(xl|2xl|3xl)\)$/;

describeContrast(
  "Ocean",
  css,
  [
    ...COMMON_TEXT_PAIRS,
    // The sidebar is its own surface: text, the lit row, the chosen mark.
    ["foreground", "sidebar"],
    ["sidebar-foreground", "sidebar"],
    ["sidebar-accent-foreground", "sidebar-accent"],
    ["sidebar-primary-foreground", "sidebar-primary"],
    ["primary", "sidebar"],
    ["secondary-foreground", "secondary"],
    ["accent-foreground", "accent"],
    // The ink pill (the octopus mark's own dark), the same in both schemes.
    ["ink-foreground", "ink"],
  ],
  [
    // Marks drawn, not read: the coral accent, the focus ring, a field's edge.
    ["coral", "card"],
    ["coral", "background"],
    ["ring", "background"],
    ["input", "card"],
  ]
);

describe("Ocean's own choices", () => {
  it("keeps the ink the same in both schemes", () => {
    const dark = hexTokens(css, ".dark");
    expect(dark.has("ink")).toBe(false);
    expect(dark.has("ink-foreground")).toBe(false);
    expect(hexTokens(css, ":root").get("ink")).toBeDefined();
  });

  // An emoji is full colour, so it keeps its own colours: a tight shadow lifts
  // it off any ground. Ink on the light ground, a light rim on the dark one.
  it("gives emoji a tight shadow in each scheme, the filter an Image reads", () => {
    const light = declarations(css, ":root").get("emoji-shadow") ?? "";
    const dark = declarations(css, ".dark").get("emoji-shadow") ?? "";
    expect(light).toContain("drop-shadow(");
    expect(dark).toContain("drop-shadow(");
    expect(dark).not.toBe(light);
  });

  it("is soft or tidy as the owner chose", () => {
    expect(declarations(css, ":root").get("radius")).toBe("0.75rem");
  });

  it("sets headings in Fraunces and text in Nunito", () => {
    const root = declarations(css, ":root");
    expect(root.get("font-sans")).toContain('"Nunito"');
    expect(root.get("font-heading")).toContain('"Fraunces"');
    expect(declarations(css, "@theme inline").get("font-heading")).toBe(
      "var(--font-heading)"
    );
  });
});

describe("Ocean frame tokens", () => {
  const light = declarations(css, ":root");
  const dark = declarations(css, ".dark");

  it("gives the floating frame a gap as a plain length", () => {
    expect(light.get("frame-gap")).toMatch(PLAIN_LENGTH);
  });

  it("rounds the frame from the Design's radius scale", () => {
    expect(light.get("frame-radius")).toMatch(RADIUS_STEP);
  });

  it("casts a shadow in both schemes, deeper at night", () => {
    expect(light.get("frame-shadow")).toContain("rgb(");
    expect(dark.get("frame-shadow")).toContain("rgb(");
    expect(dark.get("frame-shadow")).not.toBe(light.get("frame-shadow"));
  });
});
