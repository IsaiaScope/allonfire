// @module-tag integration
import { createElement } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFPictureGuard } from "../components/aof-picture-guard";

/** A link the dev server answers 404, as the image server does once a picture is deleted or its link expired. */
const GONE = "/gone/picture.avif";
const BLUR = "data:image/webp;base64,UklGRlIAAABXRUJQ";

/** The picture is a plain img made without JSX: a stand-in for next/image, which the browser runner cannot load. */
const guarded = (resetKey: string, src = GONE) => (
  <div className="size-24">
    <AOFPictureGuard
      alt="The sea"
      blurDataUrl={BLUR}
      className="size-full"
      resetKey={resetKey}
    >
      {(fail) => createElement("img", { alt: "The sea", onError: fail, src })}
    </AOFPictureGuard>
  </div>
);

describe("AOFPictureGuard", () => {
  it("swaps a picture that cannot load for a tile painted with its blur", async () => {
    await render(guarded("links-1"));
    const tile = page.getByRole("img", { name: "The sea" });
    await vi.waitFor(() => {
      const element = tile.element();
      expect(element.tagName).toBe("SPAN");
      expect(getComputedStyle(element).backgroundImage).toContain(BLUR);
    });
  });

  it("tries the picture again once its links are new", async () => {
    const screen = await render(guarded("links-1"));
    await vi.waitFor(() =>
      expect(page.getByRole("img", { name: "The sea" }).element().tagName).toBe(
        "SPAN"
      )
    );
    // The same picture, now reachable (a data URL loads at once).
    const png =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    await screen.rerender(guarded("links-2", png));
    await vi.waitFor(() =>
      expect(page.getByRole("img", { name: "The sea" }).element().tagName).toBe(
        "IMG"
      )
    );
  });
});
