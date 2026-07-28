type GameHeaderScore = {
  value: string | number;
  label: string;
};

export function GameHeader({
  title,
  isPlaying,
  score,
  pauseDisabled,
  onBack,
  onPause,
}: {
  title: string;
  isPlaying: boolean;
  score: GameHeaderScore | null;
  pauseDisabled: boolean;
  onBack: () => void;
  onPause: () => void;
}) {
  return (
    <header className="relative flex min-h-14 items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-2">
      <button
        type="button"
        onClick={onBack}
        aria-label={isPlaying ? "Back to Hub" : undefined}
        className={`flex min-h-12 items-center rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${isPlaying ? "shrink-0 gap-1 hover:bg-slate-900" : "gap-2"}`}
      >
        <span aria-hidden="true">←</span> Back to Hub
      </button>
      <p className="pointer-events-none absolute left-1/2 top-1/2 max-w-[55%] -translate-x-1/2 -translate-y-1/2 truncate text-center text-sm font-black tracking-tight text-white sm:text-base">{title}</p>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {score && (
          <div className="flex min-h-12 min-w-12 items-center justify-center gap-1.5 rounded-xl border border-amber-300/15 bg-amber-300/5 px-2 text-sm font-black text-amber-300" aria-label={score.label}>
            <span aria-hidden="true">◆</span> {score.value}
          </div>
        )}
        {isPlaying && (
          <button type="button" onClick={onPause} disabled={pauseDisabled} aria-label="Pause game" className="flex min-h-12 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm font-black text-cyan-300 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span aria-hidden="true">Ⅱ</span> Pause
          </button>
        )}
      </div>
    </header>
  );
}
