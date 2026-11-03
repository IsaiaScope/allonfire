// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { computedValue } from "@/shared/tests/computed-style";
import { SectionPage, type SectionPageProps } from "../section-page";

/** Wider than a form's cap, as the page area beside the sidebar is. */
const AREA_WIDTH_PX = 1200;
/** Shorter than the page's content, so the page outgrows its area. */
const AREA_HEIGHT_PX = 200;
const CONTENT_HEIGHT_PX = 600;
/** `max-w-4xl`'s cap: 56rem. */
const FORM_WIDTH_REM = 56;

/** The frame's page area: a scrolling column the page fills. */
const Area = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      height: AREA_HEIGHT_PX,
      overflowY: "auto",
      width: AREA_WIDTH_PX,
    }}
  >
    {children}
  </div>
);

const renderPage = async (width?: SectionPageProps["width"]) => {
  const screen = await render(
    <Area>
      <SectionPage width={width}>
        {/* Its rows: as tall as they are, as a form's fields. */}
        <div>
          <div style={{ height: CONTENT_HEIGHT_PX }}>Users</div>
        </div>
      </SectionPage>
    </Area>
  );
  const section = screen.container.querySelector("section");
  if (!section) {
    throw new Error("the page is not a section");
  }
  return section;
};

const px = (length: string) => Number.parseFloat(length);

beforeEach(() =>
  page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
);

describe("SectionPage", () => {
  it("ends twice the bottom gutter above the edge, home indicator included", async () => {
    const section = await renderPage();
    expect(px(getComputedStyle(section).paddingBottom)).toBe(
      2 * px(computedValue("padding-bottom", "var(--gutter-bottom)"))
    );
  });

  it("fills the page area by default, as a list does", async () => {
    const section = await renderPage();
    expect(section.getBoundingClientRect().width).toBe(AREA_WIDTH_PX);
  });

  it("holds a form page to the form width, centred", async () => {
    const section = await renderPage("form");
    const rem = px(getComputedStyle(document.documentElement).fontSize);
    const box = section.getBoundingClientRect();
    const area = section.parentElement?.getBoundingClientRect();
    expect(box.width).toBe(FORM_WIDTH_REM * rem);
    expect(box.left - (area?.left ?? 0)).toBe((area?.right ?? 0) - box.right);
  });

  it.each(["full", "form"] as const)(
    "lets a %s page grow past its area, so its padding stays under its last row",
    async (width) => {
      const section = await renderPage(width);
      const content = section.firstElementChild?.getBoundingClientRect();
      const { paddingBottom } = getComputedStyle(section);
      expect(section.scrollHeight).toBe(section.clientHeight);
      expect(section.getBoundingClientRect().bottom).toBe(
        (content?.bottom ?? 0) + px(paddingBottom)
      );
    }
  );
});
