import { existsSync, readdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { REPO } from "@allonfire/config/local/repo";

export const APPS = pathToFileURL(`${REPO.APPS}/`);

/** App folders on the scaffolding: their next.config.ts calls it. */
export const scaffoldedApps = () =>
  readdirSync(APPS).filter((name) => {
    const config = new URL(`${name}/next.config.ts`, APPS);
    return (
      !name.startsWith(".") &&
      existsSync(config) &&
      readFileSync(config, "utf8").includes("AOFCreateNextConfig")
    );
  });
