/** A Deploy unit (`CONTEXT.md`): an App, or the database migration. */
export const DEPLOY_UNIT = {
  /** The name the migration deploys under. */
  MIGRATE: "db-migrate",
  PATH: {
    /** Every workspace package under it is an App (the API included). */
    APPS: "apps/",
    /** The one Deploy unit outside `apps/`: the database migration. */
    MIGRATION: "packages/database",
  },
} as const;
