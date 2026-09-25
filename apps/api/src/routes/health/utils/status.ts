import { CHECK_STATUS, type CheckStatus } from "../constants/statuses";

export type HealthDeps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
};

export const checkStatus = (reachable: boolean): CheckStatus =>
  reachable ? CHECK_STATUS.OK : CHECK_STATUS.UNREACHABLE;
