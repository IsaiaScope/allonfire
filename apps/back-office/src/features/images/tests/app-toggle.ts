import type { App } from "@allonfire/database/enums";
import type { Locator } from "vitest/browser";
import { APP_ENTRY } from "@/shared/constants/apps";
import EN from "../../i18n/translations/en.json" with { type: "json" };

/** Where an App's toggle is: the group named by the App, within `scope`. */
export const appToggle = (scope: Pick<Locator, "getByRole">, app: App) =>
  scope.getByRole("radiogroup", { name: APP_ENTRY[app].name });

/** The toggle's "In" side: the current one (`aria-current`) while the App is chosen. */
export const appIn = (scope: Pick<Locator, "getByRole">, app: App) =>
  appToggle(scope, app).getByRole("button", {
    exact: true,
    name: EN.Images.form.appIn,
  });
