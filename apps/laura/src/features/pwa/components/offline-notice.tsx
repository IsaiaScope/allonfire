import { AOFOfflineNotice } from "@allonfire/ui/features/pwa/components/aof-offline-notice";
import { OceanNoticeFrame } from "@/features/errors/components/ocean-notice-frame";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";

/** The shared Offline notice in Laura's Ocean Design: the octopus asleep. */
export const OfflineNotice = () => (
  <AOFOfflineNotice actions={ACTION_DRESSING} Frame={OceanNoticeFrame} />
);
