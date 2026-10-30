// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { createTranslator } from "next-intl";
import { render } from "vitest-browser-react";
import { BACK_OFFICE } from "@/shared/constants/back-office";
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

  it("names the tab after the error, since error pages take no metadata", async () => {
    await render(
      <ErrorNotice error={new Error("boom")} retry={vi.fn()} t={t} />
    );
    await expect
      .poll(() => document.title)
      .toBe(pageTitle(t("title"), BACK_OFFICE.NAME));
  });
});
