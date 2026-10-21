"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import type { ReactNode } from "react";
import { stationNoticeAction } from "@/shared/components/station-notice";

const reload = () => location.reload();

/**
 * Reloads the address the visitor was opening: the worker serves the
 * Offline page at the address that failed, so a reload is the retry.
 */
export const ReloadButton = ({ children }: { children: ReactNode }) => (
  <AOFButton className={stationNoticeAction()} onClick={reload} type="button">
    {children}
  </AOFButton>
);
