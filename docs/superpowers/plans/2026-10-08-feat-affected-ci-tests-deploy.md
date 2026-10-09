# Affected-only CI, Browser and E2e Tests, Modular Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A PR runs only what it affects, three test layers (unit, browser, e2e) run in CI, and a merge to `prod` deploys only the affected Deploy units as CI-built images.

**Architecture:** Turbo's package graph (`turbo ls --affected`) is the single source of "what changed"; one tested script turns it into the affected Apps and Deploy units, which the e2e job and the deploy workflow read. Vitest gains a browser config (real Chromium, MSW) beside the existing Node one; Playwright's shared preset starts the API plus the App. Production stays one Dokploy compose project, now made of GHCR images with `pull_policy: always`, redeployed by CI.

**Tech Stack:** Turborepo 2.11, Vitest 4.1 (`@vitest/browser-playwright`, `vitest-browser-react`), MSW 2, Playwright Test 1.63, GitHub Actions, GHCR, Dokploy API, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-08-affected-ci-tests-deploy-design.md` (with ADR 0018 and the **Deploy unit** term in `CONTEXT.md`)

## Global Constraints

- Never commit (iso-write); leave every change in the working tree.
- npm dependencies need at least 200k weekly downloads: `@vitest/browser-playwright` 10.3M, `vitest-browser-react` 1.9M, `msw` 26.8M.
- No `as` casts (tests too); no `biome-ignore`.
- Use `objectKeys/objectEntries/objectFromEntries` and `parseJson/parseJsonWith/stringifyJson` from `@allonfire/core`, never the raw std calls.
- Every Vitest test file's first line is `// @module-tag unit` or `// @module-tag integration`; browser tests are `integration`.
- Env vars are prefixed by their owner; tools keep their own names (`CI`, `TURBO_SCM_BASE`).
- Docs, code and workflow comments in plain English; no "may"/"might" for permission.
- Laura is out of scope and leaves the production compose file.
- `dev` and `test` stay CI-only; only a push to `prod` deploys.
- End every task: scoped `pnpm exec biome check --write <files>`, then `pnpm -s turbo run check-types`, `pnpm -s lint`, `pnpm -s turbo run test` repo-wide, all green.

## Review Focus

1. A root-only change (lockfile, `turbo.json`, `biome.jsonc`): every package must count as affected, never none. Pinned by the "root change" case in Task 1.
2. A change only to `docs/` or a `*.md` file: no App is affected, so the e2e job and the deploy skip. Pinned by the "docs only" case in Task 1.
3. A request a browser test did not fake: it must fail the test, not reach the network. Pinned by the "unhandled request" test in Task 4.
4. A signed-out visit to `/` must land on `/sign-in`, not render the home page. Pinned by the updated smoke spec in Task 5.
5. A push to `prod` that affects nothing must not call Dokploy. Pinned by the `if:` guard and its dry check in Task 8.

---

## Phase 1: affected-only CI

### Task 1: The affected script (`@allonfire/ci`)

The script needs core's JSON and object helpers, and `@allonfire/core`
already depends on `@allonfire/config`, so it cannot live in `config`
(a workspace cycle Turbo rejects). It gets its own package, named after its
concept.

**Files:**
- Create: `packages/ci/package.json`, `packages/ci/tsconfig.json`, `packages/ci/vitest.config.ts`, `packages/ci/README.md`
- Create: `packages/ci/src/features/affected/affected.ts`
- Create: `packages/ci/src/features/affected/tests/affected.test.ts`
- Create: `packages/ci/src/index.ts` (the CLI)

**Interfaces:**
- Consumes: the JSON `pnpm turbo ls --affected --output=json` prints: `{ packages: { items: { name: string; path: string }[] } }`.
- Produces: `affectedFrom(json: string): { apps: App[]; deploy: DeployUnit[] }` where `App = "api" | "back-office"` and `DeployUnit = App | "db-migrate"`; CLI `pnpm -s --filter @allonfire/ci exec tsx src/index.ts` reads stdin and prints `apps=<json>` and `deploy=<json>` lines for `$GITHUB_OUTPUT`.

- [ ] **Step 1: Scaffold the package**

