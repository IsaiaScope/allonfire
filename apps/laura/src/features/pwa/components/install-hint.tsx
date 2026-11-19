"use client";

import { AOFInstallHint } from "@allonfire/ui/features/pwa/components/aof-install-hint";
import { LAURA } from "@/shared/constants/laura";
import { InstallHintCard } from "./install-hint-card";

/** The shared Install hint, in Laura's card. */
export const InstallHint = () => (
  <AOFInstallHint appName={LAURA.name} Card={InstallHintCard} />
);
