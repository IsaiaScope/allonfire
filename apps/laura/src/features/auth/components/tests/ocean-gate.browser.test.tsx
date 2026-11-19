// @module-tag integration
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { aofMessages } from "@allonfire/core/features/next/i18n/utils/aof-translators";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import { LAURA } from "@/shared/constants/laura";
import { enT } from "@/shared/tests/translators";
import { OceanGate } from "../ocean-gate";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@allonfire/ui/shared/tests/image-mock")).ImageMock,
}));

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("@allonfire/ui/shared/tests/navigation-mock")
);

const STATUS = "Signing in";
const CARD = "The card";

const gate = () =>
  render(
    <NextIntlClientProvider locale="en" messages={aofMessages("en", EN)}>
      <OceanGate page={AUTH.PAGE.SIGN_IN} status={STATUS}>
        <p>{CARD}</p>
      </OceanGate>
    </NextIntlClientProvider>
  );

describe("OceanGate", () => {
  it("shows the card, the status and Laura's name as the page's heading", async () => {
    const screen = await gate();
    await expect.element(screen.getByText(CARD)).toBeVisible();
    await expect.element(screen.getByText(STATUS)).toBeVisible();
    // The mocked picture carries its alt as data, not as a name.
    await expect
      .element(screen.getByRole("heading", { level: 1 }))
      .toBeInTheDocument();
    expect(
      document.querySelector("h1 [data-alt]")?.getAttribute("data-alt")
    ).toBe(LAURA.name);
  });

  it("names the language the page speaks and lets the visitor change it", async () => {
    const screen = await gate();
    const languages = screen.getByRole("navigation", {
      name: enT("Common.Auth.Gate.language"),
    });
    const [current, other] = I18N.BASE_LANGUAGES;
    await expect
      .element(languages.getByRole("link", { name: current.toUpperCase() }))
      .toHaveAttribute("aria-current", "true");
    await expect
      .element(languages.getByRole("link", { name: other.toUpperCase() }))
      .toHaveAttribute("href", `/${other}${AUTH.PAGE.SIGN_IN}`);
  });

  it("holds the theme toggle", async () => {
    const screen = await gate();
    await expect
      .element(
        screen.getByRole("button", { name: enT("Common.Auth.Gate.theme") })
      )
      .toBeVisible();
  });

  it("links to nothing but the page's languages: no registration", async () => {
    await gate();
    expect(document.querySelectorAll("a")).toHaveLength(
      I18N.BASE_LANGUAGES.length
    );
  });
});
