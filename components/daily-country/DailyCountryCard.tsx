"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatDailyCountryCountdown,
  getCurrentDailyCountryStreak,
  getDailyCountryPuzzle,
  getMillisecondsUntilNextDailyCountry,
} from "@/lib/daily-country";
import { trackGameSelected } from "@/lib/analytics";
import { usePuzzlerStore } from "@/lib/puzzler-store";

export function DailyCountryCard() {
  const outcomes = usePuzzlerStore((state) => state.dailyCountry.outcomes);
  const [now, setNow] = useState(() => new Date());
  const puzzle = getDailyCountryPuzzle(now);
  const outcome = outcomes[puzzle.dateKey];
  const streak = getCurrentDailyCountryStreak(outcomes, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const stateLabel = outcome?.status === "solved"
    ? "Solved in " + outcome.guessesUsed + " " + (outcome.guessesUsed === 1 ? "guess" : "guesses")
    : outcome?.status === "failed"
      ? "Answer revealed"
      : outcome?.status === "in-progress"
        ? outcome.guessesUsed + " of 6 guesses used"
        : "Not played yet";
  const actionLabel = outcome?.status === "solved" || outcome?.status === "failed" ? "View today’s result" : outcome?.status === "in-progress" ? "Continue today’s puzzle" : "Play today’s challenge";

  return (
    <Link
      href="/daily-challenge"
      onClick={() => void trackGameSelected("daily_country")}
      className="group relative block min-h-64 overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-300/15 via-slate-900 to-slate-900 p-5 transition hover:-translate-y-1 hover:border-amber-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500" />
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-300 text-2xl text-slate-950 shadow-lg" aria-hidden="true">☀</div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Daily challenge</p>
          <p className="mt-1 text-xs font-bold tabular-nums text-slate-400">Next in {formatDailyCountryCountdown(getMillisecondsUntilNextDailyCountry(now))}</p>
        </div>
      </div>
      <div className="mt-6">
        <p className="text-sm font-bold text-amber-200">Puzzle #{puzzle.puzzleNumber}</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Today&apos;s country</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{stateLabel}</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
        <div>
          <p className="text-xl font-black text-amber-300">{streak}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current streak</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-cyan-300">{actionLabel}</p>
          <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
        </div>
      </div>
    </Link>
  );
}
