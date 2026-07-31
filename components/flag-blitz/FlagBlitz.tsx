"use client";

import { useEffect, useRef, useState } from "react";
import { type Country } from "@/app/data/countries";
import {
  FLAG_MATCH_TIMED_CORRECT_BONUS_MS,
  createMultipleChoiceOptions,
  createQuestionDeck,
  createRunSeed,
  createSeededRandom,
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
  type RandomSource,
} from "@/lib/flag-quiz";
import { FLAG_MATCH_CHALLENGE_VERSION, createFlagMatchChallengeUrl, getFlagMatchChallengeOutcome, orderFlagMatchChallengePool, type FlagMatchChallenge } from "@/lib/flag-challenge";
import { formatSeconds } from "@/lib/player-records";
import { usePuzzlerStore } from "@/lib/puzzler-store";
import {
  getActiveCountries,
  hasMinimumActiveCountries,
  MINIMUM_ACTIVE_COUNTRIES,
} from "@/lib/puzzler-settings";
import {
  trackFirstGameCompletion,
  trackGameAbandoned,
  trackGameCompleted,
  trackGameModeSelected,
  trackGameStarted,
  trackReplayStarted,
  trackFlagMatchChallengeCompleted,
  trackFlagMatchChallengeOpened,
  trackFlagMatchChallengeReshared,
  trackFlagMatchChallengeShared,
  trackFlagMatchChallengeStarted,
  type AnalyticsDifficulty,
  type GameEndReason,
  type GameExitReason,
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

async function copyChallengeLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.className = "fixed -left-full top-0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  }
}

