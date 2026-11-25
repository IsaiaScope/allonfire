// @module-tag integration

import { renderHook } from "vitest-browser-react";
import { GAMES } from "../../constants/games";
import { useElapsed } from "../use-elapsed";

const STARTED_AT = 1_000_000;

beforeEach(() => {
  vi.useFakeTimers({ now: STARTED_AT });
});
afterEach(() => {
  vi.useRealTimers();
});

type Clock = { startedAt: number | null; timeMs: number | null };
const IDLE: Clock = { startedAt: null, timeMs: null };

const setup = () =>
  renderHook(
    ({ startedAt, timeMs }: Clock = IDLE) => useElapsed(startedAt, timeMs),
    { initialProps: IDLE }
  );

describe("useElapsed", () => {
  it("reads zero until a game starts, and ticks no timer", async () => {
    const { result } = await setup();
    expect(result.current).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("moves by a hundredth of a second, not a second at a time", async () => {
    const { act, rerender, result } = await setup();
    await rerender({ startedAt: STARTED_AT, timeMs: null });
    await act(() => vi.advanceTimersByTime(GAMES.MEMORY.DELAY.CLOCK_MS));
    expect(result.current).toBe(GAMES.MEMORY.DELAY.CLOCK_MS);
    await act(() => vi.advanceTimersByTime(GAMES.MEMORY.DELAY.CLOCK_MS));
    expect(result.current).toBe(GAMES.MEMORY.DELAY.CLOCK_MS * 2);
  });

  it("stops on the game's own time and leaves no timer", async () => {
    const { act, rerender, result, unmount } = await setup();
    await rerender({ startedAt: STARTED_AT, timeMs: null });
    await act(() => vi.advanceTimersByTime(500));
    await rerender({ startedAt: STARTED_AT, timeMs: 1234 });
    expect(result.current).toBe(1234);
    await act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(1234);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });

  it("leaves no timer when the board goes while playing", async () => {
    const { rerender, unmount } = await setup();
    await rerender({ startedAt: STARTED_AT, timeMs: null });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
