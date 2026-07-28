"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  DAILY_COUNTRY_GUESS_LIMIT,
  formatDailyCountryCountdown,
  getDailyCountryClues,
  getDailyCountryPuzzle,
  getMillisecondsUntilNextDailyCountry,
} from "@/lib/daily-country";
import { isCorrectAnswer } from "@/lib/flag-quiz";
import { trackFirstGameCompletion, trackGameAbandoned, trackGameCompleted, trackGameStarted } from "@/lib/analytics";
import { usePuzzlerStore } from "@/lib/puzzler-store";

export function DailyCountryChallenge({ onBack }: { onBack: () => void }) {
  const outcomes = usePuzzlerStore((state) => state.dailyCountry.outcomes);
  const recordOutcome = usePuzzlerStore((state) => state.recordDailyCountryOutcome);
  const [now, setNow] = useState(() => new Date());
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());
  const activeDateRef = useRef<string | null>(null);

  const puzzle = getDailyCountryPuzzle(now);
  const clues = getDailyCountryClues(puzzle);
  const outcome = outcomes[puzzle.dateKey];
  const guessesUsed = outcome?.guessesUsed ?? 0;
  const isComplete = outcome?.status === "solved" || outcome?.status === "failed";
  const visibleClueCount = Math.min(DAILY_COUNTRY_GUESS_LIMIT, Math.max(1, guessesUsed + (outcome?.status === "solved" ? 0 : 1)));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setAnswer("");
    setFeedback(null);
    startedAtRef.current = Date.now();
    activeDateRef.current = null;

    if (outcome?.status === "solved" || outcome?.status === "failed") return;

    activeDateRef.current = puzzle.dateKey;
    void trackGameStarted({ game: "daily_country" });
  }, [puzzle.dateKey]);

  function abandonChallenge() {
    if (activeDateRef.current === puzzle.dateKey && !isComplete) {
      void trackGameAbandoned({
        game: "daily_country",
        duration_ms: Math.max(0, Date.now() - startedAtRef.current),
        progress: guessesUsed,
      });
    }

    activeDateRef.current = null;
    onBack();
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isComplete || answer.trim().length === 0) return;

    const nextGuessesUsed = guessesUsed + 1;
    const correct = isCorrectAnswer(answer, puzzle.country);

    if (correct) {
      recordOutcome(puzzle.dateKey, "solved", nextGuessesUsed);
      setFeedback("Correct!");
      activeDateRef.current = null;
      void trackGameCompleted({
        game: "daily_country",
        score: DAILY_COUNTRY_GUESS_LIMIT + 1 - nextGuessesUsed,
        duration_ms: Math.max(0, Date.now() - startedAtRef.current),
        progress: nextGuessesUsed,
      });
      void trackFirstGameCompletion("daily_country");
    } else if (nextGuessesUsed === DAILY_COUNTRY_GUESS_LIMIT) {
      recordOutcome(puzzle.dateKey, "failed", nextGuessesUsed);
      setFeedback("No guesses left.");
      activeDateRef.current = null;
      void trackGameCompleted({
        game: "daily_country",
        score: 0,
        duration_ms: Math.max(0, Date.now() - startedAtRef.current),
        progress: nextGuessesUsed,
      });
      void trackFirstGameCompletion("daily_country");
    } else {
      recordOutcome(puzzle.dateKey, "in-progress", nextGuessesUsed);
      setFeedback("Not quite — another clue is unlocked.");
    }

    setAnswer("");
  }

  const countdown = formatDailyCountryCountdown(getMillisecondsUntilNextDailyCountry(now));

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={abandonChallenge} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
          <span aria-hidden="true">←</span> Back to Puzzler
        </button>
        <p className="text-base font-black tracking-tight text-white">Daily Challenge</p>
        <span className="min-w-12" aria-hidden="true" />
      </header>

      <section className="flex-1 py-7" aria-labelledby="daily-country-title">
        <div className="rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-300/10 via-slate-900 to-slate-900 p-5 shadow-glow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">Today&apos;s country</p>
              <h1 id="daily-country-title" className="mt-2 text-3xl font-black tracking-tight text-white">Puzzle #{puzzle.puzzleNumber}</h1>
            </div>
            <time className="rounded-xl border border-amber-300/20 bg-slate-950/60 px-3 py-2 text-right text-sm font-black tabular-nums text-amber-200" dateTime={"PT" + Math.floor(getMillisecondsUntilNextDailyCountry(now) / 1_000) + "S"}>
              Next in<br />{countdown}
            </time>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-300">Name the mystery country. A new clue appears after every incorrect guess.</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-200/70">{Math.min(guessesUsed + (isComplete ? 0 : 1), DAILY_COUNTRY_GUESS_LIMIT)} of {DAILY_COUNTRY_GUESS_LIMIT} clues revealed · {guessesUsed} of {DAILY_COUNTRY_GUESS_LIMIT} guesses used</p>
        </div>

        <div className="mt-5 space-y-3">
          {clues.slice(0, visibleClueCount).map((clue) => (
            <article key={clue.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
              <div className="border-b border-slate-800 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{clue.label}</div>
              {clue.flagCode ? (
                <div className="relative aspect-[2/1] bg-slate-950 p-4">
                  <Image src={"https://flagcdn.com/" + clue.flagCode + ".svg"} alt="The mystery country's flag" fill unoptimized sizes="(max-width: 640px) calc(100vw - 40px), 576px" className="object-contain p-4" />
                </div>
              ) : (
                <p className="px-4 py-4 text-base font-bold text-white">{clue.text}</p>
              )}
            </article>
          ))}
        </div>

        {isComplete ? (
          <section className={"mt-5 rounded-2xl border p-5 text-center " + (outcome?.status === "solved" ? "border-emerald-300/30 bg-emerald-300/10" : "border-rose-300/30 bg-rose-500/10")} aria-live="polite">
            <p className={"text-xs font-black uppercase tracking-[0.22em] " + (outcome?.status === "solved" ? "text-emerald-300" : "text-rose-200")}>{outcome?.status === "solved" ? "Solved" : "Answer revealed"}</p>
            <h2 className="mt-2 text-3xl font-black text-white">{puzzle.country.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{outcome?.status === "solved" ? "You solved today’s country in " + guessesUsed + " " + (guessesUsed === 1 ? "guess." : "guesses.") : "Come back tomorrow for a new country."}</p>
            <button type="button" onClick={abandonChallenge} className="mt-5 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Back to Puzzler</button>
          </section>
        ) : (
          <form onSubmit={submitAnswer} className="mt-5 space-y-3">
            <label htmlFor="daily-country-answer" className="sr-only">Country name</label>
            <input
              id="daily-country-answer"
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Type the country name"
              className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 text-base font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-amber-300 focus:ring-4 focus:ring-amber-300/10"
            />
            {feedback && <p className="min-h-6 text-center text-sm font-black text-amber-200" role="status" aria-live="polite">{feedback}</p>}
            <button type="submit" disabled={answer.trim().length === 0} className="min-h-14 w-full rounded-2xl bg-amber-300 px-5 font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Submit guess</button>
          </form>
        )}
      </section>
    </main>
  );
}
