// @module-tag unit
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";
import { crumbArt } from "../crumb-art";

describe("crumbArt", () => {
  it("gives the App's crumb the forms' octopus, the same as the gate's band", () => {
    expect(crumbArt()).toBe(MASCOT.APP);
    expect(MASCOT.APP).toBe(MASCOT.GATE);
  });

  it("gives every Section and page of Laura its own picture", () => {
    const labels = LAURA.sections.flatMap((section) => [
      section.label,
      ...("pages" in section ? section.pages.map(({ label }) => label) : []),
    ]);
    const arts = labels.map((label) => crumbArt(label));
    expect(arts).not.toContain(MASCOT.APP);
    expect(new Set(arts).size).toBe(labels.length);
  });

  it("falls back to the favourite for a label it does not know", () => {
    expect(crumbArt("toString")).toBe(MASCOT.APP);
  });
});
