"use client";

import { useEffect, useRef, useState } from "react";
import type { Country } from "@/app/data/countries";
import {
  createQuestionDeck,
  createSpeedMatchTargetDeck,
  createSpeedMatchUnlimitedColumns,
  getNextRoundAction,
  getUpdatedScore,
  isCorrectAnswer,
  pickSpeedMatchTarget,
  SPEED_MATCH_UNLIMITED_QUEUED_FLAGS,
  SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS,
  type Difficulty,
  type GameMode,
} from "@/lib/flag-quiz";
import { usePuzzlerStore } from "@/lib/puzzler-store";
import { DifficultySelector } from "./DifficultySelector";
import { GameModeSelector } from "./GameModeSelector";
import { QuizRound } from "./QuizRound";
import { Results } from "./Results";
import { SpeedMatchRound } from "./SpeedMatchRound";

type RoundState = "selecting-mode" | "selecting-difficulty" | "playing" | "answered" | "results";

function isSpeedMatchMode(gameMode: GameMode | null): gameMode is "speed-match" | "speed-match-unlimited" {
  return gameMode === "speed-match" || gameMode === "speed-match-unlimited";
}

export function FlagBlitz({ onBack }: { onBack: () => void }) {
  const recordPlay = usePuzzlerStore((state) => state.recordPlay);
  const recordResult = usePuzzlerStore((state) => state.recordResult);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<ReturnType<typeof createQuestionDeck>>([]);
  const [speedMatchTargets, setSpeedMatchTargets] = useState<ReturnType<typeof createQuestionDeck>>([]);
  const [speedMatchColumns, setSpeedMatchColumns] = useState<Country[][]>([]);
  const [speedMatchQueuedFlags, setSpeedMatchQueuedFlags] = useState<Country[]>([]);
  const [speedMatchTarget, setSpeedMatchTarget] = useState<Country | null>(null);
  const [speedMatchDeckIndex, setSpeedMatchDeckIndex] = useState(0);
  const [removingCode, setRemovingCode] = useState<string | null>(null);
  const [promotedCodes, setPromotedCodes] = useState<string[]>([]);
  const [roundState, setRoundState] = useState<RoundState>("selecting-mode");
  const [index, setIndex] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [incorrectCodes, setIncorrectCodes] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const transitionTimerRef = useRef<number | null>(null);
  const promotionTimerRef = useRef<number | null>(null);
  const gameIdRef = useRef(0);

  function clearBoardTransition() {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (promotionTimerRef.current !== null) {
      window.clearTimeout(promotionTimerRef.current);
      promotionTimerRef.current = null;
    }
  }

  useEffect(() => () => clearBoardTransition(), []);

  function selectGameMode(selectedGameMode: GameMode) {
    if (isSpeedMatchMode(selectedGameMode)) {
      beginGame(selectedGameMode, null);
      return;
    }

    setGameMode(selectedGameMode);
    setDifficulty(null);
    setRoundState("selecting-difficulty");
  }

  function beginGame(selectedGameMode: GameMode, selectedDifficulty: Difficulty | null) {
    const nextQuestions = createQuestionDeck(selectedGameMode);
    const isSpeedMatchUnlimited = selectedGameMode === "speed-match-unlimited";
    const initialVisibleFlags = isSpeedMatchUnlimited
      ? nextQuestions.slice(0, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS)
      : [];
    const initialColumns = createSpeedMatchUnlimitedColumns(initialVisibleFlags);
    const initialQueuedFlags = isSpeedMatchUnlimited
      ? nextQuestions.slice(SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS + SPEED_MATCH_UNLIMITED_QUEUED_FLAGS)
      : [];

    gameIdRef.current += 1;
    clearBoardTransition();
    setGameMode(selectedGameMode);
    setDifficulty(selectedDifficulty);
    setQuestions(nextQuestions);
    setSpeedMatchTargets(selectedGameMode === "speed-match" ? createSpeedMatchTargetDeck(nextQuestions) : []);
    setSpeedMatchColumns(initialColumns);
    setSpeedMatchQueuedFlags(initialQueuedFlags);
    setSpeedMatchTarget(pickSpeedMatchTarget(initialVisibleFlags));
    setSpeedMatchDeckIndex(initialVisibleFlags.length + initialQueuedFlags.length);
    setRemovingCode(null);
    setPromotedCodes([]);
    setRoundState("playing");
    setIndex(0);
    setQuestionNumber(1);
    setScore(0);
    setStreak(0);
    setAnswer("");
    setHintVisible(false);
    setWasCorrect(null);
    setMatchedCodes([]);
    setIncorrectCodes([]);
    setTimeLeft(60);
    recordPlay();
  }

  function startGame(selectedDifficulty: Difficulty) {
    if (!gameMode) return;
    beginGame(gameMode, selectedDifficulty);
  }

  function submitAnswer(value: string) {
    if (roundState !== "playing" || !questions[index]) return;

    const correct = isCorrectAnswer(value, questions[index]);
    const updatedScore = getUpdatedScore({ score, streak }, correct);
    setAnswer(value);
    setWasCorrect(correct);
    setScore(updatedScore.score);
    setStreak(updatedScore.streak);
    setRoundState("answered");
  }

  function finishGame() {
    if (!gameMode) return;
    clearBoardTransition();
    recordResult(gameMode, score);
    setRoundState("results");
  }

  function selectSpeedMatchFlag(countryCode: string) {
    const target = gameMode === "speed-match-unlimited" ? speedMatchTarget : speedMatchTargets[index];
    if (!isSpeedMatchMode(gameMode) || roundState !== "playing" || !target || removingCode) return;

    if (countryCode !== target.code) {
      setIncorrectCodes((current) => current.includes(countryCode) ? current : [...current, countryCode]);
      setStreak(0);

      window.setTimeout(() => {
        setIncorrectCodes((current) => current.filter((code) => code !== countryCode));
      }, 1800);
      return;
    }

    const nextScore = score + 1;
    setIncorrectCodes([]);
    setScore(nextScore);
    setStreak((current) => current + 1);

    if (gameMode === "speed-match-unlimited") {
      const columnIndex = speedMatchColumns.findIndex((column) => column.some((country) => country.code === countryCode));
      const flagIndex = speedMatchColumns[columnIndex]?.findIndex((country) => country.code === countryCode) ?? -1;
      const queuedFlag = speedMatchQueuedFlags[columnIndex];

      if (columnIndex === -1 || flagIndex === -1 || !queuedFlag) return;

      const shiftedCodes = [
        ...speedMatchColumns[columnIndex].slice(flagIndex + 1),
        queuedFlag,
      ].map((country) => country.code);
      const nextColumns = speedMatchColumns.map((column, currentColumnIndex) => (
        currentColumnIndex === columnIndex
          ? [...column.slice(0, flagIndex), ...column.slice(flagIndex + 1), queuedFlag]
          : column
      ));
      const occupiedCodes = new Set([
        ...nextColumns.flat().map((country) => country.code),
        ...speedMatchQueuedFlags
          .filter((_, currentColumnIndex) => currentColumnIndex !== columnIndex)
          .map((country) => country.code),
      ]);
      let nextDeck = questions;
      let replacementIndex = nextDeck.findIndex((country, currentIndex) => (
        currentIndex >= speedMatchDeckIndex
        && !occupiedCodes.has(country.code)
      ));

      if (replacementIndex === -1) {
        nextDeck = createQuestionDeck("unlimited");
        replacementIndex = nextDeck.findIndex((country) => !occupiedCodes.has(country.code));
      }

      const replacementFlag = nextDeck[replacementIndex];
      const nextQueuedFlags = replacementFlag
        ? speedMatchQueuedFlags.map((country, currentColumnIndex) => currentColumnIndex === columnIndex ? replacementFlag : country)
        : speedMatchQueuedFlags;
      const nextVisibleFlags = nextColumns.flat();
      const gameId = gameIdRef.current;

      setRemovingCode(countryCode);
      transitionTimerRef.current = window.setTimeout(() => {
        if (gameIdRef.current !== gameId) return;

        setQuestions(nextDeck);
        setSpeedMatchDeckIndex(replacementIndex + 1);
        setSpeedMatchColumns(nextColumns);
        setSpeedMatchQueuedFlags(nextQueuedFlags);
        setSpeedMatchTarget(pickSpeedMatchTarget(nextVisibleFlags));
        setRemovingCode(null);
        setPromotedCodes(shiftedCodes);
        transitionTimerRef.current = null;
        promotionTimerRef.current = window.setTimeout(() => {
          if (gameIdRef.current !== gameId) return;
          setPromotedCodes([]);
          promotionTimerRef.current = null;
        }, 380);
      }, 360);
      return;
    }

    setMatchedCodes((current) => [...current, countryCode]);

    if (index === speedMatchTargets.length - 1) {
      recordResult("speed-match", nextScore);
      setRoundState("results");
      return;
    }

    setIndex((current) => current + 1);
  }

  function nextQuestion() {
    if (!gameMode || wasCorrect === null) return;

    const action = getNextRoundAction({
      gameMode,
      correct: wasCorrect,
      deckIndex: index,
      deckSize: questions.length,
    });

    if (action === "results") {
      finishGame();
      return;
    }

    if (action === "reshuffle") {
      setQuestions(createQuestionDeck("unlimited"));
      setIndex(0);
    } else {
      setIndex((current) => current + 1);
    }

    setQuestionNumber((current) => current + 1);
    setAnswer("");
    setHintVisible(false);
    setWasCorrect(null);
    setRoundState("playing");
  }

  useEffect(() => {
    if (!isSpeedMatchMode(gameMode) || roundState !== "playing") return;

    if (timeLeft === 0) {
      finishGame();
      return;
    }

    const timer = window.setTimeout(() => setTimeLeft((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [gameMode, roundState, timeLeft, score]);

  const speedMatchActive = isSpeedMatchMode(gameMode);
  const activeSpeedMatchFlags = gameMode === "speed-match-unlimited" ? speedMatchColumns.flat() : questions;
  const activeSpeedMatchTarget = gameMode === "speed-match-unlimited" ? speedMatchTarget : speedMatchTargets[index];
  const headerValue = speedMatchActive ? score : streak;
  const headerLabel = speedMatchActive ? `${score} flags found` : `${streak} answer streak`;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <span aria-hidden="true">←</span> Hub
        </button>
        <p className="text-base font-black tracking-tight text-white">Flag Blitz</p>
        <div className="flex min-h-12 min-w-20 items-center justify-end gap-1.5 text-sm font-black text-amber-300" aria-label={headerLabel}>
          <span aria-hidden="true">◆</span> {headerValue}
        </div>
      </header>
      {roundState === "selecting-mode" && <GameModeSelector onSelect={selectGameMode} />}
      {gameMode && roundState === "selecting-difficulty" && (
        <DifficultySelector gameMode={gameMode} onSelect={startGame} onBack={() => setRoundState("selecting-mode")} />
      )}
      {gameMode && !speedMatchActive && difficulty && (roundState === "playing" || roundState === "answered") && questions.length > 0 && (
        <QuizRound
          gameMode={gameMode}
          difficulty={difficulty}
          questions={questions}
          index={index}
          questionNumber={questionNumber}
          answer={answer}
          hintVisible={hintVisible}
          answered={roundState === "answered"}
          wasCorrect={wasCorrect}
          onAnswerChange={setAnswer}
          onHint={() => setHintVisible(true)}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
        />
      )}
      {speedMatchActive && roundState === "playing" && activeSpeedMatchFlags.length > 0 && activeSpeedMatchTarget && (
        <SpeedMatchRound
          flags={activeSpeedMatchFlags}
          target={activeSpeedMatchTarget}
          timeLeft={timeLeft}
          score={score}
          total={gameMode === "speed-match" ? questions.length : null}
          matchedCodes={matchedCodes}
          incorrectCodes={incorrectCodes}
          removingCode={removingCode}
          isUnlimited={gameMode === "speed-match-unlimited"}
          columns={gameMode === "speed-match-unlimited" ? speedMatchColumns : null}
          queuedFlags={gameMode === "speed-match-unlimited" ? speedMatchQueuedFlags : null}
          promotedCodes={promotedCodes}
          onSelect={(country) => selectSpeedMatchFlag(country.code)}
        />
      )}
      {gameMode && (difficulty || speedMatchActive) && roundState === "results" && (
        <Results
          gameMode={gameMode}
          score={score}
          total={questions.length}
          streak={streak}
          questionNumber={questionNumber}
          timeLeft={timeLeft}
          difficulty={difficulty}
          onReplay={() => beginGame(gameMode, difficulty)}
          onHub={onBack}
        />
      )}
    </main>
  );
}
