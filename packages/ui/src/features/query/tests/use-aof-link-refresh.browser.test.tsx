// @module-tag integration
import { UNIT } from "@allonfire/core/shared/constants/units";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { render } from "vitest-browser-react";
import { useAOFLinkRefresh } from "../hooks/use-aof-link-refresh";

const KEY = ["links"];
const REFRESH_MS = 10 * UNIT.MS_PER_MINUTE;
const TICK_MS = UNIT.MS_PER_MINUTE;

const reads = vi.fn(() => Promise.resolve("links"));

/** A feed that reads its links once and never goes stale by itself, as the feeds do. */
const Feed = () => {
  useQuery({ queryFn: reads, queryKey: KEY, staleTime: "static" });
  useAOFLinkRefresh({ queryKey: KEY, refreshMs: REFRESH_MS });
  return <p>feed</p>;
};

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Feed />
    </QueryClientProvider>
  );

const setVisibility = (state: "hidden" | "visible") =>
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(state);

beforeEach(() => {
  reads.mockClear();
  // Only the clock and the interval are fake: TanStack's own timers stay real.
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const firstRead = () => vi.waitUntil(() => reads.mock.calls.length === 1);
const ageBy = (ms: number) => {
  vi.setSystemTime(Date.now() + ms);
  vi.advanceTimersByTime(TICK_MS);
};

describe("useAOFLinkRefresh", () => {
  it("reads the links again once they are as old as refreshMs, though the query is static", async () => {
    await mount();
    await firstRead();
    ageBy(REFRESH_MS);
    await vi.waitUntil(() => reads.mock.calls.length === 2);
    expect(reads).toHaveBeenCalledTimes(2);
  });

  it("leaves younger links alone", async () => {
    await mount();
    await firstRead();
    ageBy(REFRESH_MS / 2);
    // Give a wrongly started read the time to show.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(reads).toHaveBeenCalledTimes(1);
  });

  it("waits while the tab is hidden, and reads when it becomes visible", async () => {
    setVisibility("hidden");
    await mount();
    await firstRead();
    ageBy(REFRESH_MS);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(reads).toHaveBeenCalledTimes(1);
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitUntil(() => reads.mock.calls.length === 2);
    expect(reads).toHaveBeenCalledTimes(2);
  });

  it("stops its timer when the page unmounts", async () => {
    const screen = await mount();
    await firstRead();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await screen.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
