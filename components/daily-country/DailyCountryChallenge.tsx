"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  DAILY_COUNTRY_CLUE_LIMIT,
  DAILY_COUNTRY_GUESS_LIMIT,
  canSelectDailyCountryClue,
  formatDailyCountryCountdown,
  getCurrentDailyCountryStreak,
  getDailyCountryClues,
  getDailyCountryGuessFeedback,
  getDailyCountryPuzzle,
  getMillisecondsUntilNextDailyCountry,
} from "@/lib/daily-country";
import { SOVEREIGN_NATIONS, type Country } from "@/app/data/countries";
import { trackDailyCountryShared, trackFirstGameCompletion, trackGameAbandoned, trackGameCompleted, trackGameStarted, trackReplayStarted } from "@/lib/analytics";
import { useCookieSettings } from "@/components/analytics/AnalyticsConsentProvider";
import { CountryAutocomplete } from "@/components/gameplay/CountryAutocomplete";
import { ShareResultButton } from "@/components/gameplay/ShareResultButton";
import { usePuzzlerStore } from "@/lib/puzzler-store";

const DAILY_SILHOUETTE_CACHE_KEY = "puzzler-daily-silhouette-v1";
const DAY_MS = 86_400_000;

function getProximityTone(proximity: number | null): { text: string; bar: string } {
  if (proximity === null) return { text: "text-slate-400", bar: "bg-slate-600" };
  if (proximity >= 90) return { text: "text-emerald-300", bar: "bg-gradient-to-r from-emerald-400 to-emerald-200" };
  if (proximity >= 70) return { text: "text-amber-300", bar: "bg-gradient-to-r from-amber-400 to-yellow-200" };
  return { text: "text-rose-300", bar: "bg-gradient-to-r from-rose-500 to-pink-300" };
}

type CachedDailySilhouette = {
  countryCode: string;
  path: string;
};

function readCachedDailySilhouette(countryCode: string): string | null {
  try {
    const cached: unknown = JSON.parse(window.sessionStorage.getItem(DAILY_SILHOUETTE_CACHE_KEY) ?? "null");
    if (!cached || typeof cached !== "object" || !("countryCode" in cached) || !("path" in cached)) return null;
    return cached.countryCode === countryCode && typeof cached.path === "string" ? cached.path : null;
  } catch {
    return null;
  }
}