Copy the shape of the smallest existing package (`packages/core`'s `tsconfig.json` extends from `@allonfire/config/typescript/*`; reuse the same base). `package.json`:

```json
{
  "name": "@allonfire/ci",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./features/affected/affected": "./src/features/affected/affected.ts"
  },
  "scripts": {
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@allonfire/core": "workspace:*",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@allonfire/config": "workspace:*",
    "@types/node": "^22.13.0",
    "tsx": "^4.19.0",
    "typescript": "~6.0.3",
    "vitest": "^4.1.11"
  }
}
```

```ts
// packages/ci/vitest.config.ts
import { vitestConfig } from "@allonfire/config/tests/vitest";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  vitestConfig,
  defineConfig({ test: { include: ["src/**/*.test.ts"] } })
);
```

README: one paragraph (what the package does, the CLI line), in the repo's README style. Run `pnpm install`.

- [ ] **Step 2: Write the failing test**

```ts
// packages/ci/src/features/affected/tests/affected.test.ts
// @module-tag unit
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { affectedFrom } from "../affected";

const turboLs = (...names: string[]) =>
  stringifyJson({
    packages: {
      items: names.map((name) => ({
        name,
        path: name.replace("@allonfire/", ""),
      })),
    },
  });

describe("affectedFrom", () => {
  it("deploys only the App a change touched", () => {
    expect(affectedFrom(turboLs("@allonfire/back-office"))).toEqual({
      apps: ["back-office"],
      deploy: ["back-office"],
    });
  });

  it("deploys every App reading a shared package Turbo lists as affected", () => {
    expect(
      affectedFrom(
        turboLs("@allonfire/auth", "@allonfire/api", "@allonfire/back-office")
      )
    ).toEqual({ apps: ["api", "back-office"], deploy: ["api", "back-office"] });
  });

  it("adds the migration first when the database package changed", () => {
    expect(
      affectedFrom(turboLs("@allonfire/database", "@allonfire/api"))
    ).toEqual({ apps: ["api"], deploy: ["db-migrate", "api"] });
  });

  it("treats a root change as every package", () => {
    const everything = turboLs(
      "@allonfire/api",
      "@allonfire/auth",
      "@allonfire/back-office",
      "@allonfire/ci",
      "@allonfire/config",
      "@allonfire/core",
      "@allonfire/database"
    );
    expect(affectedFrom(everything).deploy).toEqual([
      "db-migrate",
      "api",
      "back-office",
    ]);
  });

  it("affects nothing for a docs-only change", () => {
    expect(affectedFrom(turboLs())).toEqual({ apps: [], deploy: [] });
  });

  it("rejects output that is not turbo ls JSON", () => {
    expect(() => affectedFrom("WARNING something")).toThrow();
  });
});
```

`turbo ls --affected` already adds dependents (it is `--filter=...[base]`), so the script only maps names; it never walks the graph.

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @allonfire/ci test`
Expected: FAIL, `Cannot find module '../affected'`.

- [ ] **Step 4: Write the implementation and the CLI**

```ts
// packages/ci/src/features/affected/affected.ts
import { parseJsonWith } from "@allonfire/core/shared/utils/json";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { z } from "zod";

/** The Apps with e2e tests and an image; Laura is paused (ADR 0010). */
const APP_BY_PACKAGE = {
  "@allonfire/api": "api",
  "@allonfire/back-office": "back-office",
} as const;
export type App = (typeof APP_BY_PACKAGE)[keyof typeof APP_BY_PACKAGE];

/** A Deploy unit (CONTEXT.md): an App, or the database migration. */
export const DB_MIGRATE = "db-migrate";
export type DeployUnit = App | typeof DB_MIGRATE;

const DATABASE_PACKAGE = "@allonfire/database";
const appByPackage = new Map<string, App>(objectEntries(APP_BY_PACKAGE));

const turboLsSchema = z.object({
  packages: z.object({
    items: z.array(z.object({ name: z.string(), path: z.string() })),
  }),
});

/**
 * Turbo's affected packages, read as the Apps to test end to end and the
 * Deploy units to ship. The migration comes first, as the compose file runs
 * it before the Apps.
 */
export const affectedFrom = (
  json: string
): { apps: App[]; deploy: DeployUnit[] } => {
  const names = parseJsonWith(json, turboLsSchema).packages.items.map(
    ({ name }) => name
  );
  const apps = names.flatMap((name) => {
    const app = appByPackage.get(name);
    return app ? [app] : [];
  });
  const migrate: DeployUnit[] = names.includes(DATABASE_PACKAGE)
    ? [DB_MIGRATE]
    : [];
  return { apps, deploy: [...migrate, ...apps] };
};
```

If `objectEntries` cannot feed `new Map<string, App>` without a cast, build the map with `for (const [name, app] of objectEntries(APP_BY_PACKAGE))`; never add `as`.

```ts
// packages/ci/src/index.ts
import { readFileSync } from "node:fs";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { affectedFrom } from "./features/affected/affected";

// `turbo ls --affected --output=json | tsx src/index.ts >> $GITHUB_OUTPUT`
const { apps, deploy } = affectedFrom(readFileSync(0, "utf8"));
process.stdout.write(
  `apps=${stringifyJson(apps)}\ndeploy=${stringifyJson(deploy)}\n`
);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @allonfire/ci test`
Expected: PASS, 6 tests.

Run: `TURBO_SCM_BASE=HEAD pnpm -s turbo ls --affected --output=json | pnpm -s --filter @allonfire/ci exec tsx src/index.ts`
Expected: two lines, `apps=[...]` and `deploy=[...]`.

`pnpm -s test:unit` from the root also collects the 6 tests (the root glob `{apps,packages}/*/vitest.config.ts` picks up the new package).

### Task 2: CI runs only what is affected

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `CLAUDE.md` (Deployment section: one line on affected CI)

**Interfaces:**
- Consumes: Task 1's CLI output lines `apps=` and `deploy=`.
- Produces: job `changes` with `outputs.apps` and `outputs.deploy` (JSON arrays as strings), read by Task 6 (`e2e`) and reused by Task 8.

- [ ] **Step 1: Add the `changes` job**

```yaml
  changes:
    runs-on: ubuntu-latest
    outputs:
      apps: ${{ steps.affected.outputs.apps }}
      deploy: ${{ steps.affected.outputs.deploy }}
    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      # Turbo diffs against the PR's base branch (GITHUB_BASE_REF) and adds
      # every dependent, so a shared package lists each App that reads it.
      - name: Affected Apps and Deploy units
        id: affected
        run: |
          pnpm -s turbo ls --affected --output=json \
            | pnpm -s --filter @allonfire/ci exec tsx src/index.ts \
            >> "$GITHUB_OUTPUT"
```

`set -o pipefail` is the default for `bash` steps on GitHub, so a failing `turbo ls` fails the job.

- [ ] **Step 2: Make `check-types`, `test` and `build` affected-only**

In `lint-types`, `test` and `build`: add `with: { fetch-depth: 0 }` to `actions/checkout`, then:
- `pnpm check-types` becomes `pnpm turbo run check-types --affected`
- `pnpm turbo run test` becomes `pnpm turbo run test --affected`
- `pnpm build` becomes `pnpm turbo run build --affected`

Leave `pnpm lint`, `design:sync --check`, `i18n:check`, shellcheck and the Liquibase `docker build --check` repo-wide.

- [ ] **Step 3: Lint the workflows in CI**

Add to `lint-types`, after shellcheck:

```yaml
      - name: Workflows
        run: docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7 -color
```

- [ ] **Step 4: Verify locally**

Run: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7 -color`
Expected: no output, exit 0.

Run: `TURBO_SCM_BASE=dev pnpm -s turbo run check-types --affected --dry=json | grep -c '"taskId"'`
Expected: a number smaller than the full run's (`pnpm -s turbo run check-types --dry=json | grep -c '"taskId"'`) when the branch does not touch root files; equal when it does.

- [ ] **Step 5: Document**

`CLAUDE.md`, Deployment section, add: `- CI runs check-types, test and build with \`turbo --affected\`; lint and the repo-wide checks always run. \`packages/ci/src/features/affected/affected.ts\` turns \`turbo ls --affected\` into the affected Apps and Deploy units.`

---

## Phase 2: tests

### Task 3: A browser config beside the Node one

**Files:**
- Create: `packages/config/tests/vitest.browser.config.ts`
- Modify: `packages/config/tests/vitest.config.ts` (exclude browser tests)
- Modify: `packages/config/tests/vitest.setup.ts` (comment)
- Modify: `packages/config/package.json` (export, optional peers)
- Rename: `packages/core/src/features/next/query/tests/aof-get-query-client.browser.test.ts` to `aof-get-query-client.client.test.ts`
- Modify: `turbo.json` (`test:browser` task)
- Modify: `package.json` (root `test:browser` script)

**Interfaces:**
- Produces: `vitestBrowserConfig` from `@allonfire/config/tests/vitest-browser`; a package's `vitest.browser.config.ts` is `mergeConfig(vitestBrowserConfig, defineConfig({...}))`; script `test:browser` = `vitest run --config vitest.browser.config.ts`; Turbo task `test:browser`.

Ruling against the spec's "two projects": Vitest allows `projects` only in the root config, and each package config is already one root project, so browser tests get their own config file instead. Same behaviour; the root `{apps,packages}/*/vitest.config.ts` glob keeps running Node tests only.

- [ ] **Step 1: Write the failing check**

Create a throwaway `packages/config/tests/probe.browser.test.ts`:

```ts
// @module-tag integration
it("runs in a real browser", () => {
  expect(typeof window.document.createElement).toBe("function");
  expect(navigator.userAgent).toContain("Chrome");
});
```

and point a temporary `packages/config/vitest.browser.config.ts` at it:

```ts
import { defineConfig, mergeConfig } from "vitest/config";
import { vitestBrowserConfig } from "./tests/vitest.browser.config";

export default mergeConfig(
  vitestBrowserConfig,
  defineConfig({ test: { include: ["tests/**/*.browser.test.ts"] } })
);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @allonfire/config exec vitest run --config vitest.browser.config.ts`
Expected: FAIL, cannot resolve `./tests/vitest.browser.config`.

- [ ] **Step 3: Install and write the browser preset**

Run: `pnpm --filter @allonfire/config add -D vitest@^4.1.11 @vitest/browser-playwright@^4.1.11 playwright@^1.63.0` and add the last two to `peerDependencies` as optional (like `vitest`). Then `pnpm exec playwright install chromium`.

```ts
// packages/config/tests/vitest.browser.config.ts
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";
import { vitestConfig } from "./vitest.config";

/**
 * Browser tests (`*.browser.test.ts(x)`): one component in a real Chromium,
 * driven by Playwright. No Next server runs here: Server Components, server
 * actions and navigation are the e2e tests' job. A package merges its own
 * options on top, as with `vitestConfig`.
 */
export const vitestBrowserConfig = mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      browser: {
        enabled: true,
        headless: true,
        instances: [{ browser: "chromium" }],
        provider: playwright(),
        screenshotFailures: false,
      },
      include: ["src/**/*.browser.test.{ts,tsx}"],
    },
  })
);
```

`packages/config/tests/vitest.config.ts`: add `"**/*.browser.test.{ts,tsx}"` to `exclude` with the comment `// The browser config runs these (vitest.browser.config.ts).` Export `"./tests/vitest-browser": "./tests/vitest.browser.config.ts"`.

