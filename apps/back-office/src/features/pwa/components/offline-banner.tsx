"use client";

import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { AOF_TOAST, useAOFToast } from "@allonfire/ui/lib/use-aof-toast";
import { useOffline } from "next/offline";
import { useTranslations } from "next-intl";
import { OfflineCard } from "./offline-card";

const OPTIONS = { ...AOF_TOAST.PERSISTENT, position: "top-center" } as const;

/**
 * While the network is gone, a toast at the top: Next keeps a failed
 * navigation or Server Action pending and retries it once the connection is
 * back (`experimental.useOffline`), so there is nothing to press; the toast
 * leaves when the network returns. Renders nothing itself: the layout's
 * AOFToaster draws it and announces it.
 */
export const OfflineBanner = () => {
  const t = useTranslations("Common.Offline");
  useAOFToast(
    PWA.TOAST.OFFLINE,
    useOffline() ? (
      <OfflineCard
        description={t("banner.description")}
        title={t("banner.title")}
      />
    ) : null,
    OPTIONS
  );
  return null;
};
