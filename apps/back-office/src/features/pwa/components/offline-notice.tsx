import { useTranslations } from "next-intl";
import { PWA_SIGNAGE } from "@/features/pwa/constants/pwa-signage";
import {
  StationNotice,
  StationNoticeKanji,
} from "@/shared/components/station-notice";
import { ReloadButton } from "./reload-button";

/**
 * The Offline page: the service worker precaches it per language and shows
 * it at any address that failed to load for lack of network. 断 and 不通 on
 * the stamp, 圏外 (out of range) across the wall, and a retry that reloads.
 */
export const OfflineNotice = () => {
  const t = useTranslations("Common.Offline");
  return (
    <StationNotice
      action={
        <ReloadButton>
          <StationNoticeKanji kanji={PWA_SIGNAGE.OFFLINE.RETRY_KANJI} />
          {t("retry")}
        </ReloadButton>
      }
      description={t("description")}
      heading={t("title")}
      signage={PWA_SIGNAGE.OFFLINE}
    />
  );
};
