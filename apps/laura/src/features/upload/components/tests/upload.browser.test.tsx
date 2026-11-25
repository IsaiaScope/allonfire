// @module-tag integration

import { IMAGE } from "@allonfire/ui/features/image/constants/image";
import {
  imageNames,
  rowPrefix,
} from "@allonfire/ui/features/image/upload/utils/image-form-data";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { page, userEvent } from "vitest/browser";
import { LAURA } from "@/shared/constants/laura";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { addImage } from "../../actions/add-image";
import { replace } from "../../tests/upload-mocks";
import { Upload } from "../upload";

/*
 * The form itself (rows, limits, refusals, layout) is ui's `AOFAddImages`,
 * tested there; this is what Laura dresses it with and where it goes.
 */

// jscpd:ignore-start
// Hoisted mocks: a `vi.mock` cannot move into a shared helper, and the Back Office's twin and this App's other suite need the same ones.
vi.mock("../../actions/add-image", () => ({ addImage: vi.fn() }));
vi.mock("@/features/i18n/navigation", () => import("../../tests/upload-mocks"));
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../tests/upload-mocks")
);
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("../../tests/upload-mocks")
);
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));
// jscpd:ignore-end

const UPLOAD = EN.Upload;
const BOLD = /font-bold/;
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

// jscpd:ignore-start
// The Back Office's twin: the same setup over its own App's page.
beforeEach(() => {
  replace.mockClear();
  vi.mocked(addImage).mockReset();
  vi.mocked(aofToast).mockClear();
});

const renderUpload = () =>
  renderInApp({
    // The page's own width, which the form's wide layout reads (`AOFSectionPage`).
    children: (
      <div className="@container">
        <Upload />
      </div>
    ),
  });
// jscpd:ignore-end
/** The drop area (a region) and the file input behind it share one name. */
const area = () =>
  page.getByRole("region", { name: enT("Common.ImageUpload.pick.input") });
const pick = (...files: File[]) =>
  userEvent.upload(
    page.getByRole("button", { name: enT("Common.ImageUpload.pick.input") }),
    files
  );
const rowTitle = (number: number) =>
  page.getByRole("group", {
    name: enT("Common.ImageUpload.row.title", { number }),
  });
const sharedBox = () =>
  page.getByRole("group", { name: enT("Common.ImageUpload.shared.title") });

describe("Upload", () => {
  it("offers the drop area and no Apps toggle: every photo goes to Laura", async () => {
    renderUpload();
    await expect.element(area()).toBeVisible();
    await pick(photo("a.jpg"));
    await expect
      .element(page.getByText(enT("Common.ImageFields.apps"), { exact: true }))
      .not.toBeInTheDocument();
  });

  it("draws Choose as Laura's action button, not the plain outline one", async () => {
    renderUpload();
    await expect
      .element(
        page.getByRole("button", {
          name: enT("Common.ImageUpload.dropzone.choose"),
        })
      )
      .toHaveClass(BOLD);
  });

  it("names Remove in a tip that opens to its left, where the corner leaves room", async () => {
    renderUpload();
    await pick(photo("a.jpg"));
    const remove = page.getByRole("button", {
      name: enT("Common.ImageUpload.row.remove", { name: "a.jpg" }),
    });
    await userEvent.hover(remove);
    await vi.waitFor(() => {
      const tip = document.querySelector("[data-slot=tooltip-content]");
      expect(tip?.textContent).toContain("a.jpg");
      expect(tip?.getAttribute("data-side")).toBe("left");
    });
  });

  it("offers no Access and no shared set: every image is private", async () => {
    renderUpload();
    await pick(photo("a.jpg"));
    await expect.element(rowTitle(1)).toBeVisible();
    await expect.element(sharedBox()).not.toBeInTheDocument();
    await expect
      .element(
        rowTitle(1).getByRole("group", {
          name: enT("Common.ImageFields.access"),
        })
      )
      .not.toBeInTheDocument();
  });

  it("sends the alt typed", async () => {
    vi.mocked(addImage).mockResolvedValue({});
    renderUpload();
    await pick(photo("a.jpg"));
    await rowTitle(1)
      .getByRole("textbox", { name: "English" })
      .fill("The sea at dawn");
    await page.getByRole("button", { name: UPLOAD.submit }).click();
    await expect.poll(() => vi.mocked(addImage).mock.calls.length).toBe(1);
    const form = vi.mocked(addImage).mock.calls[0]?.[1];
    expect(form?.get(imageNames(rowPrefix(0)).alt("en"))).toBe(
      "The sea at dawn"
    );
  });

  it("keeps the row and says why when the batch is refused", async () => {
    vi.mocked(addImage).mockResolvedValue({
      error: IMAGE.UPLOAD.ERROR.UNSUPPORTED,
    });
    renderUpload();
    await pick(photo("a.jpg"));
    await page.getByRole("button", { name: UPLOAD.submit }).click();
    await expect
      .element(page.getByText(enT("Common.ImageUpload.error.unsupported")))
      .toBeVisible();
    await expect.element(rowTitle(1)).toBeVisible();
  });

  it("toasts how many were added, then opens the Gallery", async () => {
    vi.mocked(addImage).mockResolvedValue({
      added: 2,
      notice: IMAGE.UPLOAD.NOTICE.ADDED,
    });
    renderUpload();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await page.getByRole("button", { name: UPLOAD.submit }).click();
    await expect
      .poll(() => replace.mock.calls.at(0)?.[0])
      .toBe(LAURA.PAGE.GALLERY);
    expect(aofToast).toHaveBeenCalledWith("2 images added", "success");
  });

  it("sends Cancel back to the Gallery", async () => {
    renderUpload();
    await expect
      .element(
        page.getByRole("link", { name: enT("Common.ImageUpload.cancel") })
      )
      .toHaveAttribute("href", LAURA.PAGE.GALLERY);
  });
});
