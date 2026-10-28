"use client";

import { AOFQueryClientProvider } from "@allonfire/core/features/next/providers/aof-query-client-provider";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { aofToast } from "../lib/use-aof-toast";

/** A failure told to the visitor: an error toast. */
export const aofNotifyError = (message: string) => aofToast(message, "error");

/**
 * The page's query client for every App: a failed mutation, or a failed
 * refresh of what is on screen, becomes an error toast (core's
 * `aofErrorCaches`), in a query's or mutation's own words
 * (`aofErrorMeta`) or the shared `Common.Request.failed`. Here, not in core:
 * the toast is ui's. Mount it inside `NextIntlClientProvider` and beside
 * `AOFToaster`.
 */
export const AOFQueryProvider = ({ children }: { children: ReactNode }) => {
  const t = useTranslations("Common.Request");
  return (
    <AOFQueryClientProvider
      errors={{ fallback: t("failed"), notify: aofNotifyError }}
    >
      {children}
    </AOFQueryClientProvider>
  );
};
