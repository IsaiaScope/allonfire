// @module-tag integration

import { App } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/ui/features/image/constants/image";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { page, userEvent } from "vitest/browser";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { addImage } from "../../actions/add-image";
import { IMAGES } from "../../constants/images";
import { appIn, appToggle } from "../../tests/app-toggle";
import { replace } from "../../tests/image-form-mocks";
import { AddImage } from "../add-image";

/*
 * The form itself (rows, limits, refusals, layout) is ui's `AOFAddImages`,
 * tested there; this is what the Back Office dresses it with.
 */

// jscpd:ignore-start
// Hoisted mocks: a `vi.mock` cannot move into a shared helper, and the Back Office's twin and this App's other suite need the same ones.
vi.mock("../../actions/add-image", () => ({ addImage: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("../../tests/image-form-mocks")
);
vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../tests/image-form-mocks")
);
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("../../tests/image-form-mocks")
);
vi.mock("@allonfire/ui/shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("@allonfire/ui/shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));
// jscpd:ignore-end

const ADD = EN.Images.add;
const BOTH = [App.BACK_OFFICE, App.LAURA];
/** A tiny file; the browser holds its bytes, the form only its name. */
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

// jscpd:ignore-start
// The Back Office's twin: the same setup over its own App's page.
beforeEach(() => {
  replace.mockClear();
  vi.mocked(addImage).mockReset();
  vi.mocked(aofToast).mockClear();
});

const renderAdd = (apps: readonly App[] = BOTH) =>
  renderInApp({
    // The page's own width, which the form's wide layout reads (`AOFSectionPage`).
    children: (
      <div className="@container">
        <AddImage apps={apps} />
      </div>
    ),
  });
// jscpd:ignore-end
const pick = (...files: File[]) =>
  userEvent.upload(
    page.getByLabelText(enT("Common.ImageUpload.pick.input")),
    files
  );
const rowTitle = (number: number) =>
  page.getByRole("group", {
    name: enT("Common.ImageUpload.row.title", { number }),
  });
const sharedBox = () =>
  page.getByRole("group", { name: enT("Common.ImageUpload.shared.title") });

describe("AddImage", () => {
  it("offers Pick pictures as a kanji button named by its words", async () => {
    renderAdd();
    const button = page.getByRole("button", {
      name: enT("Common.ImageUpload.pick.button"),
    });
    await expect.element(button).toBeVisible();
    await expect
      .element(button.getByText(IMAGES.KANJI.ADD, { exact: true }))
      .toBeInTheDocument();
  });

  it("names each App's toggle as the Back Office draws it, in the shared set and in the rows", async () => {
    renderAdd();
    await pick(photo("a.jpg"));
    await expect
      .element(appIn(sharedBox(), App.BACK_OFFICE))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(appIn(rowTitle(1), App.BACK_OFFICE))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(appIn(rowTitle(1), App.LAURA))
      .not.toHaveAttribute("aria-current");
  });

  it("offers only the Apps the visitor administers", async () => {
    renderAdd([App.BACK_OFFICE]);
    await expect
      .element(appToggle(sharedBox(), App.LAURA))
      .not.toBeInTheDocument();
  });

  it("keeps the button's kanji while it is adding", async () => {
    let release: () => void = () => undefined;
    vi.mocked(addImage).mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({});
      })
    );
    renderAdd();
    await pick(photo("a.jpg"));
    await page.getByRole("button", { name: ADD.submit }).click();
    const adding = page.getByRole("button", { name: ADD.submitting });
    await expect.element(adding).toBeVisible();
    await expect
      .element(adding.getByText(IMAGES.KANJI.ADD, { exact: true }))
      .toBeInTheDocument();
    release();
  });

  it("toasts how many were added, then opens the Images list", async () => {
    vi.mocked(addImage).mockResolvedValue({
      added: 2,
      notice: IMAGE.UPLOAD.NOTICE.ADDED,
    });
    renderAdd();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await page.getByRole("button", { name: ADD.submit }).click();
    await expect
      .poll(() => replace.mock.calls.at(0)?.[0])
      .toBe(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    expect(aofToast).toHaveBeenCalledWith("2 Images added", "success");
  });

  it("sends Cancel back to the Images list", async () => {
    renderAdd();
    await expect
      .element(
        page.getByRole("link", { name: enT("Common.ImageUpload.cancel") })
      )
      .toHaveAttribute("href", BACK_OFFICE.PAGE.STORAGE_IMAGES);
  });
});
