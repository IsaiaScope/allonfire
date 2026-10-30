import { type CheckStatus, HEALTH } from "../constants/statuses";

export type HealthDeps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
};

export const checkStatus = (reachable: boolean): CheckStatus =>
  reachable ? HEALTH.CHECK_STATUS.OK : HEALTH.CHECK_STATUS.UNREACHABLE;
