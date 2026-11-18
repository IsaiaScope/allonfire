import { AOFNuqsAdapter } from "@allonfire/core/features/next/providers/components/aof-nuqs-adapter";
import { AOFThemeProvider } from "@allonfire/core/features/next/providers/components/aof-theme-provider";
import { AOFPwa } from "@allonfire/core/features/next/pwa/components/aof-pwa";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { AOFEdgeTint } from "../../feedback/components/aof-edge-tint";
import { AOFQueryProvider } from "../../query/components/aof-query-provider";

/**
 * Every App's `[locale]` document: the language, the providers every page
 * reads (words, queries, theme, URL state), the App's toaster, the edge
 * tint that keeps iOS Safari's toolbar the page's colour (never a slot, so
 * an App cannot forget it) and the PWA around the pages (ADR 0023). The
 * toaster, the Install hint and the offline banner are the App's, drawn in
 * its Design. `generateStaticParams`, `generateMetadata` and `viewport` stay
 * in the App's layout file: Next reads those exports from it.
 */
export const AOFLocaleDocument = ({
  banner,
  children,
  hint,
  locale,
  pwaEnabled,
  toaster,
}: {
  /** The App's offline banner. */
  banner: ReactNode;
  children: ReactNode;
  /** The App's Install hint. */
  hint: ReactNode;
  locale: string;
  /** Registers the service worker: the App's production build only. */
  pwaEnabled: boolean;
  /** Every toast the App sends, above an iPhone's home indicator. */
  toaster: ReactNode;
}) => (
  <html lang={locale} suppressHydrationWarning translate="no">
    <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
      <NextIntlClientProvider>
        <AOFQueryProvider>
          <AOFThemeProvider>
            <AOFNuqsAdapter>
              {toaster}
              <AOFEdgeTint />
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
