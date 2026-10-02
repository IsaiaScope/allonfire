import { Role } from "@allonfire/database/enums";
import type { App } from "../../../shared/types/auth";

/**
 * How far each Role reaches; a higher rank holds every right of a lower one.
 * Steps of 100 leave room to slot a new Role between two without renumbering.
 * `satisfies` fails the build when the schema gains a Role with no rank here.
 */
export const ROLE_RANK = {
  ADMIN: 300,
  USER: 200,
  VIEWER: 100,
} as const satisfies Record<Role, number>;

/** The lowest Role each App lets in, beside the User's Allowed apps. */
export const APP_MIN_ROLE = {
  BACK_OFFICE: Role.ADMIN,
  LAURA: Role.VIEWER,
} as const satisfies Record<App, Role>;
