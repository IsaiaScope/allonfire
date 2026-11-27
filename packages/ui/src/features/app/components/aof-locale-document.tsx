import { env } from "@allonfire/core/environment/environment";
import { AOFNuqsAdapter } from "@allonfire/core/features/next/providers/components/aof-nuqs-adapter";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/components/aof-theme-provider";
import { AOFPwa } from "@allonfire/core/features/next/pwa/components/aof-pwa";
import { ENV } from "@allonfire/core/shared/constants/env";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { AOFQueryProvider } from "../../query/components/aof-query-provider";
import { AOFThemeColor } from "../../theme/components/aof-theme-color";

/**
 * Every App's `[locale]` document: the language, the providers every page
 * reads (words, queries, theme, URL state), the App's toaster and the PWA
 * around the pages (ADR 0023). Nothing fixed is drawn at the screen's bottom
 * edge but the toaster (`docs/guides/safari.md`). `generateStaticParams`,
 * `generateMetadata` and `viewport` stay in the App's layout file: Next reads
 * those exports from it.
 */
export const AOFLocaleDocument = ({
  banner,
  children,
  hint,
  locale,
  pwaEnabled = env.NODE_ENV === ENV.NODE.PRODUCTION,
  toaster,
}: {
  /** The App's offline banner. */
  banner: ReactNode;
  children: ReactNode;
  /** The App's Install hint. */
  hint: ReactNode;
  locale: string;
  /** Registers the service worker: a production build only, unless the App says otherwise. */
  pwaEnabled?: boolean;
  /** Every toast the App sends, above an iPhone's home indicator. */
  toaster: ReactNode;
}) => (
  <html lang={locale} suppressHydrationWarning translate="no">
    <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <NextIntlClientProvider>
        <AOFQueryProvider>
          <AOFThemeProvider>
            <AOFThemeColor />
            <AOFNuqsAdapter>
              {toaster}
              <AOFPwa banner={banner} enabled={pwaEnabled} hint={hint}>
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
