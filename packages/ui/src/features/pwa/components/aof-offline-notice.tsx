import { IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import type { AOFNoticeFrame } from "../../feedback/types/notice";
import { AOFReloadButton } from "./aof-reload-button";

/**
 * The Offline page: the service worker precaches it per language and shows
 * it at any address that failed to load for lack of network. The App's
 * `Frame` draws an `offline` notice whose action reloads.
 */
export const AOFOfflineNotice = ({
  actions,
  Frame,
}: {
  actions: AOFActionDressing;
  Frame: AOFNoticeFrame;
}) => {
  const t = useTranslations("Common.Offline");
  return (
    <Frame
      action={
        <AOFReloadButton className={actions.className}>
          {actions.marks.retry}
          <IconRefresh aria-hidden />
          {t("retry")}
        </AOFReloadButton>
      }
      description={t("description")}
      heading={t("title")}
      kind="offline"
    />
  );
};
