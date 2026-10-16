"use client";

import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { useInstallHint } from "@allonfire/core/features/next/pwa/use-install-hint";
import { AOF_TOAST, useAOFToast } from "@allonfire/ui/lib/use-aof-toast";
import { useTranslations } from "next-intl";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { InstallHintCard } from "./install-hint-card";

const OPTIONS = { ...AOF_TOAST.PERSISTENT, position: "bottom-center" } as const;

/**
 * Sends the Install hint as a toast at the bottom, kept until dismissed and
 * updated in place as installing moves on (one id). Renders nothing itself:
 * the layout's AOFToaster draws it. Core decides when it shows (never on a
 * first visit, a year away once dismissed); no swiping it away, so a
 * dismissal is always the ✕ and always remembered.
 */
export const InstallHint = () => {
  const t = useTranslations("Common.Install");
  const hint = useInstallHint();
  const button = hint && "install" in hint ? hint.install : null;
  useAOFToast(
    PWA.TOAST.INSTALL_HINT,
    hint ? (
      <InstallHintCard
        cta={t("cta", { app: BACK_OFFICE.NAME })}
        dismissLabel={t("dismiss")}
        error={button?.failed ? t("error") : undefined}
        install={
          button
            ? {
                label: t(button.installing ? "installing" : "install"),
                onInstall: button.onInstall,
                pending: button.installing,
              }
            : undefined
        }
        label={t("title")}
        onDismiss={hint.dismiss}
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
