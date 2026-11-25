import { RATE_LIMIT } from "../constants/limits";

export const rateLimitKey = (clientKey: string) =>
  `${RATE_LIMIT.KEY.PREFIX}${clientKey}` as const;
