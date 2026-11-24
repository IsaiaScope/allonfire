"use client";

import { AOFResourceView } from "@allonfire/core/features/next/query/components/aof-resource-view";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import { AOFErrorNotice } from "../../feedback/components/aof-error-notice";
import type { AOFNoticeFrame } from "../../feedback/types/notice";

/** An error with no digest: the notice then shows no reference. */
const UNREFERENCED = new Error("The API answered with no reference");

/**
 * Core's `AOFResourceView` dressed for an App's page of one resource (an
 * edit form): the page's `loading` while it is read, and the error notice
 * (the App's `Frame` and `actions`), with its retry, for a refusal that is no
 * 404 (the 404 is the Section's own `not-found`).
 */
export const AOFResourceQueryView = <T,>({
  actions,
  children,
  Frame,
  loading,
  query,
}: {
  actions: AOFActionDressing;
  children: (data: T) => ReactNode;
  Frame: AOFNoticeFrame;
  /** What stands in for the resource while it is read. */
  loading: ReactNode;
  query: Pick<UseQueryResult<T, unknown>, "data" | "error" | "refetch">;
}) => {
  const t = useTranslations("Common.Error");
  const { error } = query;
  const failed = useCallback(
    (retry: () => void) => (
      <AOFErrorNotice
        actions={actions}
        error={error instanceof Error ? error : UNREFERENCED}
        Frame={Frame}
        retry={retry}
        t={t}
      />
    ),
    [actions, error, Frame, t]
  );
  return (
    <AOFResourceView failed={failed} loading={loading} query={query}>
      {children}
    </AOFResourceView>
  );
};
