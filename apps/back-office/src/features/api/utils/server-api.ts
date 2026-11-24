import type { ApiType } from "@allonfire/api/client";
import { aofCreateServerApi } from "@allonfire/core/features/next/api/utils/aof-create-server-api";
import { hc } from "hono/client";
import { env } from "@/environment/environment";

/**
 * The API from this App's server, at its internal address (`API_URL`):
 * `serverApi()` as the visitor, for a Server Component that reads before it
 * renders; `sessionApi(cookie)` as the Session a `"use cache"` read names.
 * The factory is core's; the browser uses `api`.
 */
export const { serverApi, sessionApi } = aofCreateServerApi({
  create: hc<ApiType>,
  url: () => env.API_URL,
});
