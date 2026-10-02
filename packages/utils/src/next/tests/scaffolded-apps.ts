import { existsSync, readdirSync, readFileSync } from "node:fs";

export const REPO = new URL("../../../../../", import.meta.url);
export const APPS = new URL("apps/", REPO);

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
