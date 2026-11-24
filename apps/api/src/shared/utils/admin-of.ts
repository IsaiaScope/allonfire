import type { CanManage } from "@allonfire/auth/features/hono/guards/utils/manage-guard";
import { type App, Role } from "@allonfire/database/enums";
import {
  type AccessUser,
  hasRoleIn,
} from "@allonfire/database/features/auth/access/access";
import {
  accessUserById,
  sessionAlive,
} from "@allonfire/database/features/auth/user.service";

/** The two reads `adminOf` makes; a test hands in its own. */
export type AdminReads = {
  accessUserById: (id: string) => Promise<AccessUser | null>;
  sessionAlive: (sessionId: string) => Promise<boolean>;
};

const REAL_READS: AdminReads = { accessUserById, sessionAlive };

/**
 * Who may manage `app`: an Admin there, read from the database now, on a
 * Session still there. The Session's cookie copy can outlive both (a new
 * password deleted the Session, and the 5-minute cookie cache can hide that),
 * so a write never trusts it. One rule for every App's `canManage`.
 */
export const adminOf =
  (app: App, reads: AdminReads = REAL_READS): CanManage =>
  async ({ sessionId, userId }) => {
    const [user, alive] = await Promise.all([
      reads.accessUserById(userId),
      reads.sessionAlive(sessionId),
    ]);
    return alive && user !== null && hasRoleIn(user, app, Role.ADMIN);
  };
