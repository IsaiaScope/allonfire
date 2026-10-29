import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofButtonVariants } from "@allonfire/ui/components/aof-button";
import { cn } from "@allonfire/ui/lib/utils";
import { IconArrowBackUp } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import { Link } from "@/features/i18n/navigation";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import {
  StationNotice,
  type StationNoticeProps,
} from "@/shared/components/station-notice";

/**
 * What every 404 shows: a station the line does not have. Its eki stamp
 * reads 404 and 回送 (not in service), 迷子 (lost) is brushed across the
 * wall, and the button, brushed 戻 (return) beside a return arrow, leads
 * back. not-found.js takes no metadata exports (only global-not-found does),
 * so the notice names the tab. `page` is the frame it fills: the whole
 * screen, or a Section's page area inside the signed-in frame.
 */
export const NotFoundNotice = ({ page }: Pick<StationNoticeProps, "page">) => {
  const t = useTranslations("Common.NotFound");
  return (
    <StationNotice
      action={
        <Link
          className={cn(aofButtonVariants({ size: "field" }), kanjiAction())}
          href={METADATA.PATH.ROOT}
        >
          <ActionKanji kanji={ERROR_SIGNAGE.NOT_FOUND.BACK_KANJI} />
          <IconArrowBackUp aria-hidden />
          {t("back")}
        </Link>
      }
      description={t("lost")}
      heading={t("title")}
      page={page}
      signage={ERROR_SIGNAGE.NOT_FOUND}
    />
  );
};
