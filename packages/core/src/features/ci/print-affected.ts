import { REPO } from "@allonfire/config/local/repo";
import { stringifyJson } from "../../shared/utils/json";
import { affectedSince } from "./turbo-affected";

// CI's `changes` step; the contract is in the package README.
const [base] = process.argv.slice(2);

const { apps, deploy } = affectedSince(REPO.ROOT, base ?? "");
process.stdout.write(
  `apps=${stringifyJson(apps)}\ndeploy=${stringifyJson(deploy)}\n`
);
