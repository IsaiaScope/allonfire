// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { createTranslator } from "next-intl";
import { render } from "vitest-browser-react";
import { ErrorNotice } from "../error-notice";

const t = createTranslator({
  locale: I18N.DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});

describe("ErrorNotice", () => {
  it("calls back once per retry click", async () => {
    const retry = vi.fn();
    const screen = await render(
      <ErrorNotice error={new Error("boom")} retry={retry} t={t} />
    );
    await screen.getByRole("button", { name: t("retry") }).click();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
