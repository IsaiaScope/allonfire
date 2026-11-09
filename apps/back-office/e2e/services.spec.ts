import { expect, test } from "@playwright/test";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { SERVICES, signInAsAdmin } from "./pages";

const t = EN.Services;

// Read-only: the Test database's providers are shared by every project's
// run, so a save here would race another project's Version.
test("an Admin sees the MAIL providers in slot order, each without a key", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(SERVICES);
  await expect(
    page.getByRole("heading", { name: t.service.MAIL })
  ).toBeVisible();
  const forms = page.getByRole("form");
  await expect(forms.nth(0)).toHaveAccessibleName("Provider 1");
  await expect(forms.nth(1)).toHaveAccessibleName("Provider 2");
  await expect(page.getByText(t.key.missing).first()).toBeVisible();
});

test("a provider's form refuses a negative limit before asking the API", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto(SERVICES);
  const first = page.getByRole("form", { name: "Provider 1" });
  await first.getByLabel(t.field.dailyLimit).fill("-1");
  await first.getByRole("button", { name: t.save }).click();
  await expect(first.getByText(t.fieldError.limit)).toBeVisible();
});
