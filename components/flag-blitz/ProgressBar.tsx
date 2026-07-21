import type { GameMode } from "@/lib/flag-quiz";

export function ProgressBar({ current, total, gameMode }: { current: number; total: number; gameMode: GameMode }) {
  if (gameMode === "unlimited") {
    return (
      <div className="mt-4">
        <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          <span>Flag {current}</span>
          <span className="text-cyan-300">Unlimited</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-900">
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-cyan-300 via-blue-500 to-cyan-300" />
        </div>
      </div>
    );
  }

  const progress = Math.round(((current + 1) / total) * 100);
  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        <span>Flag {current + 1} of {total}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
