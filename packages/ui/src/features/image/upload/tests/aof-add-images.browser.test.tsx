// @module-tag integration

import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";
import { page, userEvent } from "vitest/browser";
import { aofToast } from "../../../../shared/hooks/use-aof-toast";
import { renderInUi } from "../../../../shared/tests/render-in-ui";
import { IMAGE } from "../../constants/image";
import { AOFAddImages } from "../components/aof-add-images";
import type { AOFAddImagesApps } from "../types/add-images-dressing";
import type { AddImageState } from "../utils/add-image-schema";
import { imageNames, rowPrefix } from "../utils/image-form-data";
import {
  STUB_APP,
  STUB_DRESSING_FULL,
  STUB_FIXED,
  STUB_OPTIONS,
} from "./add-images-stub";
import { appIn, appToggle } from "./app-toggle";
import { fieldsCopy, uploadCopy } from "./image-upload-copy";

const replace = vi.fn();
vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-navigation", () => ({
  aofBaseNavigation: { useRouter: () => ({ replace }) },
}));
vi.mock(
  "../../../../shared/components/aof-image",
  () => import("../../../../shared/tests/aof-image-mock")
);
vi.mock("../../../../shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("../../../../shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const TITLE = "Add pictures";
const LIST = "/gallery";
const LABELS = {
  added: (count: number) => `${count} added`,
  submit: "Save them",
  submitting: "Saving",
  title: TITLE,
} as const;
/** The hint sits right under the title: well within a line's height. */
const HINT_GAP_PX = 24;
/** How far a toggle sits inside its capsule. */
const CAPSULE_PAD_PX = 8;
/** A tiny file; the browser holds its bytes, the form only its name. */
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });

const refreshNothing = () => Promise.resolve();
const action =
  vi.fn<(state: AddImageState, form: FormData) => Promise<AddImageState>>();

beforeEach(() => {
  replace.mockClear();
  action.mockReset();
  action.mockResolvedValue({});
  vi.mocked(aofToast).mockClear();
});

const show = (apps: AOFAddImagesApps = STUB_OPTIONS, access?: ImageAccess) =>
  renderInUi({
    // The page's own width, which the form's wide layout reads.
    children: (
      <div className="@container">
        <AOFAddImages
          access={access}
          action={action}
          apps={apps}
          dressing={STUB_DRESSING_FULL}
          labels={LABELS}
          list={LIST}
          refresh={refreshNothing}
        />
      </div>
    ),
    messages: {},
  });
const pick = (...files: File[]) =>
  userEvent.upload(page.getByLabelText(uploadCopy("pick.input")), files);
const rowTitle = (number: number) =>
  page.getByRole("group", { name: uploadCopy("row.title", { number }) });
const sharedBox = () =>
  page.getByRole("group", { name: uploadCopy("shared.title") });
const apply = () =>
  page.getByRole("button", { name: uploadCopy("shared.apply") });
const rectOf = (locator: { element: () => Element }) =>
  locator.element().getBoundingClientRect();
const removeRow = (name: string) =>
  page
    .getByRole("button", { name: uploadCopy("row.remove", { name }) })
    .click();

