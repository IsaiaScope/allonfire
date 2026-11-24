// @module-tag integration
import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import {
  OCEAN_ART,
  type OceanArtKey,
} from "@allonfire/design/designs/ocean/mascot-art";
import { render } from "vitest-browser-react";
import { OceanArt } from "../ocean-art";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const FULL_COLOUR = "OCTOPUS_NOTO" satisfies OceanArtKey;
const ONE_COLOUR = "OCTOPUS_MONO" satisfies OceanArtKey;

const picture = () => document.querySelector("[data-testid=picture]");

describe("OceanArt", () => {
  it("draws a full-colour picture as an inlined image, the key's own", async () => {
    const screen = await render(<OceanArt art={FULL_COLOUR} />);
    expect(picture()?.getAttribute("data-src")).toBe(
      svgDataUrl(OCEAN_ART[FULL_COLOUR].SVG)
    );
    expect(picture()?.getAttribute("data-alt")).toBe("");
    screen.unmount();
  });

  it("draws a different picture for each key", async () => {
    const screen = await render(<OceanArt art={FULL_COLOUR} />);
    const first = picture()?.getAttribute("data-src");
    await screen.rerender(<OceanArt art="SQUID_NOTO" />);
    expect(picture()?.getAttribute("data-src")).not.toBe(first);
    screen.unmount();
  });

  it("paints a one-colour picture through a mask in the theme's primary, not as an image", async () => {
    const screen = await render(
      <OceanArt art={ONE_COLOUR} data-testid="art" />
    );
    expect(picture()).toBeNull();
    const art = screen.getByTestId("art").element();
    expect(art.classList.contains("text-primary")).toBe(true);
    expect(art.getAttribute("style")).toContain("data:image/svg+xml");
    screen.unmount();
  });

  it("hides itself from assistive tech and takes its size from the caller", async () => {
    const screen = await render(
      <OceanArt art={FULL_COLOUR} className="size-12" data-testid="art" />
    );
    const art = screen.getByTestId("art");
    await expect.element(art).toHaveAttribute("aria-hidden", "true");
    expect(art.element().getBoundingClientRect().width).toBe(48);
    screen.unmount();
  });
});
