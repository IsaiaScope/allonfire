import type { UseQueryResult } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { HTTP } from "../../../http/constants/http";

/**
 * The API's answer that the resource is not there, read from the error's
 * `statusCode` (the Hono client's `DetailedError` has one), so core needs no
 * client of its own.
 */
const isGone = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  error.statusCode === HTTP.STATUS.NOT_FOUND;

/**
 * A page of one resource (an edit form) as its read leaves it: the resource
 * drawn (`children`) once there is one, the 404 (`notFound()`, the Section's
 * own `not-found`) when the API does not know it (a resource deleted
 * elsewhere), the host's `failed`, given the read's retry, for any other
 * failure with nothing to show, and the host's `loading` while it is read. A
 * read that fails after the resource was drawn (this very page deleted it)
 * leaves the form as it is. Hooks-free, so a Server or a Client Component
 * renders it.
 */
export const AOFResourceView = <T,>({
  children,
  failed,
  loading,
  query: { data, error, refetch },
}: {
  children: (data: T) => ReactNode;
  failed: (retry: () => void) => ReactNode;
  loading: ReactNode;
  query: Pick<UseQueryResult<T, unknown>, "data" | "error" | "refetch">;
}) => {
  if (data) {
    return children(data);
  }
  if (isGone(error)) {
    notFound();
  }
  if (error) {
    return failed(() => refetch());
  }
  return loading;
};