`vitest.setup.ts` comment: replace "Browser tests are Playwright's (`e2e/`), not vitest's." with "Browser tests (`*.browser.test.tsx`) are `integration`; e2e tests are Playwright's (`e2e/`)."

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @allonfire/config exec vitest run --config vitest.browser.config.ts`
Expected: PASS, 1 test, Chromium launched headless.

Then delete `probe.browser.test.ts` and `packages/config/vitest.browser.config.ts` (the probe proved the preset; the first real browser test arrives in Task 4).

- [ ] **Step 5: Free the suffix and add the task**

`git mv packages/core/src/features/next/query/tests/aof-get-query-client.browser.test.ts packages/core/src/features/next/query/tests/aof-get-query-client.client.test.ts` (it runs in Node with a mocked `isServer`; the new name says what it covers). Run `pnpm --filter @allonfire/core test`: same count as before.

`turbo.json`, beside `test`:

```json
    "test:browser": {
      "dependsOn": ["transit"],
      "inputs": ["$TURBO_DEFAULT$", "!**/*.md"]
    },
```

Root `package.json` scripts: `"test:browser": "turbo run test:browser"`.

### Task 4: MSW and the first browser tests (Back office)

**Files:**
- Create: `apps/back-office/vitest.browser.config.ts`
- Create: `apps/back-office/src/shared/tests/msw/handlers.ts`
- Create: `apps/back-office/src/shared/tests/msw/worker.ts`
- Create: `apps/back-office/vitest.browser.setup.ts`
- Create: `apps/back-office/public/mockServiceWorker.js` (generated)
- Create: `apps/back-office/src/features/api/utils/tests/api.browser.test.ts`
- Create: `apps/back-office/src/features/auth/components/tests/sign-in-form.browser.test.tsx`
- Modify: `apps/back-office/package.json` (`test:browser`, devDependencies, `msw.workerDirectory`)

**Interfaces:**
- Consumes: `vitestBrowserConfig` (Task 3); `api` from `@/features/api/utils/api`; `SignInForm`; `SIGN_IN_ERROR`.
- Produces: `worker` (`setupWorker` instance) from `src/shared/tests/msw/worker.ts`; `handlers` array; `API_TEST_URL = "http://api.test"`.

- [ ] **Step 1: Install and wire the config**

Run: `pnpm --filter @allonfire/back-office add -D msw@^2 vitest-browser-react@^2 @vitest/browser-playwright@^4.1.11 playwright@^1.63.0`, then `pnpm --filter @allonfire/back-office exec msw init public --save` (writes `public/mockServiceWorker.js` and `"msw": { "workerDirectory": ["public"] }`).

```ts
// apps/back-office/vitest.browser.config.ts
import { fileURLToPath } from "node:url";
import { vitestBrowserConfig } from "@allonfire/config/tests/vitest-browser";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { defineConfig, mergeConfig } from "vitest/config";
import { API_TEST_URL } from "./src/shared/tests/msw/handlers";

