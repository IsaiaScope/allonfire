import type { ApiType } from "@allonfire/api/client";
import { readVisitorHeaders } from "@allonfire/core/features/next/api/forwarded-for";
import { hc } from "hono/client";
import { env } from "@/environment/environment";
import type { ApiClient } from "./api";

/**
 * The API from this App's server, as the visitor: their cookies, address and
 * Origin, at the API's internal address. For a Server Component that reads
 * data before it renders; the browser uses `api`. Read the body with
 * `parseResponse`, as there.
 */
export const serverApi = async (): Promise<ApiClient> =>
  hc<ApiType>(env.API_URL, { headers: await readVisitorHeaders() });
