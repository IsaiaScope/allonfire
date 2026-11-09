/** The four Stages (CONTEXT.md): every check a change must pass sits in one. */
export const STAGE_NAMES = ["static", "test", "e2e", "build"] as const;
export type StageName = (typeof STAGE_NAMES)[number];

/** One check inside a Stage: a root script, runnable alone by its name. */
export type Tool = {
  /** The root script; also what the report calls it. */
  name: string;
  /** What runs, from the repo root. */
  command: string;
  /** Why the check exists: what it catches. */
  why: string;
  /** A Turbo run: CI gives it `--affected --summarize`. */
  turbo?: true;
  /** A binary a Mac may lack; without it the tool is skipped, never failed. */
  requires?: string;
};

const script = (
  name: string,
  why: string,
  extra: Pick<Tool, "requires" | "turbo"> = {}
): Tool => ({ command: `pnpm -s run ${name}`, name, why, ...extra });

const TEST_SERVICES = script(
  "test:services",
  "The Test services (database, Redis, storage, the image server, the cdn), waited for: integration, browser and e2e tests run on them, never on the rest of Local."
);

/** Every Stage's tools, in the order they run. The hook, `pnpm <stage>` and CI read this list, so none of them can run a different set. */
export const STAGE = {
  build: [
    script(
      "build:apps",
      "Every affected App's production build, as the Docker image builds it.",
      { turbo: true }
    ),
  ],
  e2e: [
    TEST_SERVICES,
    script(
      "e2e:browser",
      "One component in real Chromium and WebKit, MSW answering the API (testing.md).",
      { turbo: true }
    ),
    script(
      "e2e:run",
      "The App's production build plus the API on their own ports, each spec in four projects (testing.md).",
      { turbo: true }
    ),
  ],
  static: [
    script(
      "static:lint",
      "Biome over the repo, warnings included, then oxlint's typed rule: a deprecated API fails, members included."
    ),
    script("static:types", "Every package's and App's TypeScript.", {
      turbo: true,
    }),
    script(
      "static:knip",
      "Unused files, exports, dependencies and binaries, tests included, over the whole repo."
    ),
    script(
      "static:knip-production",
      "Code only tests use: production entries only."
    ),
    script(
      "static:dupes",
      "Copied code (jscpd), Apps, packages, CI and Docker."
    ),
    script(
      "static:i18n",
      "Every translation's placeholders match its source language.",
      { turbo: true }
    ),
    script(
      "static:tailwind",
      "Every class in the spelling the editor's suggestCanonicalClasses asks for.",
      { turbo: true }
    ),
    script(
      "static:design",
      "Each App's copy of its Design matches packages/design (design:sync --check)."
    ),
    script(
      "static:shell",
      "ShellCheck on the Liquibase and database scripts.",
      {
        requires: "shellcheck",
      }
    ),
    script(
      "static:migrate-image",
      "The db-migrate image's build checks; its Dockerfile turns every warning into an error.",
      { requires: "docker" }
    ),
    script("static:workflows", "actionlint on the GitHub workflows.", {
      requires: "docker",
    }),
  ],
  test: [
    TEST_SERVICES,
    script(
      "test:run",
      "Unit and integration tests in every package, each run on its own Test database and bucket.",
      { turbo: true }
    ),
    script(
      "test:drift",
      "The changelog builds the schema Prisma describes, on the Test template."
    ),
  ],
} as const satisfies Record<StageName, readonly Tool[]>;

/** What `pnpm check` and the pre-commit hook run, in order: every Stage but build, which e2e already does for the App it tests. */
export const CHECK = [
  "static",
  "test",
  "e2e",
] as const satisfies readonly StageName[];
