import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofButtonVariants } from "@allonfire/ui/components/aof-button";
import { cn } from "@allonfire/ui/lib/utils";
import { getTranslations } from "next-intl/server";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import { Link } from "@/features/i18n/navigation";
import {
  STATION_NOTICE_ACTION,
  StationNotice,
  StationNoticeKanji,
} from "@/shared/components/station-notice";

// not-found.js takes no metadata exports (only global-not-found does), so
// the notice names the tab. A station the line does not have: its eki stamp
// reads 404 and 回送 (not in service), 迷子 (lost) is brushed across the
// wall, and the button, brushed 戻 (return), leads back.
const NotFound = async () => {
  const t = await getTranslations("Common.NotFound");
  return (
    <StationNotice
      action={
        <Link
          className={cn(aofButtonVariants(), STATION_NOTICE_ACTION)}
          href={METADATA.PATH.ROOT}
        >
          <StationNoticeKanji kanji={ERROR_SIGNAGE.NOT_FOUND.BACK_KANJI} />
          {t("back")}
        </Link>
      }
      description={t("lost")}
      heading={t("title")}
      signage={ERROR_SIGNAGE.NOT_FOUND}
    />
  );
};

export default NotFound;
