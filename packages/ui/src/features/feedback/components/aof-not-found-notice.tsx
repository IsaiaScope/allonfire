import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofBaseNavigation } from "@allonfire/core/features/next/i18n/utils/aof-base-navigation";
import { IconArrowBackUp } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { aofActionLinkClass } from "../../../shared/components/aof-button";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import type { AOFNoticeFrame, AOFNoticeFrameProps } from "../types/notice";

/**
 * What every 404 shows: the App's `Frame` for a `notFound` notice, with a
 * link back to the start. not-found.js takes no metadata exports, so the
 * frame names the tab. `page` is the frame it fills: the whole screen, or a
 * Section's page area inside the signed-in frame.
 */
export const AOFNotFoundNotice = ({
  actions,
  Frame,
  page,
}: {
  actions: AOFActionDressing;
  Frame: AOFNoticeFrame;
  page?: AOFNoticeFrameProps["page"];
}) => {
  const t = useTranslations("Common.NotFound");
  return (
    <Frame
      action={
        <aofBaseNavigation.Link
          className={aofActionLinkClass(actions)}
          href={METADATA.PATH.ROOT}
        >
          {actions.marks.back}
          <IconArrowBackUp aria-hidden />
          {t("back")}
        </aofBaseNavigation.Link>
      }
      description={t("lost")}
      heading={t("title")}
      kind="notFound"
      page={page}
    />
  );
};
