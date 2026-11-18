// @module-tag integration
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { useTranslations } from "next-intl";
import { renderInUi } from "./render-in-ui";

const Failed = () => <p>{useTranslations("Common.Request")("failed")}</p>;

describe("renderInUi", () => {
  it("shows core's shared text in the language asked for", async () => {
    const english = await renderInUi({ children: <Failed />, messages: {} });
    await expect
      .element(english.getByText(SHARED_TRANSLATIONS.en.Common.Request.failed))
      .toBeVisible();
    await english.unmount();

    const italian = await renderInUi({
      children: <Failed />,
      language: "it",
      messages: {},
    });
    await expect
      .element(italian.getByText(SHARED_TRANSLATIONS.it.Common.Request.failed))
      .toBeVisible();
  });
});