describe("AOFAddImages", () => {
  it("opens with nothing picked", async () => {
    show();
    await expect.element(page.getByText(uploadCopy("pick.none"))).toBeVisible();
    await expect.element(rowTitle(1)).not.toBeInTheDocument();
  });

  it("makes a row for each picked file, filled from the shared set", async () => {
    show();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await expect.element(rowTitle(1)).toBeVisible();
    await expect.element(rowTitle(2)).toBeVisible();
    await expect
      .element(appIn(rowTitle(2), STUB_APP.BACK_OFFICE))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(appIn(rowTitle(2), STUB_APP.LAURA))
      .not.toHaveAttribute("aria-current");
  });

  it("leaves the rows alone when the shared set changes, until applied to all", async () => {
    show();
    await pick(photo("a.jpg"));
    await appIn(sharedBox(), STUB_APP.LAURA).click();
    await expect
      .element(appIn(rowTitle(1), STUB_APP.LAURA))
      .not.toHaveAttribute("aria-current");
    await apply().click();
    await expect
      .element(appIn(rowTitle(1), STUB_APP.LAURA))
      .toHaveAttribute("aria-current", "page");
  });

  it("keeps Apply to all off until a picture is picked", async () => {
    show();
    await expect.element(apply()).toBeDisabled();
    await pick(photo("a.jpg"));
    await expect.element(apply()).toBeEnabled();
  });

  it("says the limits right under the title, without listing the formats", async () => {
    show();
    const title = page.getByRole("heading", { name: TITLE });
    await expect.element(title).toBeVisible();
    const hint = page.getByText(
      uploadCopy("pick.hint", {
        files: STORED_IMAGE.LIMIT.FILES_PER_UPLOAD,
        size: STORED_IMAGE.LIMIT.FILE_BYTES / UNIT.BYTES_PER_MIB,
        total: STORED_IMAGE.LIMIT.UPLOAD.BYTES / UNIT.BYTES_PER_MIB,
      })
    );
    await expect.element(hint).toBeVisible();
    expect(rectOf(hint).top - rectOf(title).bottom).toBeLessThan(HINT_GAP_PX);
    expect(uploadCopy.raw("pick.hint")).not.toContain("HEIC");
  });

  it("offers the Design's picker, taking every format the upload decodes", async () => {
    show();
    await expect
      .element(page.getByRole("button", { name: uploadCopy("pick.button") }))
      .toBeVisible();
    await expect
      .element(page.getByLabelText(uploadCopy("pick.input")))
      .toHaveAttribute("accept", STORED_IMAGE.INPUT_ACCEPT);
  });

  it("refuses a file past the most one upload takes, keeping the rows", async () => {
    show();
    await pick(
      ...Array.from(
        { length: STORED_IMAGE.LIMIT.FILES_PER_UPLOAD + 1 },
        (_, index) => photo(`p${index}.jpg`)
      )
    );
    await expect
      .element(rowTitle(STORED_IMAGE.LIMIT.FILES_PER_UPLOAD))
      .toBeVisible();
    await expect
      .element(rowTitle(STORED_IMAGE.LIMIT.FILES_PER_UPLOAD + 1))
      .not.toBeInTheDocument();
    await expect
      .poll(() => vi.mocked(aofToast).mock.calls)
      .toContainEqual([uploadCopy("field.tooManyFiles"), "error"]);
  });

  it("removes a row, freeing its preview and turning no field uncontrolled", async () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    show();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await removeRow("a.jpg");
    await expect.element(rowTitle(2)).not.toBeInTheDocument();
    await expect.element(rowTitle(1)).toBeVisible();
    expect(revoke).toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).not.toContain("uncontrolled");
    revoke.mockRestore();
    log.mockRestore();
  });

  it("keeps each row's own Apps when a row above it is removed, and lets the shifted rows be edited", async () => {
    show();
    await pick(photo("a.jpg"), photo("b.jpg"), photo("c.jpg"));
    await appIn(rowTitle(2), STUB_APP.LAURA).click();
    await removeRow("a.jpg");
    await expect.element(rowTitle(3)).not.toBeInTheDocument();
    // b.jpg moved up to row 1 with its own Apps; c.jpg to row 2 with the shared ones.
    await expect
      .element(appIn(rowTitle(1), STUB_APP.LAURA))
      .toHaveAttribute("aria-current", "page");
    await expect
      .element(appIn(rowTitle(2), STUB_APP.LAURA))
      .not.toHaveAttribute("aria-current");
    await appIn(rowTitle(2), STUB_APP.LAURA).click();
    await expect
      .element(appIn(rowTitle(2), STUB_APP.LAURA))
      .toHaveAttribute("aria-current", "page");
    await expect.element(rowTitle(2)).toBeVisible();
  });
});

describe("AOFAddImages rows", () => {
  it("moves focus to the heading when the last row is removed", async () => {
    show();
    await pick(photo("a.jpg"));
    await removeRow("a.jpg");
    await expect
      .element(page.getByRole("heading", { name: TITLE }))
      .toHaveFocus();
  });
});

describe("AOFAddImages saving", () => {
  it("posts every row's file, alt, access and Apps to the action", async () => {
    show();
    await pick(photo("a.jpg"));
    await rowTitle(1).getByRole("textbox", { name: "English" }).fill("The sea");
    await rowTitle(1)
      .getByRole("textbox", { name: "italiano" })
      .fill("Il mare");
    await page.getByRole("button", { name: LABELS.submit }).click();
    await expect.poll(() => action.mock.calls.length).toBe(1);
    const form = action.mock.calls[0]?.[1];
    const names = imageNames(rowPrefix(0));
    expect(form?.get(names.file)).toBeInstanceOf(File);
    expect(form?.get(names.alt("en"))).toBe("The sea");
    expect(form?.get(names.alt("it"))).toBe("Il mare");
    expect(form?.get(names.access)).toBe(ImageAccess.PRIVATE);
    expect(form?.getAll(names.apps)).toEqual([App.BACK_OFFICE]);
  });

  it("says it is saving while the action runs", async () => {
    let release: () => void = () => undefined;
    action.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve({});
      })
    );
    show();
    await pick(photo("a.jpg"));
    await page.getByRole("button", { name: LABELS.submit }).click();
    await expect
      .element(page.getByRole("button", { name: LABELS.submitting }))
      .toBeVisible();
    release();
  });

  it("keeps every row and shows why when the API refuses the batch, until the picked files change", async () => {
    action.mockResolvedValue({ error: IMAGE.UPLOAD.ERROR.UNSUPPORTED });
    show();
    await pick(photo("a.jpg"));
    const english = rowTitle(1).getByRole("textbox", { name: "English" });
    await english.fill("The sea");
    await page.getByRole("button", { name: LABELS.submit }).click();
    const why = page.getByText(uploadCopy("error.unsupported"));
    await expect.element(why).toBeVisible();
    await expect.element(english).toHaveValue("The sea");
    expect(replace).not.toHaveBeenCalled();
    // Typing in a row leaves it: the same files are still going to be sent.
    await english.fill("The sea!");
    await expect.element(why).toBeVisible();
    // It was about the old files: it goes with them.
    await removeRow("a.jpg");
    await expect.element(why).not.toBeInTheDocument();
  });

  it("toasts how many were added, then opens the list", async () => {
    action.mockResolvedValue({
      added: 2,
      notice: IMAGE.UPLOAD.NOTICE.ADDED,
    });
    show();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await page.getByRole("button", { name: LABELS.submit }).click();
    await expect.poll(() => replace.mock.calls.at(0)?.[0]).toBe(LIST);
    expect(aofToast).toHaveBeenCalledWith(LABELS.added(2), "success");
  });

  it("sends Cancel back to the list", async () => {
    show();
    await expect
      .element(page.getByRole("link", { name: uploadCopy("cancel") }))
      .toHaveAttribute("href", LIST);
  });
});

