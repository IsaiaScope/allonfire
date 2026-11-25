"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { GAMES } from "../constants/games";
import type { MemoryCard } from "../utils/deal-cards";

type MemoryStatus = "checking" | "complete" | "idle" | "playing";

export type MemoryAnnouncement =
  | { imageId: string; kind: "match" }
  | { kind: "miss" }
  | { kind: "complete"; moves: number; timeMs: number };

type CardView = MemoryCard & {
  index: number;
  isFaceUp: boolean;
  isMatched: boolean;
};

type State = {
  announcement: MemoryAnnouncement | null;
  /** Indexes turned up and not yet resolved: none, one, or two while checking. */
  faceUp: readonly number[];
  /** Images whose pair is found. */
  matched: readonly string[];
  moves: number;
  startedAt: number | null;
  status: MemoryStatus;
  /** Set once, at completion. */
  timeMs: number | null;
};

type Action =
  | { at: number; index: number; type: "flip" }
  | { at: number; type: "resolve" };

const INITIAL: State = {
  announcement: null,
  faceUp: [],
  matched: [],
  moves: 0,
  startedAt: null,
  status: "idle",
  timeMs: null,
};

const PAIR = 2;

/** The game's rules, unchanged from the first Memory: a pure step of its state. */
const reduce =
  (cards: readonly MemoryCard[]) =>
  (state: State, action: Action): State => {
    if (action.type === "flip") {
      const card = cards[action.index];
      const blocked =
        !card ||
        state.status === "checking" ||
        state.status === "complete" ||
        state.faceUp.includes(action.index) ||
        state.matched.includes(card.imageId);
      if (blocked) {
        return state;
      }
      const faceUp = [...state.faceUp, action.index];
      const started = state.startedAt ?? action.at;
      if (faceUp.length < PAIR) {
        return { ...state, faceUp, startedAt: started, status: "playing" };
      }
      return {
        ...state,
        faceUp,
        moves: state.moves + 1,
        startedAt: started,
        status: "checking",
      };
    }
    const [first, second] = state.faceUp.map((index) => cards[index]);
    if (state.status !== "checking" || !first || !second) {
      return state;
    }
    if (first.imageId !== second.imageId) {
      return {
        ...state,
        announcement: { kind: "miss" },
        faceUp: [],
        status: "playing",
      };
    }
    const matched = [...state.matched, first.imageId];
    if (matched.length * PAIR < cards.length) {
      return {
        ...state,
        announcement: { imageId: first.imageId, kind: "match" },
        faceUp: [],
        matched,
        status: "playing",
      };
    }
    const timeMs = action.at - (state.startedAt ?? action.at);
    return {
      ...state,
      announcement: { kind: "complete", moves: state.moves, timeMs },
      faceUp: [],
      matched,
      status: "complete",
      timeMs,
    };
  };

/**
 * One game of Memory over `cards`. The first flip starts the clock; every
 * second flip is one move and holds both cards `HOLD_MS` before it resolves;
 * flips are ignored while checking, after the end, and on a face-up or
 * matched card. `onComplete` runs once, with the moves and the time since the
 * first flip. There is no reset: a new game is a new deck, so the board
 * remounts the hook with new cards.
 */
export const useMemoryGame = (
  cards: readonly MemoryCard[],
  {
    onComplete,
  }: {
    onComplete: (score: { moves: number; timeMs: number }) => void;
  }
) => {
  const [state, dispatch] = useReducer(reduce(cards), INITIAL);
  const reported = useRef(false);
  const report = useRef(onComplete);
  report.current = onComplete;

  const flip = useCallback(
    (index: number) => dispatch({ at: Date.now(), index, type: "flip" }),
    []
  );

  // A pair rests face up before it resolves; the timer goes with the board.
  useEffect(() => {
    if (state.status !== "checking") {
      return;
    }
    const timer = setTimeout(
      () => dispatch({ at: Date.now(), type: "resolve" }),
      GAMES.MEMORY.DELAY.HOLD_MS
    );
    return () => clearTimeout(timer);
  }, [state.status]);

  useEffect(() => {
    if (
      state.status === "complete" &&
      state.timeMs !== null &&
      !reported.current
    ) {
      reported.current = true;
      report.current({ moves: state.moves, timeMs: state.timeMs });
    }
  }, [state.status, state.timeMs, state.moves]);

  const views: CardView[] = cards.map((card, index) => {
    const isMatched = state.matched.includes(card.imageId);
    return {
      ...card,
      index,
      isFaceUp: isMatched || state.faceUp.includes(index),
      isMatched,
    };
  });

  return {
    announcement: state.announcement,
    cards: views,
    flip,
    moves: state.moves,
    startedAt: state.startedAt,
    status: state.status,
    timeMs: state.timeMs,
  };
};
