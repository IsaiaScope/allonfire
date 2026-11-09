// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "../repo";

const CI = readFileSync(resolve(REPO.ROOT, ".github/workflows/ci.yml"), "utf8");
/** A job's key, two spaces in, alone on its line. */
const JOB_KEY = /^ {2}([a-z0-9-]+):$/gm;
const NEXT_JOB = /\n {2}[a-z0-9-]+:\n/;
/** A tool a Stage runs, called by a CI step itself. */
const BY_HAND =
  /run: .*\b(knip|jscpd|shellcheck|actionlint|turbo run|docker compose)\b/;

const jobsBlock = CI.split("\njobs:\n")[1] ?? "";
const job = (name: string) => {
  const [, rest = ""] = jobsBlock.split(`\n  ${name}:\n`);
  return rest.split(NEXT_JOB)[0] ?? "";
};

describe("CI", () => {
  it("runs on a PR to dev only: test and prod take a commit dev already passed", () => {
    expect(CI).toContain("pull_request:\n    branches: [dev]\n");
  });

  it("runs one job per Stage, plus what is affected", () => {
    expect(
      [...`\n${jobsBlock}`.matchAll(JOB_KEY)].map(([, name]) => name)
    ).toEqual(["affected", "static", "test", "e2e", "build"]);
  });

  it.each(["static", "test", "e2e", "build"])(
    "runs the %s Stage by its command, named for it",
    (stage) => {
      const block = job(stage);
      expect(block).toContain(`    name: ${stage}\n`);
      // `pnpm test` is pnpm's own command and refuses `--affected`; `pnpm run` hands the flags on.
      expect(block).toContain(`run: pnpm run ${stage} --affected --keep-going`);
      expect(block).toContain("uses: ./.github/actions/prepare");
      expect(block).not.toMatch(BY_HAND);
    }
  );

  it("keeps the jobs parallel, but builds only code that passed static", () => {
    expect(job("build")).toContain("needs: static");
    expect(job("e2e")).toContain("needs: affected");
    expect(job("static")).not.toContain("needs:");
    expect(job("test")).not.toContain("needs:");
  });

  it("says in the run's summary what runs, and why e2e would not", () => {
    expect(job("affected")).toContain("GITHUB_STEP_SUMMARY");
    expect(job("affected")).toContain("no App affected");
  });
});