describe("AOFAddImages with fixed Apps", () => {
  it("offers no Apps toggle anywhere, and still posts: its rows carry the Apps", async () => {
    show(STUB_FIXED);
    await pick(photo("a.jpg"));
    await expect.element(rowTitle(1)).toBeVisible();
    await expect
      .element(appToggle(sharedBox(), STUB_APP.LAURA))
      .not.toBeInTheDocument();
    await expect
      .element(appToggle(rowTitle(1), STUB_APP.LAURA))
      .not.toBeInTheDocument();
    // The form's own check needs an App in every row: it passes, so they carry it (the action places the Images).
    await page.getByRole("button", { name: LABELS.submit }).click();
    await expect.poll(() => action.mock.calls.length).toBe(1);
  });
});

describe("AOFAddImages with a fixed access", () => {
  it("offers no Access anywhere and no shared set when the Apps are fixed too, and still posts", async () => {
    show(STUB_FIXED, ImageAccess.PRIVATE);
    await pick(photo("a.jpg"));
    await expect.element(rowTitle(1)).toBeVisible();
    await expect.element(sharedBox()).not.toBeInTheDocument();
    await expect
      .element(rowTitle(1).getByRole("group", { name: fieldsCopy("access") }))
      .not.toBeInTheDocument();
    await page.getByRole("button", { name: LABELS.submit }).click();
    await expect.poll(() => action.mock.calls.length).toBe(1);
  });

  it("keeps the shared set for the Apps still chosen, without its Access", async () => {
    show(STUB_OPTIONS, ImageAccess.PRIVATE);
    await pick(photo("a.jpg"));
    await expect.element(sharedBox()).toBeVisible();
    await expect
      .element(sharedBox().getByRole("group", { name: fieldsCopy("access") }))
      .not.toBeInTheDocument();
    await expect
      .element(appIn(sharedBox(), STUB_APP.BACK_OFFICE))
      .toBeVisible();
  });
});

describe("AOFAddImages shared set layout", () => {
  it("sets Apply to all at the bottom left of the grid on a wide page, the Apps beside it", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.DESKTOP.WIDTH,
      SCREEN.VIEWPORT.DESKTOP.HEIGHT
    );
    show();
    await pick(photo("a.jpg"));
    const access = rectOf(
      sharedBox().getByRole("button", { name: fieldsCopy("option.PUBLIC") })
    );
    const button = rectOf(apply());
    const reef = rectOf(appIn(sharedBox(), STUB_APP.LAURA));
    const shell = rectOf(appIn(sharedBox(), STUB_APP.BACK_OFFICE));
    // The toggle's capsule is padded inside the column the button starts at.
    expect(Math.abs(button.left - access.left)).toBeLessThan(CAPSULE_PAD_PX);
    expect(button.top).toBeGreaterThan(access.bottom);
    expect(Math.min(reef.left, shell.left)).toBeGreaterThan(button.right);
    const grid = apply()
      .element()
      .parentElement?.parentElement?.getBoundingClientRect();
    expect(button.bottom).toBeCloseTo(grid?.bottom ?? 0, 0);
  });

  it("keeps Apply to all after the Apps on a phone", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    show();
    await pick(photo("a.jpg"));
    expect(rectOf(apply()).top).toBeGreaterThan(
      rectOf(appIn(sharedBox(), STUB_APP.BACK_OFFICE)).bottom
    );
  });
});
