import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { projectFolderFromName } from "./paths";

export function resolveProjectFolder(
  arg: string,
  workDir: string,
  cwd: string = process.cwd()
): string {
  if (arg.length === 0) {
    if (existsSync(join(cwd, "metadata.json"))) {
      return cwd;
    }
    const cwdRawFolder = join(cwd, "raw");
    if (existsSync(join(cwdRawFolder, "metadata.json"))) {
      return cwdRawFolder;
    }
    throw new Error(
      "No project arg and cwd is not a project folder (missing metadata.json)."
    );
  }

  if (isAbsolute(arg)) {
    if (!existsSync(arg)) {
      throw new Error(`Could not resolve project: ${arg} does not exist.`);
    }
    const rawFolder = join(arg, "raw");
    if (existsSync(rawFolder) && statSync(rawFolder).isDirectory()) {
      return rawFolder;
    }
    return arg;
  }

  const candidate = projectFolderFromName(workDir, arg);
  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    return candidate;
  }

  throw new Error(`Could not resolve project: ${arg}`);
}
