import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { App, Role } from "../../../../../generated/prisma/enums";
import type { AppSettingsTable } from "./app-settings";

/**
 * How far each Role reaches; a higher rank holds every right of a lower one.
 * Steps of 100 leave room to slot a new Role between two without renumbering.
 * `satisfies` fails the build when the schema gains a Role with no rank here.
 */
const ROLE_RANK = {
  ADMIN: 300,
  USER: 200,
  VIEWER: 100,
} as const satisfies Record<Role, number>;

/**
 * Every App's settings, read by the API (which enforces them) and every App.
 * A new App fails to compile until its row is here.
 */
const APP_SETTINGS = {
  [App.LAURA]: {
    indexing: METADATA.INDEXING.UNINDEXED,
    minRole: Role.VIEWER,
    registration: null,
  },
  [App.BACK_OFFICE]: {
    indexing: METADATA.INDEXING.UNINDEXED,
    minRole: Role.ADMIN,
    registration: null,
  },
} as const satisfies AppSettingsTable;

/** Who is allowed where: each App's own settings, and how far each Role reaches. */
export const ACCESS = { APP_SETTINGS, ROLE_RANK } as const;
