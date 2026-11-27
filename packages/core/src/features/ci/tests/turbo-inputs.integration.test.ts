// @module-tag integration
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { z } from "zod";
import { PATTERN } from "../../../shared/constants/patterns";
import { parseJsonWith } from "../../../shared/utils/json";
import { objectEntries } from "../../../shared/utils/object";
import { isDeployUnit } from "../affected";
import { readWorkspace } from "../release-workspace";

const TURBO = {
  CONFIG: "turbo.json",
  CORE_CONFIG: "packages/core/turbo.json",
  /** What the CI tests read outside core. */
  CORE_READS: [
    "$TURBO_ROOT$/apps/*/turbo.json",
    "$TURBO_ROOT$/packages/*/turbo.json",
    "$TURBO_ROOT$/pnpm-lock.yaml",
    "$TURBO_ROOT$/turbo.json",
  ],
  /** How a task key names one package's task: `web#build`. */
  PACKAGE_TASK: "#",
  /** An input that reaches into a workspace folder from any package. */
  WORKSPACE_INPUTS: ["$TURBO_ROOT$/apps/", "$TURBO_ROOT$/packages/"],
} as const;

const turboSchema = z.object({
  tasks: z.record(
    z.string(),
    z.object({ inputs: z.array(z.string()).optional() })
  ),
});

/** An input that reaches outside the package at all. */
const OUTSIDE = "$TURBO_ROOT$/";

const tasksOf = (path: string) =>
  parseJsonWith(
    // Package configs carry whole-line comments.
    readFileSync(path, "utf8").replace(PATTERN.JSONC_LINE_COMMENT, ""),
    turboSchema
  ).tasks;

const readsTheWorkspace = (input: string) =>
  TURBO.WORKSPACE_INPUTS.some((prefix) => input.startsWith(prefix));

describe("the root Turbo tasks", () => {
  // A task every package gets, reading another package's folder, makes Turbo
  // mark them all affected: a ui change then deployed the database migration.
  it("read another package's folder only when they name their package", () => {
    const { tasks } = parseJsonWith(
      readFileSync(join(REPO.ROOT, TURBO.CONFIG), "utf8"),
      turboSchema
    );

    expect(
      objectEntries(tasks)
        .filter(
          ([name, task]) =>
            !name.includes(TURBO.PACKAGE_TASK) &&
            (task.inputs ?? []).some(readsTheWorkspace)
        )
        .map(([name]) => name)
    ).toEqual([]);
  });
});

describe("core's tests", () => {
  // Turbo replays a cached pass until an input changes.
  it("re-run when a file the CI tests read changes", () => {
    const { test } = tasksOf(join(REPO.ROOT, TURBO.CORE_CONFIG));

    expect(test?.inputs).toEqual(expect.arrayContaining([...TURBO.CORE_READS]));
  });
});

describe("a Deploy unit's own Turbo tasks", () => {
  // Turbo lists a unit for such an input without listing who depends on it. A
  // Release then bumps its manifest, and that alone redeploys the dependents,
  // under their old numbers.
  it("read nothing outside the unit", () => {
    const configs = readWorkspace(REPO.ROOT)
      .filter(({ path }) => isDeployUnit(path))
      .map(({ path }) => join(path, TURBO.CONFIG))
      .filter((config) => existsSync(join(REPO.ROOT, config)));

    expect(
      configs.filter((config) =>
        objectEntries(tasksOf(join(REPO.ROOT, config))).some(([, task]) =>
          (task.inputs ?? []).some((input) => input.startsWith(OUTSIDE))
        )
      )
    ).toEqual([]);
  });
});
