// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { computedValue } from "../../../shared/tests/computed-style";
import {
  CAN_EMULATE_MEDIA,
  clearSafeAreaInsets,
  notchedPhone,
} from "../../../shared/tests/emulated-media";
import {
  AOFSectionPage,
  type AOFSectionPageProps,
} from "../components/aof-section-page";

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

const renderPage = async (width?: AOFSectionPageProps["width"]) => {
  const screen = await render(
    <Area>
      <AOFSectionPage width={width}>
        {/* Its rows: as tall as they are, as a form's fields. */}
        <div>
          <div style={{ height: CONTENT_HEIGHT_PX }}>Users</div>
        </div>
      </AOFSectionPage>
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

describe("AOFSectionPage", () => {
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

describe.runIf(CAN_EMULATE_MEDIA)(
  "AOFSectionPage edge to edge, beside a notch",
  () => {
    const NOTCH_PX = 59;
    const GUTTER_PX = 4;
    afterEach(clearSafeAreaInsets);

    /** The page as a frame holds it: `--frame-inset-left` is its own, set by the frame. */
    const leftPaddingIn = async (frameInset: string) => {
      await notchedPhone({
        bottom: 21,
        left: NOTCH_PX,
        right: NOTCH_PX,
        top: 0,
      });
      const screen = await render(
        <div className={frameInset}>
          <AOFSectionPage width="edge">Photos</AOFSectionPage>
        </div>
      );
      const section = screen.container.querySelector("section");
      return px(getComputedStyle(section ?? document.body).paddingLeft);
    };

    it("keeps the notch clear only once: beside a docked sidebar, which already clears it, the side is the bare gutter", async () => {
      expect(await leftPaddingIn("[--frame-inset-left:0px]")).toBe(GUTTER_PX);
    });

    it("clears the notch itself when no sidebar stands beside it", async () => {
      expect(
        await leftPaddingIn(
          "[--frame-inset-left:env(safe-area-inset-left,0px)]"
        )
      ).toBeGreaterThanOrEqual(NOTCH_PX);
    });

    it("keeps its right side and its bottom clear of what the screen reserves", async () => {
      await notchedPhone({ bottom: 21, left: 0, right: NOTCH_PX, top: 0 });
      const screen = await render(
        <AOFSectionPage width="edge">Photos</AOFSectionPage>
      );
      const style = getComputedStyle(
        screen.container.querySelector("section") ?? document.body
      );
      expect(px(style.paddingRight)).toBeGreaterThanOrEqual(NOTCH_PX);
      expect(px(style.paddingBottom)).toBeGreaterThanOrEqual(21);
    });
  }
);
