// @module-tag integration
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderHook } from "vitest-browser-react";
import { useAOFAltLanguage } from "../hooks/use-aof-alt-language";

const wrapperFor =
  (locale: string) =>
  ({ children }: { children: ReactNode }) => (
    <NextIntlClientProvider locale={locale}>{children}</NextIntlClientProvider>
  );

describe("useAOFAltLanguage", () => {
  it("answers the page's language when it is one a Host speaks", async () => {
    const { result } = await renderHook(() => useAOFAltLanguage(), {
      wrapper: wrapperFor("it"),
    });
    expect(result.current).toBe("it");
  });

  it("falls back to the default for a language no Host speaks", async () => {
    const { result } = await renderHook(() => useAOFAltLanguage(), {
      wrapper: wrapperFor("xx"),
    });
    expect(result.current).toBe(I18N.DEFAULT_LANGUAGE);
  });
});
