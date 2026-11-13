"use client";

import { AOFResourceView } from "@allonfire/core/features/next/query/components/aof-resource-view";
import type { UseQueryResult } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback } from "react";
import { ErrorNotice } from "@/features/errors/components/error-notice";
import { SectionLoading } from "@/features/navigation/components/section-loading";

/** An error with no digest: the notice then shows no reference. */
const UNREFERENCED = new Error("The API answered with no reference");

const LOADING = <SectionLoading />;

/**
 * Core's `AOFResourceView` dressed for a Back Office page of one resource (an
 * Image's or a User's edit form): the page's loading screen while it is
 * read (the page's own `loading`, its skeleton, or the Section's waiting
 * room), and the error notice, with its retry, for a refusal that is no 404
 * (the 404 is the Section's own `not-found`).
 */
export const ResourceView = <T,>({
  children,
  loading = LOADING,
  query,
}: {
  children: (data: T) => ReactNode;
  /** What stands in for the resource while it is read. */
  loading?: ReactNode;
  query: Pick<UseQueryResult<T, unknown>, "data" | "error" | "refetch">;
}) => {
  const t = useTranslations("Common.Error");
  const { error } = query;
  const failed = useCallback(
    (retry: () => void) => (
      <ErrorNotice
        error={error instanceof Error ? error : UNREFERENCED}
        retry={retry}
        t={t}
      />
    ),
    [error, t]
  );
  return (
    <AOFResourceView failed={failed} loading={loading} query={query}>
      {children}
    </AOFResourceView>
  );
};
