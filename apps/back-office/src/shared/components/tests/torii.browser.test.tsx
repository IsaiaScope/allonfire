// @module-tag integration
import { render } from "vitest-browser-react";
import { computedValue } from "@/shared/tests/computed-style";
import { Torii } from "../torii";

describe("Torii", () => {
  it("draws a vermilion gate with its black top beam", async () => {
    const screen = await render(<Torii />);
    // The posts, the red beams, then the black parts: the top beam, the feet.
    const [posts, beams, black] = screen.container.querySelectorAll("g");
    const vermilion = computedValue("color", "var(--hanko)");
    expect(posts && getComputedStyle(posts).fill).toBe(vermilion);
    expect(beams && getComputedStyle(beams).fill).toBe(vermilion);
    expect(black && getComputedStyle(black).fill).toBe(
      computedValue("color", "var(--led-panel)")
    );
  });
});
