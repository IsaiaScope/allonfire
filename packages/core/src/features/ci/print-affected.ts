import { execFileSync } from "node:child_process";
import { stringifyJson } from "../../shared/utils/json";
import { affectedFrom, everything } from "./affected";

// CI's `changes` step; the contract is in the package README.
const [base] = process.argv.slice(2);

const run = (command: string, args: string[]) =>
  execFileSync(command, args, {
    // The repo root: run from a package's folder, Turbo scopes to it.
    cwd: new URL("../../../../..", import.meta.url),
    encoding: "utf8",
  });

const resolves = (ref: string) => {
  try {
    run("git", ["rev-parse", "--quiet", "--verify", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
};

const all = run("pnpm", ["-s", "turbo", "ls", "--output=json"]);
const { apps, deploy } =
  base && resolves(base)
    ? affectedFrom(
        run("pnpm", [
          "-s",
          "turbo",
          "query",
          "affected",
          "--packages",
          `--base=${base}`,
          "--head=HEAD",
        ]),
        all,
        run("git", ["diff", "--name-only", `${base}...HEAD`])
          .split("\n")
          .filter(Boolean)
      )
    : everything(all);
process.stdout.write(
  `apps=${stringifyJson(apps)}\ndeploy=${stringifyJson(deploy)}\n`
);
