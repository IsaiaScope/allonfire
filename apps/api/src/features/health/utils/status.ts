import { HEALTH } from "../constants/statuses";
import type { CheckStatus } from "../constants/statuses-schema";

export type HealthDeps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
};

export const checkStatus = (reachable: boolean): CheckStatus =>
  reachable ? HEALTH.CHECK.STATUS.OK : HEALTH.CHECK.STATUS.UNREACHABLE;
