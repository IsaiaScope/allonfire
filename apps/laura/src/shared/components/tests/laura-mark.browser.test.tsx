// @module-tag integration
import { LI_MARK } from "@allonfire/design/designs/ocean/li-mark";
import { renderInApp } from "@/shared/tests/render-in-app";
import { LauraMark } from "../laura-mark";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

describe("LauraMark", () => {
  it("draws the Li logo twice, the navy one by day and the gold one by night, as decoration", async () => {
    const screen = await renderInApp({ children: <LauraMark /> });
    const sources = [
      ...screen.container.querySelectorAll("[data-testid=picture]"),
    ].map((picture) => picture.getAttribute("data-src"));
    expect(sources).toEqual([
      `data:image/png;base64,${LI_MARK.PNG_BASE64.LIGHT}`,
      `data:image/png;base64,${LI_MARK.PNG_BASE64.DARK}`,
    ]);
    expect(
      screen.container
        .querySelector("[data-testid=picture]")
        ?.getAttribute("data-alt")
    ).toBe("");
  });
});
