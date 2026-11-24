"use client";

import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { useOffline } from "next/offline";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { AOF_TOAST, useAOFToast } from "../../../shared/hooks/use-aof-toast";

const OPTIONS = { ...AOF_TOAST.PERSISTENT, position: "top-center" } as const;

/** What the App's offline card is given: the words the banner reads. */
export type AOFOfflineCardProps = { description: string; title: string };

/**
 * While the network is gone, a toast at the top: Next keeps a failed
 * navigation or Server Action pending and retries it once the connection is
 * back (`experimental.useOffline`), so there is nothing to press; the toast
 * leaves when the network returns. Renders nothing itself: the layout's
 * AOFToaster draws it and announces it. `Card` is the App's Design of it.
 */
export const AOFOfflineBanner = ({
  Card,
}: {
  Card: ComponentType<AOFOfflineCardProps>;
}) => {
  const t = useTranslations("Common.Offline");
  useAOFToast(
    PWA.TOAST.OFFLINE,
    useOffline() ? (
      <Card description={t("banner.description")} title={t("banner.title")} />
    ) : null,
    OPTIONS
  );
  return null;
};
