"use client";

import { useEffect, useRef, useState } from "react";
import type { Country } from "@/app/data/countries";
import {
  createQuestionDeck,
  createSpeedMatchTargetDeck,
  createSpeedMatchUnlimitedColumns,
  getRemainingDuration,
  getNextRoundAction,
  getUpdatedScore,
  isCorrectAnswer,
  pickSpeedMatchTarget,
  getTimeLeft,
  restoreDeadline,
  SPEED_MATCH_TIME_LIMIT_MS,
  SPEED_MATCH_UNLIMITED_QUEUED_FLAGS,
  SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS,
  type Difficulty,
  type GameMode,
} from "@/lib/flag-quiz";
import { usePuzzlerStore } from "@/lib/puzzler-store";
import {
  getActiveCountries,
  hasMinimumActiveCountries,
} from "@/lib/puzzler-settings";
import { DifficultySelector } from "./DifficultySelector";
import { GameModeSelector } from "./GameModeSelector";
import { PauseOverlay } from "./PauseOverlay";
import { QuizRound } from "./QuizRound";
import { Results } from "./Results";
import { SpeedMatchRound } from "./SpeedMatchRound";

type RoundState = "selecting-mode" | "selecting-difficulty" | "playing" | "paused" | "answered" | "results";

function isSpeedMatchMode(gameMode: GameMode | null): gameMode is "speed-match" | "speed-match-unlimited" {
  return gameMode === "speed-match" || gameMode === "speed-match-unlimited";
}

