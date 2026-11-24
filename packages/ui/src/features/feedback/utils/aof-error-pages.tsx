import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/components/aof-theme-provider";
import { createTranslator, useTranslations } from "next-intl";
import {
  type AOFErrorBoundaryProps,
  AOFErrorNotice,
  type AOFErrorNoticeProps,
} from "../components/aof-error-notice";

/**
 * The two error pages every App draws in its own Design: `RouteError` for
 * `error.tsx` (a segment's boundary, inside the language's providers) and
 * `GlobalError` for `global-error.tsx`. Next reads each from the App's own
 * file, which only default-exports the one it needs. `GlobalError` replaces
 * the root layout, so no language is known and no next-intl provider runs:
 * the shared text in the default language, through a plain translator.
 * `retry` re-fetches and re-renders the segment (stable since Next 16.3);
 * `reset` would re-render the failed server payload as it was. Call it from a
 * client module, where the hooks may run.
 */
export const aofErrorPages = (
  notice: Pick<AOFErrorNoticeProps, "actions" | "Frame">
) => {
  const t = createTranslator({
    locale: I18N.DEFAULT_LANGUAGE,
    messages: SHARED_TRANSLATIONS[I18N.DEFAULT_LANGUAGE],
    namespace: "Common.Error",
  });

  const GlobalError = ({ error, retry }: AOFErrorBoundaryProps) => (
    <html lang={I18N.DEFAULT_LANGUAGE} suppressHydrationWarning translate="no">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <AOFThemeProvider>
          <AOFErrorNotice {...notice} error={error} retry={retry} t={t} />
        </AOFThemeProvider>
      </body>
    </html>
  );

  const RouteError = ({ error, retry }: AOFErrorBoundaryProps) => (
    <AOFErrorNotice
      {...notice}
      error={error}
      retry={retry}
      t={useTranslations("Common.Error")}
    />
  );

  return { GlobalError, RouteError };
};
