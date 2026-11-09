// @module-tag unit
import teardown from "../global-teardown";

type Done = (error: Error | null, stdout?: string, stderr?: string) => void;
const calls: string[][] = [];
let failing: string | null = null;

vi.mock("node:child_process", () => ({
  execFile: (_file: string, args: string[], _options: unknown, done: Done) => {
    calls.push(args);
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
    failing = null;
    vi.stubEnv("CONFIG_E2E_STAMP", "stamp-1");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("drops the database and the bucket of the run's stamp", async () => {
    await teardown();
    expect(calls).toHaveLength(2);
    expect(calls.every((args) => args.includes("stamp-1"))).toBe(true);
  });

  it("tries both drops, then names why one failed in its message", async () => {
    failing = "test-bucket";
    await expect(teardown()).rejects.toThrow("test-bucket refused");
    expect(calls).toHaveLength(2);
  });
});
