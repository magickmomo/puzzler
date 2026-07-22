"use client";

import { usePuzzlerStore } from "@/lib/puzzler-store";
import { formatSeconds } from "@/lib/player-records";

export function FlagBlitzRecords() {
  const records = usePuzzlerStore((state) => state.flagBlitz);

  return (
    <section className="mt-8" aria-labelledby="flag-blitz-records-title">
      <p id="flag-blitz-records-title" className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Your Flag Blitz records</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Record value={records.totalPlays} label="Started" tone="text-white" description="All Flag Blitz rounds started, including replays, restarts, and runs you abandon." />
        <Record value={records.bestClassicScore} label="Best 10" tone="text-cyan-300" description="Classic: your highest score in a ten-flag run." />
        <Record value={records.bestUnlimitedStreak} label="Best streak" tone="text-amber-300" description="Classic Unlimited: correct flags found before your first miss." />
        <Record value={formatSeconds(records.bestSpeedMatchTimeMs)} label="Best time" tone="text-rose-300" description="Speed Match: your fastest time to clear all ten flags on the 60-second board." />
        <Record value={records.bestSpeedMatchUnlimitedScore} label="Best live" tone="text-violet-300" description="Flag Match Unlimited: flags found on the untimed replenishing board. Choose Save & see results to record a run." />
      </div>
    </section>
  );
}

function Record({ value, label, tone, description }: { value: string | number; label: string; tone: string; description: string }) {
  return (
    <div className="record-card relative rounded-xl border border-slate-900 bg-slate-900/45 p-3 text-center [touch-action:pan-y]">
      <p className={`text-lg font-black ${tone}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <span className="sr-only">{description}</span>
      <span role="tooltip" aria-hidden="true" className="record-tooltip pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-52 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs font-semibold leading-5 text-slate-200 opacity-0 shadow-xl transition-opacity">
        {description}
      </span>
    </div>
  );
}
