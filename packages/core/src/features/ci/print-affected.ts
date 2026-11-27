import { REPO } from "@allonfire/config/local/repo";
import { stringifyJson } from "../../shared/utils/json";
import { affectedSince } from "./turbo-affected";

// CI runs it as `pnpm -s ci:affected <base>` from the repo root; it prints
// `apps=` and `deploy=` lines for `$GITHUB_OUTPUT`. What counts as affected:
// `affectedSince` (`turbo-affected.ts`).
const [base] = process.argv.slice(2);

const { apps, deploy } = affectedSince(REPO.ROOT, base ?? "");
process.stdout.write(
  `apps=${stringifyJson(apps)}\ndeploy=${stringifyJson(deploy)}\n`
);
