import { rateLimitKey } from "../../../features/rate-limit/constants/limits";
import { AUTH_BASE_PATH } from "../routes";

expectTypeOf(AUTH_BASE_PATH).toEqualTypeOf<"/v1/auth">();
expectTypeOf(rateLimitKey("1.2.3.4")).toEqualTypeOf<`ratelimit:${string}`>();
