import { visitorHeaders } from "@allonfire/core/features/next/api/visitor-headers";
import type { NextRequest } from "next/server";
import { createApiAuthClient } from "./auth-client";

/**
 * Asks the API for the Session of the visitor a proxy's `request` comes
 * from, with their cookies and forwarded headers. `onResponse` sees the
 * API's answer (the cookies it renews). Rejects when the API cannot answer,
 * for the caller to log and fall back.
 */
export const sessionFromRequest = (
  request: NextRequest,
  onResponse?: (response: Response) => void
) =>
  createApiAuthClient().getSession({
    fetchOptions: {
      headers: visitorHeaders(request.cookies.toString(), request.headers),
      onResponse: ({ response }) => onResponse?.(response),
    },
  });
