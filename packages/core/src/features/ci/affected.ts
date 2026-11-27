import { z } from "zod";
import { parseJsonWith } from "../../shared/utils/json";
import { DEPLOY_UNIT } from "./constants/deploy-unit";

const isApp = (folder: string) => folder.startsWith(DEPLOY_UNIT.PATH.APPS);

/** Whether the package in this folder is a Deploy unit, for a deploy and a Release alike. */
export const isDeployUnit = (folder: string): boolean =>
  isApp(folder) || folder === DEPLOY_UNIT.PATH.MIGRATION;

export type Affected = { apps: string[]; deploy: string[] };

/**
 * Files every image is built from that no Turbo task reads, so Turbo lists
 * no package for them. `turbo.json` and the lockfile are Turbo's to read,
 * and Markdown is excluded from every task's inputs. The root `package.json`
 * stays out too: every Release edits it, and the one field every image
 * depends on, `packageManager`, `affectedSince` compares itself.
 */
const IMAGE_FILES = [
  /^docker\//,
  /^\.dockerignore$/,
  /^\.npmrc$/,
  /^pnpm-workspace\.yaml$/,
];

/** Whether any of these files reaches every image (`IMAGE_FILES`). */
const touchesImage = (files: readonly string[]): boolean =>
  files.some((file) => IMAGE_FILES.some((pattern) => pattern.test(file)));

const packagesSchema = z.array(
  z.object({ name: z.string(), path: z.string() })
);

/** `turbo query affected --packages` output. */
const turboQuerySchema = z.object({
  data: z.object({ affectedPackages: z.object({ items: packagesSchema }) }),
});

/** `turbo query` output of every package (`PACKAGES_QUERY` in turbo-affected). */
const turboPackagesSchema = z.object({
  data: z.object({ packages: z.object({ items: packagesSchema }) }),
});

/** The Apps (each named by its folder) and Deploy units of these packages, the migration first. */
const unitsOf = (packages: z.infer<typeof packagesSchema>): Affected => {
  const apps = packages.flatMap(({ path }) =>
    isApp(path) ? [path.slice(DEPLOY_UNIT.PATH.APPS.length)] : []
  );
  const migrate = packages.some(
    ({ path }) => path === DEPLOY_UNIT.PATH.MIGRATION
  )
    ? [DEPLOY_UNIT.MIGRATE]
    : [];
  return { apps, deploy: [...migrate, ...apps] };
};

/** Every App and every Deploy unit, from `turbo query` of every package. */
export const everything = (turboPackagesJson: string): Affected => {
  const { apps } = unitsOf(
    parseJsonWith(turboPackagesJson, turboPackagesSchema).data.packages.items
  );
  return { apps, deploy: [DEPLOY_UNIT.MIGRATE, ...apps] };
};

/** The folder of every Deploy unit in it, from the repo root. */
export const unitFolders = ({ apps, deploy }: Affected): string[] => [
  ...(deploy.includes(DEPLOY_UNIT.MIGRATE) ? [DEPLOY_UNIT.PATH.MIGRATION] : []),
  ...apps.map((app) => `${DEPLOY_UNIT.PATH.APPS}${app}`),
];

/**
 * Turbo's affected packages, read as the Apps to test end to end and the
 * Deploy units to ship, the migration first, as the compose file runs it
 * before the Apps. A changed image file reaches every unit (`turboPackagesJson`
 * lists them all).
 */
export const affectedFrom = (
  turboQueryJson: string,
  turboPackagesJson: string,
  changedFiles: readonly string[]
): Affected =>
  touchesImage(changedFiles)
    ? everything(turboPackagesJson)
    : unitsOf(
        parseJsonWith(turboQueryJson, turboQuerySchema).data.affectedPackages
          .items
      );
