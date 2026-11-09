"use client";

import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import {
  type AOFToastKind,
  aofToast,
} from "@allonfire/ui/shared/hooks/use-aof-toast";
import { IconLoader2, IconSend } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import {
  ToolbarActionBody,
  toolbarActionClass,
} from "@/shared/components/toolbar-action";
import { sendTestEmail, type TestSendState } from "../actions/services";
import { SERVICES } from "../constants/services";
import { useRefreshServices } from "../hooks/use-refresh-services";

/** What a test answered, as a toast: accepted is the only success; a refusal
 *  or a failure an error; the rest a warning, since nothing or maybe
 *  something left. */
const TEST_TOAST = {
  [MAIL.OUTCOME.ACCEPTED]: "success",
  [MAIL.OUTCOME.REJECTED]: "error",
  [MAIL.OUTCOME.UNAVAILABLE]: "warning",
  [MAIL.OUTCOME.UNCERTAIN]: "warning",
  [SERVICES.TEST_ERROR.FAILED]: "error",
  [SERVICES.TEST_ERROR.RATE_LIMITED]: "warning",
  [SERVICES.TEST_ERROR.REMOVED]: "error",
} as const satisfies Record<
  NonNullable<TestSendState["outcome"] | TestSendState["error"]>,
  AOFToastKind
>;

/**
 * Sends one real test email through this provider alone, to the signed-in
 * Admin's own address, and says what the provider did with it: acceptance,
 * never delivery, in a toast. It uses quota. It sits at the card's top
 * right.
 */
export const TestSend = ({ providerId }: { providerId: string }) => {
  const t = useTranslations("Services.test");
  const [pending, startTransition] = useTransition();
  const refresh = useRefreshServices();
  const send = () =>
    startTransition(async () => {
      const result = await sendTestEmail(providerId);
      const said = result.outcome ?? result.error ?? SERVICES.TEST_ERROR.FAILED;
      aofToast(t(said), TEST_TOAST[said]);
      // A send used quota, accepted or not: the rings are read again.
      refresh();
    });
  return (
    <div className="flex flex-col items-end">
      {/* The App's kanji action, as Users' Add draws it: on a narrow card
          its icon button, wide its label and kanji too; green, as a test. */}
      <AOFTooltip label={t("button")}>
        <AOFButton
          aria-label={pending ? t("sending") : t("button")}
          className={toolbarActionClass("card", "default", "green")}
          disabled={pending}
          onClick={send}
        >
          <ToolbarActionBody
            icon={
              pending ? (
                <IconLoader2 aria-hidden className="animate-spin" />
              ) : (
                <IconSend aria-hidden />
              )
            }
            kanjiProps={{ kanji: SERVICES.TEST_KANJI }}
            label={pending ? t("sending") : t("button")}
            shape="card"
          />
        </AOFButton>
      </AOFTooltip>
    </div>
  );
};
