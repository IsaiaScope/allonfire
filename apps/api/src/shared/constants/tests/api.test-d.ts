import type { API_PATH } from "@allonfire/config/local/addresses";
import { rateLimitKey } from "../../../features/rate-limit/constants/limits";
import { API } from "../api";

// A literal, not `string`: the two cannot drift without failing the build.
expectTypeOf(API.PATH.AUTH).toEqualTypeOf<typeof API_PATH.AUTH>();
expectTypeOf(rateLimitKey("1.2.3.4")).toEqualTypeOf<`ratelimit:${string}`>();
