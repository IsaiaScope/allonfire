// @module-tag integration

import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { StrictMode } from "react";
import { renderHook } from "vitest-browser-react";
import { inOrder } from "@/shared/tests/in-order";
import { GAMES } from "../../constants/games";
import { deckBody } from "../../tests/deck-body";
import { dealCards } from "../../utils/deal-cards";
import { useMemoryGame } from "../use-memory-game";

const FIRST = () => 0;
/** A fixed deal: the same 12 cards in the same order, every run. */
const CARDS = dealCards(deckBody().images, FIRST);

/** The indexes of the two cards of `imageId`. */
const pairOf = (imageId: string) =>
  CARDS.flatMap(({ imageId: id }, index) => (id === imageId ? [index] : []));
const IMAGE_IDS = deckBody().images.map(({ id }) => id);
/** Two cards that are not a pair. */
const MISS = [
  pairOf(IMAGE_IDS[0] ?? "")[0] ?? 0,
  pairOf(IMAGE_IDS[1] ?? "")[0] ?? 0,
];

const setup = async (wrapper?: Parameters<typeof renderHook>[1]) => {
  const onComplete = vi.fn();
  const rendered = await renderHook(
    () => useMemoryGame(CARDS, { onComplete }),
    wrapper
  );
  return { onComplete, ...rendered };
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useMemoryGame", () => {
  it("starts idle, and the first flip starts playing at no cost", async () => {
    const { act, result } = await setup();
    expect(result.current.status).toBe("idle");
    await act(() => result.current.flip(0));
    expect([result.current.status, result.current.moves]).toEqual([
      "playing",
      0,
    ]);
    expect(result.current.cards[0]?.isFaceUp).toBe(true);
  });

  it("makes the second flip a move and holds the board: a third flip is ignored", async () => {
    const { act, result } = await setup();
    await act(() => result.current.flip(MISS[0] ?? 0));
    await act(() => result.current.flip(MISS[1] ?? 0));
    expect([result.current.status, result.current.moves]).toEqual([
      "checking",
      1,
    ]);
    const other = CARDS.findIndex((_, index) => !MISS.includes(index));
    await act(() => result.current.flip(other));
    expect(result.current.cards[other]?.isFaceUp).toBe(false);
    expect(result.current.moves).toBe(1);
  });

  it("keeps a match face up after the hold and announces it", async () => {
    const [a = 0, b = 0] = pairOf(IMAGE_IDS[0] ?? "");
    const { act, result } = await setup();
    await act(() => result.current.flip(a));
    await act(() => result.current.flip(b));
    await act(() => vi.advanceTimersByTime(GAMES.MEMORY.DELAY.HOLD_MS));
    expect(result.current.status).toBe("playing");
    expect([a, b].map((i) => result.current.cards[i]?.isMatched)).toEqual([
      true,
      true,
    ]);
    expect(result.current.announcement).toEqual({
      imageId: IMAGE_IDS[0],
      kind: "match",
    });
  });

  it("turns a miss face down after the hold and announces it", async () => {
    const { act, result } = await setup();
    await act(() => result.current.flip(MISS[0] ?? 0));
    await act(() => result.current.flip(MISS[1] ?? 0));
    await act(() => vi.advanceTimersByTime(GAMES.MEMORY.DELAY.HOLD_MS));
    expect(MISS.map((i) => result.current.cards[i]?.isFaceUp)).toEqual([
      false,
      false,
    ]);
    expect(result.current.announcement).toEqual({ kind: "miss" });
    expect(result.current.status).toBe("playing");
  });

  it("ignores a face-up card and a matched card, and costs no move", async () => {
    const [a = 0, b = 0] = pairOf(IMAGE_IDS[0] ?? "");
    const { act, result } = await setup();
    await act(() => result.current.flip(a));
    await act(() => result.current.flip(a));
    expect(result.current.moves).toBe(0);
    await act(() => result.current.flip(b));
    await act(() => vi.advanceTimersByTime(GAMES.MEMORY.DELAY.HOLD_MS));
    await act(() => result.current.flip(a));
    expect(result.current.moves).toBe(1);
    expect(result.current.status).toBe("playing");
  });

  const playPerfectGame = async (
    act: (fn: () => void) => Promise<void>,
    flip: (index: number) => void
  ) =>
    inOrder(IMAGE_IDS, async (id) => {
      const [a = 0, b = 0] = pairOf(id);
      await act(() => flip(a));
      await act(() => flip(b));
      await act(() => vi.advanceTimersByTime(GAMES.MEMORY.DELAY.HOLD_MS));
    });

  it("completes on the last pair and reports the moves and time once", async () => {
    const { act, onComplete, result } = await setup();
    await playPerfectGame(act, (index) => result.current.flip(index));
    expect(result.current.status).toBe("complete");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      moves: MEMORY_RULE.PAIRS,
      timeMs: MEMORY_RULE.PAIRS * GAMES.MEMORY.DELAY.HOLD_MS,
    });
    expect(result.current.announcement).toMatchObject({ kind: "complete" });
  });

  it("reports once under StrictMode", async () => {
    const { act, onComplete, result } = await setup({ wrapper: StrictMode });
    await playPerfectGame(act, (index) => result.current.flip(index));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("ignores flips after the game is complete", async () => {
    const { act, result } = await setup();
    await playPerfectGame(act, (index) => result.current.flip(index));
    await act(() => result.current.flip(0));
    expect(result.current.moves).toBe(MEMORY_RULE.PAIRS);
    expect(result.current.status).toBe("complete");
  });

  it("hands the clock its start, and its time once the game is complete", async () => {
    const { act, result } = await setup();
    expect([result.current.startedAt, result.current.timeMs]).toEqual([
      null,
      null,
    ]);
    await act(() => result.current.flip(0));
    expect(result.current.startedAt).not.toBeNull();
    expect(result.current.timeMs).toBeNull();
    await playPerfectGame(act, (index) => result.current.flip(index));
    expect(result.current.timeMs).not.toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
