import {
  CHECK_STATUS,
  type CheckStatus,
  READY_STATUS,
  type ReadyStatus,
} from "../constants/statuses";

export type HealthDeps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis: () => Promise<boolean>;
};

export function readyStatus(database: boolean, redis: boolean): ReadyStatus {
  if (!database) {
    return READY_STATUS.UNAVAILABLE;
  }
  return redis ? READY_STATUS.OK : READY_STATUS.DEGRADED;
}

export const checkStatus = (reachable: boolean): CheckStatus =>
  reachable ? CHECK_STATUS.OK : CHECK_STATUS.UNREACHABLE;
