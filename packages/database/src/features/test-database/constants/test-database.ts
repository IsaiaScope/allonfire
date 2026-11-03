import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { UNIT } from "@allonfire/core/shared/constants/units";

/** Every Test database's name starts with it, the template's too. */
const PREFIX = "allonfire_test_";

/** The Test databases' own values: their names, their template and their Docker runs. */
export const TEST_DATABASE = {
  /** Liquibase runs in Docker; the first build pulls the image. */
  DOCKER_TIMEOUT_MS: 5 * UNIT.MS_PER_MINUTE,
  /** The database package's folder: Liquibase runs there, the template's sources sit under it. */
  PACKAGE_ROOT: resolve(REPO.PACKAGES, "database"),
  PREFIX,
  TEMPLATE: {
    /** The template's name carries this much of the fingerprint. */
    FINGERPRINT_LENGTH: 6,
    /** Any constant; every run asks Postgres for this one lock. */
    LOCK: 4_180_017,
    PREFIX: `${PREFIX}template_`,
    /**
     * What the template is built from: a change to any file builds a new one.
     * The db-migrate image (`liquibase/`) runs the changelog, so it counts too.
     */
    SOURCES: ["changelog", "liquibase", "src/features/seed"],
  },
} as const;
