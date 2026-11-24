// @module-tag unit

import { existsSync, globSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCAL } from "../addresses";
import { REPO } from "../repo";

const read = (path: string) => readFileSync(resolve(REPO.ROOT, path), "utf8");

// ponytail: line checks over the text, no JSON or YAML parser: config imports
// nothing, core's helpers included.
const LAURA_PACKAGE = read("apps/laura/package.json");
const BACK_OFFICE_PACKAGE = read("apps/back-office/package.json");

/** Dependencies Laura's old code needed and the rebuilt App must not declare. */
const BANNED = [
  "framer-motion",
  "lucide-react",
  "react-hook-form",
  "sonner",
  "heic2any",
  "better-auth",
  "@better-auth/prisma-adapter",
  "@next/bundle-analyzer",
  "sharp",
  "tsx",
] as const;
/** What `src/` holds: the layout's three folders, plus the Next `app` folder. */
const SRC_FOLDERS = ["app", "environment", "features", "shared"] as const;
/** The root files Next reads from the App itself. */
const SRC_ROOT_FILES = [
  "instrumentation-client.ts",
  "instrumentation.ts",
  "proxy.test.ts",
  "proxy.ts",
] as const;
/** Folders and files the old Laura had, none of which survives. */
const GONE = [
  "scripts",
  "messages",
  "src/lib",
  "src/components",
  "src/env.ts",
  "src/i18n",
] as const;
/** A workspace line that leaves Laura out (`- "!apps/laura"`). */
const LAURA_PAUSED = /^\s*-\s*"!apps\/laura"/m;
/** A `"name": "range",` line of a dependency list. */
const DEPENDENCY = /^\s{4}"([^"]+)": "([^"]+)",?$/gm;
const WORKSPACE_RANGE = "workspace:*";
const SIDECAR = /(?:^|\/)\._/;
/** Where a Next App would reach the database from: Prisma or a service. */
const DATABASE_ACCESS = /@allonfire\/database\/features\/prisma|\.service"/;
const TEST_FILE = /(?:\/tests\/|\.test\.tsx?$|\.test-d\.ts$)/;

const notSidecar = (name: string) => !SIDECAR.test(name);

/** The `"name": "range"` pairs of the package's two dependency lists. */
const dependencies = (packageText: string) =>
  ["dependencies", "devDependencies"].flatMap((list) => {
    const start = packageText.indexOf(`"${list}": {`);
    if (start === -1) {
      return [];
    }
    const end = packageText.indexOf("\n  }", start);
    return [...packageText.slice(start, end).matchAll(DEPENDENCY)].map(
      ([, name = "", range = ""]) => [name, range] as const
    );
  });

/** Every App that is a Next App: the API (Hono) reaches the database on purpose. */
const NEXT_APPS = readdirSync(REPO.APPS)
  .filter(notSidecar)
  .filter((app) =>
    dependencies(read(`apps/${app}/package.json`)).some(
      ([name]) => name === "next"
    )
  );

const sourcesOf = (app: string) =>
  globSync("src/**/*.{ts,tsx}", { cwd: resolve(REPO.APPS, app) }).filter(
    (path) => notSidecar(path) && !TEST_FILE.test(`/${path}`)
  );

it("is a workspace package again", () => {
  expect(read("pnpm-workspace.yaml")).not.toMatch(LAURA_PAUSED);
  expect(LAURA_PACKAGE).toContain('"name": "@allonfire/laura"');
});

it.each(BANNED)("declares no %s", (name) => {
  expect(LAURA_PACKAGE).not.toContain(`"${name}"`);
});

it("runs on its Local port, dev and start", () => {
  expect(LAURA_PACKAGE).toContain(`next dev --port ${LOCAL.PORT.LAURA}`);
  expect(LAURA_PACKAGE).toContain(`next start --port ${LOCAL.PORT.LAURA}`);
});

it("builds the service worker after next build", () => {
  expect(LAURA_PACKAGE).toContain("pwa:build");
});

it("declares every shared dependency at the Back Office's range", () => {
  const backOffice = new Map(dependencies(BACK_OFFICE_PACKAGE));
  const own = dependencies(LAURA_PACKAGE).filter(
    ([, range]) => range !== WORKSPACE_RANGE
  );
  expect(own.length).toBeGreaterThan(0);
  expect(own.filter(([name, range]) => backOffice.get(name) !== range)).toEqual(
    []
  );
});

// Red until the rest of `src/` exists: Tasks 3, 4, 8 and 10 of the Laura shell
// plan file its folders and root files, and Task 10 closes it.
it("keeps src to environment, shared, features and app, plus its four root files", () => {
  const src = resolve(REPO.APPS, "laura/src");
  const found = existsSync(src) ? readdirSync(src).filter(notSidecar) : [];
  expect(found.sort()).toEqual([...SRC_FOLDERS, ...SRC_ROOT_FILES].sort());
});

it("keeps no old top-level folder, script, message file or env name", () => {
  expect(
    GONE.filter((gone) => existsSync(resolve(REPO.APPS, "laura", gone)))
  ).toEqual([]);
});

it.each(NEXT_APPS)("%s imports no Prisma client and no service", (app) => {
  expect(
    sourcesOf(app).filter((path) =>
      DATABASE_ACCESS.test(read(`apps/${app}/${path}`))
    )
  ).toEqual([]);
});
