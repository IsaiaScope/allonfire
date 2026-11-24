// @module-tag integration
import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_ART } from "@allonfire/design/designs/ocean/mascot-art";
import { computedValue } from "@allonfire/ui/shared/tests/computed-style";
import { IconTrash } from "@tabler/icons-react";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { MASCOT } from "../../constants/mascots";
import { OceanAlert } from "../ocean-alert";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

const TITLE = "Remove this photo?";
const onConfirm = vi.fn();

const openAlert = () =>
  renderInApp({
    children: (
      <OceanAlert
        cancel="Keep photo"
        confirm="Remove photo"
        description="It leaves the Gallery for good."
        icon={<IconTrash aria-hidden />}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
        open
        pending={false}
        title={TITLE}
      />
    ),
  });

const dialog = () => page.getByRole("alertdialog");
const band = () => dialog().getByRole("heading", { name: TITLE });

beforeEach(() => onConfirm.mockClear());

describe("OceanAlert", () => {
  it("heads the dialog with its title, named for assistive tech", async () => {
    await openAlert();
    await expect
      .element(page.getByRole("alertdialog", { name: TITLE }))
      .toBeVisible();
  });

  it("puts Laura's mascot at the top left of a band of ink, beside the title", async () => {
    await openAlert();
    const title = band().element();
    const header = title.closest("div.bg-ink");
    expect(header).not.toBeNull();
    expect(getComputedStyle(header ?? title).backgroundColor).toBe(
      computedValue("background-color", "var(--ink)")
    );
    const art = header?.querySelector("[data-testid=picture]");
    expect(art?.getAttribute("data-src")).toBe(
      svgDataUrl(OCEAN_ART[MASCOT.APP].SVG)
    );
    const left = art?.getBoundingClientRect().left ?? Number.NaN;
    expect(left).toBeLessThan(title.getBoundingClientRect().left);
  });

  it("reads the text from the left, under the band", async () => {
    await openAlert();
    const text = page.getByText("It leaves the Gallery for good.").element();
    expect(getComputedStyle(text.parentElement ?? text).textAlign).toBe("left");
  });

  it("dresses Cancel as a Laura action with its icon and its faint picture", async () => {
    await openAlert();
    const cancel = dialog()
      .getByRole("button", { name: "Keep photo" })
      .element();
    expect(getComputedStyle(cancel).fontWeight).toBe("700");
    expect(cancel.querySelector("svg")).not.toBeNull();
    expect(
      cancel.querySelector("[data-testid=picture], span[aria-hidden]")
    ).not.toBeNull();
  });

  it("draws the act in the destructive colour with its icon, and acts on click", async () => {
    await openAlert();
    const confirm = dialog().getByRole("button", { name: "Remove photo" });
    expect(confirm.element().querySelector("svg")).not.toBeNull();
    await confirm.click();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
