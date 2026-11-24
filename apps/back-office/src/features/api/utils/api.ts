import type { ApiType } from "@allonfire/api/client";
import { aofCreateApi } from "@allonfire/core/features/next/api/utils/aof-create-api";
import { hc } from "hono/client";
import { env } from "@/environment/environment";

/**
 * The API from the browser (ADR 0004), typed from the API's routes: the
 * factory is core's, and only this file knows the App's API type and its
 * public addresses. Local only, a page opened off this machine calls
 * `NEXT_PUBLIC_API_REMOTE_URL` instead.
 */
export const api = aofCreateApi({
  create: hc<ApiType>,
  local: env.NEXT_PUBLIC_API_URL,
  remote: env.NEXT_PUBLIC_API_REMOTE_URL,
});

/** The API's typed client: the browser's `api`, or the server's `serverApi()`. */
export type ApiClient = typeof api;
