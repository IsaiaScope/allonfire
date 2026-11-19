import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { OfflineNotice } from "@/features/pwa/components/offline-notice";
import { pageMetadata } from "@/shared/constants/page-information";

export const generateMetadata = () =>
  pageMetadata(PWA.PATH.OFFLINE, "Common.Offline.title");

const OfflinePage = () => <OfflineNotice />;

export default OfflinePage;
