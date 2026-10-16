import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";
import { OfflineNotice } from "@/features/pwa/components/offline-notice";

export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("Common.Offline"),
    getLocale(),
  ]);
  return {
    openGraph: pageOpenGraph(PWA.PATH.OFFLINE, locale),
    title: t("title"),
  };
};

const OfflinePage = () => <OfflineNotice />;

export default OfflinePage;
