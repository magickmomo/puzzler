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

type RoundState = "playing" | "complete";
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
  const [board, setBoard] = useState(() => createCapitalMatchBoard());
  const [roundState, setRoundState] = useState<RoundState>("playing");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);
  const [selectedCapitalCode, setSelectedCapitalCode] = useState<string | null>(null);
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [resolvingPair, setResolvingPair] = useState<ResolvingPair>(null);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(Date.now());
  const resolutionTimerRef = useRef<number | null>(null);
  const initialRunRecordedRef = useRef(false);

  function clearResolutionTimer() {
    if (resolutionTimerRef.current !== null) {
      window.clearTimeout(resolutionTimerRef.current);
      resolutionTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (!initialRunRecordedRef.current) {
      recordPlay();
      initialRunRecordedRef.current = true;
    }

    return () => clearResolutionTimer();
  }, [recordPlay]);

  useEffect(() => {
    if (roundState !== "playing") return;

    const timer = window.setInterval(() => {
      setElapsedMs(getCapitalMatchElapsedMs(startedAtRef.current, mistakes));
    }, 100);

    return () => window.clearInterval(timer);
  }, [mistakes, roundState]);

  function startRun() {
    clearResolutionTimer();
    startedAtRef.current = Date.now();
    setBoard(createCapitalMatchBoard());
    setRoundState("playing");
    setSelectedCountryCode(null);
    setSelectedCapitalCode(null);
    setMatchedCodes([]);
    setResolvingPair(null);
    setMistakes(0);
    setElapsedMs(0);
    recordPlay();
  }

  function resolvePair(countryCode: string, capitalCode: string) {
    const correct = isCapitalMatch(countryCode, capitalCode);
    setResolvingPair({ countryCode, capitalCode, correct });

    if (!correct) {
      setMistakes((current) => current + 1);
    }

    resolutionTimerRef.current = window.setTimeout(() => {
      if (correct) {
        const nextMatchedCodes = [...matchedCodes, countryCode];
        setMatchedCodes(nextMatchedCodes);

        if (nextMatchedCodes.length === board.pairs.length) {
          const finalElapsedMs = getCapitalMatchElapsedMs(startedAtRef.current, mistakes);
          setElapsedMs(finalElapsedMs);
          setRoundState("complete");
          recordResult(finalElapsedMs);
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

  if (roundState === "complete") {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
        <header className="flex min-h-14 items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <span aria-hidden="true">←</span> Hub
          </button>
          <p className="text-base font-black tracking-tight text-white">Match Capital Cities</p>
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
            <button type="button" onClick={startRun} className="min-h-14 w-full rounded-2xl bg-violet-300 px-5 font-black text-slate-950 transition hover:bg-violet-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Play again</button>
            <button type="button" onClick={onBack} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Back to Hub</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
          <span aria-hidden="true">←</span> Hub
        </button>
        <p className="text-center text-base font-black tracking-tight text-white">Match Capital Cities</p>
        <time className="min-w-20 text-right text-xl font-black tabular-nums text-violet-300" dateTime={`PT${Math.round(elapsedMs / 1_000)}S`} aria-label={`${formatSeconds(elapsedMs)} elapsed`}>{formatSeconds(elapsedMs)}</time>
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
    </main>
  );
}
