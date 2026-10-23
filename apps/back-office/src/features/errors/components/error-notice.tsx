import type { SharedTranslations } from "@allonfire/core/features/next/i18n/shared-translations";
import { AOFButton } from "@allonfire/ui/components/aof-button";
import type { createTranslator } from "next-intl";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { StationNotice } from "@/shared/components/station-notice";

/** The boundary's `Common.Error` translator: `useTranslations` or `createTranslator`. */
type ErrorTranslator = ReturnType<
  typeof createTranslator<SharedTranslations, "Common.Error">
>;

/** What Next hands an error boundary (`error.tsx`, `global-error.tsx`). */
export type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

type ErrorNoticeProps = ErrorBoundaryProps & { t: ErrorTranslator };

/**
 * What every error page shows, rendered inside the client error boundaries:
 * a line that has stopped. Its eki stamp reads 停 (stop) and 見合わせ
 * (suspended), 運休 (service suspended) is brushed across the wall, and the
 * button, brushed 再 (again), retries. The digest is shown as a reference on
 * a small LED board, so a report matches the server log. error.js takes no
 * metadata exports, so the notice names the tab.
 */
export const ErrorNotice = ({ error, retry, t }: ErrorNoticeProps) => (
  <StationNotice
    action={
      <AOFButton
        className={kanjiAction()}
        onClick={retry}
        size="field"
        type="button"
      >
        <ActionKanji kanji={ERROR_SIGNAGE.ERROR.RETRY_KANJI} />
        {t("retry")}
      </AOFButton>
    }
    description={t("description")}
    heading={t("title")}
    signage={ERROR_SIGNAGE.ERROR}
  >
    {error.digest ? (
      <p className="led-board px-3 py-1 text-sm">
        {t("reference", { digest: error.digest })}
      </p>
    ) : null}
  </StationNotice>
);
