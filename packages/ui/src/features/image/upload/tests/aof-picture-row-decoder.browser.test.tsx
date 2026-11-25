// @module-tag integration

// The storage's HEIC Fixture, served by Vite to the browser under test.
import HEIC_URL from "@allonfire/storage/features/image/fixtures/files/colors-no-alpha.heic?url";
import { page } from "vitest/browser";
import { renderInUi } from "../../../../shared/tests/render-in-ui";
import { uploadCopy } from "./image-upload-copy";
import { FIXED_LAURA, PictureRowHarness } from "./picture-row-harness";

// next/image reaches a browser test as a CommonJS object: the mock shows the
// link it was given, which the test loads itself.
vi.mock(
  "../../../../shared/components/aof-image",
  () => import("../../../../shared/tests/aof-image-mock")
);

/** The wasm decoder loads on first use. */
const DECODER_MS = 10_000;

describe("AOFPictureRow with the real decoder", () => {
  it("previews an iPhone's HEIC as a picture the browser draws", async () => {
    const file = new File(
      [await (await fetch(HEIC_URL)).blob()],
      "IMG_1.HEIC",
      { type: "image/heic" }
    );
    const link = vi.spyOn(URL, "createObjectURL");
    renderInUi({
      children: <PictureRowHarness apps={FIXED_LAURA} file={file} />,
      messages: {},
    });
    await expect
      .element(
        page
          .getByRole("group", { name: uploadCopy("row.title", { number: 1 }) })
          .getByTestId("picture"),
        { timeout: DECODER_MS }
      )
      .toBeInTheDocument();
    // The link is the converted JPEG, which the browser can draw.
    const preview = new Image();
    preview.src = link.mock.results.at(-1)?.value;
    await preview.decode();
    expect(preview.naturalWidth).toBeGreaterThan(0);
    link.mockRestore();
  });
});
