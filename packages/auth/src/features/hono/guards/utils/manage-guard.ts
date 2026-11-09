import { guard } from "./guard";

/** A Back Office Admin, read now, on a Session still there. */
export type CanManage = (ids: {
  sessionId: string;
  userId: string;
}) => Promise<boolean>;

/**
 * The guard of a route that changes Users or reads for an Admin, from the
 * Host's `canManage`: 401 without a Session, 403 for anyone it refuses. Every
 * Admin-only route takes it, never a guard of its own.
 */
export const manageGuard = (canManage: CanManage) =>
  guard((session) =>
    canManage({ sessionId: session.session.id, userId: session.user.id })
  );
