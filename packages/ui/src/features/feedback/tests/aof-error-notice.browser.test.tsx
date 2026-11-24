// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { createTranslator } from "next-intl";
import { render } from "vitest-browser-react";
import { AOFErrorNotice } from "../components/aof-error-notice";
import { STUB_ACTIONS, StubFrame } from "./notice-stub";

const t = createTranslator({
  locale: I18N.DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});

describe("AOFErrorNotice", () => {
  it("calls back once per retry click, the dressing's mark inside the button", async () => {
    const retry = vi.fn();
    const screen = await render(
      <AOFErrorNotice
        actions={STUB_ACTIONS}
        error={new Error("boom")}
        Frame={StubFrame}
        retry={retry}
        t={t}
      />
    );
    const button = screen.getByRole("button", { name: t("retry") });
    await expect.element(button).toHaveTextContent("RETRY");
    await button.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
