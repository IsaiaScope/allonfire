import { type NextRequest, NextResponse } from "next/server";
import { refreshSession } from "./refresh-session";

/**
 * Wraps an App's proxy so it also renews the Session cookies. Cookies set on
 * the response here are also what the page's `cookies()` reads in this same
 * request, so the page asks the API with the fresh ones.
 */
export const withSessionRefresh =
  (proxy: (request: NextRequest) => Promise<Response> | Response) =>
  async (request: NextRequest): Promise<Response> => {
    const [renewed, response] = await Promise.all([
      refreshSession(request),
      proxy(request),
    ]);
    if (response instanceof NextResponse) {
      for (const { name, value, options } of renewed) {
        response.cookies.set(name, value, options);
      }
    }
    return response;
  };
