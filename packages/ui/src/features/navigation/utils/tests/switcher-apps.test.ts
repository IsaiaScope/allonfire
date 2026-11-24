// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { App } from "@allonfire/database/enums";
import { IconLibraryPhoto } from "@tabler/icons-react";
import type { AppEntry } from "../../types/app-descriptor";
import { switcherApps } from "../switcher-apps";

const LAURA_ADDRESS = { [App.LAURA]: LOCAL.URL.LAURA };
const ENTRIES = {
  [App.BACK_OFFICE]: { mark: { icon: IconLibraryPhoto }, name: "Office" },
  [App.LAURA]: { mark: { icon: IconLibraryPhoto }, name: "Her App" },
} as const satisfies Record<App, AppEntry>;

/** The App you are in, as far as the switcher reads it. */
const inBackOffice = { app: App.BACK_OFFICE, entries: ENTRIES };

describe("switcherApps", () => {
  it("lists the other Apps given, each with its address, host and the name the App draws it by", () => {
    expect(
      switcherApps(inBackOffice, [App.BACK_OFFICE, App.LAURA], LAURA_ADDRESS)
    ).toEqual([
      {
        app: App.LAURA,
        host: new URL(LOCAL.URL.LAURA).host,
        href: LOCAL.URL.LAURA,
        name: ENTRIES[App.LAURA].name,
      },
    ]);
  });

  it("leaves out the App you are in", () => {
    expect(
      switcherApps(inBackOffice, [App.BACK_OFFICE], LAURA_ADDRESS)
    ).toEqual([]);
  });

  it("drops an App with no address", () => {
    expect(
      switcherApps(inBackOffice, [App.BACK_OFFICE, App.LAURA], {})
    ).toEqual([]);
  });
});
