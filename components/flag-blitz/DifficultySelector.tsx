import type { Difficulty, GameMode } from "@/lib/flag-quiz";

const DIFFICULTIES: ReadonlyArray<{
  id: Difficulty;
  label: string;
  description: string;
}> = [
  { id: "easy", label: "Easy", description: "Choose from four answers" },
  { id: "medium", label: "Medium", description: "Type the country, hints allowed" },
  { id: "hard", label: "Hard", description: "Type the country, no lifelines" },
];

export function DifficultySelector({
  gameMode,
  onSelect,
  onBack,
}: {
  gameMode: GameMode;
  onSelect: (difficulty: Difficulty) => void;
  onBack: () => void;
}) {
  const modeLabel = gameMode === "classic" ? "Classic · 10 flags" : "Classic Unlimited · one life";
  const badge = gameMode === "classic" ? "10 flags" : "unlimited";

  return (
    <section className="flex flex-1 flex-col justify-center py-8" aria-labelledby="difficulty-title">
      <button type="button" onClick={onBack} className="-ml-2 flex min-h-12 w-fit items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        <span aria-hidden="true">←</span> Change run
      </button>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">{modeLabel}</p>
      <h1 id="difficulty-title" className="mt-2 text-4xl font-black tracking-tight text-white">How sharp are you?</h1>
      <p className="mt-3 text-base leading-7 text-slate-400">Choose how you want to name each flag.</p>
      <div className="mt-8 space-y-3">
        {DIFFICULTIES.map((difficulty, index) => (
          <button
            key={difficulty.id}
            type="button"
            onClick={() => onSelect(difficulty.id)}
            className="group flex min-h-20 w-full items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-cyan-300/40 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-lg font-black text-cyan-300 group-hover:bg-cyan-300 group-hover:text-slate-950">0{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-black text-white">{difficulty.label}</span>
              <span className="mt-1 block text-sm text-slate-500">{difficulty.description}</span>
            </span>
            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{badge}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
