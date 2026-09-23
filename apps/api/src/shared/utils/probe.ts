import { PROBE_PATHS } from "../constants/routes";

/**
 * Probes are self-generated on a fixed schedule. Tracing, rate limiting and
 * info-level logging all skip them, or they would bury real traffic.
 */
export const isProbe = (path: string): boolean => PROBE_PATHS.has(path);
