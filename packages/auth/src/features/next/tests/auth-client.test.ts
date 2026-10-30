// @module-tag unit
import { AUTH } from "../../../shared/constants/auth";
import { createApiAuthClient } from "../utils/auth-client";

it("gives up on an API that accepts the call and never answers", async () => {
  vi.useFakeTimers();
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: unknown, init?: RequestInit) => {
      signal = init?.signal;
      return new Promise<Response>(() => undefined);
    })
  );
  createApiAuthClient()
    .getSession()
    .catch(() => undefined);
  await vi.advanceTimersByTimeAsync(AUTH.API_TIMEOUT_MS - 1);
  expect(signal?.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(signal?.aborted).toBe(true);
});