export function FlagBlitz({
  onBack,
  onOpenReport,
  onOpenSettings,
}: {
  onBack: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
}) {
  const recordPlay = usePuzzlerStore((state) => state.recordFlagBlitzPlay);
  const recordResult = usePuzzlerStore((state) => state.recordFlagBlitzResult);
  const recordFlagAttempt = usePuzzlerStore((state) => state.recordFlagBlitzAttempt);
  const excludedCountryCodes = usePuzzlerStore((state) => state.flagBlitz.settings.excludedCountryCodes);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<ReturnType<typeof createQuestionDeck>>([]);
  const [countryPool, setCountryPool] = useState<Country[]>([]);
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
  const [wrongFlagName, setWrongFlagName] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [speedMatchCompletionTimeMs, setSpeedMatchCompletionTimeMs] = useState<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const promotionTimerRef = useRef<number | null>(null);
  const wrongFlagTimerRef = useRef<number | null>(null);
  const timerDeadlineRef = useRef<number | null>(null);
  const pausedRemainingDurationRef = useRef<number | null>(null);
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

    if (wrongFlagTimerRef.current !== null) {
      window.clearTimeout(wrongFlagTimerRef.current);
      wrongFlagTimerRef.current = null;
    }
  }

  useEffect(() => () => clearBoardTransition(), []);

  function selectGameMode(selectedGameMode: GameMode) {
    if (!hasMinimumActiveCountries(excludedCountryCodes)) return;

    if (isSpeedMatchMode(selectedGameMode)) {
      beginGame(selectedGameMode, null);
      return;
    }

    setGameMode(selectedGameMode);
    setDifficulty(null);
    setRoundState("selecting-difficulty");
  }

  function beginGame(selectedGameMode: GameMode, selectedDifficulty: Difficulty | null) {
    const nextCountryPool = getActiveCountries(excludedCountryCodes);
    if (!hasMinimumActiveCountries(excludedCountryCodes)) {
      setRoundState("selecting-mode");
      return;
    }

    const nextQuestions = createQuestionDeck(selectedGameMode, nextCountryPool);
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
    timerDeadlineRef.current = selectedGameMode === "speed-match" ? Date.now() + SPEED_MATCH_TIME_LIMIT_MS : null;
    pausedRemainingDurationRef.current = null;
    setGameMode(selectedGameMode);
    setDifficulty(selectedDifficulty);
    setQuestions(nextQuestions);
    setCountryPool(nextCountryPool);
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
    setWrongFlagName(null);
    setTimeLeft(SPEED_MATCH_TIME_LIMIT_MS / 1_000);
    setSpeedMatchCompletionTimeMs(null);
    recordPlay();
  }

  function startGame(selectedDifficulty: Difficulty) {
    if (!gameMode) return;
    beginGame(gameMode, selectedDifficulty);
  }

  function submitAnswer(value: string) {
    if (roundState !== "playing" || !gameMode || !questions[index]) return;

    const correct = isCorrectAnswer(value, questions[index]);
    const updatedScore = getUpdatedScore({ score, streak }, correct);
    recordFlagAttempt(gameMode, questions[index].code, correct);
    setAnswer(value);
    setWasCorrect(correct);
    setScore(updatedScore.score);
    setStreak(updatedScore.streak);
    setRoundState("answered");
  }

  function finishGame() {
    if (!gameMode) return;
    clearBoardTransition();
    timerDeadlineRef.current = null;
    pausedRemainingDurationRef.current = null;
    recordResult(gameMode, score);
    setRoundState("results");
  }

  function pauseGame() {
    if (roundState !== "playing" || removingCode) return;

    if (gameMode === "speed-match" && timerDeadlineRef.current !== null) {
      pausedRemainingDurationRef.current = getRemainingDuration(timerDeadlineRef.current);
      timerDeadlineRef.current = null;
    }

    setRoundState("paused");
  }

  function resumeGame() {
    if (roundState !== "paused") return;

    if (gameMode === "speed-match" && pausedRemainingDurationRef.current !== null) {
      timerDeadlineRef.current = restoreDeadline(pausedRemainingDurationRef.current);
      setTimeLeft(getTimeLeft(timerDeadlineRef.current));
    }

    pausedRemainingDurationRef.current = null;
    setRoundState("playing");
  }

  function abandonGame() {
    gameIdRef.current += 1;
    clearBoardTransition();
    timerDeadlineRef.current = null;
    pausedRemainingDurationRef.current = null;
    onBack();
  }

  function selectSpeedMatchFlag(countryCode: string) {
    const target = gameMode === "speed-match-unlimited" ? speedMatchTarget : speedMatchTargets[index];
    const selectedFlag = gameMode === "speed-match-unlimited"
      ? speedMatchColumns.flat().find((country) => country.code === countryCode)
      : questions.find((country) => country.code === countryCode);
    if (!isSpeedMatchMode(gameMode) || roundState !== "playing" || !target || removingCode) return;

    if (gameMode === "speed-match" && timerDeadlineRef.current !== null && getRemainingDuration(timerDeadlineRef.current) === 0) {
      setTimeLeft(0);
      return;
    }

    recordFlagAttempt(gameMode, target.code, countryCode === target.code);

    if (countryCode !== target.code) {
      const gameId = gameIdRef.current;
      setIncorrectCodes((current) => current.includes(countryCode) ? current : [...current, countryCode]);
      setStreak(0);

      if (selectedFlag) {
        if (wrongFlagTimerRef.current !== null) window.clearTimeout(wrongFlagTimerRef.current);
        setWrongFlagName(selectedFlag.name);
        wrongFlagTimerRef.current = window.setTimeout(() => {
          if (gameIdRef.current !== gameId) return;
          setWrongFlagName(null);
          wrongFlagTimerRef.current = null;
        }, 1_800);
      }

      window.setTimeout(() => {
        if (gameIdRef.current !== gameId) return;
        setIncorrectCodes((current) => current.filter((code) => code !== countryCode));
      }, 1800);
      return;
    }

    const nextScore = score + 1;
    setIncorrectCodes([]);
    if (wrongFlagTimerRef.current !== null) {
      window.clearTimeout(wrongFlagTimerRef.current);
      wrongFlagTimerRef.current = null;
    }
    setWrongFlagName(null);
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
        nextDeck = createQuestionDeck("speed-match-unlimited", countryPool);
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
      const completionTimeMs = timerDeadlineRef.current === null
        ? undefined
        : SPEED_MATCH_TIME_LIMIT_MS - getRemainingDuration(timerDeadlineRef.current);

      setSpeedMatchCompletionTimeMs(completionTimeMs ?? null);
      recordResult("speed-match", nextScore, completionTimeMs);
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
      setQuestions(createQuestionDeck("unlimited", countryPool));
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
    if (gameMode !== "speed-match" || roundState !== "playing") return;

    function syncTimer() {
      if (timerDeadlineRef.current === null) return;
      const nextTimeLeft = getTimeLeft(timerDeadlineRef.current);
      setTimeLeft((current) => current === nextTimeLeft ? current : nextTimeLeft);
    }

    syncTimer();
    const timer = window.setInterval(syncTimer, 250);
    return () => window.clearInterval(timer);
  }, [gameMode, roundState]);

  useEffect(() => {
    if (gameMode === "speed-match" && roundState === "playing" && timeLeft === 0) finishGame();
  }, [gameMode, roundState, timeLeft]);

  const speedMatchActive = isSpeedMatchMode(gameMode);
  const activeSpeedMatchFlags = gameMode === "speed-match-unlimited" ? speedMatchColumns.flat() : questions;
  const activeSpeedMatchTarget = gameMode === "speed-match-unlimited" ? speedMatchTarget : speedMatchTargets[index];
  const headerValue = speedMatchActive ? score : streak;
  const headerLabel = speedMatchActive ? `${score} flags found` : `${streak} answer streak`;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        {roundState === "playing" ? (
          <button type="button" onClick={pauseGame} disabled={removingCode !== null} aria-label="Pause game" className="grid h-12 w-12 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-lg font-black text-cyan-300 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span aria-hidden="true">Ⅱ</span>
          </button>
        ) : (
          <button type="button" onClick={abandonGame} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span aria-hidden="true">←</span> Hub
          </button>
        )}
        <p className="text-base font-black tracking-tight text-white">Flag Blitz</p>
        <div className="flex min-h-12 min-w-20 items-center justify-end gap-1.5 text-base font-black text-amber-300" aria-label={headerLabel}>
          <span aria-hidden="true">◆</span> {headerValue}
        </div>
      </header>
      {roundState === "selecting-mode" && (
        <GameModeSelector
          onSelect={selectGameMode}
          onOpenReport={onOpenReport}
          onOpenSettings={onOpenSettings}
          disabled={!hasMinimumActiveCountries(excludedCountryCodes)}
        />
      )}
      {gameMode && roundState === "selecting-difficulty" && (
        <DifficultySelector gameMode={gameMode} onSelect={startGame} onBack={() => setRoundState("selecting-mode")} />
      )}
      {gameMode && !speedMatchActive && difficulty && (roundState === "playing" || roundState === "answered") && questions.length > 0 && (
        <QuizRound
          gameMode={gameMode}
          difficulty={difficulty}
          questions={questions}
          countryPool={countryPool}
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
          timeLeft={gameMode === "speed-match" ? timeLeft : null}
          score={score}
          total={gameMode === "speed-match" ? questions.length : null}
          matchedCodes={matchedCodes}
          incorrectCodes={incorrectCodes}
          removingCode={removingCode}
          isUnlimited={gameMode === "speed-match-unlimited"}
          columns={gameMode === "speed-match-unlimited" ? speedMatchColumns : null}
          queuedFlags={gameMode === "speed-match-unlimited" ? speedMatchQueuedFlags : null}
          promotedCodes={promotedCodes}
          wrongFlagName={wrongFlagName}
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
          speedMatchCompletionTimeMs={speedMatchCompletionTimeMs}
          difficulty={difficulty}
          onReplay={() => beginGame(gameMode, difficulty)}
          onHub={onBack}
        />
      )}
      {roundState === "paused" && gameMode && (
        <PauseOverlay
          onResume={resumeGame}
          onRestart={() => beginGame(gameMode, difficulty)}
          onEndRun={finishGame}
          onHub={abandonGame}
        />
      )}
    </main>
  );
}
