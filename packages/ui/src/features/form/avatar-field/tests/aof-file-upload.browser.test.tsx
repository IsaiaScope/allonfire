// @module-tag integration
import { render } from "vitest-browser-react";
import {
  computedValue,
  roundestCorner,
} from "../../../../shared/tests/computed-style";
import { AOFFileUpload } from "../components/aof-file-upload";

const LABEL = "Attachment";
const LABELS = {
  choose: "Select a file",
  drop: "Drop your file here",
  formats: "PDF or PNG, up to 5 MB",
  remove: "Remove",
  tooLarge: "Too large",
  wrongType: "Not a PDF or PNG",
};
const FILE = { id: "a", name: "scan.png", size: 1 } as const;

const radius = (element: Element | null | undefined) =>
  element ? getComputedStyle(element).borderTopLeftRadius : null;
const designCorner = (token: string) =>
  computedValue("border-top-left-radius", `var(${token})`);

describe("AOFFileUpload", () => {
  it("draws its area and rows in the Design's corners, never round", async () => {
    const screen = await render(
      <AOFFileUpload
        accept="application/pdf,image/png"
        items={[FILE]}
        label={LABEL}
        labels={LABELS}
        maxBytes={5_000_000}
        name="attachment"
        onFileAccept={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const area = screen.getByRole("region", { name: LABEL }).element();
    const row = screen.getByText(FILE.name).element().closest("li");
    expect(radius(area)).toBe(designCorner("--radius-lg"));
    // Its icon's tile, and the file's.
    expect(radius(area.firstElementChild)).toBe(designCorner("--radius-md"));
    expect(radius(row)).toBe(designCorner("--radius-lg"));
    expect(radius(row?.firstElementChild)).toBe(designCorner("--radius-md"));
    expect(roundestCorner(screen.container)).toBeLessThanOrEqual(
      Number.parseFloat(designCorner("--radius-lg"))
    );
  });
});
