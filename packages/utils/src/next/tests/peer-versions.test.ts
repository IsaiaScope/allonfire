// @module-tag unit
import { readFileSync } from "node:fs";
import { z } from "zod";
import { objectKeys } from "../../helpers/object";
import { APPS, REPO, scaffoldedApps } from "./scaffolded-apps";

// utils is a symlinked workspace package: src/next/* resolves React Query,
// next-intl, next-themes and nuqs from utils' own devDependencies, not from the
// App's. Two versions would mean two React contexts ("No QueryClient set"), so
// every App on the scaffolding declares each peer at utils' exact range.
const manifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
  peerDependencies: z.record(z.string(), z.string()).default({}),
});

const manifest = (dir: URL) =>
  manifestSchema.parse(
    JSON.parse(readFileSync(new URL("package.json", dir), "utf8"))
  );

const utils = manifest(new URL("packages/utils/", REPO));

const scaffolded = scaffoldedApps();

const cases = scaffolded.flatMap((app) =>
  objectKeys(utils.peerDependencies).map((peer) => [app, peer] as const)
);

describe("App scaffolding peers", () => {
  it("finds at least one App on the scaffolding", () => {
    expect(scaffolded.length).toBeGreaterThan(0);
  });

  it.each(cases)("%s declares %s at utils' range", (app, peer) => {
    const { dependencies, devDependencies } = manifest(
      new URL(`${app}/`, APPS)
    );
    expect(dependencies[peer] ?? devDependencies[peer]).toBe(
      utils.devDependencies[peer]
    );
  });
});
