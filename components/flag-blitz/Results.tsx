import type { Difficulty, GameMode } from "@/lib/flag-quiz";

export function Results({
  gameMode,
  score,
  total,
  streak,
  questionNumber,
  timeLeft,
  difficulty,
  onReplay,
  onHub,
}: {
  gameMode: GameMode;
  score: number;
  total: number;
  streak: number;
  questionNumber: number;
  timeLeft: number;
  difficulty: Difficulty | null;
  onReplay: () => void;
  onHub: () => void;
}) {
  const isUnlimited = gameMode === "unlimited";
  const isSpeedMatchUnlimited = gameMode === "speed-match-unlimited";
  const isSpeedMatch = gameMode === "speed-match" || isSpeedMatchUnlimited;
  const percent = isUnlimited || isSpeedMatch ? 0 : Math.round((score / total) * 100);
  const title = isSpeedMatchUnlimited
    ? score >= 25 ? "Flag blur!" : score >= 15 ? "Rapid fire!" : "Keep chasing flags!"
    : isSpeedMatch
    ? score === total ? "Perfect speed!" : score >= 7 ? "Fast finder!" : "Keep chasing flags!"
    : isUnlimited
    ? score >= 25 ? "Streak legend!" : score >= 10 ? "Strong run!" : "Keep exploring!"
    : percent >= 75 ? "Map master!" : percent >= 50 ? "Solid run!" : "Keep exploring!";

  return (
    <section className="flex flex-1 flex-col justify-center py-10 text-center" aria-labelledby="results-title">
      <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl border border-cyan-300/30 bg-cyan-300/10 text-4xl shadow-glow" aria-hidden="true">🏁</div>
      <p className="mt-7 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Run complete</p>
      <h1 id="results-title" className="mt-2 text-4xl font-black tracking-tight text-white">{title}</h1>
      <p className="mx-auto mt-3 max-w-xs text-slate-400">
        {isSpeedMatchUnlimited
          ? `You found ${score} flags from a continuously replenished board before the timer ended.`
          : isSpeedMatch
          ? `You found ${score} of ${total} flags before the timer ended.`
          : isUnlimited
          ? `Your Classic Unlimited run ended on flag ${questionNumber}. One miss ends the streak.`
          : <>You completed <span className="capitalize">{difficulty}</span> mode. Another run could put you on top.</>}
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-3xl font-black text-white">{score}{!isUnlimited && !isSpeedMatchUnlimited && <span className="text-lg text-slate-600">/{total}</span>}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{isUnlimited ? "Correct flags" : isSpeedMatch ? "Flags found" : "Score"}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-3xl font-black text-amber-300">{isUnlimited ? questionNumber : isSpeedMatch ? `${timeLeft}s` : streak}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{isUnlimited ? "Run ended on" : isSpeedMatch ? "Time left" : "Final streak"}</p>
        </div>
      </div>
      <div className="mx-auto mt-8 w-full max-w-sm space-y-3">
        <button type="button" onClick={onReplay} className="min-h-14 w-full rounded-2xl bg-cyan-300 px-5 font-black text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950">Play again</button>
        <button type="button" onClick={onHub} className="min-h-14 w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 font-black text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">Back to Hub</button>
      </div>
    </section>
  );
}
