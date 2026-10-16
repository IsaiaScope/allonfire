"use client";

import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import { createTranslator } from "next-intl";
import {
  type ErrorBoundaryProps,
  ErrorNotice,
} from "@/features/errors/components/error-notice";
import "./globals.css";

// Replaces the root layout, so no locale is known and no next-intl provider
// runs: the shared text in the default language, through a plain translator.
const t = createTranslator({
  locale: I18N.DEFAULT_LANGUAGE,
  messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
  namespace: "Common.Error",
});

const GlobalError = ({ error, retry }: ErrorBoundaryProps) => (
  <html lang={I18N.DEFAULT_LANGUAGE} suppressHydrationWarning translate="no">
    <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <AOFThemeProvider>
        <ErrorNotice error={error} retry={retry} t={t} />
      </AOFThemeProvider>
    </body>
  </html>
);

export default GlobalError;
