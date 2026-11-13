// @module-tag unit
import { IconServer2 } from "@tabler/icons-react";
import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { HomeSection } from "../home-section";

const section = { icon: IconServer2, label: "storage" } as const;

const render = () =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={EN}>
      <HomeSection section={section}>
        <p>its cards</p>
      </HomeSection>
    </NextIntlClientProvider>
  );

describe("HomeSection", () => {
  it("is headed by the Section's name with its icon", () => {
    const html = render();
    expect(html).toContain(`>${EN.Navigation.storage}</h2>`);
    expect(html).toContain("<svg");
  });

  it("is a region named by that heading, holding its cards", () => {
    const html = render();
    expect(html).toContain("<section");
    expect(html).toContain("aria-labelledby");
    expect(html).toContain("its cards");
  });
});
