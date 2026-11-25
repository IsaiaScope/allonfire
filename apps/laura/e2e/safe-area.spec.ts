import { fileURLToPath } from "node:url";
import { E2E } from "@allonfire/config/tests/e2e/run";
import {
  notch,
  outsideSafeArea,
  SAFE_AREA,
} from "@allonfire/config/tests/e2e/safe-area";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { safeAreaSuite } from "@allonfire/ui/features/app/tests/e2e/safe-area-suite";
import { expect, test } from "@playwright/test";
import { SECTION } from "../src/features/navigation/constants/sections";
import { LAURA } from "../src/shared/constants/laura";
import { signInAsAdmin } from "./pages";
import { gridOf, previewOf } from "./photos";

// The suite finds every page from `src/app` (Gallery `/` and `/favorites` too).
safeAreaSuite({
  // Laura has no page with a param yet: only the catch-all.
  address: { "/[...rest]": () => "/no-such-page" },
  appDir: fileURLToPath(new URL("../src/app", import.meta.url)),
  firstSection: LAURA.sections[0].path,
  signedIn: signInAsAdmin,
});

const SCREENS = [
  {
    insets: SAFE_AREA.INSETS.UPRIGHT,
    name: "upright",
    size: SCREEN.VIEWPORT.PHONE,
  },
  {
    insets: SAFE_AREA.INSETS.SIDEWAYS,
    name: "sideways",
    size: SCREEN.VIEWPORT.PHONE_LANDSCAPE,
  },
] as const;

for (const { insets, name, size } of SCREENS) {
  test(`the photo preview's capsule and caption keep clear of the notch ${name}`, {
    tag: E2E.TAG.CHROMIUM_ONLY,
  }, async ({ page }) => {
    await page.setViewportSize({ height: size.HEIGHT, width: size.WIDTH });
    await notch(page, insets);
    await signInAsAdmin(page);
    await page.goto(SECTION.GALLERY.path);
    await expect(gridOf(page, "Gallery.list")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await gridOf(page, "Gallery.list").locator("li > button").first().click();
    await expect(previewOf(page)).toBeVisible();
    await expect.poll(() => outsideSafeArea(page, insets)).toEqual([]);
  });
}
