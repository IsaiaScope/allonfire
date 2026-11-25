// @module-tag unit

import { objectValues } from "@allonfire/core/shared/utils/object";
import { App } from "@allonfire/database/enums";
import { APP } from "@allonfire/design/apps/app";

describe("APP", () => {
  it("draws and offers every App, in the order the enum declares them", () => {
    expect(APP.OPTIONS.map(({ value }) => value)).toEqual(objectValues(App));
    expect(APP.OPTIONS).toEqual(
      objectValues(App).map((app) => ({
        label: APP.ENTRY[app].name,
        value: app,
      }))
    );
  });
});
