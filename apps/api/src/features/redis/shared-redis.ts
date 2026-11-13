import { env } from "../../environment/environment";
import { createRedis } from "./redis";

/**
 * The API's one Redis client: the rate limit, the per-address email limit and
 * the usage caches all share it. It connects at import, so the first request
 * finds it ready, and `index.ts` closes it at shutdown.
 */
export const sharedRedis = createRedis(env.API_REDIS_URL);
