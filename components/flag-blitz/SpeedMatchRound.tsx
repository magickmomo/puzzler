import Image from "next/image";
import type { Country } from "@/app/data/countries";

export function SpeedMatchRound({
  flags,
  targetIndex,
  timeLeft,
  score,
  matchedCodes,
  incorrectCodes,
  onSelect,
}: {
  flags: Country[];
  targetIndex: number;
  timeLeft: number;
  score: number;
  matchedCodes: string[];
  incorrectCodes: string[];
  onSelect: (country: Country) => void;
}) {
  const target = flags[targetIndex];

  function tileClassName(country: Country): string {
    const base = "relative aspect-[4/3] min-h-14 overflow-hidden border p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

    if (matchedCodes.includes(country.code)) {
      return `${base} animate-answer-success border-emerald-300 bg-emerald-400/25`;
    }

    if (incorrectCodes.includes(country.code)) {
      return `${base} animate-answer-error border-rose-300 bg-rose-500/35`;
    }

    return `${base} border-slate-700 bg-slate-900 hover:border-cyan-300/60 hover:bg-slate-800`;
  }

  return (
    <section className="flex flex-1 flex-col py-4" aria-labelledby="speed-match-target">
      <div className="flex items-center justify-between gap-3 border-b border-slate-900 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-300">Speed Match</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{score} of {flags.length} found</p>
        </div>
        <time className={`grid min-h-14 min-w-20 place-items-center border px-3 text-2xl font-black tabular-nums ${timeLeft <= 10 ? "animate-pulse border-rose-400/70 bg-rose-400/10 text-rose-300" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-300"}`} dateTime={`PT${timeLeft}S`} aria-label={`${timeLeft} seconds remaining`}>
          {timeLeft}s
        </time>
      </div>
      <div className="py-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Find this country</p>
        <h1 id="speed-match-target" aria-live="polite" className="mt-2 text-3xl font-black tracking-tight text-white">{target.name}</h1>
      </div>
      <div className="grid grid-cols-3 gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]" role="group" aria-label="Flag choices">
        {flags.map((country, index) => {
          const isMatched = matchedCodes.includes(country.code);
          const isIncorrect = incorrectCodes.includes(country.code);

          return (
            <button
              key={country.code}
              type="button"
              disabled={isMatched || isIncorrect || timeLeft === 0}
              onClick={() => onSelect(country)}
              className={tileClassName(country)}
              aria-label={isMatched ? `Flag option ${index + 1}, correct` : isIncorrect ? `Flag option ${index + 1}, incorrect` : `Flag option ${index + 1}`}
            >
              <Image
                src={`https://flagcdn.com/${country.code}.svg`}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 640px) calc((100vw - 56px) / 3), 128px"
                className="object-contain"
              />
              <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
