// @module-tag unit
import { cardBadge } from "../card-badge";

describe("cardBadge", () => {
  it("is the size every Home and Services card badge shares, from `sm` up", () => {
    expect(cardBadge()).toContain("sm:h-7");
    expect(cardBadge()).toContain("sm:text-sm");
  });

  it("tints a badge with a chart token, text left in the foreground", () => {
    expect(cardBadge({ tone: "chart1" })).toContain("bg-chart-1/15");
    expect(cardBadge({ tone: "chart2" })).toContain("bg-chart-2/15");
    expect(cardBadge({ tone: "chart2" })).toContain("text-foreground");
  });
});
