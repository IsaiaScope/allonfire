// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { App } from "@allonfire/database/enums";
import { APP_ENTRY, switcherApps } from "../constants/apps";

const LAURA_ADDRESS = { [App.LAURA]: LOCAL.URL.LAURA };

describe("switcherApps", () => {
  it("lists the other Apps given, each with its address and host", () => {
    expect(
      switcherApps([App.BACK_OFFICE, App.LAURA], LAURA_ADDRESS, App.BACK_OFFICE)
    ).toEqual([
      {
        app: App.LAURA,
        host: new URL(LOCAL.URL.LAURA).host,
        href: LOCAL.URL.LAURA,
        name: APP_ENTRY[App.LAURA].name,
      },
    ]);
  });

  it("leaves out the App you are in", () => {
    expect(
      switcherApps([App.BACK_OFFICE], LAURA_ADDRESS, App.BACK_OFFICE)
    ).toEqual([]);
  });

  it("drops an App with no address", () => {
    expect(
      switcherApps([App.BACK_OFFICE, App.LAURA], {}, App.BACK_OFFICE)
    ).toEqual([]);
  });
});
