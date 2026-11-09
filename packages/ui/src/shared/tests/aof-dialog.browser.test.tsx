// @module-tag integration
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { cdp, page, server } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFAlertDialog } from "../components/aof-alert-dialog";
import {
  AOFDialog,
  AOFDialogContent,
  AOFDialogTitle,
} from "../components/aof-dialog";

/** A phone turned sideways: the sensor housing's width on both sides, the
 *  home indicator below, nothing above. */
const NOTCH = { bottom: 21, left: 59, right: 59, top: 0 } as const;
/** `--page-gutter`, 1.5rem: the least any edge keeps. */
const GUTTER_PX = 24;

/** Far taller than a phone turned sideways. */
const TALL = "A line of text the dialog has to scroll. ".repeat(400);

const confirmNothing = () => undefined;

/** The sides of `popup`'s box past the screen's safe edges. */
const pastSafeEdges = (popup: Element) => {
  const box = popup.getBoundingClientRect();
  return [
    box.top < Math.max(GUTTER_PX, NOTCH.top) && "top",
    box.left < Math.max(GUTTER_PX, NOTCH.left) && "left",
    box.right > window.innerWidth - Math.max(GUTTER_PX, NOTCH.right) && "right",
    box.bottom > window.innerHeight - Math.max(GUTTER_PX, NOTCH.bottom) &&
      "bottom",
  ].filter(Boolean);
};

// WebKit has no way to draw a notch.
describe.runIf(server.browser === "chromium")(
  "Dialogs on a notched screen",
  () => {
    beforeEach(async () => {
      await page.viewport(
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.WIDTH,
        SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT
      );
      await cdp().send("Emulation.setSafeAreaInsetsOverride", {
        insets: NOTCH,
      });
    });
    afterEach(() =>
      cdp().send("Emulation.setSafeAreaInsetsOverride", { insets: {} })
    );

    it("keeps a dialog taller than the screen inside its safe edges, scrolling", async () => {
      const screen = await render(
        <AOFDialog open>
          <AOFDialogContent>
            <AOFDialogTitle>Crop the picture</AOFDialogTitle>
            <p>{TALL}</p>
          </AOFDialogContent>
        </AOFDialog>
      );
      await expect.element(screen.getByRole("dialog")).toBeVisible();
      const popup = screen.getByRole("dialog").element();
      expect(pastSafeEdges(popup)).toEqual([]);
      expect(getComputedStyle(popup).overflowY).toBe("auto");
    });

    it("keeps a confirmation taller than the screen inside its safe edges", async () => {
      const screen = await render(
        <AOFAlertDialog
          cancel="Cancel"
          confirm="Delete"
          description={TALL}
          onConfirm={confirmNothing}
          open
          pending={false}
          title="Delete the User?"
        />
      );
      await expect.element(screen.getByRole("alertdialog")).toBeVisible();
      expect(pastSafeEdges(screen.getByRole("alertdialog").element())).toEqual(
        []
      );
    });
  }
);
