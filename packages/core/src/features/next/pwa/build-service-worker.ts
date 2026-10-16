import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type GenerateSWOptions, generateSW } from "workbox-build";
import { UNIT } from "../../../shared/constants/units";
import { stringifyJson } from "../../../shared/utils/json";
import { PWA } from "./constants/pwa";
import { offlineFallback } from "./offline-fallback";

/** What a build needs: the App's folder, Next's build id, its languages (the default first). */
export type ServiceWorkerBuild = {
  appDir: string;
  buildId: string;
  languages: readonly string[];
};

/** Next's hashed files: what the worker precaches. */
const STATIC_DIR = ".next/static";
const STATIC_URL = "/_next/static/";
/** A file bigger than this is left to the network (a source map, a huge chunk). */
const LARGEST_PRECACHED = 5 * UNIT.BYTES_PER_MIB;

/**
 * Workbox's options for an App: precache Next's static files and each
 * language's Offline page; page loads go to the network, the Offline page
 * answering when it fails; nothing else is routed. A new build's worker
 * takes over on the next visit, never mid-session.
 */
const serviceWorkerOptions = ({
  appDir,
  buildId,
  languages,
}: ServiceWorkerBuild): GenerateSWOptions => ({
  additionalManifestEntries: languages.map((language) => ({
    revision: buildId,
    url: `/${language}${PWA.PATH.OFFLINE}`,
  })),
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  globDirectory: join(appDir, STATIC_DIR),
  // A TTF under static/ is a generated image's font (Satori, on the server):
  // no page loads one, so no visitor downloads it.
  globIgnores: ["**/._*", "**/*.ttf"],
  globPatterns: ["**/*"],
  inlineWorkboxRuntime: true,
  maximumFileSizeToCacheInBytes: LARGEST_PRECACHED,
  modifyURLPrefix: { "": STATIC_URL },
  // Starts a page load's request while a sleeping worker wakes up.
  navigationPreload: true,
  runtimeCaching: [
    {
      handler: "NetworkOnly",
      options: { plugins: [{ handlerDidError: offlineFallback }] },
      urlPattern: ({ request }) => request.mode === "navigate",
    },
  ],
  skipWaiting: false,
  sourcemap: false,
  swDest: join(appDir, PWA.OUTPUT),
});

/** Writes the App's `public/sw.js`, opened with the settings its fallback reads. */
export const buildServiceWorker = async (build: ServiceWorkerBuild) => {
  const options = serviceWorkerOptions(build);
  await generateSW(options);
  const [defaultLanguage = ""] = build.languages;
  const settings = stringifyJson({
    defaultLanguage,
    offline: PWA.PATH.OFFLINE,
  });
  const source = await readFile(options.swDest, "utf8");
  await writeFile(options.swDest, `self.AOF_PWA = ${settings};\n${source}`);
};
