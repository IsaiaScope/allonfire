// @module-tag unit
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFErrorNotice } from "../components/aof-error-notice";
import { STUB_ACTIONS, StubFrame } from "./notice-stub";

const t = createTranslator({
  locale: I18N.DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});
const DIGEST = "ref-1234";
const noop = () => undefined;

const markup = (error: Error & { digest?: string }) =>
  renderToStaticMarkup(
    <AOFErrorNotice
      actions={STUB_ACTIONS}
      error={error}
      Frame={StubFrame}
      retry={noop}
      t={t}
    />
  );

describe("AOFErrorNotice", () => {
  it("is an error notice with the shared title and a dressed retry button", () => {
    const html = markup(new Error("boom"));
    expect(html).toContain('data-kind="error"');
    expect(html).toContain(`<h1>${t("title")}</h1>`);
    expect(html).toContain("DRESSED");
    expect(html).toContain("<i>RETRY</i>");
    expect(html).toContain(t("retry"));
  });

  it("shows the digest as a reference, so a report matches the server log", () => {
    expect(
      markup(Object.assign(new Error("boom"), { digest: DIGEST }))
    ).toContain(t("reference", { digest: DIGEST }));
  });

  it("shows no reference for an error without a digest", () => {
    expect(markup(new Error("boom"))).not.toContain(
      t("reference", { digest: "" }).trim()
    );
  });
});
