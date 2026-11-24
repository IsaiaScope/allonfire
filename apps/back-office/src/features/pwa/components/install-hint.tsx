"use client";

import { AOFInstallHint } from "@allonfire/ui/features/pwa/components/aof-install-hint";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { InstallHintCard } from "./install-hint-card";

/** The shared Install hint, in the Back Office's night-bar card. */
export const InstallHint = () => (
  <AOFInstallHint appName={BACK_OFFICE.name} Card={InstallHintCard} />
);
