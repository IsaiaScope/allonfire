import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { SECTION } from "../src/features/navigation/constants/sections";
import { sectionHref } from "../src/features/navigation/utils/sections";
import { BACK_OFFICE } from "../src/shared/constants/back-office";
import { signInAsAdmin, tapSidebarLink } from "./pages";

const HOME = sectionHref(SECTION.HOME.path);
const FILES_COUNT = /^\d+ files?$/;

test("an Admin sees the image bucket's card with its totals on Home", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(HOME);
  const storage = page
    .getByRole("region", { name: EN.Navigation.storage })
    .filter({ visible: true });
  await expect(
    // A test run names its own bucket: the card is the Section's one level-3 heading.
    storage.getByRole("heading", { level: 3 })
  ).toBeVisible();
  await expect(storage.getByText(FILES_COUNT)).toBeVisible();
});

test("an Admin sees the Users and Storage sections on Home", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(HOME);
  await Promise.all(
    [EN.Navigation.users, EN.Navigation.storage].map((name) =>
      expect(
        page.getByRole("heading", { level: 2, name }).filter({ visible: true })
      ).toBeVisible()
    )
  );
  await expect(
    page.getByRole("img", { name: EN.Users.overview.chart.label }).filter({
      visible: true,
    })
  ).toBeVisible();
});

test("a visit to Home shows its heading at once, the overview behind its skeleton", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(sectionHref(BACK_OFFICE.PAGE.USERS));
  await instant(page, async () => {
    await tapSidebarLink(page, EN.Navigation.home);
    await expect(
      page.getByRole("heading", { name: BACK_OFFICE.NAME })
    ).toBeVisible();
  });
});
