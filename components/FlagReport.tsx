"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  FLAG_REPORT_GAME_MODES,
  FLAG_REPORT_MODE_LABELS,
  getHardestFlags,
  type FlagReportFilter,
} from "@/lib/flag-report";
import { usePuzzlerStore } from "@/lib/puzzler-store";

const REPORT_FILTERS: readonly FlagReportFilter[] = ["all", ...FLAG_REPORT_GAME_MODES];

export function FlagReport({ onBack, onHub }: { onBack: () => void; onHub: () => void }) {
  const flagStatsByMode = usePuzzlerStore((state) => state.flagBlitz.flagStatsByMode);
  const [filter, setFilter] = useState<FlagReportFilter>("all");
  const entries = useMemo(() => getHardestFlags(flagStatsByMode, filter), [filter, flagStatsByMode]);

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-6xl px-5 pb-10 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="flex min-h-14 items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex min-h-12 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <span aria-hidden="true">←</span> Flag Blitz
        </button>
        <p className="text-base font-black tracking-tight text-white">Flag Report</p>
        <button type="button" onClick={onHub} className="flex min-h-12 items-center rounded-xl px-2 text-sm font-bold text-cyan-300 transition hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          Back to Hub
        </button>
      </header>

      <section className="py-8" aria-labelledby="flag-report-title">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Your flag practice</p>
        <h1 id="flag-report-title" className="mt-2 text-4xl font-black tracking-tight text-white">Hardest flags</h1>
        <p className="mt-3 max-w-lg text-base leading-7 text-slate-400">Your missed answers become a private study list. Lower accuracy rises to the top, and every result stays on this device.</p>
      </section>

      <section aria-label="Flag Report filters">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_FILTERS.map((option) => {
            const selected = option === filter;

            return (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                aria-pressed={selected}
                className={`min-h-12 rounded-xl border px-3 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? "border-cyan-300 bg-cyan-300 text-slate-950" : "border-slate-800 bg-slate-900 text-slate-300 hover:border-cyan-300/50"}`}
              >
                {FLAG_REPORT_MODE_LABELS[option]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="flag-report-list-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">{FLAG_REPORT_MODE_LABELS[filter]}</p>
            <h2 id="flag-report-list-title" className="mt-1 text-xl font-black text-white">Flags to revisit</h2>
          </div>
          {entries.length > 0 && <p className="text-sm font-bold text-slate-500">{entries.length} {entries.length === 1 ? "flag" : "flags"}</p>}
        </div>

        {entries.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-slate-700 bg-slate-900/45 p-6 text-center">
            <p className="text-lg font-black text-white">No missed flags yet</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">Play a round and any flag you miss will appear here with its own practice record.</p>
          </div>
        ) : (
          <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6" aria-label="Hardest flags">
            {entries.map((entry, index) => (
              <li key={entry.country.code} className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                <div className="relative aspect-[4/3] overflow-hidden border-b border-white/10 bg-slate-950">
                  <Image src={`https://flagcdn.com/${entry.country.code}.svg`} alt={`Flag of ${entry.country.name}`} fill unoptimized sizes="(max-width: 640px) calc((100vw - 56px) / 3), 160px" className="object-contain" />
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-950/90 px-1.5 py-0.5 text-[9px] font-black text-rose-100">#{index + 1}</span>
                </div>
                <div className="p-2.5">
                  <h3 className="min-h-10 text-sm font-black leading-5 text-white">{entry.country.name}</h3>
                  <p className="mt-1 text-lg font-black text-rose-300">{Math.round(entry.accuracy * 100)}% <span className="text-[10px] uppercase tracking-wide text-slate-500">accuracy</span></p>
                  <dl className="mt-2 grid grid-cols-3 gap-1 text-center">
                    <div className="rounded-lg bg-slate-950/70 px-1 py-1.5">
                      <dd className="text-sm font-black text-white">{entry.stats.attempts}</dd>
                      <dt className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">Tries</dt>
                    </div>
                    <div className="rounded-lg bg-slate-950/70 px-1 py-1.5">
                      <dd className="text-sm font-black text-emerald-300">{entry.stats.correct}</dd>
                      <dt className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">Right</dt>
                    </div>
                    <div className="rounded-lg bg-slate-950/70 px-1 py-1.5">
                      <dd className="text-sm font-black text-rose-300">{entry.stats.wrong}</dd>
                      <dt className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-500">Miss</dt>
                    </div>
                  </dl>
                  <p className="mt-2 min-h-8 text-[10px] font-semibold leading-4 text-slate-400">
                    {entry.attemptsPerCorrect === null
                      ? "Not solved yet"
                      : `${entry.attemptsPerCorrect.toFixed(1)} tries per correct`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
