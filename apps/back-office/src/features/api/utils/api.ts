import type { ApiType } from "@allonfire/api/client";
import { hc } from "hono/client";
import { env } from "@/environment/environment";
import { apiUrlFor } from "./api-url";

/**
 * The API from the browser, called directly at its public address with the
 * Session cookies (set for the parent domain; the API allows this App's
 * origin with credentials). Typed from the API's routes (ADR 0004). In a
 * query, read the body with `parseResponse` from `hono/client`: it throws a
 * `DetailedError` (status, problem document) on an error, which is what
 * TanStack Query expects. Local only, a page opened off this machine calls
 * `NEXT_PUBLIC_API_REMOTE_URL` instead (`apiUrlFor`).
 */
export const api = hc<ApiType>(
  apiUrlFor(globalThis.location?.hostname, {
    local: env.NEXT_PUBLIC_API_URL,
    remote: env.NEXT_PUBLIC_API_REMOTE_URL,
  }),
  { init: { credentials: "include" } }
);

/** The API's typed client: the browser's `api`, or the server's `serverApi()`. */
export type ApiClient = typeof api;
