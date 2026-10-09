// @module-tag unit

import { readFileSync } from "node:fs";
import { z } from "zod";
import { parseJsonWith } from "../../../shared/utils/json";
import { objectKeys } from "../../../shared/utils/object";
import { APPS, REPO, scaffoldedApps } from "./scaffolded-apps";

// core is a symlinked workspace package: src/features/next/* resolves React
// Query, next-intl, next-themes and nuqs from core's own devDependencies, not
// from the App's. Two versions would mean two React contexts ("No QueryClient
// set"), so every App on the scaffolding declares each peer at core's exact range.
const manifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
  peerDependencies: z.record(z.string(), z.string()).default({}),
});

const manifest = (dir: URL) =>
  parseJsonWith(
    readFileSync(new URL("package.json", dir), "utf8"),
    manifestSchema
  );

const core = manifest(new URL("packages/core/", REPO));

const scaffolded = scaffoldedApps();

const cases = scaffolded.flatMap((app) =>
  objectKeys(core.peerDependencies).map((peer) => [app, peer] as const)
);

describe("App scaffolding peers", () => {
  it("finds at least one App on the scaffolding", () => {
    expect(scaffolded.length).toBeGreaterThan(0);
  });

  it.each(cases)("%s declares %s at core's range", (app, peer) => {
    const { dependencies, devDependencies } = manifest(
      new URL(`${app}/`, APPS)
    );
    expect(dependencies[peer] ?? devDependencies[peer]).toBe(
      core.devDependencies[peer]
    );
  });
});