// Same aliases and JSX as vitest.config.ts. The App's env module reads
// process.env, which only Node has: the browser gets the one public var.
export default mergeConfig(
  vitestBrowserConfig,
  defineConfig({
    define: {
      "process.env": stringifyJson({ NEXT_PUBLIC_API_URL: API_TEST_URL }),
    },
    oxc: { jsx: { runtime: "automatic" } },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: { setupFiles: ["./vitest.browser.setup.ts"] },
  })
);
```

`package.json` scripts: `"test:browser": "vitest run --config vitest.browser.config.ts"`.

```ts
// apps/back-office/src/shared/tests/msw/handlers.ts
import { http, HttpResponse } from "msw";

/** Where the browser tests' API lives; MSW answers for it. */
export const API_TEST_URL = "http://api.test";

/** The API's answers when a test does not set its own. */
export const handlers = [
  http.get(`${API_TEST_URL}/health`, () => HttpResponse.json({ status: "ok" })),
];
```

```ts
// apps/back-office/src/shared/tests/msw/worker.ts
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/** One worker for the whole run; a test overrides with `worker.use(...)`. */
export const worker = setupWorker(...handlers);
```

```ts
// apps/back-office/vitest.browser.setup.ts
import { worker } from "./src/shared/tests/msw/worker";

// A request no handler answers fails the test: nothing reaches a network.
beforeAll(() => worker.start({ onUnhandledRequest: "error", quiet: true }));
afterEach(() => worker.resetHandlers());
afterAll(() => worker.stop());
```

Check the `/health` response shape against `apps/api/src/features/health/routes/handlers.ts` and copy it exactly.

- [ ] **Step 2: Write the failing API client tests**

```ts
// apps/back-office/src/features/api/utils/tests/api.browser.test.ts
// @module-tag integration
import { http, HttpResponse } from "msw";
import { API_TEST_URL } from "@/shared/tests/msw/handlers";
import { worker } from "@/shared/tests/msw/worker";
import { api } from "../api";

describe("api", () => {
  it("calls the public API address with the visitor's cookies", async () => {
    let credentials: RequestCredentials | undefined;
    worker.use(
      http.get(`${API_TEST_URL}/health`, ({ request }) => {
        credentials = request.credentials;
        return HttpResponse.json({ status: "ok" });
      })
    );
    const response = await api.health.$get();
    expect(response.ok).toBe(true);
    expect(credentials).toBe("include");
  });

  it("fails a request no handler answers", async () => {
    await expect(fetch(`${API_TEST_URL}/v1/nobody-faked-this`)).rejects.toThrow();
  });
});
```

Adjust `api.health.$get()` to the real route path in `ApiType` (`/health` mounted at the root).

- [ ] **Step 3: Run to verify it fails, then passes**

Run: `pnpm --filter @allonfire/back-office test:browser`
Expected first: FAIL until `api.ts` resolves under the browser config (missing alias, `process` undefined, or the route name). Fix the config, not the test, until: PASS, 2 tests.

- [ ] **Step 4: Write the sign-in form browser tests**

```tsx
// apps/back-office/src/features/auth/components/tests/sign-in-form.browser.test.tsx
// @module-tag integration
import { signIn } from "@allonfire/auth/features/next/actions/sign-in";
import { SIGN_IN_ERROR } from "@allonfire/auth/features/next/constants/api";
import { NextIntlClientProvider } from "next-intl";
import { render } from "vitest-browser-react";
import en from "../../../i18n/translations/en.json" with { type: "json" };
import { SignInForm } from "../sign-in-form";

// The action runs on the Next server, which browser tests do not start;
// e2e covers the real round trip.
vi.mock("@allonfire/auth/features/next/actions/sign-in", () => ({
  signIn: vi.fn(),
}));

const renderForm = () =>
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <SignInForm />
    </NextIntlClientProvider>
  );

const fill = async (
  screen: Awaited<ReturnType<typeof renderForm>>,
  email: string,
  password: string
) => {
  await screen.getByLabelText("Email").fill(email);
  await screen.getByLabelText("Password").fill(password);
  await screen.getByRole("button", { name: "Sign in" }).click();
};

