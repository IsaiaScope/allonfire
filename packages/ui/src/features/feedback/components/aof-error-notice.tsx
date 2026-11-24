import type { SharedTranslations } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { IconRefresh } from "@tabler/icons-react";
import type { createTranslator } from "next-intl";
import { AOFButton } from "../../../shared/components/aof-button";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import type { AOFNoticeFrame } from "../types/notice";

/** The boundary's `Common.Error` translator: `useTranslations` or `createTranslator`. */
type ErrorTranslator = ReturnType<
  typeof createTranslator<SharedTranslations, "Common.Error">
>;

/** What Next hands an error boundary (`error.tsx`, `global-error.tsx`). */
export type AOFErrorBoundaryProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export type AOFErrorNoticeProps = AOFErrorBoundaryProps & {
  actions: AOFActionDressing;
  Frame: AOFNoticeFrame;
  t: ErrorTranslator;
};

/**
 * What every error page shows, rendered inside the client error boundaries:
 * the App's `Frame` for an `error` notice with a retry button (the App's
 * action dressing) and, when the error has a digest, a reference line so a
 * report matches the server log. error.js takes no metadata exports, so the
 * frame names the tab.
 */
export const AOFErrorNotice = ({
  actions,
  error,
  Frame,
  retry,
  t,
}: AOFErrorNoticeProps) => (
  <Frame
    action={
      <AOFButton
        className={actions.className}
        onClick={retry}
        size="field"
        type="button"
      >
        {actions.marks.retry}
        <IconRefresh aria-hidden />
        {t("retry")}
      </AOFButton>
    }
    description={t("description")}
    heading={t("title")}
    kind="error"
    reference={
      error.digest ? t("reference", { digest: error.digest }) : undefined
    }
  />
);
