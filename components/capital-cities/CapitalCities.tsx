"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CapitalMatchPair } from "@/app/data/capitals";
import {
  CAPITAL_MATCH_PAIR_COUNT,
  createCapitalMatchBoard,
  getCapitalMatchElapsedMs,
  isCapitalMatch,
} from "@/lib/capital-match";
import { formatSeconds } from "@/lib/player-records";
import { usePuzzlerStore } from "@/lib/puzzler-store";
import {
  trackFirstGameCompletion,
  trackGameAbandoned,
  trackGameCompleted,
  trackGameStarted,
  trackReplayStarted,
} from "@/lib/analytics";
import { useCookieSettings } from "@/components/analytics/AnalyticsConsentProvider";
import { GameTimer } from "@/components/GameTimer";
import { ShareResultButton } from "@/components/gameplay/ShareResultButton";

type RoundState = "waiting" | "playing" | "paused" | "complete";
type ResolvingPair = {
  countryCode: string;
  capitalCode: string;
  correct: boolean;
} | null;

const MATCH_FEEDBACK_DURATION_MS = 420;

export function CapitalCities({ onBack }: { onBack: () => void }) {
  const recordPlay = usePuzzlerStore((state) => state.recordCapitalCitiesPlay);
  const recordResult = usePuzzlerStore((state) => state.recordCapitalCitiesResult);
  const bestTimeMs = usePuzzlerStore((state) => state.capitalCities.bestTimeMs);
  const totalPlays = usePuzzlerStore((state) => state.capitalCities.totalPlays);
  const { analyticsConsentGranted, analyticsReady } = useCookieSettings();
  const [board, setBoard] = useState(() => createCapitalMatchBoard());
  const [roundState, setRoundState] = useState<RoundState>("waiting");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCapitalCode, setSelectedCapitalCode] = useState<string | null>(null);
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [resolvingPair, setResolvingPair] = useState<ResolvingPair>(null);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const resolutionTimerRef = useRef<number | null>(null);
  const gameStartedTrackedRef = useRef(false);
  const activeRunRef = useRef(false);
  const mistakesRef = useRef(0);
  const attemptsRef = useRef(0);
  const gameRunNumberRef = useRef(0);
  const matchedCodesRef = useRef<string[]>([]);

  function trackRunStartIfNeeded() {
    if (!activeRunRef.current || !analyticsReady || !analyticsConsentGranted || gameStartedTrackedRef.current) return;

    gameStartedTrackedRef.current = true;
    void trackGameStarted({ game: "capital_cities", game_run_number: gameRunNumberRef.current });
  }

  function clearResolutionTimer() {
    if (resolutionTimerRef.current !== null) {
      window.clearTimeout(resolutionTimerRef.current);
      resolutionTimerRef.current = null;
    }
  }

  function getWallClockDurationMs(): number {
    return startedAtRef.current === null ? 0 : Math.max(0, (pausedAtRef.current ?? Date.now()) - startedAtRef.current);
  }

  useEffect(() => () => clearResolutionTimer(), []);

  useEffect(() => {
    trackRunStartIfNeeded();
  }, [analyticsConsentGranted, analyticsReady, roundState]);

  useEffect(() => {
    if (roundState !== "playing" || startedAtRef.current === null) return;

    const timer = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsedMs(getCapitalMatchElapsedMs(startedAtRef.current, mistakes));
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [mistakes, roundState]);

  function startRun(isReplay = false) {
    clearResolutionTimer();
    startedAtRef.current = Date.now();
    pausedAtRef.current = null;
    activeRunRef.current = true;
    gameStartedTrackedRef.current = false;
    mistakesRef.current = 0;
    attemptsRef.current = 0;
    gameRunNumberRef.current = totalPlays + 1;
    matchedCodesRef.current = [];
    setBoard(createCapitalMatchBoard());
    setRoundState("playing");
    setSelectedCountryCode(null);
    setSelectedCapitalCode(null);
    setMatchedCodes([]);
    setResolvingPair(null);
    setMistakes(0);
    setElapsedMs(0);
    recordPlay();
    if (isReplay) {
      void trackReplayStarted({ game: "capital_cities" });
    }
  }

  function abandonRun() {
    if (activeRunRef.current) {
      activeRunRef.current = false;
      void trackGameAbandoned({
        game: "capital_cities",
        duration_ms: getWallClockDurationMs(),
        attempts: attemptsRef.current,
        mistakes: mistakesRef.current,
        game_run_number: gameRunNumberRef.current,
        exit_reason: "hub",
      });
    }

    clearResolutionTimer();
    onBack();
  }

  function pauseRun() {
    if (roundState !== "playing" || resolvingPair || startedAtRef.current === null) return;

    pausedAtRef.current = Date.now();
    setElapsedMs(getCapitalMatchElapsedMs(startedAtRef.current, mistakesRef.current, pausedAtRef.current));
    setRoundState("paused");
  }

  function resumeRun() {
    if (roundState !== "paused" || pausedAtRef.current === null || startedAtRef.current === null) return;

    startedAtRef.current += Date.now() - pausedAtRef.current;
    pausedAtRef.current = null;
    setRoundState("playing");
  }

  function restartRun() {
    if (activeRunRef.current) {
      activeRunRef.current = false;
      void trackGameAbandoned({
        game: "capital_cities",
        duration_ms: getWallClockDurationMs(),
        attempts: attemptsRef.current,
        mistakes: mistakesRef.current,
        game_run_number: gameRunNumberRef.current,
        exit_reason: "restart",
      });
    }
    startRun(true);
  }

  function resolvePair(countryCode: string, capitalCode: string) {
    const correct = isCapitalMatch(countryCode, capitalCode);
    attemptsRef.current += 1;
    setResolvingPair({ countryCode, capitalCode, correct });

    if (!correct) {
      mistakesRef.current += 1;
      setMistakes(mistakesRef.current);
    }

    resolutionTimerRef.current = window.setTimeout(() => {
      if (correct) {
        const nextMatchedCodes = [...matchedCodes, countryCode];
        matchedCodesRef.current = nextMatchedCodes;
        setMatchedCodes(nextMatchedCodes);

        if (nextMatchedCodes.length === board.pairs.length) {
          const finalElapsedMs = startedAtRef.current === null ? 0 : getCapitalMatchElapsedMs(startedAtRef.current, mistakesRef.current);
          setElapsedMs(finalElapsedMs);
          setRoundState("complete");
          recordResult(finalElapsedMs);
          if (activeRunRef.current) {
            activeRunRef.current = false;
            void (async () => {
              // A very fast first run can finish before the consent-ready effect has fired.
              // Emit the start immediately before completion in that edge case.
              if (!gameStartedTrackedRef.current && analyticsReady && analyticsConsentGranted) {
                gameStartedTrackedRef.current = true;
                await trackGameStarted({ game: "capital_cities", game_run_number: gameRunNumberRef.current });
              }
              await trackGameCompleted({
                game: "capital_cities",
                score: board.pairs.length,
                duration_ms: getWallClockDurationMs(),
                attempts: attemptsRef.current,
                mistakes: mistakesRef.current,
                game_run_number: gameRunNumberRef.current,
                end_reason: "cleared",
              });
              if (attemptsRef.current > 0) await trackFirstGameCompletion("capital_cities");
            })();
          }
        }
      }

      setSelectedCountryCode(null);
      setSelectedCapitalCode(null);
      setResolvingPair(null);
      resolutionTimerRef.current = null;
    }, MATCH_FEEDBACK_DURATION_MS);
  }

  function selectCountry(countryCode: string) {
    if (roundState !== "playing" || resolvingPair || matchedCodes.includes(countryCode)) return;

    setSelectedCountryCode(countryCode);
    if (selectedCapitalCode) resolvePair(countryCode, selectedCapitalCode);
  }

  function selectCapital(capitalCode: string) {
    if (roundState !== "playing" || resolvingPair || matchedCodes.includes(capitalCode)) return;

    setSelectedCapitalCode(capitalCode);
    if (selectedCountryCode) resolvePair(selectedCountryCode, capitalCode);
  }

  function cardClassName(type: "country" | "capital", pair: CapitalMatchPair): string {
    const isResolvingCountry = resolvingPair?.countryCode === pair.code;
    const isResolvingCapital = resolvingPair?.capitalCode === pair.code;
    const isResolving = type === "country" ? isResolvingCountry : isResolvingCapital;
    const isSelected = type === "country" ? selectedCountryCode === pair.code : selectedCapitalCode === pair.code;
    const base = "relative min-h-14 w-full rounded-2xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300";

    if (isResolving && resolvingPair?.correct) {
      return `${base} animate-flag-leave border-emerald-300 bg-emerald-400/25 text-emerald-50`;
    }

    if (isResolving) {
      return `${base} animate-answer-shake border-rose-300 bg-rose-500/20 text-rose-50`;
    }

    if (isSelected) {
      return `${base} border-violet-300 bg-violet-400/20 text-white ring-1 ring-violet-300/50`;
    }

    return `${base} border-slate-800 bg-slate-900/80 text-slate-100 hover:border-violet-300/60 hover:bg-slate-800`;
  }

  const activeCountries = board.countries.filter((pair) => !matchedCodes.includes(pair.code));
  const activeCapitals = board.capitals.filter((pair) => !matchedCodes.includes(pair.code));
  const pairsRemaining = board.pairs.length - matchedCodes.length;

  if (roundState === "waiting") {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
        <header className="relative flex min-h-14 items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="relative z-10 flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"><span aria-hidden="true">←</span> Back to Hub</button>
          <p className="pointer-events-none absolute left-1/2 top-1/2 max-w-[55%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-base font-black tracking-tight text-white">Match Capital Cities</p>
          <span className="min-w-12" aria-hidden="true" />
        </header>
        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="capital-ready-title">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-violet-300/30 bg-violet-400/10 text-4xl shadow-glow" aria-hidden="true">🏛</div>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-violet-300">Capital Cities</p>
          <h1 id="capital-ready-title" className="mt-2 text-4xl font-black tracking-tight text-white">Match the pairs</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-slate-400">Match ten countries with their capitals. Correct pairs clear the board; each miss adds 2 seconds. Your time starts when you&apos;re ready.</p>
          <button type="button" autoFocus onClick={() => startRun()} className="mx-auto mt-8 min-h-14 w-full max-w-sm rounded-2xl bg-violet-300 px-5 font-black text-slate-950 transition hover:bg-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Ready — start timer</button>
        </section>
      </main>
    );
  }

  if (roundState === "complete") {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
        <header className="relative flex min-h-14 items-center justify-between gap-3">
          <button type="button" onClick={abandonRun} className="relative z-10 flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <span aria-hidden="true">←</span> Back to Hub
          </button>
          <p className="pointer-events-none absolute left-1/2 top-1/2 max-w-[55%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-base font-black tracking-tight text-white">Match Capital Cities</p>
          <span className="min-w-12" aria-hidden="true" />
        </header>

        <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="capital-results-title">
          <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-violet-300/30 bg-violet-400/10 text-4xl shadow-glow" aria-hidden="true">🏛</div>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-violet-300">Board cleared</p>
          <h1 id="capital-results-title" className="mt-2 text-4xl font-black tracking-tight text-white">Capital matcher!</h1>
          <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-slate-400">All {CAPITAL_MATCH_PAIR_COUNT} country–capital pairs are matched.</p>

          <div className="mx-auto mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-3xl font-black text-violet-300">{formatSeconds(elapsedMs)}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Final time</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-3xl font-black text-rose-300">{mistakes}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Mistakes</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold text-slate-500">Best time: <span className="text-violet-300">{formatSeconds(bestTimeMs)}</span></p>
          <p className="mt-2 text-xs font-semibold text-slate-600">Each incorrect pair adds 2 seconds.</p>

          <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
            <ShareResultButton message={`I matched ${CAPITAL_MATCH_PAIR_COUNT} capitals in ${(elapsedMs / 1_000).toFixed(1)} seconds on Puzzler.`} path="/capital-cities" tone="violet" />
            <button type="button" onClick={() => startRun(true)} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Play again</button>
            <button type="button" onClick={abandonRun} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Try another game</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="relative flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={abandonRun} className="relative z-10 flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          <span aria-hidden="true">←</span> Back to Hub
        </button>
        <p className="pointer-events-none absolute left-1/2 top-1/2 max-w-[55%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-base font-black tracking-tight text-white">Match Capital Cities</p>
        <div className="relative z-10 flex items-center gap-2">
          <button type="button" disabled={resolvingPair !== null} onClick={pauseRun} className="min-h-10 rounded-xl border border-violet-300/40 bg-violet-300/10 px-3 text-xs font-black text-violet-200 transition hover:bg-violet-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-50">Pause</button>
          <GameTimer durationMs={elapsedMs} mode="elapsed" tone="violet" />
        </div>
      </header>

      <section className="flex-none py-7" aria-labelledby="capital-match-title">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">Capital Cities</p>
        <h1 id="capital-match-title" className="mt-2 text-3xl font-black tracking-tight text-white">Match the pairs</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Tap a country, then its capital. Correct pairs clear the board; a miss costs 2 seconds.</p>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p className="text-sm font-black text-white">{pairsRemaining} {pairsRemaining === 1 ? "pair" : "pairs"} left</p>
          <p className="text-sm font-bold text-rose-300">{mistakes} {mistakes === 1 ? "mistake" : "mistakes"}</p>
        </div>
        <p className={`mt-3 min-h-6 text-sm font-black ${resolvingPair?.correct ? "text-emerald-300" : resolvingPair ? "text-rose-300" : "text-slate-500"}`} aria-live="polite" aria-atomic="true">
          {resolvingPair?.correct ? "Correct match!" : resolvingPair ? "Not a match — 2-second penalty." : "Choose one country and one capital."}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 pb-8 sm:gap-4" aria-label={`${pairsRemaining} country and capital pairs remaining`}>
        <div>
          <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Countries</p>
          <div className="space-y-2">
            {activeCountries.map((pair) => (
              <button
                key={pair.code}
                type="button"
                disabled={resolvingPair !== null}
                onClick={() => selectCountry(pair.code)}
                aria-pressed={selectedCountryCode === pair.code}
                aria-label={`Country: ${pair.name}`}
                className={cardClassName("country", pair)}
              >
                <span className="flex items-center gap-2">
                  <span className="relative h-6 w-8 shrink-0 overflow-hidden border border-white/10 bg-slate-950">
                    <Image src={`https://flagcdn.com/${pair.code}.svg`} alt="" fill unoptimized sizes="32px" className="object-contain" />
                  </span>
                  <span className="min-w-0 text-sm font-black leading-5">{pair.name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.2em] text-fuchsia-300">Capitals</p>
          <div className="space-y-2">
            {activeCapitals.map((pair) => (
              <button
                key={pair.code}
                type="button"
                disabled={resolvingPair !== null}
                onClick={() => selectCapital(pair.code)}
                aria-pressed={selectedCapitalCode === pair.code}
                aria-label={`Capital: ${pair.capital}`}
                className={cardClassName("capital", pair)}
              >
                <span className="block text-sm font-black leading-5">{pair.capital}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      {roundState === "paused" && (
        <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-slate-950 px-5 py-[max(1.25rem,env(safe-area-inset-top))] text-center" role="dialog" aria-modal="true" aria-labelledby="capital-pause-title">
          <section className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-violet-300/30 bg-violet-300/10 text-3xl text-violet-300" aria-hidden="true">Ⅱ</div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-violet-300">Game paused</p>
            <h1 id="capital-pause-title" className="mt-2 text-3xl font-black tracking-tight text-white">Take a breather</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">Your timer and board are waiting exactly where you left them.</p>
            <div className="mt-8 space-y-3">
              <button type="button" autoFocus onClick={resumeRun} className="min-h-14 w-full rounded-2xl bg-violet-300 px-5 font-black text-slate-950 transition hover:bg-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900">Resume</button>
              <button type="button" onClick={restartRun} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-800 px-5 font-black text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Restart run</button>
              <button type="button" onClick={abandonRun} className="min-h-14 w-full rounded-2xl px-5 font-black text-slate-400 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300">Try another game</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
