// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { page, userEvent } from "vitest/browser";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { type AddImageState, addImage } from "../../actions/add-image";
import { IMAGES } from "../../constants/images";
import { appIn, appToggle } from "../../tests/app-toggle";
import { replace } from "../../tests/image-form-mocks";
import { imageNames, rowPrefix } from "../../utils/image-form-data";
import { AddImage } from "../add-image";

vi.mock("../../actions/add-image", () => ({ addImage: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
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

/** The hint sits right under the title: well within a line's height. */
const HINT_GAP_PX = 24;
/** A preview large enough to recognise the picture by. */
const PREVIEW_MIN_PX = 96;
const ADD = EN.Images.add;
const COLUMN = EN.Images.column;
/** What stands where a fact is not known (a picture the browser cannot decode). */
const UNKNOWN_DIMENSIONS = "—";
const FORM = EN.Images.form;
const BOTH = [App.BACK_OFFICE, App.LAURA];
/** How far a toggle sits inside its capsule. */
const CAPSULE_PAD_PX = 8;
/** A tiny file; the browser holds its bytes, the form only its name. */
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

beforeEach(() => {
  replace.mockClear();
  vi.mocked(addImage).mockReset();
  vi.mocked(aofToast).mockClear();
});

const renderAdd = (apps: readonly App[] = BOTH) =>
  renderInApp({
    // The page's own width, which the form's wide layout reads (`SectionPage`).
    children: (
      <div className="@container">
        <AddImage apps={apps} />
      </div>
    ),
  });
const pick = (...files: File[]) =>
  userEvent.upload(page.getByLabelText(ADD.pick.input), files);
/** A 640 by 480 picture picked: the rects of its preview and of the facts' first label, once every fact shows. */
const sizedRow = async () => {
  const link = vi
    .spyOn(URL, "createObjectURL")
    .mockReturnValue("/sized/sea.jpg");
  renderAdd();
  await pick(photo("sea.jpg"));
  const row = rowTitle(1);
  // The facts show once the picture has told its size; a missing one throws.
  await vi.waitFor(() => row.getByText("640 × 480").element());
  const rects = {
    facts: row
      .getByText(COLUMN.name, { exact: true })
      .element()
      .getBoundingClientRect(),
    preview: row.getByTestId("picture").element().getBoundingClientRect(),
  };
  link.mockRestore();
  return rects;
};
const rowTitle = (number: number) =>
  page.getByRole("group", {
    name: enT("Images.add.row.title", { number }),
  });

describe("AddImage", () => {
  it("opens with nothing picked", async () => {
    renderAdd();
    await expect.element(page.getByText(ADD.pick.none)).toBeVisible();
    await expect.element(rowTitle(1)).not.toBeInTheDocument();
  });

  it("makes a row for each picked file, filled from the shared set", async () => {
    renderAdd();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await expect.element(rowTitle(1)).toBeVisible();
    await expect.element(rowTitle(2)).toBeVisible();
    await expect
      .element(appIn(rowTitle(2), App.BACK_OFFICE))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(appIn(rowTitle(2), App.LAURA))
      .not.toHaveAttribute("aria-current");
  });

  it("leaves the rows alone when the shared set changes, until applied to all", async () => {
    renderAdd();
    await pick(photo("a.jpg"));
    await appIn(
      page.getByRole("group", { name: ADD.shared.title }),
      App.LAURA
    ).click();
    await expect
      .element(appIn(rowTitle(1), App.LAURA))
      .not.toHaveAttribute("aria-current");
    await page.getByRole("button", { name: ADD.shared.apply }).click();
    await expect
      .element(appIn(rowTitle(1), App.LAURA))
      .toHaveAttribute("aria-current", "page");
  });
});

describe("AddImage shared set", () => {
  const rectOf = (locator: { element: () => Element }) =>
    locator.element().getBoundingClientRect();
  const sharedBox = () => page.getByRole("group", { name: ADD.shared.title });
  const publicToggle = () =>
    sharedBox().getByRole("button", { name: EN.Images.access.PUBLIC });
  const apply = () => page.getByRole("button", { name: ADD.shared.apply });

  it("sets Apply to all at the bottom left of the grid on a wide screen, the Apps beside it, so the card stays short", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    renderAdd();
    await pick(photo("a.jpg"));
    const access = rectOf(publicToggle());
    const button = rectOf(apply());
    const laura = rectOf(appIn(sharedBox(), App.LAURA));
    const backOffice = rectOf(appIn(sharedBox(), App.BACK_OFFICE));
    // The toggle's capsule is padded inside the column the button starts at.
    expect(Math.abs(button.left - access.left)).toBeLessThan(CAPSULE_PAD_PX);
    expect(button.top).toBeGreaterThan(access.bottom);
    expect(Math.min(laura.left, backOffice.left)).toBeGreaterThan(button.right);
    // At the grid's bottom left: on the edge the Apps' column ends at (its kept error line under the last capsule included).
    const grid = apply().element().parentElement?.getBoundingClientRect();
    expect(button.bottom).toBeCloseTo(grid?.bottom ?? 0, 0);
  });

  it("keeps Apply to all after the Apps on a phone", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    renderAdd();
    await pick(photo("a.jpg"));
    expect(rectOf(apply()).top).toBeGreaterThan(
      rectOf(appIn(sharedBox(), App.BACK_OFFICE)).bottom
    );
  });
});

describe("AddImage header", () => {
  it("says the limits under the title, without listing the formats", async () => {
    renderAdd();
    const title = page.getByRole("heading", { name: ADD.title });
    await expect.element(title).toBeVisible();
    const hint = page.getByText(
      enT("Images.add.pick.hint", {
        files: IMAGE.LIMIT.FILES_PER_UPLOAD,
        size: IMAGE.LIMIT.FILE_BYTES / UNIT.BYTES_PER_MIB,
      })
    );
    await expect.element(hint).toBeVisible();
    expect(
      hint.element().getBoundingClientRect().top -
        title.element().getBoundingClientRect().bottom
    ).toBeLessThan(HINT_GAP_PX);
    expect(ADD.pick.hint).not.toContain("HEIC");
  });

  it("offers Pick pictures as a button named by its words", async () => {
    renderAdd();
    await expect
      .element(page.getByRole("button", { name: ADD.pick.button }))
      .toBeVisible();
  });

  it("lets the picker offer every format the upload decodes, HEIC by extension too", async () => {
    renderAdd();
    await expect
      .element(page.getByLabelText(ADD.pick.input))
      .toHaveAttribute("accept", IMAGE.INPUT_ACCEPT);
  });
});

describe("AddImage previews", () => {
  // The browser cannot draw every type it lets through (Chrome has no HEIC):
  // the row then shows a tile, never a broken-image icon. The picture mock
  // fails a `/broken` link, as the browser does a file it cannot decode.
  it("shows a tile in place of a picture the browser cannot draw", async () => {
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/broken/15.heic");
    renderAdd();
    await pick(new File(["x"], "15.heic", { type: "image/heic" }));
    await expect
      .element(rowTitle(1).getByTestId("preview-fallback"))
      .toBeVisible();
    link.mockRestore();
  });

  it("draws the preview large, and cuts a long name after two lines", async () => {
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/broken/long.heic");
    renderAdd();
    const name = `${"a-very-long-name-".repeat(12)}.heic`;
    await pick(new File(["x"], name, { type: "image/heic" }));
    const tile = rowTitle(1).getByTestId("preview-fallback");
    await expect.element(tile).toBeVisible();
    expect(tile.element().getBoundingClientRect().width).toBeGreaterThanOrEqual(
      PREVIEW_MIN_PX
    );
    const title = rowTitle(1).getByText(name, { exact: true });
    expect(getComputedStyle(title.element()).webkitLineClamp).toBe("2");
    link.mockRestore();
  });

  it("sets the name, size and dimensions beside the picture on a wide screen", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    const { facts, preview } = await sizedRow();
    expect(facts.left).toBeGreaterThanOrEqual(preview.right);
  });

  it("sets them under the picture on a phone", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const { facts, preview } = await sizedRow();
    expect(facts.top).toBeGreaterThanOrEqual(preview.bottom);
  });

  it("has no dimensions to give for a picture the browser cannot draw", async () => {
    const link = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("/broken/15.heic");
    renderAdd();
    await pick(new File(["x"], "15.heic", { type: "image/heic" }));
    await expect
      .element(rowTitle(1).getByText(UNKNOWN_DIMENSIONS, { exact: true }))
      .toBeVisible();
    link.mockRestore();
  });

  it("shows the picture itself when the browser can draw it", async () => {
    renderAdd();
    await pick(photo("a.jpg"));
    await expect
      .element(rowTitle(1).getByTestId("picture"))
      .toBeInTheDocument();
    await expect
      .element(rowTitle(1).getByTestId("preview-fallback"))
      .not.toBeInTheDocument();
  });
});

