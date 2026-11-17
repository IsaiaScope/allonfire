// @module-tag integration

import { page, userEvent } from "vitest/browser";
import {
  addressOf,
  listAsked,
  listControls,
  renderList,
  setUpDesktopToday,
} from "@/shared/tests/list-sort-view-harness";
import { IMAGES_PAGE, IMAGES_URL } from "@/shared/tests/msw/handlers";
import { enT } from "@/shared/tests/translators";
import { IMAGES } from "../../constants/images";
import { ImagesTable } from "../images-table";

// A server action: covered for real by e2e.
vi.mock("../../actions/delete-images", () => ({ deleteImages: vi.fn() }));
vi.mock(
  "@/features/i18n/navigation",
  () => import("@/shared/tests/navigation-mock")
);
// A stored Image is drawn through the image server: here, a mark with its alt.
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("@/shared/tests/aof-image-mock")
);

const LIST = enT("Images.list");
const ALT = IMAGES_PAGE.images[0]?.alt.en ?? "";
const { choose, header } = listControls(/^Filters/);
const render = (search = "") =>
  renderList({ children: <ImagesTable />, list: LIST, search });

setUpDesktopToday();

describe("ImagesTable column menus", () => {
  it("draws no menu on the picture; the alt only hides, the file name sorts and hides", async () => {
    await render();
    const hide = page.getByRole("menuitemcheckbox", {
      name: enT("List.column.hide"),
    });
    const asc = page.getByRole("menuitemcheckbox", {
      name: enT("List.column.asc"),
    });
    await expect
      .element(
        page
          .getByRole("table", { name: LIST })
          .getByRole("button", { name: enT("Images.column.image") })
      )
      .not.toBeInTheDocument();
    await userEvent.click(header(enT("Images.column.alt")));
    await expect.element(hide).toBeVisible();
    await expect.element(asc).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(header(enT("Images.column.name")));
    await expect.element(hide).toBeVisible();
    await expect.element(asc).toBeVisible();
  });

  it("sorts by Name from its header menu", async () => {
    const asked = listAsked(IMAGES_URL, IMAGES_PAGE);
    await render();
    await choose(enT("Images.column.name"), enT("List.column.asc"));
    await expect
      .poll(() => asked.at(-1)?.get(IMAGES.PARAM.SORT))
      .toBe("name.asc");
  });
});

describe("ImagesTable selection and pages", () => {
  const select = () =>
    userEvent.click(
      page.getByRole("checkbox", {
        name: enT("Images.delete.select", { alt: ALT }),
      })
    );
  const deleteButton = () =>
    page.getByRole("button", {
      exact: true,
      name: enT("Images.delete.action"),
    });

  it("clears the selection on a sort and keeps it on a View change", async () => {
    await render();
    await select();
    await expect.element(deleteButton()).toBeEnabled();
    await choose(enT("Images.column.apps"), enT("List.column.hide"));
    await expect.element(deleteButton()).toBeEnabled();
    await choose(enT("Images.column.size"), enT("List.column.asc"));
    await expect.element(deleteButton()).toBeDisabled();
  });

  it("steps back in place when a range leaves one page and the address says page 3", async () => {
    const asked = listAsked(IMAGES_URL, { ...IMAGES_PAGE, pageCount: 1 });
    const { onUrlUpdate } = await render(
      `?${IMAGES.PARAM.PAGE}=3&${IMAGES.PARAM.SEARCH}=created:2026-11-26`
    );
    await expect.poll(() => asked.length).toBeGreaterThan(0);
    await expect
      .poll(() => addressOf(onUrlUpdate).has(IMAGES.PARAM.PAGE))
      .toBe(false);
  });
});
