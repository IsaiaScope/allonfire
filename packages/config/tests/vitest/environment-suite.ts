// @vitest-environment node
// Node, not jsdom: t3-env only validates server variables where `window` is
// undefined, which is where a Next App's server runs.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCAL } from "../../local/addresses";
import { REPO } from "../../local/repo";

/** The two Apps' own public addresses. */
const ADDRESSES = ["BACK_OFFICE_URL", "LAURA_URL"] as const;
type Address = (typeof ADDRESSES)[number];

type Options = {
  /** The Apps' addresses this App reads, and so refuses to start without; any other is not its business. */
  addresses: readonly Address[];
  /** The `AUTH_APP` the App is served as (`App.LAURA`). */
  authApp: string;
  /** The API's own Auth path (`API.PATH.AUTH`); the App is told it behind the API's address (`API_AUTH_URL`). */
  authPath: string;
  /** Where the App's `.env.example` sits. */
  examplePath: URL;
  /** Loads the App's env module afresh (`() => import("../environment")`). */
  importEnv: () => Promise<unknown>;
};

/** What `next build` validates in every Next App: Turbo drops any variable it does not list. */
const BUILD_VARIABLES = [
  "API_URL",
  "BACK_OFFICE_URL",
  "LAURA_URL",
  "NEXT_PUBLIC_API_REMOTE_URL",
  "NEXT_PUBLIC_API_URL",
] as const;
/** Addresses every App starts with, but whose absence is not an error. */
const OPTIONAL = ["NEXT_PUBLIC_API_REMOTE_URL"] as const;
/** The API's address, which every App refuses to start without, and refuses when not a URL. */
const API_ADDRESS = "API_URL";

const INVALID = "Invalid environment variables";
const NOT_A_URL = "not-a-url";
// ponytail: config imports nothing, core's helpers included, so turbo.json is
// read as text: the names between the brackets of a list.
const LIST_ITEM = /"([^"]+)"/g;
const BUILD_TASK = '"build": {';

/** The quoted names in `"key": [ ... ]`, from the start of `text`. */
const namesOf = (text: string, key: string) => {
  const list = text.match(new RegExp(`"${key}":\\s*\\[([^\\]]*)\\]`))?.[1];
  return [...(list ?? "").matchAll(LIST_ITEM)].map(([, name = ""]) => name);
};

/** What Turbo hands a build: its `env` and the globals passed through. */
const turboBuildVariables = () => {
  const turbo = readFileSync(resolve(REPO.ROOT, "turbo.json"), "utf8");
  return [
    ...namesOf(turbo.slice(turbo.indexOf(BUILD_TASK)), "env"),
    ...namesOf(turbo, "globalPassThroughEnv"),
  ];
};

/**
 * The cases every Next App's env module passes: it loads with its variables,
 * refuses an address it needs when unset or not a URL, starts without an
 * optional one or one it never reads, takes its build variables from Turbo, and its example holds
 * the API's Auth address.
 */
export const environmentSuite = ({
  addresses,
  authApp,
  authPath,
  examplePath,
  importEnv,
}: Options) => {
  const authUrl = `${LOCAL.URL.API}${authPath}`;
  const required = [...addresses, API_ADDRESS];
  const unused = ADDRESSES.filter((name) => !addresses.includes(name));
  /** Every variable the App needs to load, with a valid value. */
  const stub: Record<string, string> = {
    API_AUTH_URL: authUrl,
    API_URL: LOCAL.URL.API,
    AUTH_APP: authApp,
    BACK_OFFICE_URL: LOCAL.URL.BACK_OFFICE,
    LAURA_URL: LOCAL.URL.LAURA,
    NEXT_PUBLIC_API_URL: LOCAL.URL.API,
  };

  beforeEach(() => {
    vi.resetModules();
    for (const name of Reflect.ownKeys(stub)) {
      if (typeof name === "string") {
        vi.stubEnv(name, stub[name]);
      }
    }
  });

  describe("environment", () => {
    it("loads at runtime with the App's own variables", async () => {
      await expect(importEnv()).resolves.toHaveProperty("env");
    });

    it.each(required)("refuses to start without %s", async (name) => {
      vi.stubEnv(name, undefined);
      await expect(importEnv()).rejects.toThrow(INVALID);
    });

    it.each(required)("refuses %s when it is not a URL", async (name) => {
      vi.stubEnv(name, NOT_A_URL);
      await expect(importEnv()).rejects.toThrow(INVALID);
    });

    it.each(unused)("starts without %s, which it never reads", async (name) => {
      vi.stubEnv(name, undefined);
      await expect(importEnv()).resolves.toHaveProperty("env");
    });

    it.each(OPTIONAL)("starts without %s", async (name) => {
      vi.stubEnv(name, undefined);
      await expect(importEnv()).resolves.toHaveProperty("env");
    });

    it.each(OPTIONAL)("refuses %s when it is not a URL", async (name) => {
      vi.stubEnv(name, NOT_A_URL);
      await expect(importEnv()).rejects.toThrow(INVALID);
    });

    it("lets Turbo hand the build every variable it validates", () => {
      expect(turboBuildVariables()).toEqual(
        expect.arrayContaining([...BUILD_VARIABLES])
      );
    });

    it("points .env.example at the API's own Auth path", () => {
      expect(readFileSync(examplePath, "utf8")).toContain(
        `API_AUTH_URL="${authUrl}"`
      );
    });
  });
};
