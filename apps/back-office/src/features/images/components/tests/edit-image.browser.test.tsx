// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { App, ImageAccess } from "@allonfire/database/enums";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { page } from "vitest/browser";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { deleteImages } from "../../actions/delete-images";
import { type EditImageState, editImage } from "../../actions/edit-image";
import { IMAGES } from "../../constants/images";
import { imageBody } from "../../tests/image-body";
import { replace } from "../../tests/image-form-mocks";
import { imageNames } from "../../utils/image-form-data";
import { EditImage } from "../edit-image";

vi.mock("../../actions/edit-image", () => ({ editImage: vi.fn() }));
vi.mock("../../actions/delete-images", () => ({
  deleteImages: vi.fn(() => Promise.resolve(1)),
}));
vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/image-form-mocks")
);
// jscpd:ignore-start
// A stored Image is drawn through the image server: here, a tile the picture's size.
vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@/shared/tests/image-mock")).ImageMock,
  AOFStorageImage: ({
    className,
    lcp,
  }: {
    className?: string;
    lcp?: boolean;
  }) => (
    <span
      className={className}
      data-lcp={lcp ? "true" : undefined}
      data-testid="picture"
    />
  ),
}));
// jscpd:ignore-end
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const CHANGED = /Someone changed this meanwhile/;
const IMAGE: ImageBody = imageBody({
  alt: { en: "The sea", fr: "La mer", it: "Il mare" },
});
const altField = (language: string) =>
  page.getByRole("textbox", { name: language });

beforeEach(() => {
  replace.mockClear();
  vi.mocked(editImage).mockReset();
  vi.mocked(deleteImages).mockClear();
  vi.mocked(aofToast).mockClear();
});

const renderEdit = () =>
  renderInApp({
    // The page's own width, which the form's wide layout reads (`SectionPage`).
    children: (
      <div className="@container">
        <EditImage image={IMAGE} offered={[App.BACK_OFFICE, App.LAURA]} />
      </div>
    ),
  });
const save = () =>
  page.getByRole("button", { name: EN.Images.edit.submit }).click();
const answers = (state: EditImageState) =>
  vi.mocked(editImage).mockResolvedValue(state);

describe("EditImage", () => {
  it("opens on the Image's alt in every language it holds", async () => {
    renderEdit();
    await expect.element(altField("English")).toHaveValue("The sea");
    await expect.element(altField("italiano")).toHaveValue("Il mare");
    await expect.element(altField("français")).toHaveValue("La mer");
  });

  it("names Delete beside its icon on a wide screen", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    renderEdit();
    await expect
      .element(page.getByText(EN.Images.delete.action, { exact: true }))
      .toBeVisible();
  });

  it("keeps Delete an icon on a phone", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    renderEdit();
    await expect
      .element(page.getByRole("button", { name: EN.Images.delete.action }))
      .toBeVisible();
    await expect
      .element(page.getByText(EN.Images.delete.action, { exact: true }))
      .not.toBeVisible();
  });

  it("names the Image under its picture by its stored file's name, a click copying it", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    renderEdit();
    const name = page.getByText(EN.Images.column.name, { exact: true });
    await expect.element(name).toBeVisible();
    const copy = page.getByRole("button", {
      name: enT("Images.copy.label", { name: IMAGE.key }),
    });
    await expect.element(copy).toBeVisible();
    await copy.click();
    expect(writeText).toHaveBeenCalledWith(IMAGE.key);
  });

  it("lets the name run over two lines at most, and shows all of it where the room allows", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    renderEdit();
    const name = page.getByText(IMAGE.key, { exact: true });
    await expect.element(name).toBeVisible();
    const element = name.element();
    expect(getComputedStyle(element).webkitLineClamp).toBe("2");
    expect(element.scrollHeight).toBeLessThanOrEqual(element.clientHeight);
  });

  it("sets the facts beside the picture on a wide screen, under it on a phone", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    const { unmount } = await renderEdit();
    const summary = page.getByRole("region", { name: EN.Images.edit.summary });
    await expect.element(summary).toBeVisible();
    expect(getComputedStyle(summary.element()).flexDirection).toBe("row");
    await unmount();
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    await renderEdit();
    await expect.element(summary).toBeVisible();
    expect(getComputedStyle(summary.element()).flexDirection).toBe("column");
  });

  it("fetches the picture first: it is the page's largest content, above the fold", async () => {
    renderEdit();
    await expect
      .element(page.getByTestId("picture"))
      .toHaveAttribute("data-lcp", "true");
  });

  it("shows the picture with its size and dimensions", async () => {
    renderEdit();
    await expect.element(page.getByTestId("picture")).toBeInTheDocument();
    await expect.element(page.getByText(formatSize(IMAGE.bytes))).toBeVisible();
    await expect
      .element(page.getByText(`${IMAGE.width} × ${IMAGE.height}`))
      .toBeVisible();
  });

  it("posts the language it opened with, so Save does not lose it", async () => {
    answers({});
    renderEdit();
    await save();
    await expect.poll(() => vi.mocked(editImage).mock.calls.length).toBe(1);
    const form = vi.mocked(editImage).mock.calls[0]?.[2];
    const names = imageNames("");
    expect(form?.get(names.alt("fr"))).toBe("La mer");
    expect(form?.get(names.access)).toBe(ImageAccess.PUBLIC);
    expect(form?.getAll(names.apps)).toEqual([App.BACK_OFFICE]);
  });

  it("toasts Saved and opens the list", async () => {
    answers({ notice: IMAGES.EDIT_NOTICE.SAVED });
    renderEdit();
    await save();
    await expect
      .poll(() => replace.mock.calls.at(0)?.[0])
      .toBe(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    expect(aofToast).toHaveBeenCalledWith(EN.Images.edit.saved, "success");
  });
});

describe("EditImage refusals", () => {
  it("says someone changed the Image meanwhile", async () => {
    answers({ error: IMAGES.EDIT_ERROR.CHANGED });
    renderEdit();
    await save();
    await expect.element(page.getByText(CHANGED)).toBeVisible();
    expect(replace).not.toHaveBeenCalled();
  });

  it("says the Image is gone", async () => {
    answers({ error: IMAGES.EDIT_ERROR.GONE });
    renderEdit();
    await save();
    await expect
      .element(page.getByText(EN.Images.edit.error.gone))
      .toBeVisible();
  });
});

describe("EditImage delete", () => {
  it("deletes this Image after asking, then opens the list", async () => {
    renderEdit();
    await page.getByRole("button", { name: EN.Images.delete.action }).click();
    await page.getByRole("button", { name: EN.Images.delete.confirm }).click();
    await expect.poll(() => vi.mocked(deleteImages).mock.calls.length).toBe(1);
    expect(vi.mocked(deleteImages).mock.calls[0]?.[0]).toEqual([IMAGE.id]);
    await expect
      .poll(() => replace.mock.calls.at(-1)?.[0])
      .toBe(BACK_OFFICE.PAGE.STORAGE_IMAGES);
  });
});
