// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { ErrorNotice } from "../error-notice";

const t = createTranslator({
  locale: I18N.DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});
const DIGEST = "ref-1234";
const REFERENCE_LABEL = t("reference", { digest: "" }).trim();
const noop = () => undefined;

describe("ErrorNotice", () => {
  it("shows the error's digest as a reference, so a report matches the server log", () => {
    const markup = renderToStaticMarkup(
      <ErrorNotice
        error={Object.assign(new Error("boom"), { digest: DIGEST })}
        retry={noop}
        t={t}
      />
    );
    expect(markup).toContain(t("reference", { digest: DIGEST }));
  });

  it("shows no reference for an error without a digest", () => {
    const markup = renderToStaticMarkup(
      <ErrorNotice error={new Error("boom")} retry={noop} t={t} />
    );
    expect(markup).not.toContain(REFERENCE_LABEL);
  });
});
