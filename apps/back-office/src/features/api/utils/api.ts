import type { ApiType } from "@allonfire/api/client";
import { hc } from "hono/client";
import { env } from "@/environment/environment";

/**
 * The API from the browser, called directly at its public address with the
 * Session cookies (set for the parent domain; the API allows this App's
 * origin with credentials). Typed from the API's routes (ADR 0004). In a
 * query, read the body with `parseResponse` from `hono/client`: it throws a
 * `DetailedError` (status, problem document) on an error, which is what
 * TanStack Query expects.
 */
export const api = hc<ApiType>(env.NEXT_PUBLIC_API_URL, {
  init: { credentials: "include" },
});

/** Either client; a query options factory takes one, so it runs on both sides. */
export type ApiClient = typeof api;
