import type { Role } from "@allonfire/database/enums";

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
