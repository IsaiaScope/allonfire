// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "../../../..");
const read = (path: string) => readFileSync(resolve(REPO, path), "utf8");

// ponytail: exact-text checks, no TypeScript or YAML parser, like the other
// local/ tests. A schema key is a `KEY: ` property line in an env file.
const EXAMPLE_KEY = /^(?:# )?([A-Z][A-Z0-9_]*)=/gm;
const SCHEMA_KEY = /^\s+([A-Z][A-Z0-9_]*): /gm;
const COMPOSE_KEY = /\$\{([A-Z][A-Z0-9_]*)/g;
const BLOCK = /\n\s*\n/;
/** Set by the runtime, never by a file. */
const TOOL_SET = new Set(["NODE_ENV"]);

const keys = (text: string, pattern: RegExp) =>
  [...text.matchAll(pattern)].map(([, key]) => key);
const sorted = (list: string[]) => [...new Set(list)].sort();
const fromSchemas = (...paths: string[]) =>
  sorted(paths.flatMap((path) => keys(read(path), SCHEMA_KEY))).filter(
    (key) => !TOOL_SET.has(key)
  );

// Laura keeps its old names until it is rebuilt (package-layout.md).
const OWNERS = [
  [
    "apps/api/.env.example",
    () =>
      fromSchemas(
        "apps/api/src/environment/environment.ts",
        "packages/auth/src/environment/environment.ts",
        "packages/database/src/environment/environment.ts",
        "packages/storage/src/environment/environment.ts"
      ),
  ],
  [
    "apps/back-office/.env.example",
    () =>
      fromSchemas(
        "apps/back-office/src/environment/environment.ts",
        "packages/auth/src/environment/next-environment.ts"
      ),
  ],
  [
    "packages/database/.env.example",
    () =>
      fromSchemas(
        "packages/database/src/environment/environment.ts",
        "packages/database/src/environment/seed-environment.ts"
      ),
  ],
  [
    "packages/storage/.env.example",
    () => fromSchemas("packages/storage/src/environment/environment.ts"),
  ],
  [
    "docker/.env.example",
    () =>
      sorted([
        ...keys(read("docker/docker-compose.dev.yml"), COMPOSE_KEY),
        ...keys(read("docker/docker-compose.prod.yml"), COMPOSE_KEY),
        "DOKPLOY_API_KEY",
        "DOKPLOY_COMPOSE_ID",
        "DOKPLOY_URL",
      ]),
  ],
] as const;

describe.each(OWNERS)("%s", (path, expected) => {
  const example = read(path);

  it("names every key its reader takes, and no other", () => {
    expect(sorted(keys(example, EXAMPLE_KEY))).toEqual(expected());
  });

  it("lists each block's keys in alphabetical order", () => {
    for (const block of example.split(BLOCK)) {
      const names = keys(block, EXAMPLE_KEY);
      expect(names).toEqual([...names].sort());
    }
  });
});
