import { App, type Role } from "@allonfire/database/enums";
import {
  accessUserFrom,
  roleIn,
} from "@allonfire/database/features/auth/access/access";

/**
 * Who reads Users through the kept read (`readUsers`), and so
 * their key: the Session (`sessionCookie`, from `readSessionCookie`) and its
 * Back Office Role as the Session reads now. The Role is in the key only: an
 * Admin whose Role is taken away misses the entries kept for them and asks
 * the API, which refuses once their Session's copy runs out (5 minutes),
 * never the hour an entry lives.
 */
export type UsersVisitor = { role: Role | undefined; sessionCookie: string };

export const usersVisitorOf = (
  user: Parameters<typeof accessUserFrom>[0],
  sessionCookie: string
): UsersVisitor => ({
  role: roleIn(accessUserFrom(user), App.BACK_OFFICE),
  sessionCookie,
});
