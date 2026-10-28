import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { AOFBaseViewport } from "@allonfire/core/features/next/metadata/aof-base-viewport";
import { AOFNuqsAdapter } from "@allonfire/core/features/next/providers/aof-nuqs-adapter";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import { AOFPwa } from "@allonfire/core/features/next/pwa/aof-pwa";
import { ENV } from "@allonfire/core/shared/constants/env";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import { AOFQueryProvider } from "@allonfire/ui/components/aof-query-provider";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { env } from "@/environment/environment";
import { routing } from "@/features/i18n/routing";
import { baseMetadata } from "@/features/metadata/utils/base-metadata";
import { metadataText } from "@/features/metadata/utils/metadata-text";
import { InstallHint } from "@/features/pwa/components/install-hint";
import { OfflineBanner } from "@/features/pwa/components/offline-banner";
import { StationToaster } from "@/shared/components/station-toaster";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import "../globals.css";

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

// Pages add `title`, `description` and `openGraph: pageOpenGraph(...)`. Next
// merges shallowly: a page's `openGraph` or `robots` replaces the layout's
// whole, so a page never writes either by hand.
export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const t = metadataText(locale);
  return {
    ...baseMetadata(locale),
    description: t("description"),
    metadataBase: new URL(env.BACK_OFFICE_URL),
    title: {
      default: BACK_OFFICE.NAME,
      template: pageTitle("%s", BACK_OFFICE.NAME),
    },
  };
};

export const viewport: Viewport = AOFBaseViewport({
  schemeColors: JAPAN_IMAGE_COLOR,
});

// The locale comes from next/root-params via src/features/i18n/request.ts, which also
// 404s an unknown one.
const LocaleLayout = async ({ children }: { children: ReactNode }) => {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning translate="no">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <AOFQueryProvider>
            <AOFThemeProvider>
              <AOFNuqsAdapter>
                {/* Every toast the App sends, the Install hint and the
                    offline notice included; above an iPhone's home
                    indicator. */}
                <StationToaster />
                {/* The PWA (ADR 0023): the Install hint and the offline
                    notice, both sent as toasts in the Japan Design, and in
                    production the service worker. */}
                <AOFPwa
                  banner={<OfflineBanner />}
                  enabled={env.NODE_ENV === ENV.NODE.PRODUCTION}
                  hint={<InstallHint />}
                >
                  {children}
                </AOFPwa>
              </AOFNuqsAdapter>
            </AOFThemeProvider>
            {/* ponytail: TanStack Query devtools hidden until a page queries
                anything; mount AOFReactQueryDevtools here to bring them back. */}
          </AOFQueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
