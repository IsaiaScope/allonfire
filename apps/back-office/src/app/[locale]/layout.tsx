import { AOFNuqsAdapter } from "@allonfire/core/features/next/providers/aof-nuqs-adapter";
import { AOFQueryClientProvider } from "@allonfire/core/features/next/providers/aof-query-client-provider";
import { AOFReactQueryDevtools } from "@allonfire/core/features/next/providers/aof-react-query-devtools";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import { NODE_ENV } from "@allonfire/core/shared/constants/env";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { env } from "@/environment/environment";
import { routing } from "@/features/i18n/routing";
import "../globals.css";

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("Metadata");
  // Pages ship in every language the App speaks; a browser's machine
  // translation would only rewrite React's DOM under it.
  return { other: { google: "notranslate" }, title: t("title") };
};

// The locale comes from next/root-params via src/features/i18n/request.ts, which also
// 404s an unknown one.
const LocaleLayout = async ({ children }: { children: ReactNode }) => {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning translate="no">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <AOFQueryClientProvider>
            <AOFThemeProvider>
              <AOFNuqsAdapter>{children}</AOFNuqsAdapter>
            </AOFThemeProvider>
            <AOFReactQueryDevtools
              enabled={env.NODE_ENV === NODE_ENV.DEVELOPMENT}
            />
          </AOFQueryClientProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