function cacheDailySilhouette(countryCode: string, path: string): void {
  try {
    const cached: CachedDailySilhouette = { countryCode, path };
    window.sessionStorage.setItem(DAILY_SILHOUETTE_CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Private browsing or unavailable storage should not affect the challenge.
  }
}

export function DailyCountryChallenge({ onBack }: { onBack: () => void }) {
  const outcomes = usePuzzlerStore((state) => state.dailyCountry.outcomes);
  const recordOutcome = usePuzzlerStore((state) => state.recordDailyCountryOutcome);
  const clearOutcome = usePuzzlerStore((state) => state.clearDailyCountryOutcome);
  const { analyticsConsentGranted, analyticsReady } = useCookieSettings();
  const [now, setNow] = useState(() => new Date());
  const [testDayOffset, setTestDayOffset] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [silhouettePath, setSilhouettePath] = useState<string | null | undefined>(undefined);
  const startedAtRef = useRef(Date.now());
  const activeDateRef = useRef<string | null>(null);
  const gameStartedTrackedRef = useRef(false);

  const isDevelopmentMode = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PUZZLER_MODE === "dev";
  const puzzle = getDailyCountryPuzzle(new Date(now.getTime() + testDayOffset * DAY_MS));
  const clues = getDailyCountryClues(puzzle);
  const outcome = outcomes[puzzle.dateKey];
  const guessesUsed = outcome?.guessesUsed ?? 0;
  const previousGuesses = outcome?.guesses ?? [];
  const selectedClueIds = outcome?.selectedClueIds ?? [];
  const isComplete = outcome?.status === "solved" || outcome?.status === "failed";
  const canReplayInDevelopment = isDevelopmentMode;
  const incorrectGuesses = outcome?.status === "solved" ? Math.max(0, guessesUsed - 1) : guessesUsed;
  const currentStreak = getCurrentDailyCountryStreak(outcomes, new Date(now.getTime() + testDayOffset * DAY_MS));
  const nextPuzzleCountdown = formatDailyCountryCountdown(getMillisecondsUntilNextDailyCountry(new Date(now.getTime() + testDayOffset * DAY_MS)));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSilhouettePath(undefined);
    const cachedPath = readCachedDailySilhouette(puzzle.country.code);
    if (cachedPath) {
      setSilhouettePath(cachedPath);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const response = await fetch(`/country-silhouettes/${puzzle.country.code}.json`);
        const data: unknown = await response.json();
        if (!response.ok || !data || typeof data !== "object" || !("path" in data) || typeof data.path !== "string") {
          if (!cancelled) setSilhouettePath(null);
          return;
        }
        cacheDailySilhouette(puzzle.country.code, data.path);
        if (!cancelled) setSilhouettePath(data.path);
      } catch {
        // A missing optional outline must not interrupt the daily challenge.
        if (!cancelled) setSilhouettePath(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [puzzle.country.code]);

  useEffect(() => {
    setAnswer("");
    setSelectedCountry(null);
    setFeedback(null);
    startedAtRef.current = Date.now();
    activeDateRef.current = null;
    gameStartedTrackedRef.current = false;

    if (outcome?.status === "solved" || outcome?.status === "failed") return;

    activeDateRef.current = puzzle.dateKey;
  }, [puzzle.dateKey]);

  function trackStartIfNeeded() {
    if (activeDateRef.current !== puzzle.dateKey || !analyticsReady || !analyticsConsentGranted || gameStartedTrackedRef.current) return;

    gameStartedTrackedRef.current = true;
    void trackGameStarted({ game: "daily_country", game_run_number: puzzle.puzzleNumber });
  }

  useEffect(() => {
    trackStartIfNeeded();
  }, [analyticsConsentGranted, analyticsReady, puzzle.dateKey]);

  function abandonChallenge() {
    if (activeDateRef.current === puzzle.dateKey && !isComplete) {
      void (async () => {
        if (!gameStartedTrackedRef.current && analyticsReady && analyticsConsentGranted) {
          gameStartedTrackedRef.current = true;
          await trackGameStarted({ game: "daily_country", game_run_number: puzzle.puzzleNumber });
        }
        await trackGameAbandoned({
          game: "daily_country",
          duration_ms: Math.max(0, Date.now() - startedAtRef.current),
          attempts: guessesUsed,
          mistakes: guessesUsed,
          game_run_number: puzzle.puzzleNumber,
          exit_reason: "hub",
        });
      })();
    }

    activeDateRef.current = null;
    onBack();
  }

  function replayChallenge() {
    if (!canReplayInDevelopment) return;

    clearOutcome(puzzle.dateKey);
    setAnswer("");
    setSelectedCountry(null);
    setFeedback(null);
    startedAtRef.current = Date.now();
    activeDateRef.current = puzzle.dateKey;
    gameStartedTrackedRef.current = false;
    void trackReplayStarted({ game: "daily_country" });
    trackStartIfNeeded();
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComplete || !selectedCountry) return;

    const submittedAnswer = selectedCountry.name;
    const nextGuessesUsed = guessesUsed + 1;
    const nextGuesses = [...previousGuesses, submittedAnswer];
    const correct = selectedCountry.code === puzzle.country.code;

    if (correct) {
      recordOutcome(puzzle.dateKey, "solved", nextGuessesUsed, nextGuesses, selectedClueIds);
      setFeedback("Correct!");
      activeDateRef.current = null;
      void (async () => {
        if (!gameStartedTrackedRef.current && analyticsReady && analyticsConsentGranted) {
          gameStartedTrackedRef.current = true;
          await trackGameStarted({ game: "daily_country", game_run_number: puzzle.puzzleNumber });
        }
        await trackGameCompleted({
          game: "daily_country",
          score: DAILY_COUNTRY_GUESS_LIMIT + 1 - nextGuessesUsed,
          duration_ms: Math.max(0, Date.now() - startedAtRef.current),
          attempts: nextGuessesUsed,
          mistakes: nextGuessesUsed - 1,
          game_run_number: puzzle.puzzleNumber,
          end_reason: "cleared",
        });
        await trackFirstGameCompletion("daily_country");
      })();
    } else if (nextGuessesUsed === DAILY_COUNTRY_GUESS_LIMIT) {
      recordOutcome(puzzle.dateKey, "failed", nextGuessesUsed, nextGuesses, selectedClueIds);
      setFeedback("No guesses left.");
      activeDateRef.current = null;
      void (async () => {
        if (!gameStartedTrackedRef.current && analyticsReady && analyticsConsentGranted) {
          gameStartedTrackedRef.current = true;
          await trackGameStarted({ game: "daily_country", game_run_number: puzzle.puzzleNumber });
        }
        await trackGameCompleted({
          game: "daily_country",
          score: 0,
          duration_ms: Math.max(0, Date.now() - startedAtRef.current),
          attempts: nextGuessesUsed,
          mistakes: nextGuessesUsed,
          game_run_number: puzzle.puzzleNumber,
          end_reason: "wrong_answer",
        });
        await trackFirstGameCompletion("daily_country");
      })();
    } else {
      recordOutcome(puzzle.dateKey, "in-progress", nextGuessesUsed, nextGuesses, selectedClueIds);
      setFeedback(null);
    }

    setAnswer("");
    setSelectedCountry(null);
  }

  function selectClue(clueId: (typeof clues)[number]["id"]) {
    if (!canSelectDailyCountryClue({
      clueId,
      incorrectGuesses,
      selectedClueIds,
      isComplete,
    })) return;

    recordOutcome(puzzle.dateKey, "in-progress", guessesUsed, previousGuesses, [...selectedClueIds, clueId]);
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="relative flex min-h-14 items-center gap-3">
        <button type="button" onClick={abandonChallenge} className="relative z-10 flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <span aria-hidden="true">←</span> Back to home
        </button>
        <p className="pointer-events-none absolute left-1/2 top-1/2 max-w-[52%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-base font-black tracking-tight text-white">Daily Challenge · Puzzle #{puzzle.puzzleNumber}</p>
        {isDevelopmentMode ? (
          <button type="button" onClick={() => setTestDayOffset((offset) => offset + 1)} className="relative z-10 ml-auto grid h-12 w-12 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/10 text-base transition hover:border-amber-300/60 hover:bg-amber-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300" aria-label="Load next test puzzle" title={testDayOffset > 0 ? `Load next test puzzle (currently +${testDayOffset} days)` : "Load next test puzzle"}>🧪</button>
        ) : <span className="ml-auto min-w-12" aria-hidden="true" />}
      </header>

      <section className="flex-1 py-7" aria-labelledby="daily-country-title">
        <h1 id="daily-country-title" className="sr-only">Daily Challenge Puzzle #{puzzle.puzzleNumber}</h1>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-stretch lg:gap-5">
          <div>
            {isComplete ? (
              <section className={(outcome?.status === "solved" ? "border-emerald-300/30 bg-emerald-300/10" : "border-rose-300/30 bg-rose-500/10") + " rounded-3xl border p-5 text-center shadow-glow"} aria-live="polite">
                <p className={(outcome?.status === "solved" ? "text-emerald-300" : "text-rose-200") + " text-xs font-black uppercase tracking-[0.22em]"}>{outcome?.status === "solved" ? "Solved" : "Answer revealed"}</p>
                <h2 className="mt-2 text-3xl font-black text-white">{puzzle.country.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{outcome?.status === "solved" ? "You solved today’s country in " + guessesUsed + " " + (guessesUsed === 1 ? "guess." : "guesses.") : "Come back tomorrow for a new country."}</p>
                <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 divide-x divide-slate-700/70 rounded-2xl border border-slate-700/70 bg-slate-950/30">
                  <div className="px-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Streak</dt>
                    <dd className="mt-1 text-lg font-black text-amber-300">{currentStreak} {currentStreak === 1 ? "day" : "days"}</dd>
                  </div>
                  <div className="px-4 py-3">
                    <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Next puzzle</dt>
                    <dd className="mt-1 text-lg font-black tabular-nums text-white">{nextPuzzleCountdown}</dd>
                  </div>
                </dl>
                <div className="mx-auto mt-5 max-w-sm space-y-3">
                  <ShareResultButton
                    message={outcome?.status === "solved"
                      ? `I solved Puzzler Daily Challenge #${puzzle.puzzleNumber} in ${guessesUsed}/${DAILY_COUNTRY_GUESS_LIMIT} guesses.`
                      : `I took on Puzzler Daily Challenge #${puzzle.puzzleNumber}. Can you solve it?`}
                    path="/daily-challenge"
                    tone="amber"
                    onShared={(shareMethod) => void trackDailyCountryShared({
                      puzzle_number: puzzle.puzzleNumber,
                      solved: outcome?.status === "solved",
                      guesses_used: guessesUsed,
                      share_method: shareMethod,
                    })}
                  />
                  {canReplayInDevelopment && <button type="button" onClick={replayChallenge} className="min-h-12 w-full rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 font-black text-amber-100 transition hover:bg-amber-300/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Replay today&apos;s challenge</button>}
                  <button type="button" onClick={abandonChallenge} className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Back to home</button>
                </div>
              </section>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-amber-300/25 bg-slate-900/80 shadow-glow">
                <div className="grid min-h-[min(40vh,21rem)] place-items-center p-3 sm:p-4" aria-busy={silhouettePath === undefined}>
                  {silhouettePath ? (
                    <svg viewBox="0 0 100 100" className="h-[min(37vh,19rem)] w-full max-w-md origin-center scale-105 overflow-visible text-amber-300" role="img" aria-label="Country silhouette clue">
                      <path d={silhouettePath} fill="currentColor" fillRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm font-bold text-slate-500">{silhouettePath === undefined ? "Loading outline…" : "Outline unavailable"}</span>
                  )}
                </div>
              </div>
            )}
            {!isComplete && (
              <form onSubmit={submitAnswer} className="mt-5 space-y-3">
                <label htmlFor="daily-country-answer" className="sr-only">Country name</label>
                <div className="flex gap-3">
                  <CountryAutocomplete
                    id="daily-country-answer"
                    value={answer}
                    countries={SOVEREIGN_NATIONS}
                    onChange={(value) => {
                      setAnswer(value);
                      setSelectedCountry(null);
                    }}
                    onSelect={(country) => {
                      setAnswer(country.name);
                      setSelectedCountry(country);
                    }}
                    placeholder="Choose a country"
                    suggestionPlacement="above"
                    maxSuggestions={4}
                    inputClassName="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10"
                  />
                  <button type="submit" disabled={!selectedCountry} className="min-h-14 shrink-0 rounded-2xl bg-amber-300 px-5 font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Submit guess</button>
                </div>
                {feedback && <p className="min-h-6 text-center text-sm font-black text-amber-200" role="status" aria-live="polite">{feedback}</p>}
              </form>
            )}

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80" aria-labelledby="daily-country-guess-history">
              <div className="flex min-h-12 items-center justify-between border-b border-slate-800 px-4 py-2">
                <h2 id="daily-country-guess-history" className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Guess history</h2>
                <span className="text-xs font-bold tabular-nums text-slate-400">{previousGuesses.length}/{DAILY_COUNTRY_GUESS_LIMIT}</span>
              </div>
              {previousGuesses.length === 0 ? (
                <p className="px-4 py-5 text-sm font-semibold text-slate-500">Your guesses and directional feedback will appear here.</p>
              ) : (
                <ol className="divide-y divide-slate-800">
                  {previousGuesses.map((guess, index) => ({ guess, attempt: index + 1 })).reverse().map(({ guess, attempt }) => {
                    const details = getDailyCountryGuessFeedback(guess, puzzle.country);
                    const tone = getProximityTone(details.proximity);
                    const displayedName = details.country?.name ?? guess;

                    return (
                      <li key={`${guess}-${attempt}`} className="relative flex min-h-16 items-center gap-3 px-4 py-2">
                        <div className="flex min-w-0 max-w-[36%] items-center gap-3">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-black tabular-nums text-slate-400">{attempt}</span>
                          <p className="truncate text-sm font-black leading-none text-white">{displayedName}</p>
                        </div>
                        {details.distanceKm === null || details.direction === null || details.proximity === null ? (
                          <p className="absolute left-1/2 -translate-x-1/2 text-center text-xs font-semibold leading-none text-slate-500">Location unavailable</p>
                        ) : (
                          <p className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-xs font-bold leading-none ${tone.text}`}>
                            {details.distanceKm.toLocaleString()} km <span className="px-1 text-base leading-none" aria-label={`Toward ${details.direction.label}`} title={`Toward ${details.direction.label}`}>{details.direction.arrow}</span> {details.proximity}% close
                          </p>
                        )}
                        {details.proximity !== null && (
                          <div className="ml-auto w-16 shrink-0" role="progressbar" aria-label={`Proximity: ${details.proximity}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={details.proximity}>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                              <div className={`h-full rounded-full transition-[width] ${tone.bar}`} style={{ width: `${details.proximity}%` }} />
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
          <aside className="mt-5 flex overflow-hidden rounded-3xl border border-amber-300/25 bg-slate-900/80 p-3 shadow-glow lg:mt-0" aria-labelledby="daily-country-clues">
            <div className="flex w-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <h2 id="daily-country-clues" className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Choose clues</h2>
                <span className="text-xs font-bold tabular-nums text-slate-400">{selectedClueIds.length}/{DAILY_COUNTRY_CLUE_LIMIT}</span>
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Earn one clue after each incorrect guess. The flag unlocks after three.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {clues.map((clue) => {
                  const selected = selectedClueIds.includes(clue.id);
                  const canSelect = canSelectDailyCountryClue({
                    clueId: clue.id,
                    incorrectGuesses,
                    selectedClueIds,
                    isComplete,
                  });
                  const requirement = clue.id === "flag" ? 3 : 1;
                  const locked = !selected && !canSelect;

                  return (
                    <button
                      key={clue.id}
                      type="button"
                      onClick={() => selectClue(clue.id)}
                      disabled={!canSelect}
                      aria-pressed={selected}
                      title={locked && !isComplete ? `Unlock after ${requirement} incorrect ${requirement === 1 ? "guess" : "guesses"}` : undefined}
                      className={`min-h-10 rounded-xl border px-2 text-left text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${selected ? "cursor-default border-cyan-300/30 bg-cyan-300/10 text-cyan-100 opacity-75" : locked ? "border-slate-800 bg-slate-950/40 text-slate-600" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white"} disabled:cursor-not-allowed`}
                    >
                      <span>{clue.label}</span>
                      {locked && !isComplete && <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide">{requirement} wrong</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-1 flex-col">
                {selectedClueIds.length === 0 ? (
                  <section className="mt-auto border-t border-slate-800 pt-4" aria-labelledby="daily-country-how-to-play">
                    <h3 id="daily-country-how-to-play" className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">How to play</h3>
                    <ol className="mt-2 space-y-2 text-xs font-semibold leading-5 text-slate-400">
                      <li><span className="mr-2 text-cyan-300">1.</span>Study the map outline.</li>
                      <li><span className="mr-2 text-cyan-300">2.</span>Each incorrect guess unlocks a clue.</li>
                      <li><span className="mr-2 text-cyan-300">3.</span>Guess the country in six tries.</li>
                    </ol>
                  </section>
                ) : clues.filter((clue) => selectedClueIds.includes(clue.id)).map((clue) => (
                  <article key={clue.id} className="border-t border-slate-800 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{clue.label}</p>
                    {clue.flagCode ? (
                      <div className="relative mt-2 aspect-[2/1] bg-slate-950">
                        <Image src={`https://flagcdn.com/${clue.flagCode}.svg`} alt="The mystery country's flag" fill unoptimized sizes="240px" className="object-contain" />
                      </div>
                    ) : (
                      <p className="mt-1 text-xs font-bold leading-5 text-white">{clue.text}</p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>

      </section>
    </main>
  );
}
