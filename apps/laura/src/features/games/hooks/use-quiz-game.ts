"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { QuizQuestionData } from "@/features/games/actions/quiz";
import {
  getQuizQuestionsAction,
  submitQuizScoreAction,
} from "@/features/games/actions/quiz";

type GameState = "idle" | "playing" | "complete";
type SubmitState = "idle" | "submitting" | "success" | "error";

export type PlayerAnswer = {
  questionId: string;
  selectedAnswerId: string;
  isCorrect: boolean;
};

export function useQuizGame(initialQuestions: QuizQuestionData[]) {
  const [questions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<PlayerAnswer[]>([]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isNewBest, setIsNewBest] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Timer effect
  useEffect(() => {
    if (gameState === "playing") {
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

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const correctCount = playerAnswers.filter((a) => a.isCorrect).length;

  const selectAnswer = useCallback(
    (answerId: string) => {
      if (gameState === "complete" || isTransitioning) {
        return;
      }

      // Start timer on first interaction
      if (gameState === "idle") {
        startTimeRef.current = Date.now();
        setGameState("playing");
      }

      setSelectedAnswerId(answerId);
    },
    [gameState, isTransitioning]
  );

  const confirmAnswer = useCallback(() => {
    if (!(selectedAnswerId && currentQuestion) || isTransitioning) {
      return;
    }

    const selectedAnswer = currentQuestion.answers.find(
      (a) => a.id === selectedAnswerId
    );
    if (!selectedAnswer) {
      return;
    }

    const answer: PlayerAnswer = {
      questionId: currentQuestion.id,
      selectedAnswerId,
      isCorrect: selectedAnswer.isCorrect,
    };

    const updatedAnswers = [...playerAnswers, answer];
    setPlayerAnswers(updatedAnswers);

    // Check if quiz is complete
    if (currentIndex + 1 >= totalQuestions) {
      const finalTime = startTimeRef.current
        ? Date.now() - startTimeRef.current
        : 0;
      setElapsedMs(finalTime);
      setGameState("complete");

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Submit score
      const finalCorrectCount = updatedAnswers.filter(
        (a) => a.isCorrect
      ).length;
      setSubmitState("submitting");
      submitQuizScoreAction({
        timeMs: finalTime,
        correctCount: finalCorrectCount,
        totalQuestions,
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
      // Transition to next question
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswerId(null);
        setIsTransitioning(false);
      }, 300);
    }
  }, [
    selectedAnswerId,
    currentQuestion,
    currentIndex,
    totalQuestions,
    playerAnswers,
    isTransitioning,
  ]);

  const resetGame = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const result = await getQuizQuestionsAction();
    if (!result.success) {
      return;
    }

    setCurrentIndex(0);
    setSelectedAnswerId(null);
    setPlayerAnswers([]);
    setGameState("idle");
    setElapsedMs(0);
    setSubmitState("idle");
    setIsNewBest(false);
    setIsTransitioning(false);
    startTimeRef.current = null;
  }, []);

  const retrySubmit = useCallback(() => {
    if (submitState !== "error") {
      return;
    }

    setSubmitState("submitting");
    submitQuizScoreAction({
      timeMs: elapsedMs,
      correctCount,
      totalQuestions,
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
  }, [submitState, elapsedMs, correctCount, totalQuestions]);

  const mistakes = useMemo(
    () =>
      playerAnswers
        .filter((a) => !a.isCorrect)
        .map((a) => {
          const question = questions.find((q) => q.id === a.questionId);
          const selectedAnswer = question?.answers.find(
            (ans) => ans.id === a.selectedAnswerId
          );
          const correctAnswer = question?.answers.find((ans) => ans.isCorrect);
          return {
            questionText: question?.text ?? "",
            questionIndex: questions.findIndex((q) => q.id === a.questionId),
            selectedAnswerText: selectedAnswer?.text ?? "",
            correctAnswerText: correctAnswer?.text ?? "",
          };
        }),
    [playerAnswers, questions]
  );

  return {
    currentQuestion,
    currentIndex,
    totalQuestions,
    selectedAnswerId,
    playerAnswers,
    gameState,
    elapsedMs,
    submitState,
    isNewBest,
    isTransitioning,
    correctCount,
    mistakes,
    selectAnswer,
    confirmAnswer,
    resetGame,
    retrySubmit,
  };
}
