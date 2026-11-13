"use client";

import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { UseQueryResult } from "@tanstack/react-query";
import { type ReactNode, useCallback } from "react";

/**
 * The API's refusal: the visitor is in the App but not allowed in. Read from
 * the error's `statusCode` (the Hono client's `DetailedError` has one), so ui
 * needs no client of its own.
 */
const isForbidden = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  error.statusCode === HTTP.STATUS.FORBIDDEN;

/**
 * The states of a card that reads the API as the visitor: its data
 * (`children`, given it), the host's `forbidden` for a 403 (the API is the
 * judge, so what a member who is not allowed sees is the host's to draw), the
 * host's `failed`, given a `retry`, on any other failure with nothing to show
 * (a first load that fails never toasts), and the `skeleton` while it loads.
 * The host draws both refusals as cards the size of the one it stands for,
 * so nothing moves between the states.
 */
export const AOFQueryView = <T,>({
  children,
  failed,
  forbidden,
  query: { data, error, refetch },
  skeleton,
}: {
  children: (data: T) => ReactNode;
  failed: (retry: () => void) => ReactNode;
  forbidden: ReactNode;
  query: Pick<UseQueryResult<T, unknown>, "data" | "error" | "refetch">;
  skeleton: ReactNode;
}) => {
  const retry = useCallback(() => refetch(), [refetch]);
  if (data) {
    return children(data);
  }
  if (isForbidden(error)) {
    return forbidden;
  }
  if (error) {
    return failed(retry);
  }
  return skeleton;
};
