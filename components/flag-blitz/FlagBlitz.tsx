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
import { DifficultySelector } from "./DifficultySelector";
import { GameModeSelector } from "./GameModeSelector";
import { PauseOverlay } from "./PauseOverlay";
import { QuizRound } from "./QuizRound";
import { Results } from "./Results";
import { SpeedMatchRound } from "./SpeedMatchRound";

type RoundState = "selecting-mode" | "selecting-difficulty" | "selecting-speed-match-timer" | "playing" | "paused" | "answered" | "results";

function isSpeedMatchMode(gameMode: GameMode | null): gameMode is "speed-match" | "speed-match-unlimited" {
  return gameMode === "speed-match" || gameMode === "speed-match-unlimited";
}

function isTimedSpeedMatchRun(gameMode: GameMode | null, speedMatchUnlimitedTimed: boolean): boolean {
  return gameMode === "speed-match" || (gameMode === "speed-match-unlimited" && speedMatchUnlimitedTimed);
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
  const [timerBonusSeconds, setTimerBonusSeconds] = useState<number | null>(null);
  const [speedMatchCompletionTimeMs, setSpeedMatchCompletionTimeMs] = useState<number | null>(null);
  const [speedMatchUnlimitedTimed, setSpeedMatchUnlimitedTimed] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const promotionTimerRef = useRef<number | null>(null);
  const wrongFlagTimerRef = useRef<number | null>(null);
  const timerBonusTimerRef = useRef<number | null>(null);
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

  function showTimerBonus(seconds: number) {
    if (timerBonusTimerRef.current !== null) window.clearTimeout(timerBonusTimerRef.current);
    setTimerBonusSeconds(seconds);
    timerBonusTimerRef.current = window.setTimeout(() => {
      setTimerBonusSeconds(null);
      timerBonusTimerRef.current = null;
    }, 1_000);
  }

  useEffect(() => () => clearBoardTransition(), []);

  function selectGameMode(selectedGameMode: GameMode) {
    if (!hasMinimumActiveCountries(excludedCountryCodes)) return;

    if (selectedGameMode === "speed-match") {
      beginGame(selectedGameMode, null, false);
      return;
    }

    if (selectedGameMode === "speed-match-unlimited") {
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
    timerDeadlineRef.current = isTimedSpeedMatchRun(selectedGameMode, timedUnlimited) ? Date.now() + SPEED_MATCH_TIME_LIMIT_MS : null;
    pausedRemainingDurationRef.current = null;
    setGameMode(selectedGameMode);
    setDifficulty(selectedDifficulty);
    setSpeedMatchUnlimitedTimed(selectedGameMode === "speed-match-unlimited" && timedUnlimited);
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
    setTimerBonusSeconds(null);
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

    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && timerDeadlineRef.current !== null) {
      pausedRemainingDurationRef.current = getRemainingDuration(timerDeadlineRef.current);
      timerDeadlineRef.current = null;
    }

    setRoundState("paused");
  }

  function resumeGame() {
    if (roundState !== "paused") return;

    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && pausedRemainingDurationRef.current !== null) {
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

    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && timerDeadlineRef.current !== null && getRemainingDuration(timerDeadlineRef.current) === 0) {
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

    if (gameMode === "speed-match-unlimited" && speedMatchUnlimitedTimed && timerDeadlineRef.current !== null) {
      timerDeadlineRef.current = extendDeadline(timerDeadlineRef.current, FLAG_MATCH_TIMED_CORRECT_BONUS_MS);
      setTimeLeft(getTimeLeft(timerDeadlineRef.current));
      showTimerBonus(FLAG_MATCH_TIMED_CORRECT_BONUS_MS / 1_000);
    }

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
    if (!isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) || roundState !== "playing") return;

    function syncTimer() {
      if (timerDeadlineRef.current === null) return;
      const nextTimeLeft = getTimeLeft(timerDeadlineRef.current);
      setTimeLeft((current) => current === nextTimeLeft ? current : nextTimeLeft);
    }

    syncTimer();
    const timer = window.setInterval(syncTimer, 250);
    return () => window.clearInterval(timer);
  }, [gameMode, roundState, speedMatchUnlimitedTimed]);

  useEffect(() => {
    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && roundState === "playing" && timeLeft === 0) finishGame();
  }, [gameMode, roundState, speedMatchUnlimitedTimed, timeLeft]);

  const speedMatchActive = isSpeedMatchMode(gameMode);
  const activeSpeedMatchFlags = gameMode === "speed-match-unlimited" ? speedMatchColumns.flat() : questions;
  const activeSpeedMatchTarget = gameMode === "speed-match-unlimited" ? speedMatchTarget : speedMatchTargets[index];
  const timedSpeedMatchActive = isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed);
  const pauseInTimerRow = gameMode === "speed-match" && timedSpeedMatchActive;
  const headerValue = speedMatchActive ? score : streak;
  const headerLabel = speedMatchActive ? `${score} flags found` : `${streak} answer streak`;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-2">
        {roundState === "playing" ? (
          <button type="button" onClick={abandonGame} aria-label="Back to Hub" className="flex min-h-12 shrink-0 items-center gap-1 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span aria-hidden="true">←</span> Back to Hub
          </button>
        ) : (
          <button type="button" onClick={abandonGame} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span aria-hidden="true">←</span> Back to Hub
          </button>
        )}
        <p className="min-w-0 flex-1 text-center text-sm font-black tracking-tight text-white sm:text-base">Flag Blitz</p>
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl border border-amber-300/15 bg-amber-300/5 px-2 text-sm font-black text-amber-300" aria-label={headerLabel}>
            <span aria-hidden="true">◆</span> {headerValue}
          </div>
          {roundState === "playing" && !pauseInTimerRow && (
            <button type="button" onClick={pauseGame} disabled={removingCode !== null} aria-label="Pause game" className="flex min-h-12 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-cyan-300 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
              <span aria-hidden="true">Ⅱ</span> Pause
            </button>
          )}
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
      {gameMode === "speed-match-unlimited" && roundState === "selecting-speed-match-timer" && (
        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="timer-choice-title">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Match Unlimited</p>
          <h1 id="timer-choice-title" className="mt-2 text-4xl font-black tracking-tight text-white">Choose your timer</h1>
          <p className="mx-auto mt-3 max-w-xs text-base leading-7 text-slate-400">Play relaxed with no clock, or race to find as many flags as you can in 60 seconds.</p>
          <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
            <button type="button" autoFocus onClick={() => beginGame("speed-match-unlimited", null, true)} className="group min-h-16 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 text-left font-black text-white transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus-visible:border-cyan-300 focus-visible:bg-cyan-300 focus-visible:text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">60-second timer<span className="mt-1 block text-sm font-semibold text-slate-500 transition group-hover:text-slate-700 group-focus-visible:text-slate-700">Every correct flag adds 3 seconds.</span></button>
            <button type="button" onClick={() => beginGame("speed-match-unlimited", null, false)} className="group min-h-16 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 text-left font-black text-white transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus-visible:border-cyan-300 focus-visible:bg-cyan-300 focus-visible:text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">No timer<span className="mt-1 block text-sm font-semibold text-slate-500 transition group-hover:text-slate-700 group-focus-visible:text-slate-700">Play until you save the run.</span></button>
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
          timerBonusSeconds={timedSpeedMatchActive ? timerBonusSeconds : null}
          onPause={pauseInTimerRow ? pauseGame : undefined}
          pauseDisabled={removingCode !== null}
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
          onReplay={() => beginGame(gameMode, difficulty, speedMatchUnlimitedTimed)}
          onHub={onBack}
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
