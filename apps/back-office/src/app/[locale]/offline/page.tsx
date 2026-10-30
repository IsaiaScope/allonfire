import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { OfflineNotice } from "@/features/pwa/components/offline-notice";

export const generateMetadata = () =>
  pageMetadata(PWA.PATH.OFFLINE, "Common.Offline.title");

const OfflinePage = () => <OfflineNotice />;

export default OfflinePage;