describe("SignInForm", () => {
  it("names each empty field without calling the action", async () => {
    const screen = await renderForm();
    await screen.getByRole("button", { name: "Sign in" }).click();
    await expect.element(screen.getByText("Enter your email.")).toBeVisible();
    await expect
      .element(screen.getByText("Enter your password."))
      .toBeVisible();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows the action's refusal as an alert", async () => {
    vi.mocked(signIn).mockResolvedValue({ error: SIGN_IN_ERROR.FORBIDDEN });
    const screen = await renderForm();
    await fill(screen, "user@allonfire.com", "testpass123");
    await expect
      .element(screen.getByRole("alert"))
      .toHaveTextContent("This account cannot enter the Back office.");
  });

  it("marks both fields wrong when the credentials are", async () => {
    vi.mocked(signIn).mockResolvedValue({ error: SIGN_IN_ERROR.INVALID });
    const screen = await renderForm();
    await fill(screen, "user@allonfire.com", "wrong-password");
    await expect
      .element(screen.getByLabelText("Email"))
      .toHaveAttribute("aria-invalid", "true");
  });

  it("says it is signing in while the action runs", async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => undefined));
    const screen = await renderForm();
    await fill(screen, "admin@example.com", "changeme123");
    await expect
      .element(screen.getByRole("button", { name: "Signing in…" }))
      .toBeVisible();
  });
});
```

If `getByLabelText("Password")` also matches the reveal toggle ("Show password"), use `{ exact: true }`.

- [ ] **Step 5: Run to verify**

Run: `pnpm --filter @allonfire/back-office test:browser`
Expected: PASS, 6 tests. If one passes before you expect it to (e.g. the alert renders without the mock), stop: the mock is not applied, and the test proves nothing.

Then `pnpm --filter @allonfire/back-office test`: the Node suite still passes and collects no `*.browser.test.*` file.

### Task 5: The shared Playwright preset and the first e2e flows

**Files:**
- Modify: `packages/config/tests/playwright.config.ts`
- Modify: `apps/back-office/playwright.config.ts`
- Modify: `apps/api/package.json` (`start`)
- Modify: `apps/back-office/e2e/smoke.spec.ts`
- Create: `apps/back-office/e2e/sign-in.spec.ts`
- Create: `apps/back-office/e2e/users.ts`

**Interfaces:**
- Produces: `aofPlaywrightConfig({ app: string; port: number }): PlaywrightTestConfig` from `@allonfire/config/tests/playwright`; `API_PORT = 3300`; `E2E_USER.ADMIN`, `E2E_USER.USER` (`{ email; password }`) from `apps/back-office/e2e/users.ts`.

- [ ] **Step 1: The API gets a start script**

`apps/api/package.json`: `"start": "tsx src/index.ts"` (no watch, no `--env-file`: the caller provides the env). Move `tsx` from `devDependencies` to `dependencies`, since the image runs it.

- [ ] **Step 2: Rewrite the preset**

```ts
// packages/config/tests/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

/** The API every App calls; the e2e stack always starts it. */
export const API_PORT = 3300;

/**
 * An App's e2e config: the App on `port` plus the API, both started unless
 * already running. Locally that reuses `pnpm dev`; in CI it starts the
 * production builds (`next start`, the API's `start`), which the job built.
 */
export const aofPlaywrightConfig = ({
  app,
  port,
}: {
  app: string;
  port: number;
}) => {
  const baseURL = `http://localhost:${port}`;
  const script = isCi ? "start" : "dev";
  return defineConfig({
    forbidOnly: isCi,
    fullyParallel: true,
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    reporter: isCi ? [["github"], ["html", { open: "never" }]] : "list",
    retries: isCi ? 2 : 0,
    testDir: "./e2e",
    // macOS writes `._name` AppleDouble twins on non-APFS volumes, and
    // Playwright would load `._smoke.spec.ts` as a test file.
    testIgnore: "**/._*",
    use: { baseURL, trace: "on-first-retry" },
    webServer: [
      {
        command: `pnpm --filter @allonfire/api ${script}`,
        reuseExistingServer: !isCi,
        url: `http://localhost:${API_PORT}/health`,
      },
      {
        command: `pnpm --filter @allonfire/${app} ${script}`,
        reuseExistingServer: !isCi,
        url: baseURL,
      },
    ],
  });
};
```

```ts
// apps/back-office/playwright.config.ts
import { aofPlaywrightConfig } from "@allonfire/config/tests/playwright";

export default aofPlaywrightConfig({ app: "back-office", port: 3400 });
```

- [ ] **Step 3: Write the failing e2e specs**

```ts
// apps/back-office/e2e/users.ts
/**
 * The seeded Users (`pnpm db:seed` in dev mode): the admin from
 * DATABASE_SEED_ADMIN_* (ADMIN in every App), and a mock User whose Back
 * office Membership is USER, under the floor in APP_SETTINGS (ADMIN), with
 * DATABASE_SEED_TEST_PASSWORD.
 * Defaults match packages/database/.env.example.
 */
export const E2E_USER = {
  ADMIN: {
    email: process.env.DATABASE_SEED_ADMIN_EMAIL ?? "admin@example.com",
    password: process.env.DATABASE_SEED_ADMIN_PASSWORD ?? "changeme123",
  },
  USER: {
    email: "allonfire-user@allonfire.com",
    password: process.env.DATABASE_SEED_TEST_PASSWORD ?? "testpass123",
  },
} as const;
```

```ts
// apps/back-office/e2e/sign-in.spec.ts
import { expect, type Page, test } from "@playwright/test";
import { E2E_USER } from "./users";

const SIGN_IN_URL = /\/sign-in$/;
const HOME_URL = /localhost:3400\/$/;

const signIn = async (page: Page, { email, password }: { email: string; password: string }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
};

test("an admin signs in and lands home", async ({ page }) => {
  await signIn(page, E2E_USER.ADMIN);
  await expect(page).toHaveURL(HOME_URL);
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});

test("a User under the Back office floor is refused", async ({ page }) => {
  await signIn(page, E2E_USER.USER);
  await expect(page.getByRole("alert")).toHaveText(
    "This account cannot enter the Back office."
  );
  await expect(page).toHaveURL(SIGN_IN_URL);
});

test("a wrong password is refused", async ({ page }) => {
  await signIn(page, { ...E2E_USER.ADMIN, password: "not-the-password" });
  await expect(page.getByRole("alert")).toHaveText("Email or password is wrong.");
});

