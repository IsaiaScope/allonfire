import { HTTP } from "@allonfire/core/features/http/constants/http";
import { visitorHeaders } from "@allonfire/core/features/next/api/visitor-headers";
import type { NextRequest } from "next/server";
import { createApiAuthClient } from "./auth-client";

/**
 * Asks the API for the Session of the visitor a proxy's `request` comes
 * from, with their cookies and forwarded headers. A browser sends no Origin
 * on a same-origin page load, so the page's own stands in: the API narrows
 * the cookies it renews by it (a Domain the page is not under is dropped).
 * `onResponse` sees the
 * API's answer (the cookies it renews). Rejects when the API cannot answer,
 * for the caller to log and fall back.
 */
export const sessionFromRequest = (
  request: NextRequest,
  onResponse?: (response: Response) => void
) =>
  createApiAuthClient().getSession({
    fetchOptions: {
      headers: {
        [HTTP.HEADER.ORIGIN]: request.nextUrl.origin,
        ...visitorHeaders(request.cookies.toString(), request.headers),
      },
      onResponse: ({ response }) => onResponse?.(response),
    },
  });
