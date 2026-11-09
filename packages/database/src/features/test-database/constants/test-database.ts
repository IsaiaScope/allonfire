import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { TEST_RUN } from "@allonfire/config/tests/run/test-run";
import { UNIT } from "@allonfire/core/shared/constants/units";

/** The Test databases' own values: their names, their template and their Docker runs. */
export const TEST_DATABASE = {
  /** Liquibase runs in Docker; the first build pulls the image. */
  DOCKER_TIMEOUT_MS: 5 * UNIT.MS_PER_MINUTE,
  /** The database package's folder: Liquibase runs there, the template's sources sit under it. */
  PACKAGE_ROOT: resolve(REPO.PACKAGES, "database"),
  TEMPLATE: {
    /** The template's name carries this much of the fingerprint: a Test run's suffix, so it parses. */
    FINGERPRINT_LENGTH: TEST_RUN.SUFFIX_LENGTH,
    /** Any constant; every run asks Postgres for this one lock. */
    LOCK: 4_180_017,
    PREFIX: `${TEST_RUN.PREFIX}template_`,
    /**
     * What the template is built from: a change to any file builds a new one.
     * The db-migrate image (`liquibase/`) runs the changelog, so it counts too.
     */
    SOURCES: ["changelog", "liquibase", "src/features/seed"],
  },
} as const;
