"use client";

import { useEffect, useRef, useState } from "react";
import type { Country } from "@/app/data/countries";
import {
  FLAG_MATCH_TIMED_CORRECT_BONUS_MS,
  createQuestionDeck,
  createSpeedMatchTargetDeck,
  createSpeedMatchUnlimitedColumns,
  extendDeadline,
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
import {
  trackFirstGameCompletion,
  trackGameAbandoned,
  trackGameCompleted,
  trackGameStarted,
  trackReplayStarted,
  type AnalyticsDifficulty,
} from "@/lib/analytics";
import { DifficultySelector } from "./DifficultySelector";
import { GameModeSelector } from "./GameModeSelector";
import { GameHeader } from "./GameHeader";
import { PauseOverlay } from "./PauseOverlay";
import { QuizRound } from "./QuizRound";
import { Results } from "./Results";
import { SpeedMatchRound } from "./SpeedMatchRound";

type RoundState = "challenge-intro" | "selecting-mode" | "selecting-difficulty" | "selecting-speed-match-timer" | "playing" | "paused" | "answered" | "results";
export type FlagBlitzEntry = "standard" | "flag-match-challenge" | "flag-match-timer-selection";

const FLAG_MATCH_TRANSITION_DURATION_MS = 300;
const FLAG_MATCH_REWARD_DURATION_MS = 600;

type LeavingFlag = {
  country: Country;
  columnIndex: number;
  flagIndex: number;
};

function isSpeedMatchMode(gameMode: GameMode | null): gameMode is "speed-match" | "flag-match-unlimited" {
  return gameMode === "speed-match" || gameMode === "flag-match-unlimited";
}

function isTimedSpeedMatchRun(gameMode: GameMode | null, speedMatchUnlimitedTimed: boolean): boolean {
  return gameMode === "speed-match" || (gameMode === "flag-match-unlimited" && speedMatchUnlimitedTimed);
}

export function FlagBlitz({
  onBack,
  onOpenReport,
  onOpenSettings,
  entry = "standard",
  onExploreModes,
  onSelectFlagMatchUnlimited,
}: {
  onBack: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  entry?: FlagBlitzEntry;
  onExploreModes?: () => void;
  onSelectFlagMatchUnlimited?: () => void;
}) {
  const recordPlay = usePuzzlerStore((state) => state.recordFlagBlitzPlay);
  const recordResult = usePuzzlerStore((state) => state.recordFlagBlitzResult);
  const recordFlagAttempt = usePuzzlerStore((state) => state.recordFlagBlitzAttempt);
  const excludedCountryCodes = usePuzzlerStore((state) => state.flagBlitz.settings.excludedCountryCodes);
  const [gameMode, setGameMode] = useState<GameMode | null>(entry === "flag-match-timer-selection" ? "flag-match-unlimited" : null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<ReturnType<typeof createQuestionDeck>>([]);
  const [countryPool, setCountryPool] = useState<Country[]>([]);
  const [speedMatchTargets, setSpeedMatchTargets] = useState<ReturnType<typeof createQuestionDeck>>([]);
  const [speedMatchColumns, setSpeedMatchColumns] = useState<Country[][]>([]);
  const [speedMatchQueuedFlags, setSpeedMatchQueuedFlags] = useState<Array<Country | null>>([]);
  const [speedMatchTarget, setSpeedMatchTarget] = useState<Country | null>(null);
  const [speedMatchDeckIndex, setSpeedMatchDeckIndex] = useState(0);
  const [removingCode, setRemovingCode] = useState<string | null>(null);
  const [leavingFlag, setLeavingFlag] = useState<LeavingFlag | null>(null);
  const [promotedCodes, setPromotedCodes] = useState<string[]>([]);
  const [correctFeedbackVisible, setCorrectFeedbackVisible] = useState(false);
  const [correctFeedbackId, setCorrectFeedbackId] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(
    entry === "flag-match-challenge"
      ? "challenge-intro"
      : entry === "flag-match-timer-selection"
        ? "selecting-speed-match-timer"
        : "selecting-mode",
  );
  const [index, setIndex] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [incorrectCodes, setIncorrectCodes] = useState<string[]>([]);
  const [wrongFlagName, setWrongFlagName] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timeLeftMs, setTimeLeftMs] = useState(SPEED_MATCH_TIME_LIMIT_MS);
  const [timerBonusSeconds, setTimerBonusSeconds] = useState<number | null>(null);
  const [speedMatchCompletionTimeMs, setSpeedMatchCompletionTimeMs] = useState<number | null>(null);
  const [runDurationMs, setRunDurationMs] = useState<number | null>(null);
  const [speedMatchUnlimitedTimed, setSpeedMatchUnlimitedTimed] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const correctFeedbackTimerRef = useRef<number | null>(null);
  const wrongFlagTimerRef = useRef<number | null>(null);
  const timerBonusTimerRef = useRef<number | null>(null);
  const timerDeadlineRef = useRef<number | null>(null);
  const pausedRemainingDurationRef = useRef<number | null>(null);
  const gameIdRef = useRef(0);
  const runStartedAtRef = useRef<number | null>(null);
  const runPausedAtRef = useRef<number | null>(null);
  const pausedRunDurationRef = useRef(0);
  const activeRunRef = useRef(false);

  function clearBoardTransition() {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (correctFeedbackTimerRef.current !== null) {
      window.clearTimeout(correctFeedbackTimerRef.current);
      correctFeedbackTimerRef.current = null;
    }

    if (wrongFlagTimerRef.current !== null) {
      window.clearTimeout(wrongFlagTimerRef.current);
      wrongFlagTimerRef.current = null;
    }
  }

  function showTimerBonus(seconds: number) {
    if (timerBonusTimerRef.current !== null) window.clearTimeout(timerBonusTimerRef.current);
    setTimerBonusSeconds(seconds);
    timerBonusTimerRef.current = window.setTimeout(() => {
      setTimerBonusSeconds(null);
      timerBonusTimerRef.current = null;
    }, 1_000);
  }

  function showCorrectFeedback() {
    if (correctFeedbackTimerRef.current !== null) window.clearTimeout(correctFeedbackTimerRef.current);
    setCorrectFeedbackId((current) => current + 1);
    setCorrectFeedbackVisible(true);
    correctFeedbackTimerRef.current = window.setTimeout(() => {
      setCorrectFeedbackVisible(false);
      setLeavingFlag(null);
      correctFeedbackTimerRef.current = null;
    }, FLAG_MATCH_REWARD_DURATION_MS);
  }

  useEffect(() => () => clearBoardTransition(), []);

  function getRunDurationMs(): number {
    if (runStartedAtRef.current === null) return 0;
    const activePausedDuration = runPausedAtRef.current === null ? 0 : Date.now() - runPausedAtRef.current;
    return Math.max(0, Date.now() - runStartedAtRef.current - pausedRunDurationRef.current - activePausedDuration);
  }

  function getTrackingContext(selectedGameMode = gameMode, selectedDifficulty = difficulty, timedUnlimited = speedMatchUnlimitedTimed) {
    if (!selectedGameMode) return null;

    const context: {
      game: "flag_blitz";
      mode: GameMode;
      difficulty?: AnalyticsDifficulty;
      timer_enabled?: boolean;
    } = {
      game: "flag_blitz" as const,
      mode: selectedGameMode,
    };

    if (selectedDifficulty) context.difficulty = selectedDifficulty as AnalyticsDifficulty;
    if (isSpeedMatchMode(selectedGameMode)) context.timer_enabled = isTimedSpeedMatchRun(selectedGameMode, timedUnlimited);

    return context;
  }

  function recordActiveRunAbandonment() {
    if (!activeRunRef.current) return;
    const context = getTrackingContext();
    activeRunRef.current = false;
    if (!context) return;

    void trackGameAbandoned({
      ...context,
      duration_ms: getRunDurationMs(),
      progress: score,
    });
  }

  function selectGameMode(selectedGameMode: GameMode) {
    if (!hasMinimumActiveCountries(excludedCountryCodes)) return;

    if (selectedGameMode === "flag-match-unlimited" && onSelectFlagMatchUnlimited) {
      onSelectFlagMatchUnlimited();
      return;
    }

    if (selectedGameMode === "speed-match") {
      beginGame(selectedGameMode, null, false);
      return;
    }

    if (selectedGameMode === "flag-match-unlimited") {
      setGameMode(selectedGameMode);
      setDifficulty(null);
      setRoundState("selecting-speed-match-timer");
      return;
    }

    setGameMode(selectedGameMode);
    setDifficulty(null);
    setRoundState("selecting-difficulty");
  }

  function beginGame(selectedGameMode: GameMode, selectedDifficulty: Difficulty | null, timedUnlimited = speedMatchUnlimitedTimed) {
    const nextCountryPool = getActiveCountries(excludedCountryCodes);
    if (!hasMinimumActiveCountries(excludedCountryCodes)) {
      setRoundState("selecting-mode");
      return;
    }

    const nextQuestions = createQuestionDeck(selectedGameMode, nextCountryPool);
    const isSpeedMatchUnlimited = selectedGameMode === "flag-match-unlimited";
    const initialVisibleFlags = isSpeedMatchUnlimited
      ? nextQuestions.slice(0, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS)
      : [];
    const initialColumns = createSpeedMatchUnlimitedColumns(initialVisibleFlags);
    const initialQueuedFlags: Array<Country | null> = isSpeedMatchUnlimited
      ? nextQuestions.slice(SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS + SPEED_MATCH_UNLIMITED_QUEUED_FLAGS)
      : [];

    recordActiveRunAbandonment();
    gameIdRef.current += 1;
    clearBoardTransition();
    timerDeadlineRef.current = isTimedSpeedMatchRun(selectedGameMode, timedUnlimited) ? Date.now() + SPEED_MATCH_TIME_LIMIT_MS : null;
    pausedRemainingDurationRef.current = null;
    setGameMode(selectedGameMode);
    setDifficulty(selectedDifficulty);
    setSpeedMatchUnlimitedTimed(selectedGameMode === "flag-match-unlimited" && timedUnlimited);
    setQuestions(nextQuestions);
    setCountryPool(nextCountryPool);
    setSpeedMatchTargets(selectedGameMode === "speed-match" ? createSpeedMatchTargetDeck(nextQuestions) : []);
    setSpeedMatchColumns(initialColumns);
    setSpeedMatchQueuedFlags(initialQueuedFlags);
    setSpeedMatchTarget(pickSpeedMatchTarget(initialVisibleFlags));
    setSpeedMatchDeckIndex(initialVisibleFlags.length + initialQueuedFlags.filter((country) => country !== null).length);
    setRemovingCode(null);
    setLeavingFlag(null);
    setPromotedCodes([]);
    setCorrectFeedbackVisible(false);
    setRoundState("playing");
    setIndex(0);
    setQuestionNumber(1);
    setScore(0);
    setStreak(0);
    setMistakes(0);
    setAnswer("");
    setHintVisible(false);
    setWasCorrect(null);
    setMatchedCodes([]);
    setIncorrectCodes([]);
    setWrongFlagName(null);
    setTimeLeft(SPEED_MATCH_TIME_LIMIT_MS / 1_000);
    setTimeLeftMs(SPEED_MATCH_TIME_LIMIT_MS);
    setTimerBonusSeconds(null);
    setSpeedMatchCompletionTimeMs(null);
    setRunDurationMs(null);
    runStartedAtRef.current = Date.now();
    runPausedAtRef.current = null;
    pausedRunDurationRef.current = 0;
    activeRunRef.current = true;
    recordPlay();
    const context = getTrackingContext(selectedGameMode, selectedDifficulty, timedUnlimited);
    if (context) void trackGameStarted(context);
  }

  function startGame(selectedDifficulty: Difficulty) {
    if (!gameMode) return;
    beginGame(gameMode, selectedDifficulty);
  }

  function startFlagMatchChallenge() {
    beginGame("flag-match-unlimited", null, true);
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

  function finishGame(finalScore = score, completionTimeMs?: number) {
    if (!gameMode || !activeRunRef.current) return;
    clearBoardTransition();
    timerDeadlineRef.current = null;
    pausedRemainingDurationRef.current = null;
    activeRunRef.current = false;
    const context = getTrackingContext();
    const durationMs = getRunDurationMs();
    setRunDurationMs(durationMs);
    recordResult(gameMode, finalScore, completionTimeMs);
    if (context) {
      void trackGameCompleted({
        ...context,
        score: finalScore,
        duration_ms: durationMs,
        progress: finalScore,
      });
      void trackFirstGameCompletion("flag_blitz");
    }
    setRoundState("results");
  }

  function pauseGame() {
    if (roundState !== "playing" || removingCode) return;

    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && timerDeadlineRef.current !== null) {
      pausedRemainingDurationRef.current = getRemainingDuration(timerDeadlineRef.current);
      timerDeadlineRef.current = null;
    }

    runPausedAtRef.current = Date.now();

    setRoundState("paused");
  }

  function resumeGame() {
    if (roundState !== "paused") return;

    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && pausedRemainingDurationRef.current !== null) {
      timerDeadlineRef.current = restoreDeadline(pausedRemainingDurationRef.current);
      setTimeLeft(getTimeLeft(timerDeadlineRef.current));
      setTimeLeftMs(getRemainingDuration(timerDeadlineRef.current));
    }

    if (runPausedAtRef.current !== null) {
      pausedRunDurationRef.current += Date.now() - runPausedAtRef.current;
      runPausedAtRef.current = null;
    }
    pausedRemainingDurationRef.current = null;
    setRoundState("playing");
  }

  function abandonGame() {
    recordActiveRunAbandonment();
    gameIdRef.current += 1;
    clearBoardTransition();
    timerDeadlineRef.current = null;
    pausedRemainingDurationRef.current = null;
    onBack();
  }

  function selectSpeedMatchFlag(countryCode: string) {
    const target = gameMode === "flag-match-unlimited" ? speedMatchTarget : speedMatchTargets[index];
    const selectedFlag = gameMode === "flag-match-unlimited"
      ? speedMatchColumns.flat().find((country) => country.code === countryCode)
      : questions.find((country) => country.code === countryCode);
    if (!isSpeedMatchMode(gameMode) || roundState !== "playing" || !target || removingCode) return;

    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && timerDeadlineRef.current !== null && getRemainingDuration(timerDeadlineRef.current) === 0) {
      setTimeLeft(0);
      setTimeLeftMs(0);
      return;
    }

    recordFlagAttempt(gameMode, target.code, countryCode === target.code);

    if (countryCode !== target.code) {
      const gameId = gameIdRef.current;
      setIncorrectCodes((current) => current.includes(countryCode) ? current : [...current, countryCode]);
      setStreak(0);
      setMistakes((current) => current + 1);

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

    if (gameMode === "flag-match-unlimited" && speedMatchUnlimitedTimed && timerDeadlineRef.current !== null) {
      timerDeadlineRef.current = extendDeadline(timerDeadlineRef.current, FLAG_MATCH_TIMED_CORRECT_BONUS_MS);
      setTimeLeft(getTimeLeft(timerDeadlineRef.current));
      setTimeLeftMs(getRemainingDuration(timerDeadlineRef.current));
      showTimerBonus(FLAG_MATCH_TIMED_CORRECT_BONUS_MS / 1_000);
    }

    if (gameMode === "flag-match-unlimited") {
      showCorrectFeedback();
      const columnIndex = speedMatchColumns.findIndex((column) => column.some((country) => country.code === countryCode));
      const flagIndex = speedMatchColumns[columnIndex]?.findIndex((country) => country.code === countryCode) ?? -1;
      const queuedFlag = speedMatchQueuedFlags[columnIndex];

      if (columnIndex === -1 || flagIndex === -1 || !selectedFlag) return;

      const shiftedCodes = [
        ...speedMatchColumns[columnIndex].slice(flagIndex + 1),
        ...(queuedFlag ? [queuedFlag] : []),
      ].map((country) => country.code);
      const nextColumns = speedMatchColumns.map((column, currentColumnIndex) => (
        currentColumnIndex === columnIndex
          ? [...column.slice(0, flagIndex), ...column.slice(flagIndex + 1), ...(queuedFlag ? [queuedFlag] : [])]
          : column
      ));
      const occupiedCodes = new Set([
        ...nextColumns.flat().map((country) => country.code),
        ...speedMatchQueuedFlags
          .filter((country, currentColumnIndex): country is Country => currentColumnIndex !== columnIndex && country !== null)
          .map((country) => country.code),
      ]);
      const replacementIndex = questions.findIndex((country, currentIndex) => (
        currentIndex >= speedMatchDeckIndex
        && !occupiedCodes.has(country.code)
      ));
      const replacementFlag = replacementIndex === -1 ? null : questions[replacementIndex];
      const nextQueuedFlags = speedMatchQueuedFlags.map((country, currentColumnIndex) => (
        currentColumnIndex === columnIndex ? replacementFlag : country
      ));
      const nextVisibleFlags = nextColumns.flat();
      const gameId = gameIdRef.current;

      if (nextVisibleFlags.length === 0) {
        finishGame(nextScore);
        return;
      }

      setRemovingCode(countryCode);
      setLeavingFlag({ country: selectedFlag, columnIndex, flagIndex });
      setSpeedMatchDeckIndex(replacementFlag ? replacementIndex + 1 : speedMatchDeckIndex);
      setSpeedMatchColumns(nextColumns);
      setSpeedMatchQueuedFlags(nextQueuedFlags);
      setSpeedMatchTarget(pickSpeedMatchTarget(nextVisibleFlags));
      setPromotedCodes(shiftedCodes);
      transitionTimerRef.current = window.setTimeout(() => {
        if (gameIdRef.current !== gameId) return;

        setRemovingCode(null);
        setPromotedCodes([]);
        transitionTimerRef.current = null;
      }, FLAG_MATCH_TRANSITION_DURATION_MS);
      return;
    }

    setMatchedCodes((current) => [...current, countryCode]);

    if (index === speedMatchTargets.length - 1) {
      const completionTimeMs = timerDeadlineRef.current === null
        ? undefined
        : SPEED_MATCH_TIME_LIMIT_MS - getRemainingDuration(timerDeadlineRef.current);

      setSpeedMatchCompletionTimeMs(completionTimeMs ?? null);
      finishGame(nextScore, completionTimeMs);
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
    if (!isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) || roundState !== "playing") return;

    function syncTimer() {
      if (timerDeadlineRef.current === null) return;
      const remainingDuration = getRemainingDuration(timerDeadlineRef.current);
      const nextTimeLeft = getTimeLeft(timerDeadlineRef.current);
      setTimeLeft((current) => current === nextTimeLeft ? current : nextTimeLeft);
      setTimeLeftMs((current) => current === remainingDuration ? current : remainingDuration);
    }

    syncTimer();
    const timer = window.setInterval(syncTimer, 100);
    return () => window.clearInterval(timer);
  }, [gameMode, roundState, speedMatchUnlimitedTimed]);

  useEffect(() => {
    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && roundState === "playing" && timeLeft === 0) finishGame();
  }, [gameMode, roundState, speedMatchUnlimitedTimed, timeLeft]);

  const speedMatchActive = isSpeedMatchMode(gameMode);
  const activeSpeedMatchFlags = gameMode === "flag-match-unlimited" ? speedMatchColumns.flat() : questions;
  const activeSpeedMatchTarget = gameMode === "flag-match-unlimited" ? speedMatchTarget : speedMatchTargets[index];
  const timedSpeedMatchActive = isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed);
  const isFlagMatchUnlimited = gameMode === "flag-match-unlimited";
  const isSpeedMatch = gameMode === "speed-match";
  const headerValue = speedMatchActive ? score : streak;
  const headerLabel = speedMatchActive ? `${score} flags found` : `${streak} answer streak`;
  const showClassicHeaderScore = (gameMode === "classic" || gameMode === "unlimited")
    && (roundState === "playing" || roundState === "answered");
  const headerScore = showClassicHeaderScore
    ? { value: headerValue, label: headerLabel }
    : null;
  const headerTitle = isFlagMatchUnlimited ? "Flag Match Unlimited" : isSpeedMatch ? "Speed Match" : "Flag Blitz";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <GameHeader
        title={headerTitle}
        isPlaying={roundState === "playing"}
        score={headerScore}
        pauseDisabled={removingCode !== null}
        onBack={abandonGame}
        onPause={pauseGame}
      />
      {roundState === "selecting-mode" && (
        <GameModeSelector
          onSelect={selectGameMode}
          onOpenReport={onOpenReport}
          onOpenSettings={onOpenSettings}
          disabled={!hasMinimumActiveCountries(excludedCountryCodes)}
        />
      )}
      {roundState === "challenge-intro" && (
        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="flag-match-challenge-title">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Match</p>
          <h1 id="flag-match-challenge-title" className="mt-2 text-4xl font-black tracking-tight text-white">Flag Match: 60-Second Challenge</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-slate-400">Find the named country&apos;s flag. Every correct answer adds two seconds.</p>
          <button type="button" autoFocus onClick={startFlagMatchChallenge} disabled={!hasMinimumActiveCountries(excludedCountryCodes)} className="mx-auto mt-8 min-h-14 w-full max-w-sm rounded-2xl bg-cyan-300 px-5 font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Start challenge</button>
        </section>
      )}
      {gameMode && roundState === "selecting-difficulty" && (
        <DifficultySelector gameMode={gameMode} onSelect={startGame} onBack={() => setRoundState("selecting-mode")} />
      )}
      {gameMode === "flag-match-unlimited" && roundState === "selecting-speed-match-timer" && (
        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="timer-choice-title">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Match Unlimited</p>
          <h1 id="timer-choice-title" className="mt-2 text-4xl font-black tracking-tight text-white">Choose your timer</h1>
          <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
            <button type="button" autoFocus onClick={() => beginGame("flag-match-unlimited", null, true)} className="group min-h-16 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 text-left font-black text-white transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus-visible:border-cyan-300 focus-visible:bg-cyan-300 focus-visible:text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">60-second timer<span className="mt-1 block text-sm font-semibold text-slate-500 transition group-hover:text-slate-700 group-focus-visible:text-slate-700">Every correct flag adds 2 seconds.</span></button>
            <button type="button" onClick={() => beginGame("flag-match-unlimited", null, false)} className="group min-h-16 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 text-left font-black text-white transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus-visible:border-cyan-300 focus-visible:bg-cyan-300 focus-visible:text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">No timer<span className="mt-1 block text-sm font-semibold text-slate-500 transition group-hover:text-slate-700 group-focus-visible:text-slate-700">Play until you save the run.</span></button>
            <button type="button" onClick={() => setRoundState("selecting-mode")} className="min-h-12 w-full rounded-2xl px-5 font-black text-slate-400 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Back to modes</button>
          </div>
        </section>
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
          timeLeft={timedSpeedMatchActive ? timeLeft : null}
          timeLeftMs={timedSpeedMatchActive ? timeLeftMs : null}
          timerBonusSeconds={timedSpeedMatchActive ? timerBonusSeconds : null}
          score={score}
          mistakes={mistakes}
          total={gameMode === "speed-match" || gameMode === "flag-match-unlimited" ? questions.length : null}
          matchedCodes={matchedCodes}
          incorrectCodes={incorrectCodes}
          removingCode={removingCode}
          leavingFlag={leavingFlag}
          isUnlimited={gameMode === "flag-match-unlimited"}
          columns={gameMode === "flag-match-unlimited" ? speedMatchColumns : null}
          queuedFlags={gameMode === "flag-match-unlimited" ? speedMatchQueuedFlags : null}
          promotedCodes={promotedCodes}
          correctFeedbackVisible={correctFeedbackVisible}
          correctFeedbackId={correctFeedbackId}
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
          speedMatchCompletionTimeMs={speedMatchCompletionTimeMs}
          runDurationMs={runDurationMs}
          mistakes={mistakes}
          difficulty={difficulty}
          onReplay={() => {
            const context = getTrackingContext();
            if (context) void trackReplayStarted(context);
            beginGame(gameMode, difficulty, speedMatchUnlimitedTimed);
          }}
          onHub={onBack}
          secondaryActionLabel={entry === "flag-match-challenge" ? "Explore other games/modes" : undefined}
          onSecondaryAction={entry === "flag-match-challenge" ? onExploreModes : undefined}
        />
      )}
      {roundState === "paused" && gameMode && (
        <PauseOverlay
          onResume={resumeGame}
          onRestart={() => beginGame(gameMode, difficulty, speedMatchUnlimitedTimed)}
          onEndRun={finishGame}
          onHub={abandonGame}
        />
      )}
    </main>
  );
}
