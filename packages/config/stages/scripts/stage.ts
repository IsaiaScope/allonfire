import { runStage } from "../run";
import { CHECK, STAGE_NAMES, type StageName } from "../stages";

const isStage = (name: string): name is StageName =>
  STAGE_NAMES.some((stage) => stage === name);

const USAGE = `usage: stage.ts <${[...STAGE_NAMES, "check"].join("|")}> [--affected] [--keep-going]\n`;

/**
 * `pnpm <stage>` and `pnpm check`: runs each Stage in turn, stopping at the
 * first that fails; exit 1 when a tool failed, 2 on a wrong argument. CI adds
 * `--affected --keep-going`, and GitHub's env gives the summary file and the
 * run's page.
 */
const main = (args: readonly string[]): Promise<number> | number => {
  const [target = "", ...flags] = args;
  const stages = target === "check" ? CHECK : [target].filter(isStage);
  if (stages.length === 0) {
    process.stderr.write(USAGE);
    return 2;
  }
  const {
    GITHUB_REPOSITORY,
    GITHUB_RUN_ID,
    GITHUB_SERVER_URL,
    GITHUB_STEP_SUMMARY,
  } = process.env;
  const options = {
    affected: flags.includes("--affected"),
    keepGoing: flags.includes("--keep-going"),
    ...(GITHUB_STEP_SUMMARY ? { summaryPath: GITHUB_STEP_SUMMARY } : {}),
    ...(GITHUB_RUN_ID
      ? {
          runUrl: `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`,
        }
      : {}),
  };
  const failedAt = async (rest: readonly StageName[]): Promise<number> => {
    const [stage, ...next] = rest;
    if (!stage) {
      return 0;
    }
    const results = await runStage(stage, options);
    return results.some(({ status }) => status === "failed")
      ? 1
      : failedAt(next);
  };
  return failedAt(stages);
};

process.exitCode = await main(process.argv.slice(2));
