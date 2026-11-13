// @module-tag unit
import { deleteLeftovers } from "../utils/delete-leftovers";

const REASON = "files left behind";
const EVENT = "image.files_left_behind";
const KEYS = ["a.avif", "b.avif"];

const logger = () => ({ warn: vi.fn() });

describe("deleteLeftovers", () => {
  it("deletes the files it is handed", async () => {
    const remove = vi.fn(async () => undefined);
    const log = logger();
    await deleteLeftovers({
      event: EVENT,
      keys: KEYS,
      log,
      reason: REASON,
      remove,
    });
    expect(remove).toHaveBeenCalledWith(KEYS);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("asks nothing when there is nothing to delete", async () => {
    const remove = vi.fn(async () => undefined);
    await deleteLeftovers({
      event: EVENT,
      keys: [],
      log: logger(),
      reason: REASON,
      remove,
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("never throws: a failure is logged with the event, the keys and the reason", async () => {
    const failure = new Error("storage down");
    const log = logger();
    await deleteLeftovers({
      event: EVENT,
      keys: KEYS,
      log,
      reason: REASON,
      remove: () => Promise.reject(failure),
    });
    expect(log.warn).toHaveBeenCalledWith(
      { err: failure, event: EVENT, keys: KEYS },
      REASON
    );
  });

  it("asks once more when told to retry, and logs nothing if that works", async () => {
    const remove = vi
      .fn<(keys: readonly string[]) => Promise<void>>()
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValueOnce(undefined);
    const log = logger();
    await deleteLeftovers({
      event: EVENT,
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
