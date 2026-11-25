// @module-tag integration

import { page } from "vitest/browser";
import { renderInUi } from "../../../../shared/tests/render-in-ui";
import type { AOFAddImagesApps } from "../types/add-images-dressing";
import { appToggle } from "./app-toggle";
import { uploadCopy } from "./image-upload-copy";
import {
  FIXED_LAURA,
  ONE_APP,
  PictureRowHarness,
  SHELL,
} from "./picture-row-harness";

vi.mock(
  "../../../../shared/components/aof-image",
  () => import("../../../../shared/tests/aof-image-mock")
);
vi.mock("../../../../shared/utils/heic-to-jpeg", async (original) => ({
  ...(await original<typeof import("../../../../shared/utils/heic-to-jpeg")>()),
  heicToJpeg: vi.fn(),
}));

const { heicToJpeg } = await import("../../../../shared/utils/heic-to-jpeg");

const WIDE_PX = 900;
const PHONE_PX = 360;
/** A preview large enough to recognise the picture by. */
const PREVIEW_MIN_PX = 96;

const photo = (name: string, type = "image/jpeg") =>
  new File(["x"], name, { type });
const heic = (name = "IMG_1.HEIC") => photo(name, "image/heic");

const show = (file: File, apps?: AOFAddImagesApps, width = WIDE_PX) =>
  renderInUi({
    children: (
      <div className="@container" style={{ width }}>
        <PictureRowHarness apps={apps} file={file} />
      </div>
    ),
    messages: {},
  });
const row = () =>
  page.getByRole("group", { name: uploadCopy("row.title", { number: 1 }) });
/** A hidden file input posts the original. */
const posted = (container: Element) =>
  container.querySelector<HTMLInputElement>('input[type="file"][hidden]');

const PULSE = /motion-safe:animate-pulse/;
const FAINT_MUTED = /bg-muted\/20/;

beforeEach(() => {
  vi.mocked(heicToJpeg).mockReset();
});

describe("AOFPictureRow preview", () => {
  it("draws a JPEG itself, with no tile", async () => {
    show(photo("a.jpg"));
    await expect.element(row().getByTestId("picture")).toBeInTheDocument();
    await expect
      .element(row().getByTestId("preview-fallback"))
      .not.toBeInTheDocument();
    expect(heicToJpeg).not.toHaveBeenCalled();
  });

  it("pulses the placeholder while a HEIC is being decoded, then draws the picture", async () => {
    let finish: (file: File) => void = () => undefined;
    vi.mocked(heicToJpeg).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/sized/sea.jpg");
    await show(heic());
    await expect
      .element(row().getByTestId("preview-loading"))
      .toHaveClass(PULSE);
    finish(photo("IMG_1.jpg"));
    await expect.element(row().getByTestId("picture")).toBeInTheDocument();
    await expect
      .element(row().getByTestId("preview-loading"))
      .not.toBeInTheDocument();
    link.mockRestore();
  });

  it("previews a HEIC through its JPEG and posts the original file", async () => {
    const original = heic();
    const jpeg = photo("IMG_1.jpg");
    vi.mocked(heicToJpeg).mockResolvedValue(jpeg);
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/sized/sea.jpg");
    const screen = await show(original);
    await expect.element(row().getByTestId("picture")).toBeInTheDocument();
    expect(
      vi.mocked(heicToJpeg).mock.calls.map(([source]) => source)
    ).toHaveLength(1);
    // Files compare by identity here: two files are never equal by their content.
    expect(vi.mocked(heicToJpeg).mock.calls[0]?.[0]).toBe(original);
    expect(link.mock.calls).toHaveLength(1);
    expect(link.mock.calls[0]?.[0]).toBe(jpeg);
    expect(posted(screen.container)?.files?.[0]).toBe(original);
    link.mockRestore();
  });

  it("shows the tile and no dimensions when the HEIC cannot be decoded", async () => {
    vi.mocked(heicToJpeg).mockRejectedValue(new Error("not a picture"));
    show(heic());
    await expect.element(row().getByTestId("preview-fallback")).toBeVisible();
    await expect.element(row().getByText("—", { exact: true })).toBeVisible();
  });

  it("keeps the tile's background faint (a fifth), so a picture's own colours lead", async () => {
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/broken/a.jpg");
    show(photo("broken.jpg"));
    await expect
      .element(row().getByTestId("preview-fallback"))
      .toHaveClass(FAINT_MUTED);
    link.mockRestore();
  });

  it("shows the tile for a picture the browser cannot draw", async () => {
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/broken/a.jpg");
    show(photo("a.jpg"));
    await expect.element(row().getByTestId("preview-fallback")).toBeVisible();
    link.mockRestore();
  });

  it("frees every link it made when the row goes", async () => {
    vi.mocked(heicToJpeg).mockResolvedValue(photo("IMG_1.jpg"));
    let made = 0;
    const link = vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
      made += 1;
      return `/sized/${made}.jpg`;
    });
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    show(heic());
    await expect.element(row().getByTestId("picture")).toBeInTheDocument();
    await page
      .getByRole("button", {
        name: uploadCopy("row.remove", { name: "IMG_1.HEIC" }),
      })
      .click();
    await expect.element(row()).not.toBeInTheDocument();
    expect(made).toBeGreaterThan(0);
    for (let number = 1; number <= made; number += 1) {
      expect(revoke).toHaveBeenCalledWith(`/sized/${number}.jpg`);
    }
    link.mockRestore();
    revoke.mockRestore();
  });
});

describe("AOFPictureRow facts", () => {
  it("draws the preview large and cuts a long name after two lines", async () => {
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/broken/long.jpg");
    const name = `${"a-very-long-name-".repeat(12)}.jpg`;
    show(photo(name));
    const tile = row().getByTestId("preview-fallback");
    await expect.element(tile).toBeVisible();
    expect(tile.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(
      PREVIEW_MIN_PX
    );
    const title = row().getByText(name, { exact: true });
    expect(getComputedStyle(title.element()).webkitLineClamp).toBe("2");
    link.mockRestore();
  });

  const rects = async (width: number) => {
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/sized/sea.jpg");
    show(photo("sea.jpg"), undefined, width);
    // The facts show once the picture has told its size.
    await vi.waitFor(() => row().getByText("640 × 480").element());
    const found = {
      facts: row()
        .getByText(uploadCopy("facts.name"), { exact: true })
        .element()
        .getBoundingClientRect(),
      preview: row().getByTestId("picture").element().getBoundingClientRect(),
    };
    link.mockRestore();
    return found;
  };

  it("sets the name, size and dimensions beside the picture on a wide page", async () => {
    const { facts, preview } = await rects(WIDE_PX);
    expect(facts.left).toBeGreaterThanOrEqual(preview.right);
  });

  it("sets them under the picture on a phone", async () => {
    const { facts, preview } = await rects(PHONE_PX);
    expect(facts.top).toBeGreaterThanOrEqual(preview.bottom);
  });
});

describe("AOFPictureRow Apps", () => {
  it("offers a toggle for each App it is given", async () => {
    show(photo("a.jpg"), ONE_APP);
    await expect.element(appToggle(row(), SHELL.name)).toBeVisible();
  });

  it("offers none when the Apps are fixed", async () => {
    show(photo("a.jpg"), FIXED_LAURA);
    await expect.element(row()).toBeVisible();
    await expect
      .element(row().getByRole("radiogroup", { name: SHELL.name }))
      .not.toBeInTheDocument();
    await expect
      .element(row().getByText("Apps", { exact: true }))
      .not.toBeInTheDocument();
  });
});
