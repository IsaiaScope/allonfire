// @module-tag unit
import { LOCAL } from "@allonfire/config/local/addresses";
import { storageEnvSchema } from "../environment";

describe("storageEnvSchema", () => {
  it("drops the image server's trailing slashes, so a link never holds `//`", () => {
    expect(
      storageEnvSchema.STORAGE_IMAGE_SERVER_URL.parse(
        `${LOCAL.URL.IMAGE_SERVER}//`
      )
    ).toBe(LOCAL.URL.IMAGE_SERVER);
  });
});
