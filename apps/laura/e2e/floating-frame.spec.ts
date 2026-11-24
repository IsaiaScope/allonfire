import { E2E } from "@allonfire/config/tests/e2e/run";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { expect, type Page, test } from "@playwright/test";
import { signInAsAdmin } from "./pages";

/**
 * Laura's frame floats: the Design's `--frame-gap`, `--frame-radius` and
 * `--frame-shadow` (Ocean) reach the sidebar through the shared frame, which
 * reads them with shadcn's values as fallback. Chromium only: it is the
 * engine whose computed styles this reads.
 */
test.use({
  viewport: {
    height: SCREEN.VIEWPORT.DESKTOP.HEIGHT,
    width: SCREEN.VIEWPORT.DESKTOP.WIDTH,
  },
});
test.describe.configure({ mode: "parallel" });

const CHROMIUM = { tag: E2E.TAG.CHROMIUM_ONLY };
const SIDEBAR = '[data-sidebar="sidebar"]';

/** The CSS property each probe reads. */
const PROPERTY = {
  borderRadius: "border-radius",
  boxShadow: "box-shadow",
  width: "width",
} as const satisfies Record<string, string>;

/**
 * What a token resolves to once used as `property`: a probe element reads it,
 * so a `var()` and a `calc()` come back as the browser draws them.
 */
const resolved = (page: Page, property: keyof typeof PROPERTY, token: string) =>
  page.evaluate(
    ([name, value]) => {
      const probe = document.createElement("div");
      probe.style.setProperty(name, `var(${value})`);
      document.body.append(probe);
      const read = getComputedStyle(probe).getPropertyValue(name);
      probe.remove();
      return read;
    },
    [PROPERTY[property], token] as const
  );

const styleOf = (page: Page, property: string) =>
  page
    .locator(SIDEBAR)
    .first()
    .evaluate(
      (element, name) => getComputedStyle(element).getPropertyValue(name),
      property
    );

test("the frame floats", CHROMIUM, async ({ page }) => {
  await signInAsAdmin(page);
  await expect(page.locator('[data-frame-variant="floating"]')).toHaveCount(1);
});

test(
  "the sidebar wears the Design's frame radius",
  CHROMIUM,
  async ({ page }) => {
    await signInAsAdmin(page);
    expect(await styleOf(page, "border-radius")).toBe(
      await resolved(page, "borderRadius", "--frame-radius")
    );
  }
);

test(
  "the sidebar wears the Design's frame shadow, and the night's",
  CHROMIUM,
  async ({ page }) => {
    await signInAsAdmin(page);
    const light = await resolved(page, "boxShadow", "--frame-shadow");
    expect(await styleOf(page, "box-shadow")).toContain(light);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect
      .poll(async () => resolved(page, "boxShadow", "--frame-shadow"))
      .not.toBe(light);
    const dark = await resolved(page, "boxShadow", "--frame-shadow");
    await expect.poll(() => styleOf(page, "box-shadow")).toContain(dark);
  }
);

test(
  "the sidebar sits one gap from the viewport's edge",
  CHROMIUM,
  async ({ page }) => {
    await signInAsAdmin(page);
    const gap = Number.parseFloat(await resolved(page, "width", "--frame-gap"));
    const edge = await page
      .locator(SIDEBAR)
      .first()
      .evaluate((element) => {
        const { left, top } = element.getBoundingClientRect();
        return { left, top };
      });
    // A desktop window has no notch: the safe-area inset adds nothing.
    expect(edge).toEqual({ left: gap, top: gap });
  }
);
