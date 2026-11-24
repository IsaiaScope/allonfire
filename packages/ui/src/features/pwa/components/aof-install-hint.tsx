"use client";

import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { useInstallHint } from "@allonfire/core/features/next/pwa/hooks/use-install-hint";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { AOF_TOAST, useAOFToast } from "../../../shared/hooks/use-aof-toast";
import type { AOFInstallHintCardProps } from "../types/install-hint-card";

const OPTIONS = { ...AOF_TOAST.PERSISTENT, position: "bottom-center" } as const;

/**
 * Sends the Install hint as a toast at the bottom, kept until dismissed and
 * updated in place as installing moves on (one id). Renders nothing itself:
 * the layout's AOFToaster draws it. Core decides when it shows (never on a
 * first visit, a year away once dismissed); no swiping it away, so a
 * dismissal is always the ✕ and always remembered. `Card` is the App's
 * Design of the hint; `appName` fills the words' `{app}`.
 */
export const AOFInstallHint = ({
  appName,
  Card,
}: {
  appName: string;
  Card: ComponentType<AOFInstallHintCardProps>;
}) => {
  const t = useTranslations("Common.Install");
  const hint = useInstallHint();
  const button = hint && "install" in hint ? hint.install : null;
  useAOFToast(
    PWA.TOAST.INSTALL_HINT,
    hint ? (
      <Card
        aria-label={t("title")}
        cta={t("cta", { app: appName })}
        dismissProps={{ "aria-label": t("dismiss"), onClick: hint.dismiss }}
        error={button?.failed ? t("error") : undefined}
        installProps={
          button
            ? {
                children: t(button.installing ? "installing" : "install"),
                onClick: button.onInstall,
                pending: button.installing,
              }
            : undefined
        }
        steps={
          "steps" in hint
            ? hint.steps.map((step) => ({ step, text: t(`step.${step}`) }))
            : undefined
        }
      />
    ) : null,
    OPTIONS
  );
  return null;
};