test("signing out returns to sign-in and keeps home closed", async ({ page }) => {
  await signIn(page, E2E_USER.ADMIN);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(SIGN_IN_URL);
  await page.goto("/");
  await expect(page).toHaveURL(SIGN_IN_URL);
});
```

`smoke.spec.ts`: the home page now needs a Session, so replace the two home tests with:

```ts
test("sends a signed-out visitor from / to sign-in", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page).toHaveURL(SIGN_IN_URL);
  await expect(page.getByRole("heading", { name: "Back office" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("serves Italian at /it/sign-in", async ({ page }) => {
  await page.goto("/it/sign-in");
  await expect(page.getByRole("button", { name: "Accedi" })).toBeVisible();
});
```

(define `const SIGN_IN_URL = /\/sign-in$/;`, take the Italian submit label from `it.json` `SignIn.submit`, keep the 404 test). If the sign-in photograph's key does not exist in this MinIO, `collectErrors` catches the failed image load: filter out messages containing `/_next/image` in `collectErrors` with a comment pointing at `sign-in-image.ts`.

- [ ] **Step 4: Run against the local stack**

Run: `pnpm dev:setup` (Docker up, migrate, seed; dev mode needs `DATABASE_SEED_MODE="dev"` and `DATABASE_SEED_TEST_PASSWORD` in `packages/database/.env`), then `pnpm --filter @allonfire/back-office test:e2e`.
Expected: first run FAILS where the old smoke assumptions or labels differ; fix selectors to the real page, never the flow. Final: PASS, 7 tests (4 sign-in, 3 smoke).

Check the dev server ownership rule first: if 3300 or 3400 is already served by someone else's `pnpm dev`, Playwright reuses it; do not kill it.

### Task 6: The e2e job in CI

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `turbo.json` (`test:e2e` env passthrough)
- Modify: `CLAUDE.md` (testing paragraph: three layers)

**Interfaces:**
- Consumes: `needs.changes.outputs.apps` (Task 2); `test:browser` (Tasks 3-4); `aofPlaywrightConfig` (Task 5).

- [ ] **Step 1: Add the job**

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: changes
    if: needs.changes.outputs.apps != '[]'
    # Every value here exists only for this run's throwaway stack.
    env:
      CI: "true"
      DATABASE_URL: postgresql://allonfire:allonfire@localhost:5432/allonfire
      API_REDIS_URL: redis://localhost:6379/0
      API_CORS_ORIGINS: http://localhost:3400
      API_LOG_LEVEL: warn
      AUTH_SECRET: e2e-secret-only-for-this-throwaway-stack-000
      AUTH_URL: http://localhost:3300
      PORT: "3300"
      STORAGE_ENDPOINT: http://localhost:9000
      STORAGE_ACCESS_KEY: allonfire
      STORAGE_SECRET_KEY: allonfire
      API_URL: http://localhost:3300
      API_AUTH_URL: http://localhost:3300/v1/auth
      NEXT_PUBLIC_API_URL: http://localhost:3300
      AUTH_APP: BACK_OFFICE
      DATABASE_SEED_MODE: dev
      DATABASE_SEED_ADMIN_EMAIL: admin@example.com
      DATABASE_SEED_ADMIN_PASSWORD: changeme123
      DATABASE_SEED_TEST_PASSWORD: testpass123
      DATABASE_SEED_LAURA_VIEWER_EMAIL: laura-viewer@allonfire.com
      DATABASE_SEED_LAURA_VIEWER_PASSWORD: viewer1234
    steps:
      - name: Checkout
        uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
      - name: Setup Node.js
        uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      # The same services Local runs, bucket included (minio-init).
      - name: Start Postgres, Redis and MinIO
        run: docker compose -f docker/docker-compose.dev.yml up -d --wait postgres redis minio minio-init
      - name: Generate Prisma client
        run: pnpm db:generate
      - name: Apply the changelog
        run: pnpm db:update
      - name: Seed the Users
        run: pnpm --filter @allonfire/database exec tsx src/features/seed/seed.ts
      - name: Playwright version
        id: playwright
        run: echo "version=$(pnpm -s --filter @allonfire/back-office exec playwright --version)" >> "$GITHUB_OUTPUT"
      - name: Cache browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ steps.playwright.outputs.version }}
      - name: Install Chromium
        run: pnpm --filter @allonfire/back-office exec playwright install chromium --with-deps
      - name: Browser tests
        run: pnpm turbo run test:browser --affected
      - name: Build the affected Apps
        run: pnpm turbo run build --affected
      - name: End-to-end tests
        run: pnpm turbo run test:e2e --affected
      - name: Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/*/playwright-report
          retention-days: 7
```

`minio-init` exits after creating the bucket; `--wait` waits for it to complete. If Compose reports the one-shot as a failure under `--wait`, start `postgres redis minio` with `--wait`, then `docker compose ... up minio-init` (no `-d`).

- [ ] **Step 2: Pass the env through Turbo**

`turbo.json`, `test:e2e`: add `"passThroughEnv": ["CI", "DATABASE_SEED_*", "API_AUTH_URL", "NEXT_PUBLIC_API_URL", "AUTH_APP"]` (globals already pass the rest). Same list on `test:browser` is not needed.

- [ ] **Step 3: Verify**

Run: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7 -color`
Expected: exit 0.

Run the job's steps locally once, from `Start Postgres` to `End-to-end tests`, with the env above exported (and `CI=true`), against a stopped local dev stack.
Expected: browser tests PASS, e2e PASS (7). Stop the stack afterwards (`pnpm docker:down` or the repo's equivalent).

- [ ] **Step 4: Document the layers**

`CLAUDE.md`, the testing paragraph under API App Structure: replace "Browser tests are Playwright's, under the app's `e2e/`." with:

"Three layers: unit and integration tests run in Node (`vitest.config.ts`); browser tests (`*.browser.test.tsx`, `integration`) render one client component in real Chromium through `vitest.browser.config.ts`, with MSW answering the API (`src/shared/tests/msw/`, unhandled requests fail); e2e tests are Playwright's, under the App's `e2e/`, against the API plus the App (`aofPlaywrightConfig`). A server action is mocked in a browser test and covered for real by e2e. CI runs browser and e2e tests only for affected Apps."

---

## Phase 3: modular deploy

### Task 7: Images for every Deploy unit, compose from images

**Files:**
- Modify: `docker/Dockerfile` (`api` runner target)
- Modify: `docker/docker-compose.prod.yml`
- Modify: `apps/back-office/next.config.ts` only if `output: "standalone"` is missing

**Interfaces:**
- Produces: Docker targets `next-runner` (default, today's `runner` renamed) and `node-runner`; images `ghcr.io/isaiascope/allonfire-<unit>:prod` named in compose for `db-backup`/`db-migrate` (`allonfire-db-migrate`), `api`, `back-office`.

- [ ] **Step 1: Write the failing check**

Run: `docker build --check -f docker/Dockerfile --target node-runner --build-arg APP_NAME=api .`
Expected: FAIL, `target stage "node-runner" could not be found`.

- [ ] **Step 2: Add the API runner**

In `docker/Dockerfile`, rename `AS runner` to `AS next-runner`, add before it (so `next-runner` stays the last, default stage):

```dockerfile
# Stage 4a: the API (and any Node Host): runs the TypeScript sources with tsx,
# with the workspace's installed dependencies. ponytail: bundle the API if
# start time or image size ever matters.
FROM node:${NODE_VERSION}-alpine AS node-runner
RUN apk add --no-cache openssl
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
ARG APP_NAME
ENV APP_NAME=${APP_NAME} NODE_ENV=production PORT=3000
COPY --from=builder --chown=appuser:nodejs /app ./
USER appuser
EXPOSE 3000
WORKDIR /app/apps/${APP_NAME}
CMD ["node_modules/.bin/tsx", "src/index.ts"]
```

`openssl` is what Prisma's musl engine needs; sharp installs its musl binary during `pnpm install` on Alpine.

- [ ] **Step 3: Verify both targets build**

Run: `docker build -f docker/Dockerfile --target node-runner --build-arg APP_NAME=api -t allonfire-api:local .`
Expected: success. Then `docker run --rm --env-file apps/api/.env -e DATABASE_URL=... --network host allonfire-api:local` against the local stack, `curl -s localhost:3000/health` answers.

Run: `docker build -f docker/Dockerfile --build-arg APP_NAME=back-office --build-arg STORAGE_ENDPOINT=http://localhost:9000 --build-arg NEXT_PUBLIC_API_URL=http://localhost:3300 -t allonfire-back-office:local .`
Expected: success (`next-runner` is the default target).

- [ ] **Step 4: Compose from images**

In `docker/docker-compose.prod.yml`:
- `x-db-job`: replace `build:` and `image: allonfire-db-migrate` with `image: ghcr.io/isaiascope/allonfire-db-migrate:prod` and `pull_policy: always`.
- Remove the `laura` service and its comment block (Laura leaves Production until its rebuild, spec).
- Add:

```yaml
  api:
    image: ghcr.io/isaiascope/allonfire-api:prod
    pull_policy: always
    restart: unless-stopped
    depends_on:
      db-migrate:
        condition: service_completed_successfully
    environment:
      - DATABASE_URL=${DATABASE_URL:?DATABASE_URL is required}
      - API_REDIS_URL=${API_REDIS_URL:?API_REDIS_URL is required}
      - API_CORS_ORIGINS=https://${BACK_OFFICE_HOST:?BACK_OFFICE_HOST is required}
      - API_TRUSTED_PROXY_HOPS=1
      - AUTH_SECRET=${AUTH_SECRET:?AUTH_SECRET is required}
      - AUTH_URL=https://${API_HOST:?API_HOST is required}
      - AUTH_COOKIE_DOMAIN=${AUTH_COOKIE_DOMAIN:-}
      - STORAGE_ENDPOINT=http://minio:9000
      - STORAGE_ACCESS_KEY=${MINIO_ACCESS_KEY}
      - STORAGE_SECRET_KEY=${MINIO_SECRET_KEY}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - allonfire
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.allonfire-api.rule=Host(`${API_HOST}`)"
      - "traefik.http.routers.allonfire-api.entrypoints=websecure"
      - "traefik.http.routers.allonfire-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.allonfire-api.loadbalancer.server.port=3000"

  back-office:
    image: ghcr.io/isaiascope/allonfire-back-office:prod
    pull_policy: always
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    environment:
      - API_URL=http://api:3000
      - API_AUTH_URL=http://api:3000/v1/auth
      - AUTH_APP=BACK_OFFICE
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/sign-in"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - allonfire
      - dokploy-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.allonfire-back-office.rule=Host(`${BACK_OFFICE_HOST}`)"
      - "traefik.http.routers.allonfire-back-office.entrypoints=websecure"
      - "traefik.http.routers.allonfire-back-office.tls.certresolver=letsencrypt"
      - "traefik.http.services.allonfire-back-office.loadbalancer.server.port=3000"
```

Check the API's env schema (`apps/api/src/environment/environment.ts`) and the Back office's (`packages/auth/src/environment/next-environment.ts`) for any required var missing above, and add it. The Back office's `STORAGE_ENDPOINT` and `NEXT_PUBLIC_API_URL` are baked at build (Task 8's build args), not set here.

- [ ] **Step 5: Verify the compose file**

Run: `DATABASE_URL=x API_REDIS_URL=x AUTH_SECRET=x API_HOST=api.example.com BACK_OFFICE_HOST=bo.example.com MINIO_ACCESS_KEY=x MINIO_SECRET_KEY=x docker compose -f docker/docker-compose.prod.yml config --quiet`
Expected: exit 0. Run it again without `API_HOST`: expected FAIL naming `API_HOST is required`.

### Task 8: The deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md` (Deploy section: one-time Dokploy setup)
- Modify: `CLAUDE.md` (Deployment section)

**Interfaces:**
- Consumes: Task 1's CLI (`deploy=`), Task 7's targets and image names.
- Produces: secrets `DOKPLOY_API_KEY`, `PROD_STORAGE_ENDPOINT`, `PROD_NEXT_PUBLIC_API_URL`; variables `DOKPLOY_URL`, `DOKPLOY_COMPOSE_ID` (all in the `prod` GitHub environment).

- [ ] **Step 1: Write the workflow**

```yaml
name: Deploy

on:
  push:
    branches: [prod]

# One deploy at a time; a newer push waits for the running one.
concurrency:
  group: deploy-prod
  cancel-in-progress: false

env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
  REGISTRY: ghcr.io/isaiascope

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      deploy: ${{ steps.affected.outputs.deploy }}
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # Against the previous prod commit: what this push changed.
      - name: Affected Deploy units
        id: affected
        env:
          TURBO_SCM_BASE: ${{ github.event.before }}
        run: |
          pnpm -s turbo ls --affected --output=json \
            | pnpm -s --filter @allonfire/ci exec tsx src/index.ts \
            >> "$GITHUB_OUTPUT"

  image:
    needs: changes
    if: needs.changes.outputs.deploy != '[]'
    runs-on: ubuntu-latest
    environment: prod
    permissions:
      contents: read
      packages: write
    strategy:
      fail-fast: true
      matrix:
        unit: ${{ fromJSON(needs.changes.outputs.deploy) }}
    steps:
      - uses: actions/checkout@v5
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ${{ matrix.unit == 'db-migrate' && 'packages/database/liquibase/Dockerfile' || 'docker/Dockerfile' }}
          target: ${{ matrix.unit == 'api' && 'node-runner' || '' }}
          build-args: |
            APP_NAME=${{ matrix.unit }}
            STORAGE_ENDPOINT=${{ secrets.PROD_STORAGE_ENDPOINT }}
            NEXT_PUBLIC_API_URL=${{ secrets.PROD_NEXT_PUBLIC_API_URL }}
          push: true
          tags: |
            ${{ env.REGISTRY }}/allonfire-${{ matrix.unit }}:${{ github.sha }}
            ${{ env.REGISTRY }}/allonfire-${{ matrix.unit }}:prod
          cache-from: type=gha,scope=${{ matrix.unit }}
          cache-to: type=gha,mode=max,scope=${{ matrix.unit }}
      # GHCR is free for now; ten builds back is enough to roll back.
      - name: Keep the last 10 images
        uses: actions/delete-package-versions@v5
        with:
          package-name: allonfire-${{ matrix.unit }}
          package-type: container
          min-versions-to-keep: 10

  deploy:
    needs: [changes, image]
    runs-on: ubuntu-latest
    environment: prod
    steps:
      # One call: compose recreates only the services whose :prod image
      # changed, after db-backup and db-migrate (depends_on).
      - name: Redeploy the compose project
        run: |
          curl --fail-with-body -sS -X POST "${{ vars.DOKPLOY_URL }}/api/compose.deploy" \
            -H "x-api-key: ${{ secrets.DOKPLOY_API_KEY }}" \
            -H "content-type: application/json" \
            -d '{"composeId":"${{ vars.DOKPLOY_COMPOSE_ID }}"}'
```

`deploy` inherits `image`'s skip when nothing is affected (a job whose `needs` was skipped is skipped), which is Review Focus 5. Confirm the endpoint and header against Dokploy's API reference for the installed version before running it; if it differs, change the `curl` line only.

- [ ] **Step 2: Lint**

Run: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.7 -color`
Expected: exit 0.

- [ ] **Step 3: Dry check of the guards**

Run: `echo '{"packages":{"items":[]}}' | pnpm -s --filter @allonfire/ci exec tsx src/index.ts`
Expected: `deploy=[]`, so `image` and `deploy` are skipped.

Run: `echo '{"packages":{"items":[{"name":"@allonfire/database","path":"packages/database"},{"name":"@allonfire/api","path":"apps/api"}]}}' | pnpm -s --filter @allonfire/ci exec tsx src/index.ts`
Expected: `deploy=["db-migrate","api"]`.

- [ ] **Step 4: Document the one-time setup**

`README.md`, Deploy section (create it under the existing deployment notes):

1. GitHub, environment `prod`: secrets `DOKPLOY_API_KEY`, `PROD_STORAGE_ENDPOINT`, `PROD_NEXT_PUBLIC_API_URL`; variables `DOKPLOY_URL`, `DOKPLOY_COMPOSE_ID`.
2. Dokploy: a registry entry for `ghcr.io` with a GitHub token that has only `read:packages`.
3. Dokploy compose project `allonfire`: turn off auto-deploy; env holds `DATABASE_URL`, `API_REDIS_URL`, `AUTH_SECRET`, `AUTH_COOKIE_DOMAIN`, `API_HOST`, `BACK_OFFICE_HOST`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`.
4. First deploy: run the workflow once with every unit (push a commit touching the lockfile, or run `image` for each unit) so every `:prod` tag exists before compose pulls.
5. Rollback: `docker buildx imagetools create -t ghcr.io/isaiascope/allonfire-<unit>:prod ghcr.io/isaiascope/allonfire-<unit>:<sha>`, then redeploy the compose project in Dokploy.
6. Laura is down until its rebuild.

`CLAUDE.md`, Deployment section: replace the Dokploy line with "Orchestrator: Dokploy runs one compose project of GHCR images; `.github/workflows/deploy.yml` builds only the affected Deploy units on a push to `prod` and redeploys it (ADR 0018)."

- [ ] **Step 5: Final verification**

Run: `pnpm -s turbo run check-types && pnpm -s lint && pnpm -s turbo run test && pnpm -s test:browser`
Expected: all green.
