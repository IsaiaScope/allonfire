// @module-tag integration
import { render } from "vitest-browser-react";
import { useSafeAreaPadding } from "../hooks/use-safe-area-padding";

const PROBES = "[data-safe-area-probe]";

const READERS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];

const Reader = () => {
  useSafeAreaPadding();
  return null;
};

const Readers = () => READERS.map((reader) => <Reader key={reader} />);

describe("useSafeAreaPadding", () => {
  // A table row carries a tooltip: one probe per reader would flush layout
  // once per row, and again for each of them on every resize.
  it("shares one probe between every reader, and removes it with the last", async () => {
    const screen = await render(<Readers />);
    expect(document.querySelectorAll(PROBES)).toHaveLength(1);
    screen.unmount();
    expect(document.querySelectorAll(PROBES)).toHaveLength(0);
  });
});
