import type { GameMode } from "@/lib/flag-quiz";
import { FlagBlitzRecords } from "./FlagBlitzRecords";

const GAME_MODES: ReadonlyArray<{
  id: GameMode;
  label: string;
  description: string;
  badge: string;
  icon: string;
}> = [
  {
    id: "classic",
    label: "Classic",
    description: "Ten flags. Build a score and finish the run.",
    badge: "10 flags",
    icon: "10",
  },
  {
    id: "unlimited",
    label: "Classic Unlimited",
    description: "Keep your streak alive. One wrong answer ends it.",
    badge: "One life",
    icon: "∞",
  },
  {
    id: "speed-match",
    label: "Speed Match",
    description: "Find ten flags before the 60-second clock runs out.",
    badge: "60 seconds",
    icon: "60",
  },
  {
    id: "speed-match-unlimited",
    label: "Flag Match Unlimited",
    description: "Keep a live board going with no timer or a 60-second score chase.",
    badge: "Timer choice",
    icon: "∞",
  },
];

export function GameModeSelector({
  onSelect,
  onOpenReport,
  onOpenSettings,
  disabled = false,
}: {
  onSelect: (mode: GameMode) => void;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="flex flex-none flex-col py-8" aria-labelledby="game-mode-title">
      <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Flag Blitz</p>
      <h1 id="game-mode-title" className="mt-2 text-4xl font-black tracking-tight text-white">Choose your run</h1>
      <p className="mt-3 text-base leading-7 text-slate-400">Play a quick set or see how long your streak can last.</p>
      {disabled && <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-bold leading-6 text-rose-100">At least 12 active flags are needed to start a run. Update your collection in Flag settings.</p>}
      <div className="mt-8 space-y-3">
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(mode.id)}
            className="group flex min-h-24 w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-cyan-300/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-800 text-2xl font-black text-cyan-300 group-hover:bg-cyan-300 group-hover:text-slate-950">{mode.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-black text-white">{mode.label}</span>
              <span className="mt-1 block text-sm leading-5 text-slate-500">{mode.description}</span>
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{mode.badge}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onOpenReport} className="group min-h-14 rounded-2xl border border-rose-400/25 bg-rose-400/5 px-4 text-left transition hover:border-rose-300/60 hover:bg-rose-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
          <span className="block text-sm font-black text-white">Flag Report</span>
          <span className="mt-1 block text-xs font-semibold text-slate-500">Your hardest flags</span>
        </button>
        <button type="button" onClick={onOpenSettings} className="group min-h-14 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 text-left transition hover:border-cyan-300/40 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
          <span className="block text-sm font-black text-white">Flag settings</span>
          <span className="mt-1 block text-xs font-semibold text-slate-500">Choose your flag pool</span>
        </button>
      </div>
      <FlagBlitzRecords />
    </section>
  );
}
