import { z } from "zod";
import { parseJsonWith } from "../../shared/utils/json";

/**
 * An App is a workspace package under `apps/` (the API included), named by
 * its folder; pnpm-workspace.yaml leaves paused Laura out, so Turbo never
 * lists it.
 */
const APPS_DIR = "apps/";

/** A Deploy unit (CONTEXT.md): an App, or the database migration. */
const DB_MIGRATE = "db-migrate";
const DATABASE_PACKAGE = "@allonfire/database";

export type Affected = { apps: string[]; deploy: string[] };

/**
 * Files every image is built from that no Turbo task reads, so Turbo lists
 * no package for them. Turbo's own global files (root `package.json`,
 * `turbo.json`, the lockfile) and Markdown (excluded from every task's
 * inputs) need nothing here.
 */
const IMAGE_FILES = [/^docker\//, /^\.dockerignore$/, /^pnpm-workspace\.yaml$/];

const packagesSchema = z.array(
  z.object({ name: z.string(), path: z.string() })
);

/** `turbo query affected --packages` output. */
const turboQuerySchema = z.object({
  data: z.object({ affectedPackages: z.object({ items: packagesSchema }) }),
});

/** `turbo ls --output=json` output. */
const turboLsSchema = z.object({
  packages: z.object({ items: packagesSchema }),
});

/** The Apps and Deploy units of these packages, the migration first. */
const unitsOf = (packages: z.infer<typeof packagesSchema>): Affected => {
  const apps = packages.flatMap(({ path }) =>
    path.startsWith(APPS_DIR) ? [path.slice(APPS_DIR.length)] : []
  );
  const migrate = packages.some(({ name }) => name === DATABASE_PACKAGE)
    ? [DB_MIGRATE]
    : [];
  return { apps, deploy: [...migrate, ...apps] };
};

/** Every App and every Deploy unit, from `turbo ls` of the whole workspace. */
export const everything = (turboLsJson: string): Affected => {
  const { apps } = unitsOf(
    parseJsonWith(turboLsJson, turboLsSchema).packages.items
  );
  return { apps, deploy: [DB_MIGRATE, ...apps] };
};

/**
 * Turbo's affected packages, read as the Apps to test end to end and the
 * Deploy units to ship, the migration first, as the compose file runs it
 * before the Apps. A changed image file reaches every unit (`turboLsJson`
 * lists them all).
 */
export const affectedFrom = (
  turboQueryJson: string,
  turboLsJson: string,
  changedFiles: readonly string[]
): Affected =>
  changedFiles.some((file) => IMAGE_FILES.some((pattern) => pattern.test(file)))
    ? everything(turboLsJson)
    : unitsOf(
        parseJsonWith(turboQueryJson, turboQuerySchema).data.affectedPackages
          .items
      );
