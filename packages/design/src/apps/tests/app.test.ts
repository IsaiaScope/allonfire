// @module-tag unit
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { APP } from "../app";
import { BACK_OFFICE_LOGO } from "../back-office/back-office-logo";
import { LAURA_LOGO } from "../laura/laura-logo";

describe("APP", () => {
  it("draws each App by its Brand logo and its logo's name", () => {
    expect(APP.ENTRY.BACK_OFFICE).toEqual({
      mark: { logo: BACK_OFFICE_LOGO },
      name: BACK_OFFICE_LOGO.name,
    });
    expect(APP.ENTRY.LAURA).toEqual({
      mark: { logo: LAURA_LOGO },
      name: LAURA_LOGO.name,
    });
  });

  it("offers one option for each App, named as the App is drawn", () => {
    expect(APP.OPTIONS).toEqual([
      { label: LAURA_LOGO.name, value: "LAURA" },
      { label: BACK_OFFICE_LOGO.name, value: "BACK_OFFICE" },
    ]);
    expect(APP.OPTIONS.map(({ value }) => value)).toHaveLength(
      objectKeys(APP.ENTRY).length
    );
  });
});
