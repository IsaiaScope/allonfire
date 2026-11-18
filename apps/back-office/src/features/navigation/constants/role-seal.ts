import { Role } from "@allonfire/database/enums";

/**
 * The seal pressed beside the User in the account menu: their Role in the
 * Back Office as an office stamp (管理 manage, 利用 use, 閲覧 view).
 */
export const ROLE_SEAL = {
  [Role.ADMIN]: "管理",
  [Role.USER]: "利用",
  [Role.VIEWER]: "閲覧",
} as const satisfies Record<Role, string>;
