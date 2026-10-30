import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { I18N } from "../../i18n/constants/locales";
import { buildServiceWorker } from "./build-service-worker";

/**
 * `pnpm --filter @allonfire/core pwa:build --app <path> [--languages en,it]`,
 * run by an App's `build` after `next build`: writes its `public/sw.js`.
 * The languages default to the Host's, the default one first.
 */
const { values } = parseArgs({
  options: {
    app: { type: "string" },
    languages: { type: "string" },
  },
});
if (!values.app) {
  throw new Error("pwa:build needs --app <the App's folder>");
}
const appDir = resolve(values.app);
const buildId = (await readFile(join(appDir, ".next/BUILD_ID"), "utf8")).trim();
// The default language comes first: BASE_LANGUAGES starts with it.
const languages = values.languages?.split(",") ?? [...I18N.BASE_LANGUAGES];
await buildServiceWorker({ appDir, buildId, languages });
