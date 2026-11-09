// @module-tag unit
import { LOCAL } from "../../../local/addresses";
import teardown from "../global-teardown";

type Done = (error: Error | null, stdout?: string, stderr?: string) => void;
const calls: string[][] = [];
const envs: Record<string, string | undefined>[] = [];
let failing: string | null = null;

vi.mock("node:child_process", () => ({
  execFile: (
    _file: string,
    args: string[],
    options: { env: Record<string, string | undefined> },
    done: Done
  ) => {
    calls.push(args);
    envs.push(options.env);
    if (failing && args.includes(failing)) {
      done(
        new Error(`Command failed: pnpm ${args.join(" ")}\n${failing} refused`)
      );
      return;
    }
    done(null, "", "");
  },
}));

describe("e2e global teardown", () => {
  beforeEach(() => {
    calls.length = 0;
    envs.length = 0;
    failing = null;
    vi.stubEnv("CONFIG_E2E_STAMP", "stamp-1");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("drops the database and the bucket of the run's stamp", async () => {
    await teardown();
    expect(calls).toHaveLength(2);
    expect(calls.every((args) => args.includes("stamp-1"))).toBe(true);
  });

  it("hands the drops the storage settings the run's API was given", async () => {
    await teardown();
    for (const env of envs) {
      expect(env).toMatchObject({
        STORAGE_ENDPOINT: LOCAL.URL.STORAGE,
        STORAGE_IMAGE_SERVER_KEY: LOCAL.IMAGE_SERVER.KEY,
        STORAGE_IMAGE_SERVER_SALT: LOCAL.IMAGE_SERVER.SALT,
        STORAGE_IMAGE_SERVER_URL: LOCAL.URL.IMAGE_SERVER,
      });
    }
  });

  it("tries both drops, then names why one failed in its message", async () => {
    failing = "test-bucket";
    await expect(teardown()).rejects.toThrow("test-bucket refused");
    expect(calls).toHaveLength(2);
  });
});
