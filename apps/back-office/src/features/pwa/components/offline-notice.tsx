import { AOFOfflineNotice } from "@allonfire/ui/features/pwa/components/aof-offline-notice";
import { StationNoticeFrame } from "@/features/errors/components/station-notice-frame";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";

/** The shared Offline notice in the Back Office's station signage. */
export const OfflineNotice = () => (
  <AOFOfflineNotice actions={ACTION_DRESSING} Frame={StationNoticeFrame} />
);
