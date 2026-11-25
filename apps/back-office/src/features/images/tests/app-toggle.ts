import type { App } from "@allonfire/database/enums";
import { APP } from "@allonfire/design/apps/app";
import type { Locator } from "vitest/browser";
import { enT } from "@/shared/tests/translators";

/** Where an App's toggle is: the group named by the App, within `scope`. */
export const appToggle = (scope: Pick<Locator, "getByRole">, app: App) =>
  scope.getByRole("radiogroup", { name: APP.ENTRY[app].name });

/** The toggle's "In" side: the current one (`aria-current`) while the App is chosen. */
export const appIn = (scope: Pick<Locator, "getByRole">, app: App) =>
  appToggle(scope, app).getByRole("button", {
    exact: true,
    name: enT("Common.ImageFields.appIn"),
  });
