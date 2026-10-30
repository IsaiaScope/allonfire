import type { AUTH } from "@allonfire/auth/shared/constants/auth";
import { rateLimitKey } from "../../../features/rate-limit/constants/limits";
import { API } from "../api";

// A literal, not `string`: the Apps compose their addresses from it.
expectTypeOf(
  API.PATH.AUTH
).toEqualTypeOf<`${typeof API.PATH.VERSION}${typeof AUTH.PATH.BASE}`>();
expectTypeOf(rateLimitKey("1.2.3.4")).toEqualTypeOf<`ratelimit:${string}`>();