export function FlagBlitz({
  onBack,
  onOpenReport,
  onOpenSettings,
  entry = "standard",
  onExploreModes,
  onSelectFlagMatchUnlimited,
  challenge,
}: {
  onBack: () => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  entry?: FlagBlitzEntry;
  onExploreModes?: () => void;
  onSelectFlagMatchUnlimited?: () => void;
  challenge?: FlagMatchChallenge;
}) {
  const recordPlay = usePuzzlerStore((state) => state.recordFlagBlitzPlay);
  const recordResult = usePuzzlerStore((state) => state.recordFlagBlitzResult);
  const recordFlagAttempt = usePuzzlerStore((state) => state.recordFlagBlitzAttempt);
  const excludedCountryCodes = usePuzzlerStore((state) => state.flagBlitz.settings.excludedCountryCodes);
  const totalPlays = usePuzzlerStore((state) => state.flagBlitz.totalPlays);
  const [gameMode, setGameMode] = useState<GameMode | null>(entry === "flag-match-timer-selection" || challenge ? "flag-match-unlimited" : null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<ReturnType<typeof createQuestionDeck>>([]);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<Country[]>([]);
  const [countryPool, setCountryPool] = useState<Country[]>([]);
  const [runSeed, setRunSeed] = useState<string | null>(null);
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
    entry === "flag-match-challenge" || challenge
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
  const randomRef = useRef<RandomSource | null>(null);
  const challengeOpenedRef = useRef(false);
  const attemptsRef = useRef(0);
  const mistakesRef = useRef(0);
  const gameRunNumberRef = useRef(0);

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

  useEffect(() => {
    if (!challenge || challengeOpenedRef.current) return;
    challengeOpenedRef.current = true;
    void trackFlagMatchChallengeOpened({
      pool_size: challenge.countryPool.length,
      challenger_score: challenge.challengerScore,
    });
  }, [challenge]);

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

  function recordActiveRunAbandonment(exitReason: GameExitReason) {
    if (!activeRunRef.current) return;
    const context = getTrackingContext();
    activeRunRef.current = false;
    if (!context) return;

    void trackGameAbandoned({
      ...context,
      duration_ms: getRunDurationMs(),
      attempts: attemptsRef.current,
      mistakes: mistakesRef.current,
      game_run_number: gameRunNumberRef.current,
      exit_reason: exitReason,
    });
  }

  function selectGameMode(selectedGameMode: GameMode) {
    if (!hasMinimumActiveCountries(excludedCountryCodes)) return;
    void trackGameModeSelected(selectedGameMode);

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

  function beginGame(
    selectedGameMode: GameMode,
    selectedDifficulty: Difficulty | null,
    timedUnlimited = speedMatchUnlimitedTimed,
    options: { seed?: string; countryPool?: readonly Country[] } = {},
  ) {
    const selectedCountryPool = options.countryPool ? [...options.countryPool] : getActiveCountries(excludedCountryCodes);
    const nextCountryPool = selectedGameMode === "flag-match-unlimited" && timedUnlimited
      ? orderFlagMatchChallengePool(selectedCountryPool)
      : selectedCountryPool;
    if (nextCountryPool.length < MINIMUM_ACTIVE_COUNTRIES) {
      setRoundState("selecting-mode");
      return;
    }

    const nextSeed = options.seed ?? createRunSeed();
    const random = createSeededRandom(nextSeed);
    const nextQuestions = createQuestionDeck(selectedGameMode, nextCountryPool, random);
    const isSpeedMatchUnlimited = selectedGameMode === "flag-match-unlimited";
    const initialVisibleFlags = isSpeedMatchUnlimited
      ? nextQuestions.slice(0, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS)
      : [];
    const initialColumns = createSpeedMatchUnlimitedColumns(initialVisibleFlags);
    const initialQueuedFlags: Array<Country | null> = isSpeedMatchUnlimited
      ? nextQuestions.slice(SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS, SPEED_MATCH_UNLIMITED_VISIBLE_FLAGS + SPEED_MATCH_UNLIMITED_QUEUED_FLAGS)
      : [];
    const nextMultipleChoiceOptions = selectedDifficulty === "easy" && nextQuestions[0]
      ? createMultipleChoiceOptions(nextQuestions[0], nextCountryPool, random)
      : [];

    recordActiveRunAbandonment("restart");
    gameIdRef.current += 1;
    clearBoardTransition();
    timerDeadlineRef.current = isTimedSpeedMatchRun(selectedGameMode, timedUnlimited) ? Date.now() + SPEED_MATCH_TIME_LIMIT_MS : null;
    pausedRemainingDurationRef.current = null;
    setGameMode(selectedGameMode);
    setDifficulty(selectedDifficulty);
    setSpeedMatchUnlimitedTimed(selectedGameMode === "flag-match-unlimited" && timedUnlimited);
    setQuestions(nextQuestions);
    setMultipleChoiceOptions(nextMultipleChoiceOptions);
    setCountryPool(nextCountryPool);
    setRunSeed(nextSeed);
    randomRef.current = random;
    setSpeedMatchTargets(selectedGameMode === "speed-match" ? createSpeedMatchTargetDeck(nextQuestions, random) : []);
    setSpeedMatchColumns(initialColumns);
    setSpeedMatchQueuedFlags(initialQueuedFlags);
    setSpeedMatchTarget(pickSpeedMatchTarget(initialVisibleFlags, random));
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
    mistakesRef.current = 0;
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
    attemptsRef.current = 0;
    gameRunNumberRef.current = totalPlays + 1;
    recordPlay();
    const context = getTrackingContext(selectedGameMode, selectedDifficulty, timedUnlimited);
    if (context) void trackGameStarted({ ...context, game_run_number: gameRunNumberRef.current });
    if (challenge && selectedGameMode === "flag-match-unlimited" && timedUnlimited) {
      void trackFlagMatchChallengeStarted({
        pool_size: challenge.countryPool.length,
        challenger_score: challenge.challengerScore,
      });
    }
  }

  function startGame(selectedDifficulty: Difficulty) {
    if (!gameMode) return;
    beginGame(gameMode, selectedDifficulty);
  }

  function startFlagMatchChallenge() {
    beginGame("flag-match-unlimited", null, true, challenge
      ? { seed: challenge.seed, countryPool: challenge.countryPool }
      : undefined);
  }

  function getShareChallenge(): FlagMatchChallenge | null {
    if (!runSeed || gameMode !== "flag-match-unlimited" || !speedMatchUnlimitedTimed || runDurationMs === null) return null;

    return {
      version: challenge?.version ?? FLAG_MATCH_CHALLENGE_VERSION,
      seed: challenge?.seed ?? runSeed,
      challengerScore: score,
      challengerDurationMs: runDurationMs,
      challengerMistakes: mistakes,
      countryPool: challenge?.countryPool ?? countryPool,
    };
  }

  function getFlagMatchChallengeUrl(): string | null {
    const challengeToShare = getShareChallenge();
    return challengeToShare ? createFlagMatchChallengeUrl(window.location.origin, challengeToShare) : null;
  }

  function trackChallengeShare(method: "native" | "copy") {
    if (runDurationMs === null || !countryPool.length) return;
    const properties = {
      pool_size: countryPool.length,
      score,
      duration_ms: runDurationMs,
      mistakes,
      share_method: method,
    };

    if (challenge) void trackFlagMatchChallengeReshared(properties);
    else void trackFlagMatchChallengeShared(properties);
  }

  async function shareFlagMatchChallenge(): Promise<"shared" | null> {
    const url = getFlagMatchChallengeUrl();
    const challengeToShare = getShareChallenge();
    if (!url || !challengeToShare || !navigator.share) return null;

    const shareData = {
      title: "Flag Marathon challenge",
      text: `I found ${challengeToShare.challengerScore} of ${challengeToShare.countryPool.length} flags in ${formatSeconds(challengeToShare.challengerDurationMs)} with ${challengeToShare.challengerMistakes} mistakes. Can you beat me?`,
      url,
    };

    try {
      await navigator.share(shareData);
      trackChallengeShare("native");
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return null;
      return null;
    }
  }

  async function copyFlagMatchChallengeLink(): Promise<boolean> {
    const url = getFlagMatchChallengeUrl();
    const copied = url ? await copyChallengeLink(url) : false;
    if (copied) trackChallengeShare("copy");
    return copied;
  }

  function submitAnswer(value: string) {
    if (roundState !== "playing" || !gameMode || !questions[index]) return;

    const correct = isCorrectAnswer(value, questions[index]);
    attemptsRef.current += 1;
    if (!correct) {
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);
    }
    const updatedScore = getUpdatedScore({ score, streak }, correct);
    recordFlagAttempt(gameMode, questions[index].code, correct);
    setAnswer(value);
    setWasCorrect(correct);
    setScore(updatedScore.score);
    setStreak(updatedScore.streak);
    setRoundState("answered");
  }

  function finishGame(finalScore = score, completionTimeMs?: number, endReason: GameEndReason = "cleared") {
    if (!gameMode || !activeRunRef.current) return;
    clearBoardTransition();
    timerDeadlineRef.current = null;
    pausedRemainingDurationRef.current = null;
    activeRunRef.current = false;
    const context = getTrackingContext();
    const durationMs = getRunDurationMs();
    setRunDurationMs(durationMs);
    if (gameMode !== "flag-match-unlimited" || speedMatchUnlimitedTimed) {
      recordResult(gameMode, finalScore, completionTimeMs);
    }
    if (context) {
      void trackGameCompleted({
        ...context,
        score: finalScore,
        duration_ms: durationMs,
        attempts: attemptsRef.current,
        mistakes: mistakesRef.current,
        game_run_number: gameRunNumberRef.current,
        end_reason: endReason,
      });
      if (attemptsRef.current > 0) void trackFirstGameCompletion("flag_blitz");
    }
    if (challenge && gameMode === "flag-match-unlimited" && speedMatchUnlimitedTimed) {
      const challengeOutcome = getFlagMatchChallengeOutcome({ score: finalScore, mistakes: mistakesRef.current }, challenge);
      void trackFlagMatchChallengeCompleted({
        pool_size: countryPool.length,
        score: finalScore,
        duration_ms: durationMs,
        mistakes: mistakesRef.current,
        challenge_outcome: challengeOutcome,
      });
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
    recordActiveRunAbandonment("hub");
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
    attemptsRef.current += 1;

    if (countryCode !== target.code) {
      const gameId = gameIdRef.current;
      setIncorrectCodes((current) => current.includes(countryCode) ? current : [...current, countryCode]);
      setStreak(0);
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);

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
      const random = randomRef.current;
      if (!random) return;

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
      setSpeedMatchTarget(pickSpeedMatchTarget(nextVisibleFlags, random));
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
    const random = randomRef.current;
    if (!random) return;

    const action = getNextRoundAction({
      gameMode,
      correct: wasCorrect,
      deckIndex: index,
      deckSize: questions.length,
    });

    if (action === "results") {
      finishGame(score, undefined, gameMode === "unlimited" ? "wrong_answer" : "cleared");
      return;
    }

    if (action === "reshuffle") {
      const nextQuestions = createQuestionDeck("unlimited", countryPool, random);
      setQuestions(nextQuestions);
      setMultipleChoiceOptions(difficulty === "easy" && nextQuestions[0]
        ? createMultipleChoiceOptions(nextQuestions[0], countryPool, random)
        : []);
      setIndex(0);
    } else {
      const nextIndex = index + 1;
      setMultipleChoiceOptions(difficulty === "easy" && questions[nextIndex]
        ? createMultipleChoiceOptions(questions[nextIndex], countryPool, random)
        : []);
      setIndex(nextIndex);
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
    if (isTimedSpeedMatchRun(gameMode, speedMatchUnlimitedTimed) && roundState === "playing" && timeLeft === 0) finishGame(score, undefined, "timeout");
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
  const headerTitle = isFlagMatchUnlimited ? "Flag Marathon" : isSpeedMatch ? "Speed Match" : "Flag Blitz";

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
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Marathon</p>
          <h1 id="flag-match-challenge-title" className="mt-2 text-4xl font-black tracking-tight text-white">{challenge ? "Beat the challenger" : "Flag Marathon: 60-Second Challenge"}</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-slate-400">
            {challenge
              ? <>They found <span className="font-black text-amber-300">{challenge.challengerScore} of {challenge.countryPool.length}</span> flags in {formatSeconds(challenge.challengerDurationMs)} with {challenge.challengerMistakes} {challenge.challengerMistakes === 1 ? "mistake" : "mistakes"}. You&apos;ll get the exact same board and targets.</>
              : "Find the named country’s flag. Every correct answer adds two seconds."}
          </p>
          <button type="button" autoFocus onClick={startFlagMatchChallenge} disabled={!challenge && !hasMinimumActiveCountries(excludedCountryCodes)} className="mx-auto mt-8 min-h-14 w-full max-w-sm rounded-2xl bg-cyan-300 px-5 font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Start challenge</button>
        </section>
      )}
      {gameMode && roundState === "selecting-difficulty" && (
        <DifficultySelector gameMode={gameMode} onSelect={startGame} onBack={() => setRoundState("selecting-mode")} />
      )}
      {gameMode === "flag-match-unlimited" && roundState === "selecting-speed-match-timer" && (
        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="timer-choice-title">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Marathon</p>
          <h1 id="timer-choice-title" className="mt-2 text-4xl font-black tracking-tight text-white">Choose your timer</h1>
          <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
            <button type="button" autoFocus onClick={() => beginGame("flag-match-unlimited", null, true)} className="group min-h-16 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 text-left font-black text-white transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus-visible:border-cyan-300 focus-visible:bg-cyan-300 focus-visible:text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">60-second timer<span className="mt-1 block text-sm font-semibold text-slate-500 transition group-hover:text-slate-700 group-focus-visible:text-slate-700">Every correct flag adds 2 seconds.</span></button>
            <button type="button" onClick={() => beginGame("flag-match-unlimited", null, false)} className="group min-h-16 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 text-left font-black text-white transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950 focus:outline-none focus-visible:border-cyan-300 focus-visible:bg-cyan-300 focus-visible:text-slate-950 focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">No timer<span className="mt-1 block text-sm font-semibold text-slate-500 transition group-hover:text-slate-700 group-focus-visible:text-slate-700">Practice freely — scores are not ranked.</span></button>
            <button type="button" onClick={() => setRoundState("selecting-mode")} className="min-h-12 w-full rounded-2xl px-5 font-black text-slate-400 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Back to modes</button>
          </div>
        </section>
      )}
      {gameMode && !speedMatchActive && difficulty && (roundState === "playing" || roundState === "answered") && questions.length > 0 && (
        <QuizRound
          gameMode={gameMode}
          difficulty={difficulty}
          questions={questions}
          multipleChoiceOptions={multipleChoiceOptions}
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
            beginGame(gameMode, difficulty, speedMatchUnlimitedTimed, challenge
              ? { seed: challenge.seed, countryPool: challenge.countryPool }
              : undefined);
          }}
          onHub={onBack}
          secondaryActionLabel={entry === "flag-match-challenge" ? "Explore other games/modes" : undefined}
          onSecondaryAction={entry === "flag-match-challenge" ? onExploreModes : undefined}
          challenge={challenge}
          onShareChallenge={gameMode === "flag-match-unlimited" && speedMatchUnlimitedTimed && runSeed ? shareFlagMatchChallenge : undefined}
          onCopyChallengeLink={gameMode === "flag-match-unlimited" && speedMatchUnlimitedTimed && runSeed ? copyFlagMatchChallengeLink : undefined}
        />
      )}
      {roundState === "paused" && gameMode && (
        <PauseOverlay
          onResume={resumeGame}
          onRestart={() => beginGame(gameMode, difficulty, speedMatchUnlimitedTimed, challenge
            ? { seed: challenge.seed, countryPool: challenge.countryPool }
            : undefined)}
          onEndRun={() => finishGame(score, undefined, "saved")}
          onHub={abandonGame}
        />
      )}
    </main>
  );
}
