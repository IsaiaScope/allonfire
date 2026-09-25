import type { Role } from "@allonfire/database/enums";
import { hasRole } from "../../access/access";
import { guard } from "../utils/guard";

/** 403 unless the User's Role reaches `min`: `requireRole(Role.USER)` refuses a Viewer. */
export const requireRole = (min: Role) =>
  guard(({ user }) => hasRole(user.role, min));
