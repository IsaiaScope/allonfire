import type { Locator } from "vitest/browser";
import { fieldsCopy } from "./image-upload-copy";

/** Where an App's toggle is: the group named by the App's `name`, within `scope`. */
export const appToggle = (scope: Pick<Locator, "getByRole">, name: string) =>
  scope.getByRole("radiogroup", { name });

/** The toggle's "In" side: the current one (`aria-current`) while the App is chosen. */
export const appIn = (scope: Pick<Locator, "getByRole">, name: string) =>
  appToggle(scope, name).getByRole("button", {
    exact: true,
    name: fieldsCopy("appIn"),
  });