describe("AddImage picking", () => {
  it("refuses a file past the most one upload takes, keeping the rows", async () => {
    renderAdd();
    await pick(
      ...Array.from({ length: IMAGE.LIMIT.FILES_PER_UPLOAD + 1 }, (_, index) =>
        photo(`p${index}.jpg`)
      )
    );
    await expect.element(rowTitle(IMAGE.LIMIT.FILES_PER_UPLOAD)).toBeVisible();
    await expect
      .element(rowTitle(IMAGE.LIMIT.FILES_PER_UPLOAD + 1))
      .not.toBeInTheDocument();
    await expect
      .poll(() => vi.mocked(aofToast).mock.calls)
      .toContainEqual([FORM.field.tooManyFiles, "error"]);
    await expect
      .element(page.getByText(FORM.field.tooManyFiles))
      .not.toBeInTheDocument();
  });

  it("removes a row, freeing its preview and turning no field uncontrolled", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderAdd();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await page
      .getByRole("button", {
        name: enT("Images.add.row.remove", { name: "a.jpg" }),
      })
      .click();
    await expect.element(rowTitle(2)).not.toBeInTheDocument();
    await expect.element(rowTitle(1)).toBeVisible();
    expect(revoke).toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).not.toContain("uncontrolled");
    revoke.mockRestore();
    log.mockRestore();
  });
});

