import Image from "next/image";
import type { Country } from "@/app/data/countries";

export function SpeedMatchRound({
  flags,
  target,
  timeLeft,
  timerBonusSeconds,
  onPause,
  pauseDisabled,
  score,
  total,
  matchedCodes,
  incorrectCodes,
  removingCode,
  isUnlimited,
  columns,
  queuedFlags,
  promotedCodes,
  wrongFlagName,
  onSelect,
}: {
  flags: Country[];
  target: Country;
  timeLeft: number | null;
  timerBonusSeconds: number | null;
  onPause?: () => void;
  pauseDisabled: boolean;
  score: number;
  total: number | null;
  matchedCodes: string[];
  incorrectCodes: string[];
  removingCode: string | null;
  isUnlimited: boolean;
  columns: Country[][] | null;
  queuedFlags: Country[] | null;
  promotedCodes: string[];
  wrongFlagName: string | null;
  onSelect: (country: Country) => void;
}) {
  const scoreSummary = isUnlimited ? `Score: ${score}` : `${score} / ${total ?? flags.length} Guessed`;

  function tileClassName(country: Country, isPromoted: boolean): string {
    const base = "relative aspect-[4/3] min-h-14 overflow-hidden border p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

    if (removingCode === country.code) {
      return `${base} animate-flag-leave border-emerald-300 bg-emerald-400/25`;
    }

    if (matchedCodes.includes(country.code)) {
      return `${base} animate-answer-success border-emerald-300 bg-emerald-400/25`;
    }

    if (incorrectCodes.includes(country.code)) {
      return `${base} animate-answer-error border-rose-300 bg-rose-500/35`;
    }

    return `${base} ${isPromoted ? "animate-flag-promote" : ""} border-slate-700 bg-slate-900 hover:border-cyan-300/60 hover:bg-slate-800`;
  }

  function renderFlagButton(country: Country, index: number, isPromoted = false) {
    const isMatched = matchedCodes.includes(country.code);
    const isIncorrect = incorrectCodes.includes(country.code);
    const isLeaving = removingCode === country.code;

    return (
      <button
        key={country.code}
        type="button"
        disabled={isMatched || isIncorrect || removingCode !== null || timeLeft === 0}
        onClick={() => onSelect(country)}
        className={tileClassName(country, isPromoted)}
        aria-label={isLeaving || isMatched ? `Flag option ${index + 1}, correct` : isIncorrect ? `Flag option ${index + 1}, ${country.name}, incorrect` : `Flag option ${index + 1}`}
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
        {isIncorrect && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center bg-rose-950/80 p-2 text-center text-sm font-black leading-tight text-rose-50 sm:text-base">
            <span className="break-words">{country.name}</span>
          </span>
        )}
      </button>
    );
  }

  return (
    <section className="flex flex-1 flex-col py-4" aria-labelledby="speed-match-target">
      <div className="flex items-center justify-between gap-3 border-b border-slate-900 pb-4">
        <div className="min-w-0">
          <p className="text-sm font-black tracking-tight text-white">{isUnlimited ? "Flag Match Unlimited" : "Speed Match"}</p>
          <p className="mt-1 text-sm font-bold text-slate-400">{scoreSummary}</p>
        </div>
        {timeLeft !== null && (
          <div className="flex items-center gap-2">
            {onPause && (
              <button type="button" onClick={onPause} disabled={pauseDisabled} aria-label="Pause game" className="flex min-h-12 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-black text-cyan-300 transition hover:border-cyan-300 hover:text-cyan-100 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                <span aria-hidden="true">Ⅱ</span> Pause
              </button>
            )}
            <div className="relative">
              <time className={`grid min-h-12 min-w-[4.5rem] place-items-center rounded-xl border px-3 text-xl font-black tabular-nums ${timeLeft <= 10 ? "animate-pulse border-rose-400/70 bg-rose-400/10 text-rose-300" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-300"}`} dateTime={`PT${timeLeft}S`} aria-label={`${timeLeft} seconds remaining`}>
                {timeLeft}s
              </time>
              {timerBonusSeconds !== null && <span className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-black text-emerald-300" aria-live="polite">+{timerBonusSeconds}s</span>}
            </div>
          </div>
        )}
      </div>
      <div className="py-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Find this country</p>
        <h1 id="speed-match-target" aria-live="polite" className="mt-2 text-3xl font-black tracking-tight text-white">{target.name}</h1>
        <p className="mt-2 min-h-6 text-base font-black text-rose-300" aria-live="polite" aria-atomic="true">
          {wrongFlagName && <span className="animate-wrong-flag">That was {wrongFlagName}</span>}
        </p>
      </div>
      {isUnlimited && columns && queuedFlags ? (
        <div className="grid grid-cols-3 gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]" role="group" aria-label="Nine selectable flags and three queued flags">
          {columns.map((column, columnIndex) => {
            const queuedFlag = queuedFlags[columnIndex];

            return (
              <div key={`column-${columnIndex}`} className="flex flex-col gap-2">
                {column.map((country, flagIndex) => renderFlagButton(country, columnIndex * column.length + flagIndex, promotedCodes.includes(country.code)))}
                {queuedFlag && (
                  <div key={queuedFlag.code} aria-hidden="true" className="pointer-events-none relative aspect-[4/3] min-h-14 overflow-hidden border border-slate-800 bg-slate-900/70 p-1.5 opacity-[0.15]">
                    <Image
                      src={`https://flagcdn.com/${queuedFlag.code}.svg`}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 640px) calc((100vw - 56px) / 3), 128px"
                      className="object-contain"
                    />
                    <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 pb-[max(0.25rem,env(safe-area-inset-bottom))]" role="group" aria-label="Flag choices">
          {flags.map((country, index) => renderFlagButton(country, index))}
        </div>
      )}
    </section>
  );
}
