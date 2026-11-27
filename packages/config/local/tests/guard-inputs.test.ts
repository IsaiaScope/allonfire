// @module-tag unit

import { execFileSync } from "node:child_process";
import { REPO } from "../repo";

/** Files outside this package that a test in `local/tests` reads, as Turbo names them from here. */
const READ_BY_A_GUARD = [
  "../../.jscpd.json",
  "../../.oxlintrc.json",
  "../../AGENTS.md",
  "../../CONTEXT.md",
  "../../README.md",
  "../../apps/laura/README.md",
  "../../biome.jsonc",
  "../../.claude/skills/aof-design/SKILL.md",
  "../../docs/guides/deployment.md",
  "../../docs/guides/laura.md",
  "../../docs/superpowers/specs/2026-11-17-laura-parity-audit.md",
  "../../tsconfig.json",
  "../ui/README.md",
] as const;

/** The dry run hashes every App and package: half a second alone, over 7s beside every package's tests. */
const DRY_RUN_TIMEOUT_MS = 60_000;

// A guard whose file is not an input is replayed from the cache, and CI's
// `--affected` never picks it, when only that file changes.
// ponytail: config cannot import core's parseJson (core depends on config), so
// the dry run is read as text; `--only` leaves this one task's inputs in it.
it("re-runs these tests when a file they read changes", {
  timeout: DRY_RUN_TIMEOUT_MS,
}, () => {
  const output = execFileSync(
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      "test",
      "--only",
      "--filter=@allonfire/config",
      "--dry=json",
    ],
    { cwd: REPO.ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );

  expect(
    READ_BY_A_GUARD.filter((file) => !output.includes(`"${file}": "`))
  ).toEqual([]);
});
