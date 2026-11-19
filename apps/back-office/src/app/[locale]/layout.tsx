import { AOFBaseViewport } from "@allonfire/core/features/next/metadata/utils/aof-base-viewport";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import { AOFLocaleDocument } from "@allonfire/ui/features/app/components/aof-locale-document";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { routing } from "@/features/i18n/routing";
import { layoutHead } from "@/features/metadata/utils/layout-head";
import { InstallHint } from "@/features/pwa/components/install-hint";
import { OfflineBanner } from "@/features/pwa/components/offline-banner";
import { StationToaster } from "@/shared/components/station-toaster";

import "../globals.css";

export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

// Pages add `title`, `description` and `openGraph` from `pageMetadata(...)`. Next
// merges shallowly: a page's `openGraph` or `robots` replaces the layout's
// whole, so a page never writes either by hand.
export const generateMetadata = layoutHead;

export const viewport = AOFBaseViewport({
  schemeColors: JAPAN_IMAGE_COLOR,
});

// The locale comes from next/root-params via src/features/i18n/request.ts, which also
// 404s an unknown one.
const LocaleLayout = async ({ children }: { children: ReactNode }) => (
  <AOFLocaleDocument
    banner={<OfflineBanner />}
    hint={<InstallHint />}
    locale={await getLocale()}
    toaster={<StationToaster />}
  >
    {children}
  </AOFLocaleDocument>
);

export default LocaleLayout;