describe("AddImage saving", () => {
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
      .element(adding.getByText(IMAGES.ADD_KANJI, { exact: true }))
      .toBeInTheDocument();
    release();
  });

  it("posts every row's file, alt, access and Apps to the action", async () => {
    vi.mocked(addImage).mockResolvedValue({});
    renderAdd();
    await pick(photo("a.jpg"));
    await rowTitle(1).getByRole("textbox", { name: "English" }).fill("The sea");
    await rowTitle(1)
      .getByRole("textbox", {
        name: "italiano",
      })
      .fill("Il mare");
    await page.getByRole("button", { name: ADD.submit }).click();
    await expect.poll(() => vi.mocked(addImage).mock.calls.length).toBe(1);
    const form = vi.mocked(addImage).mock.calls[0]?.[1];
    const names = imageNames(rowPrefix(0));
    expect(form?.get(names.file)).toBeInstanceOf(File);
    expect(form?.get(names.alt("en"))).toBe("The sea");
    expect(form?.get(names.alt("it"))).toBe("Il mare");
    expect(form?.get(names.access)).toBe(ImageAccess.PRIVATE);
    expect(form?.getAll(names.apps)).toEqual([App.BACK_OFFICE]);
  });

  it("keeps every row and shows why when the API refuses the batch, until the picked files change", async () => {
    const refused: AddImageState = { error: IMAGES.ADD_ERROR.UNSUPPORTED };
    vi.mocked(addImage).mockResolvedValue(refused);
    renderAdd();
    await pick(photo("a.jpg"));
    await rowTitle(1).getByRole("textbox", { name: "English" }).fill("The sea");
    await page.getByRole("button", { name: ADD.submit }).click();
    await expect.element(page.getByText(ADD.error.unsupported)).toBeVisible();
    await expect
      .element(
        rowTitle(1).getByRole("textbox", {
          name: "English",
        })
      )
      .toHaveValue("The sea");
    expect(replace).not.toHaveBeenCalled();
    // Typing in a row leaves it: the same files are still going to be sent.
    await rowTitle(1)
      .getByRole("textbox", { name: "English" })
      .fill("The sea!");
    await expect.element(page.getByText(ADD.error.unsupported)).toBeVisible();
    // It was about the old files: it goes with them.
    await page
      .getByRole("button", {
        name: enT("Images.add.row.remove", { name: "a.jpg" }),
      })
      .click();
    await expect
      .element(page.getByText(ADD.error.unsupported))
      .not.toBeInTheDocument();
  });

  it("toasts how many were added, then opens the list", async () => {
    vi.mocked(addImage).mockResolvedValue({
      added: 2,
      notice: IMAGES.ADD_NOTICE.ADDED,
    });
    renderAdd();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await page.getByRole("button", { name: ADD.submit }).click();
    await expect
      .poll(() => replace.mock.calls.at(0)?.[0])
      .toBe(BACK_OFFICE.PAGE.STORAGE_IMAGES);
    expect(aofToast).toHaveBeenCalledWith("2 Images added", "success");
  });

  it("offers only the Apps the visitor administers", async () => {
    renderAdd([App.BACK_OFFICE]);
    await expect
      .element(
        appToggle(
          page.getByRole("group", { name: ADD.shared.title }),
          App.LAURA
        )
      )
      .not.toBeInTheDocument();
  });
});
