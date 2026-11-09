// @module-tag unit
import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { SERVICES } from "../../constants/services";
import { providerChangeOf, providerFormSchema } from "../provider-form-schema";

const filled = {
  dailyLimit: "300",
  enabled: SERVICES.CHOICE.OFF,
  fromAddress: "no-reply@allonfire.test",
  monthlyLimit: "",
  name: "Provider 1",
};

describe("providerFormSchema", () => {
  it("takes a provider with its sender", () => {
    expect(providerFormSchema().safeParse(filled).success).toBe(true);
  });

  it("knows no host or login: the environment holds where a provider is reached", () => {
    const parsed = providerFormSchema().safeParse({
      ...filled,
      host: "10.0.0.1",
      username: "login",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).not.toHaveProperty("host");
    expect(parsed.data).not.toHaveProperty("username");
  });

  it.each(["name", "fromAddress", "dailyLimit"] as const)(
    "requires %s, even while the provider is off",
    (field) => {
      expect(
        providerFormSchema().safeParse({ ...filled, [field]: "" }).success
      ).toBe(false);
    }
  );
});

describe("providerFormSchema limits", () => {
  const over = (field: keyof typeof filled, value: string) =>
    providerFormSchema().safeParse({ ...filled, [field]: value }).success;

  it("refuses what the API would: a name, a sender or a limit past its cap", () => {
    expect(over("name", "n".repeat(MAIL.LIMIT.NAME_MAX + 1))).toBe(false);
    expect(
      over(
        "fromAddress",
        `${"a".repeat(MAIL.LIMIT.ADDRESS_MAX)}@allonfire.test`
      )
    ).toBe(false);
    expect(over("dailyLimit", String(MAIL.LIMIT.USAGE_MAX + 1))).toBe(false);
    expect(over("monthlyLimit", String(MAIL.LIMIT.USAGE_MAX + 1))).toBe(false);
  });

  it("takes each cap itself", () => {
    expect(over("name", "n".repeat(MAIL.LIMIT.NAME_MAX))).toBe(true);
    expect(over("dailyLimit", String(MAIL.LIMIT.USAGE_MAX))).toBe(true);
    expect(over("monthlyLimit", String(MAIL.LIMIT.USAGE_MAX))).toBe(true);
  });
});

describe("providerChangeOf", () => {
  it("turns the form's text into the API's change: numbers, null for none", () => {
    const parsed = providerFormSchema().parse({
      ...filled,
      enabled: SERVICES.CHOICE.ON,
    });
    expect(providerChangeOf(parsed)).toEqual({
      dailyLimit: 300,
      enabled: true,
      fromAddress: "no-reply@allonfire.test",
      monthlyLimit: null,
      name: "Provider 1",
    });
  });
});
