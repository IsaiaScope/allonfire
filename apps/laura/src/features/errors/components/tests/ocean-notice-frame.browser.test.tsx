// @module-tag integration
import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_ART } from "@allonfire/design/designs/ocean/mascot-art";
import type { AOFNoticeFrameProps } from "@allonfire/ui/features/feedback/types/notice";
import { render } from "vitest-browser-react";
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";
import { renderInApp } from "@/shared/tests/render-in-app";
import { OceanNoticeFrame } from "../ocean-notice-frame";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

type Kind = AOFNoticeFrameProps["kind"];

const KINDS = ["error", "notFound", "offline"] as const satisfies Kind[];

const HEADING = "Something went sideways";
const DESCRIPTION = "Take a breath and try again.";
const ACTION = "Try again";

const notice = (kind: Kind) => (
  <OceanNoticeFrame
    action={<button type="button">{ACTION}</button>}
    description={DESCRIPTION}
    heading={HEADING}
    kind={kind}
  />
);

/** The octopus's picture for the light scheme: the first one in the notice. */
const mark = (kind: Kind) =>
  document
    .querySelector(`[data-kind="${kind}"] [data-testid=picture]`)
    ?.getAttribute("data-src");

/** Every kind of notice on one page, each in a box that says which. */
const renderAllKinds = () =>
  renderInApp({
    children: (
      <>
        {KINDS.map((kind) => (
          <div data-kind={kind} key={kind}>
            {notice(kind)}
          </div>
        ))}
      </>
    ),
  });

describe("OceanNoticeFrame", () => {
  it.each(KINDS)(
    "says what happened and offers the action, for a %s notice",
    async (kind) => {
      const screen = await renderInApp({ children: notice(kind) });
      await expect
        .element(screen.getByRole("heading", { level: 1, name: HEADING }))
        .toBeVisible();
      await expect.element(screen.getByText(DESCRIPTION)).toBeVisible();
      await expect
        .element(screen.getByRole("button", { name: ACTION }))
        .toBeVisible();
      screen.unmount();
    }
  );

  it("draws a different octopus for each kind", async () => {
    const screen = await renderAllKinds();
    const sources = KINDS.map((kind) => mark(kind));
    expect(new Set(sources).size).toBe(KINDS.length);
    screen.unmount();
  });

  it("draws what MASCOT assigns: the octopus for an error, the squid for a 404, the jellyfish offline", async () => {
    const screen = await renderAllKinds();
    expect(mark("error")).toBe(svgDataUrl(OCEAN_ART[MASCOT.ERROR].SVG));
    expect(mark("notFound")).toBe(svgDataUrl(OCEAN_ART[MASCOT.NOT_FOUND].SVG));
    expect(mark("offline")).toBe(svgDataUrl(OCEAN_ART[MASCOT.OFFLINE].SVG));
    screen.unmount();
  });

  it("hides the octopus from assistive tech: the words say it", async () => {
    const screen = await renderInApp({ children: notice("error") });
    const pictures = document.querySelectorAll("[data-testid=picture]");
    expect(pictures.length).toBeGreaterThan(0);
    for (const picture of pictures) {
      expect(picture.getAttribute("data-alt")).toBe("");
      expect(picture.closest("[aria-hidden=true]")).not.toBeNull();
    }
    screen.unmount();
  });

  it("names the tab after the notice, since error pages take no metadata", async () => {
    const screen = await renderInApp({ children: notice("notFound") });
    await expect
      .poll(() => document.title)
      .toBe(pageTitle(HEADING, LAURA.name));
    screen.unmount();
  });

  it("quotes a reference where a report can read it", async () => {
    const screen = await renderInApp({
      children: (
        <OceanNoticeFrame heading={HEADING} kind="error" reference="ref-1234" />
      ),
    });
    await expect.element(screen.getByText("ref-1234")).toBeVisible();
    screen.unmount();
  });

  it("is a part of a page, headed by an h2, when it sits among other things", async () => {
    const screen = await render(
      <OceanNoticeFrame heading={HEADING} kind="error" scope="part" />
    );
    await expect
      .element(screen.getByRole("heading", { level: 2, name: HEADING }))
      .toBeVisible();
    screen.unmount();
  });
});
