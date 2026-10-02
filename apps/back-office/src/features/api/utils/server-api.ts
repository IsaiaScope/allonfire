import type { ApiType } from "@allonfire/api/client";
import { visitorHeaders } from "@allonfire/utils/next/api/forwarded-for";
import { hc } from "hono/client";
import { cookies, headers } from "next/headers";
import { env } from "@/environment/environment";
import type { ApiClient } from "./api";

/**
 * The API from the App's server (a page prefetching a query, a server
 * action), straight to its internal address with the visitor's cookies and
 * address. Same types as `api`, so one query options factory serves both.
 */
export const getServerApi = async (): Promise<ApiClient> =>
  hc<ApiType>(env.API_URL, {
    headers: visitorHeaders((await cookies()).toString(), await headers()),
  });
