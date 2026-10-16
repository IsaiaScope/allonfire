import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { pageTitle } from "@allonfire/core/features/metadata/utils/page-title";
import { AOFNuqsAdapter } from "@allonfire/core/features/next/providers/aof-nuqs-adapter";
import { AOFQueryClientProvider } from "@allonfire/core/features/next/providers/aof-query-client-provider";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/aof-theme-provider";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { env } from "@/environment/environment";
import { routing } from "@/features/i18n/routing";
import { baseMetadata } from "@/features/metadata/utils/base-metadata";
import { metadataText } from "@/features/metadata/utils/metadata-text";
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

// Installed-app chrome and form controls follow the OS theme. Safari 26+
// tints its tabs from the page background instead, which the Design sets.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: objectValues(METADATA.COLOR_SCHEME).map((scheme) => ({
    color: JAPAN_IMAGE_COLOR[scheme].background,
    media: `(prefers-color-scheme: ${scheme})`,
  })),
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
            {/* ponytail: TanStack Query devtools hidden until a page queries
                anything; mount AOFReactQueryDevtools here to bring them back. */}
          </AOFQueryClientProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
