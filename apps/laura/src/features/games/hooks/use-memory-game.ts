"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MemoryCard } from "@/features/games/actions/games";
import {
  getMemoryPhotosAction,
  submitScoreAction,
} from "@/features/games/actions/games";

type GameState = "idle" | "playing" | "checking" | "complete";

type CardState = MemoryCard & {
  index: number;
  isFlipped: boolean;
  isMatched: boolean;
};

type SubmitState = "idle" | "submitting" | "success" | "error";

export function useMemoryGame(initialCards: MemoryCard[]) {
  const [cards, setCards] = useState<CardState[]>(() =>
    initialCards.map((card, index) => ({
      ...card,
      index,
      isFlipped: false,
      isMatched: false,
    }))
  );
  const [gameState, setGameState] = useState<GameState>("idle");
  const [firstCard, setFirstCard] = useState<number | null>(null);
  const [secondCard, setSecondCard] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isNewBest, setIsNewBest] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const movesRef = useRef(0);

  // Keep movesRef in sync
  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  // Timer effect
  useEffect(() => {
    if (gameState === "playing" || gameState === "checking") {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedMs(Date.now() - startTimeRef.current);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState]);

  // Check match after second card flip
  useEffect(() => {
    if (gameState !== "checking" || firstCard === null || secondCard === null) {
      return;
    }

    const first = cards[firstCard];
    const second = cards[secondCard];
    if (!(first && second)) {
      return;
    }

    const isMatch = first.photoId === second.photoId;

    const timeout = setTimeout(() => {
      setCards((prev) =>
        prev.map((card) => {
          if (card.index === firstCard || card.index === secondCard) {
            return isMatch
              ? { ...card, isMatched: true }
              : { ...card, isFlipped: false };
          }
          return card;
        })
      );

      const matchedCount =
        cards.filter((c) => c.isMatched).length + (isMatch ? 2 : 0);

      if (matchedCount === cards.length) {
        const finalTime = startTimeRef.current
          ? Date.now() - startTimeRef.current
          : 0;
        setElapsedMs(finalTime);
        setGameState("complete");

        setSubmitState("submitting");
        submitScoreAction({
          gameType: "MEMORY",
          timeMs: finalTime,
          moves: movesRef.current,
        })
          .then((result) => {
            if (result.success) {
              setSubmitState("success");
              setIsNewBest(result.isNewBest);
            } else {
              setSubmitState("error");
            }
          })
          .catch(() => {
            setSubmitState("error");
          });
      } else {
        setGameState("playing");
      }

      setFirstCard(null);
      setSecondCard(null);
    }, 800);

    return () => clearTimeout(timeout);
  }, [gameState, firstCard, secondCard, cards]);

  const flipCard = useCallback(
    (index: number) => {
      const card = cards[index];
      if (
        !card ||
        card.isFlipped ||
        card.isMatched ||
        gameState === "checking" ||
        gameState === "complete"
      ) {
        return;
      }

      setCards((prev) =>
        prev.map((c) => (c.index === index ? { ...c, isFlipped: true } : c))
      );

      if (gameState === "idle") {
        startTimeRef.current = Date.now();
        setGameState("playing");
        setFirstCard(index);
      } else if (firstCard === null) {
        setFirstCard(index);
      } else {
        setMoves((m) => m + 1);
        setSecondCard(index);
        setGameState("checking");
      }
    },
    [cards, gameState, firstCard]
  );

  const resetGame = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const result = await getMemoryPhotosAction();
    if (!result.success) {
      return;
    }

    setCards(
      result.cards.map((card, index) => ({
        ...card,
        index,
        isFlipped: false,
        isMatched: false,
      }))
    );
    setGameState("idle");
    setFirstCard(null);
    setSecondCard(null);
    setMoves(0);
    setElapsedMs(0);
    setSubmitState("idle");
    setIsNewBest(false);
    startTimeRef.current = null;
  }, []);

  const retrySubmit = useCallback(() => {
    if (submitState !== "error") {
      return;
    }

    setSubmitState("submitting");
    submitScoreAction({
      gameType: "MEMORY",
      timeMs: elapsedMs,
      moves,
    })
      .then((result) => {
        if (result.success) {
          setSubmitState("success");
          setIsNewBest(result.isNewBest);
        } else {
          setSubmitState("error");
        }
      })
      .catch(() => {
        setSubmitState("error");
      });
  }, [submitState, elapsedMs, moves]);

  return {
    cards,
    gameState,
    moves,
    elapsedMs,
    submitState,
    isNewBest,
    flipCard,
    resetGame,
    retrySubmit,
  };
}
