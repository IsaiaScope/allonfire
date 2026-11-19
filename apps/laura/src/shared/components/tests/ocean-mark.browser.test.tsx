// @module-tag integration
import { objectValues } from "@allonfire/core/shared/utils/object";
import { OCEAN_FACE } from "@allonfire/design/designs/ocean/ocean-mark";
import { render } from "vitest-browser-react";
import { OceanMark } from "../ocean-mark";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

/** The sources of the pictures the page draws now, one per scheme the mark changes with. */
const sources = () =>
  [...document.querySelectorAll("[data-testid=picture]")].map((picture) =>
    picture.getAttribute("data-src")
  );

describe("OceanMark", () => {
  it("draws one picture per scheme where the ground changes", async () => {
    const screen = await render(
      <OceanMark face={OCEAN_FACE.HAPPY} tone="coral" />
    );
    const coral = sources();
    await screen.rerender(<OceanMark face={OCEAN_FACE.HAPPY} tone="teal" />);
    const teal = sources();
    await screen.rerender(<OceanMark face={OCEAN_FACE.HAPPY} tone="white" />);
    const white = sources();
    expect(coral).toHaveLength(2);
    expect(new Set(coral).size).toBe(2);
    expect(teal).toHaveLength(2);
    expect(white).toHaveLength(1);
    screen.unmount();
  });

  it("draws a different picture for each face", async () => {
    const faces = objectValues(OCEAN_FACE);
    const screen = await render(
      <div>
        {faces.map((face) => (
          <div data-face={face} key={face}>
            <OceanMark face={face} tone="teal" />
          </div>
        ))}
      </div>
    );
    const first = faces.map((face) =>
      document
        .querySelector(`[data-face="${face}"] [data-testid=picture]`)
        ?.getAttribute("data-src")
    );
    expect(new Set(first).size).toBe(faces.length);
    screen.unmount();
  });

  it("hides itself from assistive tech: the words around it say what it shows", async () => {
    const screen = await render(
      <OceanMark data-testid="mark" face={OCEAN_FACE.WINK} tone="teal" />
    );
    await expect
      .element(screen.getByTestId("mark"))
      .toHaveAttribute("aria-hidden", "true");
    screen.unmount();
  });
});
