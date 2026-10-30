// @module-tag unit
import { deleteLeftovers } from "../delete-leftovers";

const REASON = "files left behind";
const KEYS = ["a.avif", "b.avif"];

const logger = () => ({ warn: vi.fn() });

describe("deleteLeftovers", () => {
  it("deletes the files it is handed", async () => {
    const remove = vi.fn(async () => undefined);
    const log = logger();
    await deleteLeftovers({ keys: KEYS, log, reason: REASON, remove });
    expect(remove).toHaveBeenCalledWith(KEYS);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("asks nothing when there is nothing to delete", async () => {
    const remove = vi.fn(async () => undefined);
    await deleteLeftovers({ keys: [], log: logger(), reason: REASON, remove });
    expect(remove).not.toHaveBeenCalled();
  });

  it("never throws: a failure is logged with the keys and the reason", async () => {
    const failure = new Error("storage down");
    const log = logger();
    await deleteLeftovers({
      keys: KEYS,
      log,
      reason: REASON,
      remove: () => Promise.reject(failure),
    });
    expect(log.warn).toHaveBeenCalledWith({ err: failure, keys: KEYS }, REASON);
  });

  it("asks once more when told to retry, and logs nothing if that works", async () => {
    const remove = vi
      .fn<(keys: readonly string[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValueOnce(undefined);
    const log = logger();
    await deleteLeftovers({
      keys: KEYS,
      log,
      reason: REASON,
      remove,
      retry: true,
    });
    expect(remove).toHaveBeenCalledTimes(2);
    expect(log.warn).not.toHaveBeenCalled();
  });
});
