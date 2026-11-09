// @module-tag unit
import { providerEndpoint } from "../../../environment/mail-environment";
import { MAIL } from "../constants/mail";

const name = (slot: number, suffix: string) =>
  `${MAIL.ENV.PREFIX}${slot}${suffix}`;

const full = (slot: number) => ({
  [name(slot, MAIL.ENV.SUFFIX.DRIVER)]: MAIL.DRIVER.BEARER_FLAT,
  [name(slot, MAIL.ENV.SUFFIX.KEY)]: "secret-key",
  [name(slot, MAIL.ENV.SUFFIX.URL)]: "https://mail-api.test/v1",
});

describe("providerEndpoint", () => {
  it("reads the slot's URL, key and driver", () => {
    expect(providerEndpoint(1, { ...full(0), ...full(1) })).toEqual({
      driver: MAIL.DRIVER.BEARER_FLAT,
      key: "secret-key",
      url: "https://mail-api.test/v1",
    });
  });

  it("answers undefined for a slot with nothing set", () => {
    expect(providerEndpoint(2, full(1))).toBeUndefined();
  });

  it.each([
    ["no URL", name(1, MAIL.ENV.SUFFIX.URL), undefined],
    ["an http URL", name(1, MAIL.ENV.SUFFIX.URL), "http://mail-api.test"],
    ["a URL that is not one", name(1, MAIL.ENV.SUFFIX.URL), "not a url"],
    ["an empty key", name(1, MAIL.ENV.SUFFIX.KEY), ""],
    ["no key", name(1, MAIL.ENV.SUFFIX.KEY), undefined],
    ["an unknown driver", name(1, MAIL.ENV.SUFFIX.DRIVER), "carrier-pigeon"],
    ["no driver", name(1, MAIL.ENV.SUFFIX.DRIVER), undefined],
  ])("answers undefined for %s", (_label, variable, value) => {
    expect(providerEndpoint(1, { ...full(1), [variable]: value })).toBe(
      undefined
    );
  });
});
